from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import AsyncIterator, Callable

from application.agent.meta_followup import is_meta_followup
from application.agent.query_decomposition import decompose_query
from application.agent.query_rewrite import FollowupRoute, is_content_free, route_followup
from application.agent.resolution import is_resolved
from application.agent.section_stream import SectionSplitter
from application.agent.smalltalk import detect_smalltalk, smalltalk_reply
from application.services.citations import (
    ViewerRedactionBuffer,
    merge_ranges,
    normalize_paren_timestamps,
    parse_cited_pages,
    parse_cited_ranges,
    redact_private_document_refs,
    strip_dangling_citation_artifacts,
    strip_stray_footnotes,
    strip_tagged_citation_wrappers,
)
from application.services.clip_builder import build_clip_records, sign_clips, video_chunk_ranges
from application.services.document_sources import (
    build_document_sources,
    gate_document_sources,
    hidden_document_sources,
)
from domain.entities.answer_result import AnswerResult
from utils.conversation_history import format_conversation_history
from utils.prompts.meta_prompt import build_meta_prompt
from utils.prompts.sectioned_answer_prompt import build_sectioned_prompt

logger = logging.getLogger(__name__)

# Bound on the answer's max_tokens when several sub-questions are answered in one call.
_MAX_ANSWER_TOKENS = 4096

# Persisting the assistant reply is best-effort and must never block the stream indefinitely:
# a stalled DB call here (pool exhaustion, network stall) would otherwise hang the WS generator
# forever with all answer tokens already sent but no `done` frame — the client just sees the
# connection die once something upstream (e.g. the platform's own request timeout) kills it,
# with no error surfaced. Bound it so a hang fails fast into the existing except-Exception path.
_PERSIST_TIMEOUT_S = 5.0


def _log_done(thread_id: str | None, label: str, metadata: dict, elapsed_s: float) -> None:
    """Single-line turn-completion summary \u2014 replaces the old multi-line STATE banner so the
    log stream stays scannable. Carries everything that banner did (resolved/escalated/counts),
    just as one greppable line instead of a pretty-printed JSON block."""
    logger.info(
        "chat.done_ready thread_id=%s label=%-18s resolved=%-5s escalated=%-5s sections=%d "
        "video_clips=%d document_sources=%d sources=%d elapsed_s=%.2f",
        thread_id, label, metadata.get("resolved"), metadata.get("escalated"),
        len(metadata.get("sections") or []), len(metadata.get("video_clips") or []),
        len(metadata.get("document_sources") or []), len(metadata.get("sources") or []),
        elapsed_s,
    )


def _is_admin(user) -> bool:
    """None-safe wrapper around ``User.is_global_admin`` (this turn's ``user`` may be None)."""
    return bool(user is not None and getattr(user, "is_global_admin", False))


CANNOT_ANSWER_MESSAGE = (
    "I couldn't find an answer to this in our support-video knowledge base. "
    "I've forwarded your question to our support team, who will follow up by email."
)


# A section whose text is a soft refusal ("I couldn't find an answer to this in the knowledge
# base") cites nothing, so it must not be given a document source. The ANSWER system prompt
# mandates this wording, so matching it is reliable enough to gate the implicit-reference
# fallback in ``_reconcile_docs`` (docs matched by title/page are unaffected either way).
_NO_ANSWER_RE = re.compile(
    r"(?:couldn'?t|could not|can'?t|cannot|unable to|don'?t|do not)\s+"
    r"(?:find|have|provide|give)?\s*(?:an?\s+)?answer",
    re.IGNORECASE,
)


class ThreadAccessError(Exception):
    """Raised when a thread_id is unknown or not owned by the requesting user (→ 404)."""


class SupportAgent:
    """Single linear agent: (persist turn + load memory) → small-talk? → meta-follow-up? →
    retrieve → (if grounded) generate → build clips/doc-sources → resolve → persist reply.

    Chat persistence is best-effort; ownership violations raise ThreadAccessError. The
    meta-follow-up branch answers requests that operate on the prior conversation
    (summarize/rewrite/…) from history alone, bypassing RAG + the grounding gate.
    """

    def __init__(
        self,
        rag_service,
        llm_client,
        signer: Callable[[str], str],
        answerable_threshold: float,
        max_tokens: int = 1024,
        escalation_service=None,
        max_document_sources: int = 3,
        chat_store=None,
        document_store=None,
        max_history_messages: int = 10,
        thread_title_max_len: int = 80,
        enable_meta_followups: bool = True,
        max_subquestions: int = 4,
        enable_decomposition: bool = True,
        enable_query_rewrite: bool = True,
    ) -> None:
        self._rag = rag_service
        self._llm = llm_client
        self._signer = signer
        self._threshold = answerable_threshold
        self._max_tokens = max_tokens
        self._escalation = escalation_service
        self._max_document_sources = max_document_sources
        self._chat = chat_store
        self._documents = document_store
        self._max_history = max_history_messages
        self._title_max_len = thread_title_max_len
        self._enable_meta = enable_meta_followups
        self._max_subquestions = max_subquestions
        self._enable_decomposition = enable_decomposition
        self._enable_rewrite = enable_query_rewrite

    async def _prepare_turn(self, question: str, user, thread_id: str | None) -> tuple[str | None, list[dict]]:
        """Resolve/create the thread, load prior messages, persist the user message.

        Returns ``(thread_id, recent_messages)`` (recent = messages BEFORE this turn, oldest-first).
        Raises ``ThreadAccessError`` for an unknown/foreign thread; swallows infra errors.
        """
        if self._chat is None or user is None:
            return thread_id, []
        recent: list[dict] = []
        start = time.monotonic()
        logger.info("chat.prepare_turn_started thread_id=%s", thread_id)
        try:
            if thread_id:
                thread = await self._chat.get_thread(thread_id)
                if thread is None or thread.get("user_uuid") != user.id:
                    raise ThreadAccessError(thread_id)
                recent = await self._chat.get_recent_messages(thread_id, self._max_history)
            else:
                created = await self._chat.create_thread(user.id, title=question[: self._title_max_len])
                thread_id = created["thread_id"]
            await self._chat.save_message(thread_id, "user", question)
        except ThreadAccessError:
            raise
        except Exception:
            logger.exception(
                "chat.persist_user_failed thread_id=%s elapsed_s=%.2f", thread_id, time.monotonic() - start
            )
            return thread_id, recent
        logger.info(
            "chat.prepare_turn_finished thread_id=%s elapsed_s=%.2f", thread_id, time.monotonic() - start
        )
        return thread_id, recent

    async def _persist_assistant(self, thread_id: str | None, text: str, metadata: dict) -> None:
        if self._chat is None or not thread_id:
            return
        start = time.monotonic()
        logger.info("chat.persist_assistant_started thread_id=%s", thread_id)
        try:
            await asyncio.wait_for(
                self._chat.save_message(thread_id, "assistant", text, metadata=metadata),
                timeout=_PERSIST_TIMEOUT_S,
            )
        except asyncio.TimeoutError:
            logger.error(
                "chat.persist_assistant_timeout thread_id=%s timeout_s=%.1f elapsed_s=%.2f",
                thread_id, _PERSIST_TIMEOUT_S, time.monotonic() - start,
            )
        except Exception:
            logger.exception(
                "chat.persist_assistant_failed thread_id=%s elapsed_s=%.2f", thread_id, time.monotonic() - start
            )
        else:
            logger.info(
                "chat.persist_assistant_finished thread_id=%s elapsed_s=%.2f", thread_id, time.monotonic() - start
            )

    async def _current_public(self, sources: list[dict]) -> dict[str, bool]:
        """Current DB visibility for the cited documents, so a doc made private since it was
        indexed is gated by its CURRENT state, not the (possibly stale) chunk-payload flag.
        Best-effort: on any failure return {} and gate falls back to the per-source flag."""
        if not self._documents or not sources:
            return {}
        try:
            return await self._documents.public_flags([s.get("document_id") for s in sources])
        except Exception:
            logger.exception("doc.public_flags_failed")
            return {}

    def _is_meta(self, question: str, recent: list[dict]) -> bool:
        """A meta follow-up only makes sense when there is prior conversation to operate on."""
        return self._enable_meta and bool(recent) and is_meta_followup(question)

    @staticmethod
    def _pending_clarification(recent: list[dict]) -> bool:
        """True when the last assistant turn asked the user to clarify/elaborate — this turn's
        message is the answer to that, not a fresh question."""
        if not recent or recent[-1].get("role") != "assistant":
            return False
        return bool((recent[-1].get("metadata") or {}).get("needs_clarification"))

    @staticmethod
    def _combine_with_clarification(question: str, recent: list[dict]) -> str:
        """Fold the user's clarification answer back into the original ambiguous question that
        prompted it (the turn before the clarification request in ``recent``)."""
        original = recent[-2]["content"] if len(recent) >= 2 else ""
        return f"{original} — {question}".strip(" —")

    async def _retrieval_rewrite(self, question: str, recent: list[dict]) -> FollowupRoute:
        if not self._enable_rewrite:
            return FollowupRoute(query=question)
        return await route_followup(question, recent, self._llm)

    @staticmethod
    def _last_answer_sections(recent: list[dict]) -> list[dict]:
        """The most recent REAL assistant answer's persisted sections — skips past a pending
        clarification placeholder (it has no sections of its own) to find the real content."""
        for msg in reversed(recent):
            if msg.get("role") != "assistant":
                continue
            meta = msg.get("metadata") or {}
            if meta.get("needs_clarification"):
                continue
            return meta.get("sections") or []
        return []

    @staticmethod
    def _last_answer_sources(recent: list[dict]) -> list[str]:
        for msg in reversed(recent):
            if msg.get("role") != "assistant":
                continue
            meta = msg.get("metadata") or {}
            if meta.get("needs_clarification"):
                continue
            return list(meta.get("sources") or [])
        return []

    @staticmethod
    def _dedupe_by(items: list[dict], key) -> list[dict]:
        seen = set()
        out: list[dict] = []
        for item in items:
            k = key(item)
            if k in seen:
                continue
            seen.add(k)
            out.append(item)
        return out

    async def _direct_answer_sections(self, text: str, topic: str, recent: list[dict], user) -> dict:
        """Section scaffolding for an answer composed directly from conversation history (no
        new retrieval this turn) — carries forward the previous answer's clips/doc-sources
        (re-signed/re-gated for THIS viewer), since the content came from that same material,
        not a fresh RAG pass. Keeps clip/source consistency across a "give me just the names"
        style follow-up instead of a second retrieval landing on different results."""
        text = strip_stray_footnotes(
            strip_dangling_citation_artifacts(
                strip_tagged_citation_wrappers(normalize_paren_timestamps(text))
            )
        )
        prev_sections = self._last_answer_sections(recent)
        clip_records = self._dedupe_by(
            self._flatten(prev_sections, "video_clips"), lambda c: c.get("video_id")
        )
        doc_sources = self._dedupe_by(
            self._flatten(prev_sections, "document_sources"), lambda d: d.get("document_id")
        )
        # Reconcile the carried-forward sources against THIS turn's composed answer, so a reformat/
        # subset shows only the moments/videos/docs it actually cites (the ANSWER prompt preserves
        # the source citations). No fresh retrieval here, so use each carried clip's OWN cited_ranges
        # as the match windows. A video the new text doesn't cite is dropped; kept videos carry only
        # the cited moments — keeping chips consistent with the text (no orphaned "Referenced at").
        windows = {
            c["video_id"]: [(r["start_ms"], r["end_ms"]) for r in (c.get("cited_ranges") or [])]
            for c in clip_records if c.get("video_id")
        }
        per_video = self._assign_cited_ranges(text, windows)
        clip_records = self._reconcile_clips(clip_records, per_video)
        retrieved_docs = list(doc_sources)
        doc_sources = self._reconcile_docs(text, retrieved_docs)
        is_admin = _is_admin(user)
        clips = sign_clips(clip_records, self._signer)
        current_public = await self._current_public(retrieved_docs)
        gated_docs, viewer_text = self._gate_and_redact_text(
            text, doc_sources, is_admin, current_public, retrieved_docs=retrieved_docs
        )
        sources = self._last_answer_sources(recent)

        durable = [{"topic": topic, "text": text, "video_clips": clip_records,
                    "document_sources": doc_sources}]
        viewer = [{"topic": topic, "text": viewer_text, "video_clips": clips,
                   "document_sources": gated_docs}]
        return {"durable": durable, "viewer": viewer, "sources": sources}

    async def _plan_retrieval(
        self, question: str, recent: list[dict], thread_id: str | None = None
    ) -> tuple[str, str, str | None, str | None, bool]:
        """Resolve a pending clarification, then decide how this turn should be handled:
        answered directly from recent conversation, sent to retrieval, asked to clarify, or
        given up on entirely (no RAG call).

        Returns ``(effective_question, retrieval_question, clarify_text, direct_answer, give_up)``:
        - ``effective_question`` is what the user "really asked" this turn (raw text, or the
          raw text combined with their answer to a pending clarification) — used as the visible
          section topic, never the LLM-rewritten form.
        - ``retrieval_question`` is what actually goes into decomposition/RAG (only meaningful
          when none of ``clarify_text``/``direct_answer``/``give_up`` is set).
        - ``clarify_text`` is set only when the turn should short-circuit: ask this instead of
          running retrieval at all. Never set twice in a row for the same original question —
          once a clarification round is in progress (``resuming``), the turn proceeds instead
          of asking again, so a still-ambiguous answer falls through to retrieval (and, worst
          case, the honest "couldn't find an answer" outcome) rather than looping.
        - ``direct_answer`` is set when the follow-up is fully answerable from the conversation
          already given (e.g. "just the names") — no retrieval needed; use this text as the
          answer as-is.
        - ``give_up`` is set when resuming a clarification whose reply is ITSELF content-free
          (e.g. the user answered "?" with another "?") — the combined text is still garbage, so
          rather than send it to RAG (which is exactly the bare-"?" bug this router exists to
          prevent) or ask a THIRD time, the turn ends honestly with no retrieval at all.
        At most one of ``clarify_text``/``direct_answer``/``give_up`` is ever set.

        Every branch is logged (thread-correlated) so a staging turn's routing decision —
        answered from history vs. rewritten vs. asked to clarify vs. gave up vs. passed through
        unchanged — is visible without reproducing the request locally.
        """
        if not self._enable_rewrite:
            return question, question, None, None, False

        resuming = self._pending_clarification(recent)
        effective_question = (
            self._combine_with_clarification(question, recent) if resuming else question
        )
        if resuming:
            logger.info(
                "clarification.resuming thread_id=%s combined_question=%r",
                thread_id, effective_question,
            )
        retrieval_question = effective_question
        clarify_text = None
        direct_answer = None
        give_up = False

        if not resuming and is_content_free(effective_question):
            clarify_text = "Could you share a bit more detail about what you'd like to know?"
            logger.info(
                "rewrite.decision thread_id=%s outcome=clarify_content_free question=%r",
                thread_id, effective_question,
            )
        elif not is_content_free(effective_question):
            route = await self._retrieval_rewrite(effective_question, recent)
            if route.answer:
                direct_answer = route.answer
                logger.info(
                    "rewrite.decision thread_id=%s outcome=answered_from_history question=%r",
                    thread_id, effective_question,
                )
            elif route.clarify and not resuming:
                clarify_text = route.clarify
                logger.info(
                    "rewrite.decision thread_id=%s outcome=clarify_ambiguous question=%r clarify=%r",
                    thread_id, effective_question, clarify_text,
                )
            else:
                retrieval_question = route.query
                if route.clarify and resuming:
                    logger.info(
                        "rewrite.decision thread_id=%s outcome=clarify_capped_proceeding_anyway "
                        "question=%r retrieval_question=%r",
                        thread_id, effective_question, retrieval_question,
                    )
                elif retrieval_question != effective_question:
                    logger.info(
                        "rewrite.decision thread_id=%s outcome=rewritten question=%r retrieval_question=%r",
                        thread_id, effective_question, retrieval_question,
                    )
                else:
                    logger.info(
                        "rewrite.decision thread_id=%s outcome=unchanged question=%r",
                        thread_id, effective_question,
                    )
        else:
            give_up = True
            logger.info(
                "rewrite.decision thread_id=%s outcome=clarify_capped_content_free_giving_up "
                "question=%r",
                thread_id, effective_question,
            )

        return effective_question, retrieval_question, clarify_text, direct_answer, give_up

    async def _run_rag_queries(self, subqs: list[str], thread_id: str | None) -> list:
        """Retrieve each sub-question SEQUENTIALLY (the RAG pipeline shares one cross-encoder/
        embedder, and concurrent model.predict on a shared model can corrupt/swap results across
        sub-questions — misaligning a section's clip). Timed + logged per sub-question and in
        total: retrieval is an external dependency (vector DB / embedder) that can stall, and if
        it does, this is the log line that will show which sub-question never returned."""
        contexts = []
        start = time.monotonic()
        for i, sq in enumerate(subqs):
            q_start = time.monotonic()
            logger.info("rag.query_started thread_id=%s subq_index=%d question_len=%d", thread_id, i, len(sq))
            ctx = await self._rag.query(sq)
            logger.info(
                "rag.query_finished thread_id=%s subq_index=%d elapsed_s=%.2f video_results=%d document_results=%d",
                thread_id, i, time.monotonic() - q_start,
                len(ctx.video_results or []), len(ctx.document_results or []),
            )
            contexts.append(ctx)
        logger.info(
            "rag.query_all_finished thread_id=%s subquestions=%d elapsed_s=%.2f",
            thread_id, len(subqs), time.monotonic() - start,
        )
        return contexts

    async def _subquestions(self, question: str) -> list[str]:
        if not self._enable_decomposition:
            return [question]
        return await decompose_query(question, self._llm, self._max_subquestions)

    async def _stamp_durations(self, clip_records: list[dict]) -> None:
        """Add each clip's full-video ``duration_ms`` (for the card badge). Best-effort."""
        if not self._documents or not clip_records:
            return
        try:
            durs = await self._documents.video_durations([r["video_id"] for r in clip_records])
            for r in clip_records:
                r["duration_ms"] = durs.get(r["video_id"])
        except Exception:
            logger.exception("clip.durations_failed")

    async def _prepare_sections(
        self, subqs: list[str], contexts, user, original_question: str | None = None
    ) -> dict:
        """Build the per-section scaffolding for a (possibly multi-intent) answer.

        Returns everything the answer/stream paths need before generation:
        - ``prompt_items``  : ``[(sub_q, context_text)]`` fed to the one sectioned LLM call.
        - ``durable``       : per-section records to PERSIST (unsigned clips + full doc sources).
        - ``viewer``        : per-section records to SEND now (signed clips + role-gated docs).
        - ``any_resolved``  : True if at least one sub-question is groundable.
        - ``top_score`` / ``sources`` : aggregated across sub-questions.
        Text is filled in later (once generated) into both ``durable`` and ``viewer``.

        ``original_question``, when given, is what the user actually typed (possibly folded
        with a clarification answer) — as opposed to ``sub_q``, which may be an LLM-rewritten
        retrieval query. For a single-section answer (no decomposition split), the visible
        ``topic`` uses ``original_question`` so the section header always shows the user's own
        words, never text they didn't write. A split multi-intent answer keeps ``sub_q`` as the
        topic per section, since those are already synthesized text, not verbatim user input.
        """
        is_admin = _is_admin(user)
        single_section = len(subqs) == 1
        prompt_items: list[tuple[str, str]] = []
        durable: list[dict] = []
        viewer: list[dict] = []
        chunk_ranges: list[dict] = []
        sources: list[str] = []
        any_resolved = False
        top_score = 0.0
        for sub_q, ctx in zip(subqs, contexts):
            topic = original_question if (single_section and original_question) else sub_q
            prompt_items.append((sub_q, ctx.context_text))
            any_resolved = any_resolved or is_resolved(ctx, self._threshold)
            top_score = max(top_score, ctx.top_score)
            sources.extend(ctx.source_ids)
            clip_records = build_clip_records(ctx.video_results)
            await self._stamp_durations(clip_records)
            clips = sign_clips(clip_records, self._signer)
            doc_sources = build_document_sources(ctx.document_results, self._max_document_sources)
            # Discrete per-video chunk ranges, so reconciliation can attribute each cited [MM:SS]
            # to the right video (bug: cross-video reference association).
            chunk_ranges.append(video_chunk_ranges(ctx.video_results))
            durable.append(
                {"topic": topic, "text": "", "video_clips": clip_records,
                 "document_sources": doc_sources}
            )
            viewer.append(
                {"topic": topic, "text": "",
                 "video_clips": clips,  # video names are shown to everyone
                 "document_sources": doc_sources}
            )
        # One current-visibility lookup for every cited doc; used after reconcile to gate
        # viewer cards and redact private titles from viewer-facing text.
        current_public = await self._current_public(self._flatten(durable, "document_sources"))
        for v, d in zip(viewer, durable):
            v["document_sources"] = gate_document_sources(
                d["document_sources"], is_admin, current_public
            )
        return {
            "prompt_items": prompt_items, "durable": durable, "viewer": viewer,
            "chunk_ranges": chunk_ranges,
            "any_resolved": any_resolved, "top_score": top_score, "sources": sources,
            "is_admin": is_admin, "current_public": current_public,
        }

    @staticmethod
    def _gate_and_redact_text(
        text: str,
        docs: list[dict],
        is_admin: bool,
        current_public: dict[str, bool],
        retrieved_docs: list[dict] | None = None,
        context_text: str | None = None,
    ) -> tuple[list[dict], str]:
        """Gate document cards, then strip hidden-doc titles/pages/footnotes from viewer text.

        Cards are gated from ``docs`` (usually the reconciled set). Hidden titles/footnotes
        are taken from ``retrieved_docs`` when given (the full retrieval), so a ``[5]`` cite
        that never repeats the title still redacts — reconcile may have dropped that doc.

        When ``context_text`` is the turn's RAG prompt (``### [N] document Title``), only
        footnote numbers that labeled a hidden document are stripped; public ``[3]`` survives.
        Without context (direct-from-history / callers that omit it), all bare ``[N]`` are
        dropped if any doc is hidden — same safe fallback as history replay.

        Admins get the original text. Persistence keeps the unredacted string.
        """
        gated = gate_document_sources(docs, is_admin, current_public)
        if is_admin:
            return gated, text
        hidden_from = retrieved_docs if retrieved_docs is not None else docs
        hidden = hidden_document_sources(
            hidden_from, gate_document_sources(hidden_from, is_admin, current_public)
        )
        return gated, redact_private_document_refs(
            text, hidden, gated, context_text=context_text
        )

    def _viewer_needs_redaction(self, prep: dict) -> bool:
        """True when this viewer must not see private-doc titles in streamed tokens.

        Retrieval (and current visibility) are known before generation. Live tokens then go
        through :class:`ViewerRedactionBuffer` so prose streams immediately and only an
        unsafe citation tail is held.
        """
        if prep.get("is_admin"):
            return False
        retrieved = self._flatten(prep["durable"], "document_sources")
        if not retrieved:
            return False
        gated = gate_document_sources(
            retrieved, False, prep.get("current_public") or {}
        )
        return bool(hidden_document_sources(retrieved, gated))

    def _viewer_redaction_buffers(self, prep: dict) -> list[ViewerRedactionBuffer] | None:
        """One buffer per section when the viewer must not see private-doc titles."""
        if not self._viewer_needs_redaction(prep):
            return None
        current_public = prep.get("current_public") or {}
        prompt_items = prep.get("prompt_items") or []
        buffers: list[ViewerRedactionBuffer] = []
        for i, section in enumerate(prep["durable"]):
            retrieved = list(section.get("document_sources") or [])
            gated = gate_document_sources(retrieved, False, current_public)
            hidden = hidden_document_sources(retrieved, gated)
            ctx = prompt_items[i][1] if i < len(prompt_items) else None
            buffers.append(ViewerRedactionBuffer(hidden, gated, context_text=ctx))
        return buffers

    def _reconcile_section(self, prep: dict, i: int, text: str) -> None:
        """Reconcile section ``i``'s attached videos/docs against the answer text the LLM actually
        produced. Keeps only videos whose cited ``[MM:SS]`` moments appear in the text (attaching
        each video its own merged ``cited_ranges``) and only documents whose title is mentioned.

        Durable is reconciled first (full sources, unredacted text). Viewer docs are then gated
        from that reconciled set and viewer text has private-document citations stripped, so a
        non-admin never sees a private title/page even when the model cited it.

        A soft-refusal / "no answer" section cites nothing, so this leaves it with NO clips/docs —
        which is exactly what we want (don't show sources for a non-answer)."""
        # Clean up dangling attribution brackets (e.g. "[of]") and stray RAG chunk-index
        # footnotes (e.g. "[2][5]") the model can leave behind, BEFORE reconciling — so both
        # durable and viewer text (and every viewer, admin or not) inherit the fix.
        text = strip_stray_footnotes(
            strip_dangling_citation_artifacts(
                strip_tagged_citation_wrappers(normalize_paren_timestamps(text))
            )
        )
        per_video = self._assign_cited_ranges(text, prep["chunk_ranges"][i])
        durable = prep["durable"][i]
        # Timestamps in the answer with no matching chunk window (empty ranges, missing
        # start_ms) still mean the model grounded on a retrieved video — attach cites to it
        # rather than dropping every clip.
        if not per_video and durable["video_clips"] and parse_cited_ranges(text):
            vid = durable["video_clips"][0].get("video_id")
            if vid:
                per_video = {
                    vid: [
                        {"start_ms": s, "end_ms": e}
                        for s, e in merge_ranges(parse_cited_ranges(text))
                    ]
                }
        retrieved_docs = list(durable["document_sources"])
        durable["video_clips"] = self._reconcile_clips(durable["video_clips"], per_video)
        durable["document_sources"] = self._reconcile_docs(text, retrieved_docs)
        durable["text"] = text

        viewer = prep["viewer"][i]
        viewer["video_clips"] = self._reconcile_clips(viewer["video_clips"], per_video)
        prompt_items = prep.get("prompt_items") or []
        ctx = prompt_items[i][1] if i < len(prompt_items) else None
        gated, viewer_text = self._gate_and_redact_text(
            text, durable["document_sources"],
            prep.get("is_admin", False), prep.get("current_public") or {},
            retrieved_docs=retrieved_docs,
            context_text=ctx,
        )
        viewer["document_sources"] = gated
        viewer["text"] = viewer_text

    @staticmethod
    def _assign_cited_ranges(text: str, chunk_ranges: dict) -> dict[str, list[dict]]:
        """Attribute each cited ``[MM:SS]`` to a retrieved video, then merge per video.

        Prefers the tightest chunk whose span *overlaps* the cited range (±2s). A cite whose
        start sits just outside the retrieved window (e.g. ``[5:02–5:13]`` vs a chunk at
        ``5:08–5:13``) still attaches — matching only the start dropped those clips entirely.
        Cites that overlap nothing are assigned to the nearest retrieved chunk so a timestamped
        answer is not left with no video. Returns ``{video_id: [{start_ms, end_ms}]}``.
        """
        per_video: dict[str, list[tuple[int, int]]] = {}
        unmatched: list[tuple[int, int]] = []
        for cs, ce in parse_cited_ranges(text):
            best_vid, best_width = None, None
            for vid, ranges in chunk_ranges.items():
                for rs, re_ in ranges:
                    if cs <= re_ + 2000 and ce >= rs - 2000:
                        width = re_ - rs
                        if best_width is None or width < best_width:
                            best_vid, best_width = vid, width
            if best_vid is not None:
                per_video.setdefault(best_vid, []).append((cs, ce))
            else:
                unmatched.append((cs, ce))
        for cs, ce in unmatched:
            best_vid, best_dist = None, None
            mid = (cs + ce) // 2
            for vid, ranges in chunk_ranges.items():
                for rs, re_ in ranges:
                    if rs <= mid <= re_:
                        dist = 0
                    else:
                        dist = min(abs(mid - rs), abs(mid - re_))
                    if best_dist is None or dist < best_dist:
                        best_vid, best_dist = vid, dist
            if best_vid is not None:
                per_video.setdefault(best_vid, []).append((cs, ce))
        return {
            vid: [{"start_ms": s, "end_ms": e} for s, e in merge_ranges(rs)]
            for vid, rs in per_video.items()
        }

    @staticmethod
    def _reconcile_clips(clips: list[dict], per_video: dict[str, list[dict]]) -> list[dict]:
        """Keep only clips whose video was actually cited; attach that video's merged cited_ranges."""
        kept: list[dict] = []
        for c in clips:
            ranges = per_video.get(c.get("video_id"))
            if ranges:
                kept.append({**c, "cited_ranges": ranges})
        return kept

    @staticmethod
    def _reconcile_docs(text: str, docs: list[dict]) -> list[dict]:
        """Keep documents whose title is mentioned in the answer text, OR whose cited page
        number(s) match (e.g. "[p. 2-3]") — the model doesn't always repeat the title inline
        alongside a page citation, and a bare page cite must not make the document vanish.
        
        If no documents match by title/page but documents were retrieved, keep the top one
        to handle cases where the LLM refers to documents implicitly (e.g., "the document
        mentioned in my response") without explicit citations. That fallback is skipped for an
        empty or soft-refusal section, which cites nothing and must show no sources at all."""
        low = text.lower()
        cited_pages = parse_cited_pages(text)
        kept: list[dict] = []
        for d in docs:
            title = (d.get("title") or "").strip().lower()
            title_matched = bool(title and title in low)
            page_matched = bool(cited_pages and set(d.get("page_numbers") or []) & cited_pages)
            if title_matched or page_matched:
                kept.append(d)
        # Fallback: if no docs matched but we retrieved some, keep the top one — this handles
        # implicit references like "the document mentioned in my response". A non-answer refers
        # to nothing, so it never gets the fallback.
        if not kept and docs and low.strip() and not _NO_ANSWER_RE.search(low):
            kept.append(docs[0])
        return kept

    @staticmethod
    def _split_section_texts(text: str, n: int) -> list[str]:
        """Split a completed ``@@S{i}@@``-delimited answer into ``n`` section texts."""
        splitter = SectionSplitter()
        acc: dict[int, str] = {}
        for idx, piece in splitter.feed(text) + splitter.flush():
            acc[idx] = acc.get(idx, "") + piece
        return [acc.get(i, "").strip() for i in range(n)]

    @staticmethod
    def _joined_answer(sections: list[dict]) -> str:
        """Flatten sections into one readable string (stored message content / history / title)."""
        if len(sections) == 1:
            return sections[0]["text"]
        return "\n\n".join(f"## {s['topic']}\n{s['text']}".rstrip() for s in sections)

    @staticmethod
    def _flatten(sections: list[dict], key: str) -> list[dict]:
        """Union a per-section list field (e.g. video_clips) for the back-compat top-level field."""
        return [item for s in sections for item in s.get(key, [])]

    async def _timed_complete(
        self, prompt: str, system: str, max_tokens: int, thread_id: str | None, label: str
    ) -> str:
        """``self._llm.complete`` wrapped with start/finish logging — the LLM call is an
        external dependency (provider latency/outage) that can stall; this pinpoints it."""
        start = time.monotonic()
        logger.info("llm.complete_started thread_id=%s label=%s", thread_id, label)
        text = await self._llm.complete(prompt, system=system, max_tokens=max_tokens)
        logger.info(
            "llm.complete_finished thread_id=%s label=%s elapsed_s=%.2f chars=%d",
            thread_id, label, time.monotonic() - start, len(text or ""),
        )
        return text

    async def answer(self, question: str, user=None, thread_id: str | None = None) -> AnswerResult:
        thread_id, recent = await self._prepare_turn(question, user, thread_id)

        smalltalk = detect_smalltalk(question)
        if smalltalk:
            reply = smalltalk_reply(smalltalk)
            await self._persist_assistant(thread_id, reply, {"resolved": True})
            return AnswerResult(answer=reply, resolved=True, thread_id=thread_id)

        if self._is_meta(question, recent):
            # Operate on the prior conversation (full text, no truncation); no RAG, no clips.
            history_full = format_conversation_history(
                recent, max_turns=self._max_history, max_chars_per_turn=None
            )
            system, user_prompt = build_meta_prompt(question, history_full)
            text = await self._timed_complete(
                user_prompt, system, self._max_tokens, thread_id, label="meta"
            )
            await self._persist_assistant(thread_id, text, {"resolved": True, "meta": True})
            return AnswerResult(answer=text, resolved=True, thread_id=thread_id)

        # Resolve a pending clarification, then decide: answer straight from recent
        # conversation (no new retrieval), ask the user to clarify, give up, or go to RAG.
        effective_question, retrieval_question, clarify_text, direct_answer, give_up = \
            await self._plan_retrieval(question, recent, thread_id)
        if clarify_text:
            await self._persist_assistant(
                thread_id, clarify_text, {"resolved": False, "needs_clarification": True}
            )
            return AnswerResult(answer=clarify_text, resolved=False, thread_id=thread_id)

        if give_up:
            escalated = await self._auto_escalate(question, user, thread_id)
            await self._persist_assistant(
                thread_id, CANNOT_ANSWER_MESSAGE, {"resolved": False, "escalated": escalated}
            )
            return AnswerResult(
                answer=CANNOT_ANSWER_MESSAGE, resolved=False,
                sources=[], escalated=escalated, thread_id=thread_id,
            )

        if direct_answer:
            prep = await self._direct_answer_sections(direct_answer, effective_question, recent, user)
            # Persist the FULL composed answer; viewer text may have private-doc citations stripped.
            await self._persist_assistant(
                thread_id, self._joined_answer(prep["durable"]),
                {"sections": prep["durable"], "resolved": True, "escalated": False,
                 "sources": prep["sources"]},
            )
            return AnswerResult(
                answer=self._joined_answer(prep["viewer"]),
                sections=prep["viewer"],
                video_clips=self._flatten(prep["viewer"], "video_clips"),
                document_sources=self._flatten(prep["viewer"], "document_sources"),
                resolved=True, sources=prep["sources"], thread_id=thread_id,
            )

        # Multi-intent: split the prompt, retrieve per sub-question, answer as sections.
        subqs = await self._subquestions(retrieval_question)
        contexts = await self._run_rag_queries(subqs, thread_id)
        prep = await self._prepare_sections(subqs, contexts, user, original_question=effective_question)

        if not prep["any_resolved"]:
            escalated = await self._auto_escalate(question, user, thread_id)
            await self._persist_assistant(
                thread_id, CANNOT_ANSWER_MESSAGE, {"resolved": False, "escalated": escalated}
            )
            return AnswerResult(
                answer=CANNOT_ANSWER_MESSAGE, resolved=False,
                sources=prep["sources"], escalated=escalated, thread_id=thread_id,
            )

        history = format_conversation_history(recent)
        system, user_prompt = build_sectioned_prompt(prep["prompt_items"], conversation_history=history)
        max_tokens = min(self._max_tokens * len(subqs), _MAX_ANSWER_TOKENS)
        text = await self._timed_complete(user_prompt, system, max_tokens, thread_id, label="sectioned")
        for i, section_text in enumerate(self._split_section_texts(text, len(subqs))):
            # Keep only the videos/docs this section's text actually cites (bug: sources shown that
            # the answer never used / on a "no answer" reply), each video with its own cited_ranges.
            # Reconcile writes durable (full text) and viewer (redacted for non-admins).
            self._reconcile_section(prep, i, section_text)

        # Persist FULL per-section sources + unredacted text so history re-filters per viewer.
        await self._persist_assistant(
            thread_id, self._joined_answer(prep["durable"]),
            {"sections": prep["durable"], "resolved": True, "escalated": False,
             "sources": prep["sources"]},
        )
        return AnswerResult(
            answer=self._joined_answer(prep["viewer"]),
            sections=prep["viewer"],
            video_clips=self._flatten(prep["viewer"], "video_clips"),
            document_sources=self._flatten(prep["viewer"], "document_sources"),
            resolved=True, sources=prep["sources"], thread_id=thread_id,
        )

    async def stream_answer(
        self, question: str, user=None, thread_id: str | None = None
    ) -> AsyncIterator[dict]:
        """Stream the same pipeline as :meth:`answer`, token-by-token, persisting the turn."""
        turn_start = time.monotonic()
        thread_id, recent = await self._prepare_turn(question, user, thread_id)
        logger.info(
            "chat.stream_started thread_id=%s question_len=%d elapsed_s=%.2f",
            thread_id, len(question), time.monotonic() - turn_start,
        )

        # Announce the (resolved/created) thread id FIRST, before any tokens. The client adopts
        # it immediately so a follow-up prompt continues this same thread even if the turn is
        # cancelled mid-stream or the final ``done`` frame is lost — otherwise each prompt would
        # start a brand-new thread.
        if thread_id:
            yield {"type": "thread", "thread_id": thread_id}

        smalltalk = detect_smalltalk(question)
        if smalltalk:
            reply = smalltalk_reply(smalltalk)
            yield {"type": "token", "data": reply}
            await self._persist_assistant(thread_id, reply, {"resolved": True})
            metadata = {
                "video_clips": [], "document_sources": [], "resolved": True,
                "sources": [], "escalated": False, "thread_id": thread_id}
            _log_done(thread_id, "smalltalk", metadata, time.monotonic() - turn_start)
            yield {"type": "done", "metadata": metadata}
            logger.info(
                "chat.stream_finished thread_id=%s label=smalltalk total_elapsed_s=%.2f",
                thread_id, time.monotonic() - turn_start,
            )
            return

        if self._is_meta(question, recent):
            history_full = format_conversation_history(
                recent, max_turns=self._max_history, max_chars_per_turn=None
            )
            system, user_prompt = build_meta_prompt(question, history_full)
            parts: list[str] = []
            llm_start = time.monotonic()
            logger.info("llm.stream_started thread_id=%s label=meta", thread_id)
            async for token in self._llm.stream(user_prompt, system=system, max_tokens=self._max_tokens):
                if token:
                    parts.append(token)
                    yield {"type": "token", "data": token}
            logger.info(
                "llm.stream_finished thread_id=%s label=meta elapsed_s=%.2f chars=%d",
                thread_id, time.monotonic() - llm_start, sum(len(p) for p in parts),
            )
            await self._persist_assistant(thread_id, "".join(parts), {"resolved": True, "meta": True})
            metadata = {
                "video_clips": [], "document_sources": [], "resolved": True,
                "sources": [], "escalated": False, "thread_id": thread_id}
            _log_done(thread_id, "meta", metadata, time.monotonic() - turn_start)
            yield {"type": "done", "metadata": metadata}
            logger.info(
                "chat.stream_finished thread_id=%s label=meta total_elapsed_s=%.2f",
                thread_id, time.monotonic() - turn_start,
            )
            return

        # Resolve a pending clarification, then decide: answer straight from recent
        # conversation (no new retrieval), ask the user to clarify, give up, or go to RAG.
        effective_question, retrieval_question, clarify_text, direct_answer, give_up = \
            await self._plan_retrieval(question, recent, thread_id)

        if clarify_text:
            yield {"type": "token", "data": clarify_text}
            await self._persist_assistant(
                thread_id, clarify_text, {"resolved": False, "needs_clarification": True}
            )
            metadata = {
                "video_clips": [], "document_sources": [], "resolved": False,
                "sources": [], "escalated": False, "thread_id": thread_id}
            _log_done(thread_id, "clarify", metadata, time.monotonic() - turn_start)
            yield {"type": "done", "metadata": metadata}
            logger.info(
                "chat.stream_finished thread_id=%s label=clarify total_elapsed_s=%.2f",
                thread_id, time.monotonic() - turn_start,
            )
            return

        if give_up:
            escalated = await self._auto_escalate(question, user, thread_id)
            yield {"type": "token", "data": CANNOT_ANSWER_MESSAGE}
            await self._persist_assistant(
                thread_id, CANNOT_ANSWER_MESSAGE, {"resolved": False, "escalated": escalated}
            )
            metadata = {
                "video_clips": [], "document_sources": [], "sections": [], "resolved": False,
                "sources": [], "escalated": escalated, "thread_id": thread_id}
            _log_done(thread_id, "clarify_capped_giving_up", metadata, time.monotonic() - turn_start)
            yield {"type": "done", "metadata": metadata}
            logger.info(
                "chat.stream_finished thread_id=%s label=clarify_capped_giving_up total_elapsed_s=%.2f",
                thread_id, time.monotonic() - turn_start,
            )
            return

        if direct_answer:
            # Redact before the first token — this path already has the full answer.
            prep = await self._direct_answer_sections(direct_answer, effective_question, recent, user)
            yield {"type": "token", "data": self._joined_answer(prep["viewer"])}
            await self._persist_assistant(
                thread_id, self._joined_answer(prep["durable"]),
                {"sections": prep["durable"], "resolved": True, "escalated": False,
                 "sources": prep["sources"]},
            )
            metadata = {
                "sections": prep["viewer"],
                "video_clips": self._flatten(prep["viewer"], "video_clips"),
                "document_sources": self._flatten(prep["viewer"], "document_sources"),
                "resolved": True, "sources": prep["sources"], "escalated": False,
                "thread_id": thread_id}
            _log_done(thread_id, "answered_from_history", metadata, time.monotonic() - turn_start)
            yield {"type": "done", "metadata": metadata}
            logger.info(
                "chat.stream_finished thread_id=%s label=answered_from_history total_elapsed_s=%.2f",
                thread_id, time.monotonic() - turn_start,
            )
            return

        # Multi-intent: split the prompt, retrieve per sub-question, stream one section each.
        logger.info("decompose.started thread_id=%s", thread_id)
        subqs = await self._subquestions(retrieval_question)
        logger.info("decompose.finished thread_id=%s subquestions=%d", thread_id, len(subqs))
        contexts = await self._run_rag_queries(subqs, thread_id)
        logger.info("chat.prepare_sections_started thread_id=%s subquestions=%d", thread_id, len(subqs))
        prep = await self._prepare_sections(subqs, contexts, user, original_question=effective_question)
        logger.info(
            "chat.prepare_sections_finished thread_id=%s any_resolved=%s sources=%d",
            thread_id, prep["any_resolved"], len(prep["sources"]),
        )

        if not prep["any_resolved"]:
            escalated = await self._auto_escalate(question, user, thread_id)
            yield {"type": "token", "data": CANNOT_ANSWER_MESSAGE}
            await self._persist_assistant(
                thread_id, CANNOT_ANSWER_MESSAGE, {"resolved": False, "escalated": escalated}
            )
            metadata = {
                "video_clips": [], "document_sources": [], "sections": [], "resolved": False,
                "sources": prep["sources"], "escalated": escalated, "thread_id": thread_id}
            _log_done(thread_id, "unresolved", metadata, time.monotonic() - turn_start)
            yield {"type": "done", "metadata": metadata}
            logger.info(
                "chat.stream_finished thread_id=%s label=unresolved total_elapsed_s=%.2f",
                thread_id, time.monotonic() - turn_start,
            )
            return

        # Announce the section TOPICS so the client can lay the answer out; the section texts
        # stream in next as {type:"token", section:i}. Sources are deliberately NOT sent here:
        # at this point they are the raw retrieval set, before reconciliation drops the videos
        # the answer never ends up citing and attaches each kept one its `cited_ranges`. Shipping
        # that set early meant a client whose `done` frame went missing (the frame is dropped by
        # the proxy in front of Cloud Run on most staging turns) was left showing phantom videos
        # with no "referenced at" moments — forever. Clips/doc-sources ride on `done` only.
        yield {"type": "sections", "sections": [
            {"index": i, "topic": s["topic"]} for i, s in enumerate(prep["viewer"])
        ]}

        history = format_conversation_history(recent)
        system, user_prompt = build_sectioned_prompt(prep["prompt_items"], conversation_history=history)
        max_tokens = min(self._max_tokens * len(subqs), _MAX_ANSWER_TOKENS)
        splitter = SectionSplitter()
        section_texts = [""] * len(subqs)
        # Private titles are known from retrieval. Stream redacted prose live; hold only an
        # unsafe citation tail so the client is not blocked on the full generation.
        buffers = self._viewer_redaction_buffers(prep)

        llm_start = time.monotonic()
        logger.info("llm.stream_started thread_id=%s label=sectioned", thread_id)
        async for token in self._llm.stream(user_prompt, system=system, max_tokens=max_tokens):
            if not token:
                continue
            for idx, piece in splitter.feed(token):
                if 0 <= idx < len(section_texts):
                    section_texts[idx] += piece
                    if buffers is None:
                        yield {"type": "token", "section": idx, "data": piece}
                    else:
                        delta = buffers[idx].feed(piece)
                        if delta:
                            yield {"type": "token", "section": idx, "data": delta}
        for idx, piece in splitter.flush():
            if 0 <= idx < len(section_texts):
                section_texts[idx] += piece
                if buffers is None:
                    yield {"type": "token", "section": idx, "data": piece}
                else:
                    delta = buffers[idx].feed(piece)
                    if delta:
                        yield {"type": "token", "section": idx, "data": delta}
        if buffers is not None:
            for idx, buf in enumerate(buffers):
                delta = buf.flush()
                if delta:
                    yield {"type": "token", "section": idx, "data": delta}
        logger.info(
            "llm.stream_finished thread_id=%s label=sectioned elapsed_s=%.2f chars=%d",
            thread_id, time.monotonic() - llm_start, sum(len(t) for t in section_texts),
        )

        for i, section_text in enumerate(section_texts):
            stripped = section_text.strip()
            # Reconcile attachments against the generated text (see answer() for rationale). The
            # `done` frame below therefore carries only cited videos/docs; the client's onDone
            # replaces the earlier scaffolding sections with this authoritative set (redacted
            # text for non-admins). Persist the unredacted durable text.
            self._reconcile_section(prep, i, stripped)
        logger.info("chat.reconcile_finished thread_id=%s sections=%d", thread_id, len(section_texts))
        # Clips/docs are known here. Send them before persist so a slow DB write (or a dropped
        # `done` frame) does not leave timestamp cites in the text with no player. Apply this
        # frame the same way as ``done.metadata`` (``video_clips`` / ``document_sources`` /
        # ``sections``).
        yield {
            "type": "attachments",
            "sections": prep["viewer"],
            "video_clips": self._flatten(prep["viewer"], "video_clips"),
            "document_sources": self._flatten(prep["viewer"], "document_sources"),
        }
        await self._persist_assistant(
            thread_id, self._joined_answer(prep["durable"]),
            {"sections": prep["durable"], "resolved": True, "escalated": False,
             "sources": prep["sources"]},
        )
        metadata = {
            "sections": prep["viewer"],
            "video_clips": self._flatten(prep["viewer"], "video_clips"),
            "document_sources": self._flatten(prep["viewer"], "document_sources"),
            "resolved": True, "sources": prep["sources"], "escalated": False,
            "thread_id": thread_id}
        _log_done(thread_id, "sectioned", metadata, time.monotonic() - turn_start)
        yield {"type": "done", "metadata": metadata}
        logger.info(
            "chat.stream_finished thread_id=%s label=sectioned total_elapsed_s=%.2f",
            thread_id, time.monotonic() - turn_start,
        )

    async def _auto_escalate(self, question: str, user, thread_id: str | None) -> bool:
        """Auto-escalate an unresolved turn (guardrails live in the escalation service)."""
        if self._escalation is None or user is None:
            return False
        transcript = f"Q: {question}\nA: {CANNOT_ANSWER_MESSAGE}"
        outcome = await self._escalation.maybe_escalate(
            user, thread_id or user.id, transcript, resolved=False, is_transient_error=False
        )
        return outcome.sent
