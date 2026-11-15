from __future__ import annotations

import asyncio
import contextvars
import logging
import re
from typing import Any

from agents.state import NegotiationState, NodeFn
from application.services.rag_service import RAGService
from domain.entities.rag_context import RAGContext

logger = logging.getLogger(__name__)

# Set this context var to an already-running asyncio.Task[RAGContext] before
# invoking the graph.  The rag_query node will await the running task instead
# of starting a fresh retrieval, hiding RAG latency behind the intent
# classification call.
rag_prefetch_task: contextvars.ContextVar[asyncio.Task | None] = contextvars.ContextVar(
    "rag_prefetch_task", default=None
)


# Legal-form tails a supplier name carries in the data but not always in a
# message: "Adp, Inc", "U.S. Foodservice, Inc.", "Arla Foods amba".
_LEGAL_FORM = (
    r"(?:,?\s+(?:inc|incorporated|corp|corporation|co|company|ltd|limited|llc|llp|plc|"
    r"gmbh|ag|sa|s\.a|nv|bv|srl|spa|pty|amba|oy|ab|as)\b\.?)*"
)
# The preposition that attaches the name ("for Adp", "with U.S. Foodservice").
_NAME_LINK = r"(?:\b(?:for|with|of|to|at|from|by|about)\s+)?"
_MIN_NAME_CHARS = 3


def strip_supplier_name(query: str, supplier_name: str | None) -> str:
    """The retrieval query without this supplier's name in it.

    The knowledge base is generic — definitions, the client's playbook, concept
    notes — and never mentions the supplier, so the name only pulls the query
    away from the passage. Measured on the live KB: "what is the scf rate"
    retrieved 4 chunks, "what is the scf rate for U.S. Foodservice, Inc" 0; the
    name cost the cross-encoder 3.6-6.4 logits on every pair tried. The
    classifier's rewrite adds the name on some turns and not others, which is
    why the same question could come back grounded one time and not the next.
    Only the SEARCH changes — the question the model answers keeps the name.
    """
    if not supplier_name:
        return query
    core = re.sub(_LEGAL_FORM + r"\s*$", "", supplier_name.strip(), flags=re.IGNORECASE).strip(" ,.")
    if len(core) < _MIN_NAME_CHARS:
        return query
    pattern = rf"{_NAME_LINK}(?<!\w){re.escape(core)}{_LEGAL_FORM}(?:'s)?(?!\w)"
    stripped = re.sub(pattern, " ", query, flags=re.IGNORECASE)
    stripped = re.sub(r"\s+([?.!,;:])", r"\1", re.sub(r"\s{2,}", " ", stripped)).strip()
    return stripped or query


def make_rag_query_node(rag_service: RAGService) -> NodeFn:
    """Build the shared RAG query node.

    Runs after intent classification for all substantive intents.  Retrieves
    relevant knowledge-base chunks, reranks them, and stores the formatted
    :class:`RAGContext` in the graph state so every downstream node can inject
    it into its prompt without directly coupling to the RAG pipeline.

    Failures are caught and logged; nodes receive an empty RAGContext and
    degrade gracefully to FACTS + ANALYSIS only.
    """

    async def rag_query_node(state: NegotiationState) -> dict[str, Any]:
        message = state.get("message", "")
        # Search the KB with the classifier's standalone rewrite when it produced
        # one. `resolved_question` is already validated and length-capped in
        # LLMIntentClassifier, and it is None whenever the rewrite matched what the
        # negotiator typed — so this only bites on follow-ups, where "why?" would
        # otherwise be embedded as the literal string "why?".
        resolved = (state.get("resolved_question") or "").strip()
        retrieval_query = resolved or message
        # "who are you?" embeds as nothing about Calculum. Name the subject so the
        # search finds the KB's material on it, and skip the prefetch, which ran
        # on the bare message before the classifier said what it was about.
        about_assistant = bool(state.get("about_assistant"))
        context = state.get("context")
        facts = getattr(context, "facts", None)
        retrieval_query = strip_supplier_name(
            retrieval_query, getattr(facts, "supplier_name", None)
        )
        if about_assistant:
            retrieval_query = f"Calculum AI assistant: {retrieval_query}"
        if resolved and resolved != message:
            logger.info(
                "rag_query: retrieving with resolved_question=%r (message was %r)",
                resolved[:120],
                message[:80],
            )

        prefetch = rag_prefetch_task.get()
        if about_assistant and prefetch is not None:
            prefetch.cancel()
            prefetch = None
        try:
            if prefetch is not None:
                # Pre-fetch was started concurrently with intent classification —
                # just await the already-running task. Note it cannot have used
                # `resolved_question`: the classifier had not run when it started.
                rag_context = await prefetch
                logger.info(
                    "rag_query: used pre-fetched result — %d chunk(s) for query=%r",
                    rag_context.chunk_count,
                    message[:80],
                )
            else:
                rag_context = await rag_service.query(retrieval_query)
                logger.info(
                    "rag_query: %d chunk(s) retrieved (status=%s) for query=%r",
                    rag_context.chunk_count,
                    rag_context.status,
                    retrieval_query[:80],
                )
        except Exception:
            # ERROR + stack trace, not a one-line WARNING. This branch swallowed a
            # misconfigured collection name for months: retrieval raised on every
            # single query, the node returned an empty context, and downstream it
            # was indistinguishable from "the KB had nothing to say".
            logger.exception(
                "[RAG_FAILURE] rag_query: retrieval failed, continuing without KB "
                "context (query=%r)",
                retrieval_query[:80],
            )
            rag_context = RAGContext(
                context_text="",
                source_ids=[],
                chunk_count=0,
                query=retrieval_query,
                status="failed",
            )

        # NOTE: the retrieved KB block is no longer blanket-dropped when it
        # mentions SCF and SCF is disabled for this session — that was
        # discarding whole chunks (including SCF-unrelated content pulled in
        # by chunk-boundary overlap) over one leftover sentence. The other SCF
        # guards still apply downstream: `maybe_suppress_scf` on the node's
        # system prompt instructs the model to never mention/propose SCF, and
        # `enforce_scf_output_policy` is the output-side backstop.
        raw_sources = list(rag_context.chunk_file_info)
        logger.info(
            "[RAG_SOURCES] chunk_count=%d chunk_file_info=%d entries: %s",
            rag_context.chunk_count,
            len(raw_sources),
            [{"file_id": s["file_id"], "pages": s["page_numbers"]} for s in raw_sources],
        )


        result: dict[str, Any] = {
            "rag_context": rag_context,
            "rag_sources": raw_sources,
        }
        if rag_context.status in ("failed", "timeout"):
            result["errors"] = [f"rag_query: retrieval {rag_context.status}"]
        return result

    return rag_query_node
