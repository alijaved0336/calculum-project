import asyncio

import application.agent.support_agent as support_agent_mod
from application.agent.support_agent import SupportAgent
from domain.entities.rag_context import RAGContext
from domain.entities.retrieval_result import RetrievalResult
from domain.entities.user import User


class _FakeRag:
    def __init__(self, ctx):
        self._ctx = ctx
        self.queried = False
        self.queries: list[str] = []

    async def query(self, q):
        self.queried = True
        self.queries.append(q)
        return self._ctx


class _FakeLLM:
    def __init__(self, text):
        self._text = text
        self.called = False
        self.streamed = False
        self.prompts = []

    async def complete(self, prompt, system=None, max_tokens=1024):
        self.called = True
        self.prompts.append(prompt)
        return self._text

    async def stream(self, prompt, system=None, max_tokens=1024):
        self.streamed = True
        self.prompts.append(prompt)
        for word in self._text.split(" "):
            yield word + " "


class _FakeChatStore:
    """Duck-typed chat store: records create/save; serves canned threads + recent msgs."""

    def __init__(self, threads=None, recent=None):
        self.created = []
        self.saved = []
        self._threads = dict(threads or {})
        self._recent = recent or []

    async def create_thread(self, user_uuid, title):
        tid = f"t{len(self.created) + 1}"
        self.created.append({"user_uuid": user_uuid, "title": title, "thread_id": tid})
        self._threads[tid] = {"thread_id": tid, "user_uuid": user_uuid, "title": title}
        return self._threads[tid]

    async def get_thread(self, thread_id):
        return self._threads.get(thread_id)

    async def get_recent_messages(self, thread_id, limit):
        return list(self._recent)

    async def save_message(self, thread_id, role, content, metadata=None):
        self.saved.append({"thread_id": thread_id, "role": role, "content": content, "metadata": metadata})
        return {"message_id": f"m{len(self.saved)}"}


class _User:
    def __init__(self, id):
        self.id = id


def _ctx_with_video():
    r = RetrievalResult(id="c1", score=0.9, text="auth", video_id="v1",
                        start_ms=1000, end_ms=3000, gcs_object="videos/v1.mp4", title="T")
    return RAGContext(
        context_text="### [1] video T — [00:01–00:03]\nauth",
        source_ids=["c1"], chunk_count=1, query="q", video_results=[r], top_score=0.9,
    )


def _doc_chunk(id, file_id, title, pages, is_public=True):
    return RetrievalResult(
        id=id, score=0.8, text=f"doc-{id}", source_type="document", title=title,
        metadata={"file_id": file_id, "chunk_source": "document", "title": title,
                  "page_numbers": pages, "is_public": is_public},
    )


def _ctx_hybrid():
    v = RetrievalResult(id="c1", score=0.9, text="auth", video_id="v1",
                        start_ms=1000, end_ms=3000, gcs_object="videos/v1.mp4", title="T")
    d = _doc_chunk("d1c1", "docA", "Billing Guide", [3, 4])
    return RAGContext(
        context_text="### [1] video T — [00:01–00:03]\nauth\n### [2] document Billing Guide — p. 3, 4\nfees",
        source_ids=["c1", "d1c1"], chunk_count=2, query="q",
        video_results=[v], document_results=[d], top_score=0.9,
    )


def _ctx_mixed_visibility():
    pub = _doc_chunk("d1c1", "docA", "Billing Guide", [3, 4], is_public=True)
    priv = _doc_chunk("d2c1", "docB", "Internal Payroll Policy", [9], is_public=False)
    return RAGContext(
        context_text=(
            "### [1] document Billing Guide — p. 3, 4\nfees\n"
            "### [2] document Internal Payroll Policy — p. 9\nwithhold"
        ),
        source_ids=["d1c1", "d2c1"], chunk_count=2, query="q",
        video_results=[], document_results=[pub, priv], top_score=0.9,
    )


_MIXED_ANSWER = (
    "According to the Billing Guide, p. 3, fees apply. "
    "According to Internal Payroll Policy, p. 9, withhold tax."
)


def _ctx_docs_only():
    d = _doc_chunk("d1c1", "docA", "Refund Policy", [1])
    return RAGContext(
        context_text="### [1] document Refund Policy — p. 1\nrefunds",
        source_ids=["d1c1"], chunk_count=1, query="q",
        video_results=[], document_results=[d], top_score=0.8,
    )


def _agent(rag, llm, chat_store=None):
    return SupportAgent(rag_service=rag, llm_client=llm, signer=lambda o: f"https://s/{o}",
                        answerable_threshold=0.5, chat_store=chat_store)


class _HangingChatStore(_FakeChatStore):
    """A chat store whose save_message never returns — simulates a stalled DB connection."""

    async def save_message(self, thread_id, role, content, metadata=None):
        if role == "assistant":
            await asyncio.sleep(3600)  # would hang the stream forever without a timeout
        return await super().save_message(thread_id, role, content, metadata=metadata)


async def test_persist_assistant_times_out_instead_of_hanging_forever(monkeypatch):
    # A stalled DB write on the assistant-reply persist must not block the response/stream
    # indefinitely (bug: staging sockets dying mid-answer with no `done` frame). Bound the
    # timeout tightly so the test itself stays fast.
    monkeypatch.setattr(support_agent_mod, "_PERSIST_TIMEOUT_S", 0.05)
    llm = _FakeLLM("SSO is under Settings [00:01–00:03]")
    store = _HangingChatStore(threads={"t1": {"thread_id": "t1", "user_uuid": None}})
    agent = _agent(_FakeRag(_ctx_with_video()), llm, chat_store=store)

    res = await asyncio.wait_for(
        agent.answer("how do I enable SSO?", user=None, thread_id="t1"), timeout=2.0
    )
    assert res.resolved is True
    assert "Settings" in res.answer


async def test_answer_resolved_returns_answer_and_clips():
    llm = _FakeLLM("SSO is under Settings [00:01–00:03]")
    res = await _agent(_FakeRag(_ctx_with_video()), llm).answer("how do I enable SSO?", user=None)
    assert res.resolved is True
    assert res.video_clips and res.video_clips[0]["video_id"] == "v1"
    assert res.document_sources == []                                 # video-only → no doc citations
    assert "Settings" in res.answer
    assert res.sources == ["c1"]
    assert llm.called is True


async def test_answer_hybrid_returns_both_clip_and_document_sources():
    # The answer cites the video moment and mentions the doc title, so both are kept.
    llm = _FakeLLM("See [00:02]. According to the Billing Guide, fees apply.")
    res = await _agent(_FakeRag(_ctx_hybrid()), llm).answer("q", user=None)
    assert res.video_clips and res.video_clips[0]["video_id"] == "v1"
    assert res.document_sources == [
        {"document_id": "docA", "title": "Billing Guide", "page_numbers": [3, 4], "is_public": True}
    ]


async def test_answer_documents_only_has_sources_and_no_clip():
    res = await _agent(_FakeRag(_ctx_docs_only()), _FakeLLM("Per the Refund Policy, refunds apply.")).answer("q", user=None)
    assert res.video_clips == []
    assert res.document_sources[0]["document_id"] == "docA"
    assert res.resolved is True


async def test_answer_keeps_document_cited_by_page_only_no_title():
    # Bug: the model sometimes cites a page without repeating "According to <title>" inline
    # (e.g. "...cash flow [p. 1]." instead of "...cash flow [Refund Policy, p. 1]."). The
    # document must still show up as a source — dropping it just because the title wasn't
    # repeated silently hides a citation the answer clearly makes.
    res = await _agent(_FakeRag(_ctx_docs_only()), _FakeLLM("You can free up cash flow [p. 1].")).answer(
        "q", user=None
    )
    assert res.document_sources and res.document_sources[0]["document_id"] == "docA"


async def test_answer_unresolved_no_clips_and_skips_llm():
    llm = _FakeLLM("must not be used")
    empty = RAGContext(context_text="", source_ids=[], chunk_count=0, query="q",
                       video_results=[], top_score=0.0)
    res = await _agent(_FakeRag(empty), llm).answer("unrelated?", user=None)
    assert res.resolved is False
    assert res.video_clips == []
    assert llm.called is False


async def test_greeting_short_circuits_before_rag():
    llm = _FakeLLM("must not be used")
    rag = _FakeRag(_ctx_with_video())
    res = await _agent(rag, llm).answer("hi there", user=None)
    assert res.resolved is True          # handled, so no escalation notice
    assert res.video_clips == []         # no clip for small talk
    assert res.escalated is False
    assert rag.queried is False          # RAG pipeline not run
    assert llm.called is False           # LLM not called
    assert "Calculum" in res.answer


async def _collect(agen):
    return [ev async for ev in agen]


async def test_stream_answer_resolved_streams_tokens_then_done_with_clips():
    llm = _FakeLLM("SSO is under Settings [00:02]")
    events = await _collect(
        _agent(_FakeRag(_ctx_with_video()), llm).stream_answer("how?", user=None)
    )
    tokens = [e for e in events if e["type"] == "token"]
    done = next(e for e in events if e["type"] == "done")
    assert llm.streamed is True
    assert "".join(t["data"] for t in tokens).strip() == "SSO is under Settings [00:02]"
    assert done["metadata"]["resolved"] is True
    assert done["metadata"]["video_clips"][0]["video_id"] == "v1"
    # The cited [00:02] is attached to this video as a merged cited range.
    assert done["metadata"]["video_clips"][0]["cited_ranges"] == [{"start_ms": 2000, "end_ms": 2000}]
    assert done["metadata"]["sources"] == ["c1"]


async def test_stream_answer_greeting_streams_reply_without_rag():
    llm = _FakeLLM("must not be used")
    rag = _FakeRag(_ctx_with_video())
    events = await _collect(_agent(rag, llm).stream_answer("hello!", user=None))
    done = next(e for e in events if e["type"] == "done")
    assert any(e["type"] == "token" for e in events)
    assert done["metadata"]["resolved"] is True
    assert done["metadata"]["video_clips"] == []
    assert rag.queried is False and llm.streamed is False


async def test_stream_answer_unresolved_emits_cannot_answer_and_no_clips():
    llm = _FakeLLM("must not be used")
    empty = RAGContext(context_text="", source_ids=[], chunk_count=0, query="q",
                       video_results=[], top_score=0.0)
    events = await _collect(_agent(_FakeRag(empty), llm).stream_answer("unrelated?", user=None))
    done = next(e for e in events if e["type"] == "done")
    assert llm.streamed is False
    assert done["metadata"]["resolved"] is False
    assert done["metadata"]["video_clips"] == []
    assert any(e["type"] == "token" for e in events)  # cannot-answer message is streamed


async def test_stream_answer_emits_thread_frame_first():
    """The FIRST streamed frame carries the (created) thread id, before any token — so the
    client adopts it even if the turn is cancelled or the `done` frame is lost."""
    store = _FakeChatStore()
    llm = _FakeLLM("SSO is under Settings")
    events = await _collect(
        _agent(_FakeRag(_ctx_with_video()), llm, chat_store=store).stream_answer(
            "how?", user=_User("u1"), thread_id=None
        )
    )
    tid = store.created[0]["thread_id"]
    assert events[0] == {"type": "thread", "thread_id": tid}   # very first frame
    first_token_idx = next(i for i, e in enumerate(events) if e["type"] == "token")
    assert first_token_idx > 0                                  # nothing before the thread frame


async def test_stream_answer_thread_frame_reuses_existing_thread():
    tid = "t7"
    store = _FakeChatStore(threads={tid: {"thread_id": tid, "user_uuid": "u1"}})
    llm = _FakeLLM("ok")
    events = await _collect(
        _agent(_FakeRag(_ctx_with_video()), llm, chat_store=store).stream_answer(
            "how?", user=_User("u1"), thread_id=tid
        )
    )
    assert events[0] == {"type": "thread", "thread_id": tid}
    assert store.created == []                                  # reused, not recreated


# ── Chat persistence + multi-turn memory ─────────────────────────────────────

import pytest

from application.agent.support_agent import ThreadAccessError


async def test_new_thread_created_and_turn_persisted():
    store = _FakeChatStore()
    llm = _FakeLLM("SSO is under Settings")
    res = await _agent(_FakeRag(_ctx_with_video()), llm, chat_store=store).answer(
        "how do I enable SSO?", user=_User("u1"), thread_id=None
    )
    assert len(store.created) == 1                       # a thread was created
    assert res.thread_id == store.created[0]["thread_id"]
    roles = [m["role"] for m in store.saved]
    assert roles == ["user", "assistant"]                # both turns persisted
    assert store.saved[1]["metadata"]["resolved"] is True


async def test_existing_thread_loads_memory_into_prompt():
    tid = "t9"
    store = _FakeChatStore(
        threads={tid: {"thread_id": tid, "user_uuid": "u1"}},
        recent=[{"role": "user", "content": "what is SSO?"},
                {"role": "assistant", "content": "single sign-on"}],
    )
    llm = _FakeLLM("Here you go")
    res = await _agent(_FakeRag(_ctx_with_video()), llm, chat_store=store).answer(
        "and how do I enable it?", user=_User("u1"), thread_id=tid
    )
    assert store.created == []                            # no new thread
    assert res.thread_id == tid
    assert "RECENT CONVERSATION" in llm.prompts[0]        # memory fed to the LLM
    assert "single sign-on" in llm.prompts[0]


async def test_foreign_thread_is_rejected():
    tid = "t9"
    store = _FakeChatStore(threads={tid: {"thread_id": tid, "user_uuid": "someone-else"}})
    with pytest.raises(ThreadAccessError):
        await _agent(_FakeRag(_ctx_with_video()), _FakeLLM("x"), chat_store=store).answer(
            "q", user=_User("u1"), thread_id=tid
        )


async def test_unknown_thread_is_rejected():
    store = _FakeChatStore()
    with pytest.raises(ThreadAccessError):
        await _agent(_FakeRag(_ctx_with_video()), _FakeLLM("x"), chat_store=store).answer(
            "q", user=_User("u1"), thread_id="does-not-exist"
        )


async def test_smalltalk_still_persists():
    store = _FakeChatStore()
    res = await _agent(_FakeRag(_ctx_with_video()), _FakeLLM("x"), chat_store=store).answer(
        "hi there", user=_User("u1"), thread_id=None
    )
    assert len(store.created) == 1
    assert [m["role"] for m in store.saved] == ["user", "assistant"]
    assert res.thread_id == store.created[0]["thread_id"]


async def test_stream_persists_assembled_answer_at_done():
    store = _FakeChatStore()
    agent = _agent(_FakeRag(_ctx_with_video()), _FakeLLM("SSO is under Settings"), chat_store=store)
    events = await _collect(agent.stream_answer("how?", user=_User("u1"), thread_id=None))
    done = next(e for e in events if e["type"] == "done")
    assert done["metadata"]["thread_id"] == store.created[0]["thread_id"]
    assistant = [m for m in store.saved if m["role"] == "assistant"]
    assert assistant and assistant[0]["content"].strip() == "SSO is under Settings"


async def test_persisted_clips_are_durable_records_not_signed_urls():
    store = _FakeChatStore()
    res = await _agent(_FakeRag(_ctx_with_video()), _FakeLLM("answer [00:02]"), chat_store=store).answer(
        "how?", user=_User("u1"), thread_id=None
    )
    # live response has a freshly-signed URL (flattened across sections)
    assert res.video_clips[0]["video_url"].startswith("https://s/")
    # but what's PERSISTED is the durable record per section: gcs_object, no video_url
    meta = [m for m in store.saved if m["role"] == "assistant"][0]["metadata"]
    stored = meta["sections"][0]["video_clips"]
    assert stored[0]["gcs_object"] == "videos/v1.mp4"
    assert "video_url" not in stored[0]


# ── Multi-intent decomposition → sectioned answer ────────────────────────────

class _MapRag:
    def __init__(self, by_query):
        self._by = by_query

    async def query(self, q):
        return self._by[q]


class _ScriptedLLM:
    """Split call → JSON sub-questions; answer call → a @@S{i}@@-delimited multi-section reply."""

    def __init__(self, subquestions, section_texts):
        import json
        self._subs_json = json.dumps(subquestions)
        self._answer = "".join(f"@@S{i + 1}@@{t}" for i, t in enumerate(section_texts))

    def _is_split(self, system):
        return "split" in (system or "").lower()

    async def complete(self, prompt, system=None, max_tokens=1024):
        return self._subs_json if self._is_split(system) else self._answer

    async def stream(self, prompt, system=None, max_tokens=1024):
        for ch in self._answer:
            yield ch


def _video_ctx(vid, title):
    r = RetrievalResult(id=f"c-{vid}", score=0.9, text=title, video_id=vid,
                        start_ms=1000, end_ms=3000, gcs_object=f"videos/{vid}.mp4", title=title)
    return RAGContext(context_text=f"### [1] video {title}", source_ids=[f"c-{vid}"],
                      chunk_count=1, query="q", video_results=[r], top_score=0.9)


async def test_multi_intent_answer_has_one_section_per_subquestion():
    subs = ["how to apply global filters", "list the negotiation tones"]
    rag = _MapRag({subs[0]: _video_ctx("v1", "Filters"), subs[1]: _video_ctx("v2", "Tones")})
    # Each section cites its own video's moment, so each keeps its own clip.
    llm = _ScriptedLLM(subs, ["Use the filter panel. [00:02]", "Tones: firm, neutral, warm. [00:02]"])
    res = await _agent(rag, llm).answer(
        "how to apply global filters and list the negotiation tones", user=None
    )
    assert [s["topic"] for s in res.sections] == subs
    assert res.sections[0]["text"] == "Use the filter panel. [00:02]"
    assert res.sections[1]["text"] == "Tones: firm, neutral, warm. [00:02]"
    assert res.sections[0]["video_clips"][0]["video_id"] == "v1"
    assert res.sections[1]["video_clips"][0]["video_id"] == "v2"
    # flattened back-compat field unions both clips
    assert {c["video_id"] for c in res.video_clips} == {"v1", "v2"}


async def test_multi_intent_stream_emits_sections_init_and_per_section_tokens():
    subs = ["apply global filters", "list negotiation tones"]
    rag = _MapRag({subs[0]: _video_ctx("v1", "Filters"), subs[1]: _video_ctx("v2", "Tones")})
    llm = _ScriptedLLM(subs, ["Filter answer.", "Tone answer."])
    events = [e async for e in _agent(rag, llm).stream_answer(
        "apply global filters and list negotiation tones", user=None)]

    init = next(e for e in events if e["type"] == "sections")
    assert [s["topic"] for s in init["sections"]] == subs
    assert [s["index"] for s in init["sections"]] == [0, 1]
    # Topics only: sources are unknown until the answer exists and is reconciled against it,
    # so the scaffolding frame must not carry (pre-reconciliation) clips or doc-sources.
    assert all("video_clips" not in s and "document_sources" not in s for s in init["sections"])
    # tokens are tagged with their section index
    sec1 = "".join(e["data"] for e in events if e["type"] == "token" and e.get("section") == 1)
    assert sec1.strip() == "Tone answer."
    done = next(e for e in events if e["type"] == "done")
    assert [s["text"] for s in done["metadata"]["sections"]] == ["Filter answer.", "Tone answer."]


async def test_single_intent_still_one_section():
    llm = _FakeLLM("@@S1@@SSO lives under Settings.")
    res = await _agent(_FakeRag(_ctx_with_video()), llm).answer("how do I enable SSO?", user=None)
    assert len(res.sections) == 1
    assert res.sections[0]["text"] == "SSO lives under Settings."


# ── Conversational meta / follow-up path ─────────────────────────────────────

def _agent_with_history(llm, recent):
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    return _agent(_FakeRag(_ctx_with_video()), llm, chat_store=store), store


async def test_meta_followup_answers_from_history_no_rag():
    recent = [{"role": "user", "content": "how do I set up SSO?"},
              {"role": "assistant", "content": "Go to Settings > SSO and enable it."}]
    llm = _FakeLLM("Summary: enable SSO in Settings.")
    agent, store = _agent_with_history(llm, recent)
    rag = agent._rag  # the _FakeRag

    res = await agent.answer("summarize your previous message", user=_User("u1"), thread_id="t9")

    assert rag.queried is False                         # RAG bypassed
    assert res.resolved is True and res.escalated is False
    assert res.video_clips == [] and res.document_sources == []
    assert "RECENT CONVERSATION" in llm.prompts[0]      # answered from history
    assert "Go to Settings > SSO and enable it." in llm.prompts[0]  # full prior msg (untruncated)
    saved = [m for m in store.saved if m["role"] == "assistant"][0]
    assert saved["metadata"] == {"resolved": True, "meta": True}


async def test_meta_pattern_without_history_falls_through_to_rag():
    # thread_id=None → no history → "summarize…" is NOT treated as meta; goes to RAG.
    store = _FakeChatStore()
    llm = _FakeLLM("SSO is under Settings [00:02]")
    agent = _agent(_FakeRag(_ctx_with_video()), llm, chat_store=store)
    res = await agent.answer("summarize the previous message", user=_User("u1"), thread_id=None)
    assert agent._rag.queried is True                   # RAG ran
    assert res.video_clips and res.video_clips[0]["video_id"] == "v1"


async def test_kb_question_with_history_is_not_hijacked():
    recent = [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "Hello!"}]
    llm = _FakeLLM("Answer")
    agent, _ = _agent_with_history(llm, recent)
    await agent.answer("what are the billing tiers?", user=_User("u1"), thread_id="t9")
    assert agent._rag.queried is True                   # normal grounded RAG path


async def test_stream_meta_followup():
    recent = [{"role": "assistant", "content": "The SSO steps are A, B, C."}]
    llm = _FakeLLM("Shorter: A B C")
    agent, _ = _agent_with_history(llm, recent)
    events = await _collect(agent.stream_answer("shorten that", user=_User("u1"), thread_id="t9"))
    done = next(e for e in events if e["type"] == "done")
    assert agent._rag.queried is False
    assert done["metadata"]["resolved"] is True and done["metadata"]["thread_id"] == "t9"
    assert any(e["type"] == "token" for e in events)


# ── Query rewrite + clarification + answer-from-history ──────────────────────

class _RouteAwareLLM:
    """Distinguishes the routing call (system prompt is the follow-up router) from the
    answer-generation call, so a test can script each independently."""

    def __init__(self, route_reply, answer_reply):
        self.route_reply = route_reply
        self.answer_reply = answer_reply
        self.prompts = []

    @staticmethod
    def _is_route(system):
        return "routing a support-chat follow-up" in (system or "").lower()

    async def complete(self, prompt, system=None, max_tokens=1024):
        self.prompts.append(prompt)
        return self.route_reply if self._is_route(system) else self.answer_reply

    async def stream(self, prompt, system=None, max_tokens=1024):
        for word in self.answer_reply.split(" "):
            yield word + " "


def _durable_video_section(topic, text, video_id="v1", title="T", gcs_object="videos/v1.mp4",
                           docs=None):
    """A persisted (durable) section, as ``_persist_assistant`` would have stored it — unsigned
    clip record, keyed by ``gcs_object`` so it can be re-signed on carry-forward."""
    return [{
        "topic": topic, "text": text,
        "video_clips": [{"video_id": video_id, "title": title, "start_ms": 1000, "end_ms": 3000,
                          "gcs_object": gcs_object, "cited_ranges": [{"start_ms": 1000, "end_ms": 3000}]}],
        "document_sources": list(docs or []),
    }]


async def test_content_free_question_short_circuits_without_rag():
    rag = _FakeRag(_ctx_with_video())
    llm = _FakeLLM("must not be used")
    store = _FakeChatStore()
    res = await _agent(rag, llm, chat_store=store).answer("?", user=_User("u1"), thread_id=None)
    assert rag.queried is False
    assert llm.called is False
    assert res.resolved is False
    saved_assistant = [m for m in store.saved if m["role"] == "assistant"][0]
    assert saved_assistant["metadata"] == {"resolved": False, "needs_clarification": True}


async def test_followup_is_rewritten_before_retrieval():
    recent = [{"role": "user", "content": "what are the negotiation tones?"},
              {"role": "assistant", "content": "There are five: NTA, NTB, NTC, NTD, NTE."}]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    llm = _RouteAwareLLM(
        route_reply='{"action": "retrieve", "query": "What are the names of the negotiation tones?"}',
        answer_reply="@@S1@@The five tones are NTA, NTB, NTC, NTD, NTE. [00:02]",
    )
    res = await _agent(rag, llm, chat_store=store).answer(
        "only names ?", user=_User("u1"), thread_id="t9"
    )
    assert rag.queries == ["What are the names of the negotiation tones?"]
    assert res.resolved is True
    # topic label shows the user's own words, never the rewritten/expanded query
    assert res.sections[0]["topic"] == "only names ?"


async def test_first_turn_never_rewrites():
    rag = _FakeRag(_ctx_with_video())
    llm = _RouteAwareLLM(
        route_reply='{"action": "retrieve", "query": "should never be used"}',
        answer_reply="@@S1@@SSO is under Settings [00:02]",
    )
    res = await _agent(rag, llm).answer("only names ?", user=None)
    assert rag.queries == ["only names ?"]                # no history → gate never runs
    assert res.resolved is True


async def test_resuming_clarification_combines_and_proceeds_to_rag():
    recent = [
        {"role": "user", "content": "only names ?"},
        {"role": "assistant", "content": "Could you clarify what you'd like the names of?",
         "metadata": {"resolved": False, "needs_clarification": True}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    llm = _RouteAwareLLM(
        route_reply='{"action": "retrieve", "query": "What are the names of the negotiation tones?"}',
        answer_reply="@@S1@@The five tones are NTA, NTB, NTC, NTD, NTE. [00:02]",
    )
    res = await _agent(rag, llm, chat_store=store).answer(
        "the negotiation tones", user=_User("u1"), thread_id="t9"
    )
    assert rag.queries == ["What are the names of the negotiation tones?"]
    assert res.resolved is True
    assert res.sections[0]["topic"] == "only names ? — the negotiation tones"
    saved_assistant = [m for m in store.saved if m["role"] == "assistant"][0]
    assert not saved_assistant["metadata"].get("needs_clarification")


async def test_clarify_capped_at_one_round():
    # Resuming a clarification, but the LLM STILL can't confidently resolve it — must not ask
    # a second time; proceed to RAG with best-effort text instead of looping. This is the
    # non-content-free capped branch — contrast with the content-free one below, which instead
    # gives up without ever calling RAG (sending garbled "? — ?"-style text into RAG would just
    # reproduce the original bare-"?" bug).
    recent = [
        {"role": "user", "content": "only names ?"},
        {"role": "assistant", "content": "Could you clarify what you'd like the names of?",
         "metadata": {"resolved": False, "needs_clarification": True}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    llm = _RouteAwareLLM(
        route_reply='{"action": "clarify", "clarify": "Still unclear, could you say more?"}',
        answer_reply="@@S1@@Best effort answer. [00:02]",
    )
    res = await _agent(rag, llm, chat_store=store).answer(
        "still not sure", user=_User("u1"), thread_id="t9"
    )
    assert rag.queried is True                              # proceeded to RAG, not a 2nd clarify
    saved_assistant = [m for m in store.saved if m["role"] == "assistant"][0]
    assert not saved_assistant["metadata"].get("needs_clarification")


async def test_clarify_capped_content_free_gives_up_without_rag():
    # Resuming a clarification, but the user's reply is ITSELF content-free ("?") — the combined
    # text ("? — ?") is still garbage. Must NOT fall through to RAG on garbled text (that would
    # reproduce the original bare-"?" bug); must give up honestly instead.
    recent = [
        {"role": "user", "content": "?"},
        {"role": "assistant", "content": "Could you share a bit more detail about what you'd like to know?",
         "metadata": {"resolved": False, "needs_clarification": True}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    llm = _FakeLLM("must not be used")
    res = await _agent(rag, llm, chat_store=store).answer("?", user=_User("u1"), thread_id="t9")
    assert rag.queried is False
    assert llm.called is False
    assert res.resolved is False
    assert res.answer == support_agent_mod.CANNOT_ANSWER_MESSAGE
    saved_assistant = [m for m in store.saved if m["role"] == "assistant"][0]
    assert not saved_assistant["metadata"].get("needs_clarification")


async def test_stream_clarify_capped_content_free_gives_up_without_rag():
    recent = [
        {"role": "user", "content": "?"},
        {"role": "assistant", "content": "Could you share a bit more detail about what you'd like to know?",
         "metadata": {"resolved": False, "needs_clarification": True}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    llm = _FakeLLM("must not be used")
    events = await _collect(
        _agent(rag, llm, chat_store=store).stream_answer("?", user=_User("u1"), thread_id="t9")
    )
    done = next(e for e in events if e["type"] == "done")
    assert rag.queried is False
    assert llm.streamed is False
    assert done["metadata"]["resolved"] is False
    assert any(e["type"] == "token" for e in events)  # cannot-answer message streamed


async def test_answer_from_history_skips_rag_and_carries_forward_prior_clips():
    # "just names" is fully answerable from the PRIOR answer already in history — the router
    # should say so, and the turn must not re-run RAG at all, instead reusing (re-signed) the
    # same clip/sources the prior answer cited, so the two turns stay consistent.
    prev_text = "According to the Playbook, there are five: NTA, NTB, NTC, NTD, NTE."
    recent = [
        {"role": "user", "content": "what are the negotiation tones?"},
        {"role": "assistant", "content": prev_text,
         "metadata": {"sections": _durable_video_section("what are the negotiation tones?", prev_text),
                      "resolved": True, "sources": ["c1", "c2"]}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    # The reformatted answer PRESERVES the prior citation ([00:02] is within the carried clip's
    # 00:01–00:03 span), so the carried video is kept and re-filtered to that cited moment.
    llm = _RouteAwareLLM(
        route_reply='{"action": "answer", "answer": "NTA, NTB, NTC, NTD, NTE. [00:02]"}',
        answer_reply="must not be used",
    )
    res = await _agent(rag, llm, chat_store=store).answer(
        "just names", user=_User("u1"), thread_id="t9"
    )
    assert rag.queried is False                             # no new retrieval
    assert res.resolved is True
    assert res.answer == "NTA, NTB, NTC, NTD, NTE. [00:02]"
    assert res.sections[0]["topic"] == "just names"
    assert res.video_clips[0]["video_id"] == "v1"
    assert res.video_clips[0]["video_url"].startswith("https://s/")   # freshly re-signed
    # carried clip reconciled against the new text → only the cited moment remains
    assert res.video_clips[0]["cited_ranges"] == [{"start_ms": 2000, "end_ms": 2000}]
    assert res.sources == ["c1", "c2"]                       # carried forward too
    saved_assistant = [m for m in store.saved if m["role"] == "assistant"][0]
    assert saved_assistant["metadata"]["sections"][0]["video_clips"][0]["gcs_object"] == "videos/v1.mp4"


async def test_answer_from_history_stream_emits_metadata_without_rag():
    prev_text = "According to the Playbook, there are five: NTA, NTB, NTC, NTD, NTE."
    recent = [
        {"role": "user", "content": "what are the negotiation tones?"},
        {"role": "assistant", "content": prev_text,
         "metadata": {"sections": _durable_video_section("what are the negotiation tones?", prev_text),
                      "resolved": True, "sources": ["c1"]}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    llm = _RouteAwareLLM(
        route_reply='{"action": "answer", "answer": "NTA, NTB, NTC, NTD, NTE. [00:02]"}',
        answer_reply="must not be used",
    )
    events = await _collect(
        _agent(rag, llm, chat_store=store).stream_answer("just names", user=_User("u1"), thread_id="t9")
    )
    done = next(e for e in events if e["type"] == "done")
    assert rag.queried is False
    assert done["metadata"]["resolved"] is True
    assert done["metadata"]["video_clips"][0]["video_id"] == "v1"   # carried + reconciled to [00:02]
    assert done["metadata"]["video_clips"][0]["cited_ranges"] == [{"start_ms": 2000, "end_ms": 2000}]
    assert any(e["type"] == "token" and "NTA" in e["data"] for e in events)


async def test_answer_from_history_drops_carried_clips_when_reply_cites_nothing():
    # A direct-answer follow-up whose reformatted text cites NO moment must not carry the prior
    # video forward with orphaned "Referenced at" chips — the carried clip is reconciled away.
    prev_text = "According to the Playbook, tones are firm, neutral, warm. [00:02]"
    recent = [
        {"role": "user", "content": "what are the negotiation tones?"},
        {"role": "assistant", "content": prev_text,
         "metadata": {"sections": _durable_video_section("what are the negotiation tones?", prev_text),
                      "resolved": True, "sources": ["c1"]}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    llm = _RouteAwareLLM(
        route_reply='{"action": "answer", "answer": "Firm, neutral, and warm."}',  # no citation
        answer_reply="must not be used",
    )
    res = await _agent(rag, llm, chat_store=store).answer("just names", user=_User("u1"), thread_id="t9")
    assert rag.queried is False
    assert res.answer == "Firm, neutral, and warm."
    assert res.video_clips == []                             # nothing cited → no orphaned video


async def test_query_rewrite_disabled_flag_skips_rewrite_and_clarification():
    rag = _FakeRag(_ctx_with_video())
    llm = _FakeLLM("@@S1@@SSO is under Settings [00:02]")
    agent = SupportAgent(
        rag_service=rag, llm_client=llm, signer=lambda o: f"https://s/{o}",
        answerable_threshold=0.5, enable_query_rewrite=False,
    )
    res = await agent.answer("?", user=None)
    assert rag.queried is True             # old behaviour: "?" runs straight through to RAG
    assert res.resolved is True


_MIXED_DOCS = [
    {"document_id": "docA", "title": "Billing Guide", "page_numbers": [3, 4], "is_public": True},
    {"document_id": "docB", "title": "Internal Payroll Policy", "page_numbers": [9], "is_public": False},
]


async def test_answer_hides_bracket_document_cite_for_non_admin():
    # The model often packs a document cite as ``[Document "Title"]`` or mixes it with a
    # timestamp: ``[23:50–24:05, Document "Title"]``. Those must disappear for non-admins
    # the same way the source card does — the explanation and video timestamps stay.
    priv = _doc_chunk("d2c1", "docB", "Concepts and Definitions", [1], is_public=False)
    ctx = RAGContext(
        context_text='### [1] document Concepts and Definitions — p. 1\nregulations',
        source_ids=["d2c1"], chunk_count=1, query="q",
        video_results=[], document_results=[priv], top_score=0.9,
    )
    llm = _FakeLLM(
        'Government recommendations can be overridden by a contract '
        '[23:50–24:05, Document "Concepts and Definitions" ]. '
        'Strict regulations carry penalties '
        '[Document "Concepts and Definitions" ].'
    )
    res = await _agent(_FakeRag(ctx), llm).answer("q", user=User(id="u1", role="user"))
    assert res.document_sources == []
    assert "Concepts and Definitions" not in res.answer
    assert "[Document" not in res.answer
    assert "[23:50–24:05]" in res.answer
    assert "overridden by a contract" in res.answer
    assert "Strict regulations carry penalties" in res.answer
    store = _FakeChatStore()
    res = await _agent(_FakeRag(_ctx_mixed_visibility()), _FakeLLM(_MIXED_ANSWER),
                       chat_store=store).answer("q", user=User(id="u1", role="user"))
    assert [d["document_id"] for d in res.document_sources] == ["docA"]
    assert "Billing Guide" in res.answer
    assert "Internal Payroll Policy" not in res.answer
    assert "p. 9" not in res.answer
    assert res.sections[0]["text"] == res.answer
    saved = [m for m in store.saved if m["role"] == "assistant"][0]
    assert "Internal Payroll Policy" in saved["content"]
    stored_ids = [d["document_id"] for d in saved["metadata"]["sections"][0]["document_sources"]]
    assert stored_ids == ["docA", "docB"]


async def test_answer_strips_dangling_of_citation_with_no_hidden_docs():
    # Production bug: the model sometimes shortens a document attribution down to a bare
    # "[of]" inside brackets, with no hidden docs involved at all (plain video-only answer).
    # This must be cleaned up for every viewer, admin or not.
    llm = _FakeLLM(
        "Even in different regions or product categories [of]. "
        "It may be willing to accept similar terms for other spend lines [of]."
    )
    res = await _agent(_FakeRag(_ctx_with_video()), llm).answer(
        "q", user=User(id="u1", role="user")
    )
    assert "[of]" not in res.answer
    assert "Even in different regions or product categories." in res.answer

    admin_llm = _FakeLLM(
        "Even in different regions or product categories [of]."
    )
    admin_res = await _agent(_FakeRag(_ctx_with_video()), admin_llm).answer(
        "q", user=User(id="u1", role="global_platform_admin")
    )
    assert "[of]" not in admin_res.answer


async def test_answer_strips_bare_dash_citation_with_no_hidden_docs():
    # Production bug: when the model has no exact moment to back a claim, it emits a bare
    # placeholder dash "[— ]" instead of omitting the citation. Must be cleaned up for every
    # viewer, admin or not — a bare dash carries no timestamp/page/title data at all.
    llm = _FakeLLM(
        "This serves as a starting point, after which other strategies should complement "
        "the argument [— ]. It is most relevant if the standard is higher [— ]."
    )
    res = await _agent(_FakeRag(_ctx_with_video()), llm).answer(
        "q", user=User(id="u1", role="user")
    )
    assert "[— ]" not in res.answer
    assert "[—]" not in res.answer
    assert "This serves as a starting point" in res.answer

    admin_llm = _FakeLLM(
        "This serves as a starting point, after which other strategies should complement "
        "the argument [— ]."
    )
    admin_res = await _agent(_FakeRag(_ctx_with_video()), admin_llm).answer(
        "q", user=User(id="u1", role="global_platform_admin")
    )
    assert "[— ]" not in admin_res.answer
    assert "[—]" not in admin_res.answer


async def test_answer_strips_tagged_citation_wrappers_with_no_hidden_docs():
    # Production bug: the model invents "<vid: Title — [MM:SS]>" / "<doc: — >" tags instead of
    # the prompted "[MM:SS]" citation shape. Must be cleaned up for every viewer, admin or not,
    # keeping the real timestamp but dropping the invented wrapper/title entirely.
    llm = _FakeLLM(
        "This can be adjusted in the platform setup <doc: — >. "
        "Without it, terms are hard to manage <vid: Setup — [16:06–16:46]>."
    )
    res = await _agent(_FakeRag(_ctx_with_video()), llm).answer(
        "q", user=User(id="u1", role="user")
    )
    assert "<doc:" not in res.answer
    assert "<vid:" not in res.answer
    assert "[16:06–16:46]" in res.answer
    assert "This can be adjusted in the platform setup." in res.answer

    admin_llm = _FakeLLM(
        "This can be adjusted in the platform setup <doc: — >. "
        "Without it, terms are hard to manage <vid: Setup — [16:06–16:46]>."
    )
    admin_res = await _agent(_FakeRag(_ctx_with_video()), admin_llm).answer(
        "q", user=User(id="u1", role="global_platform_admin")
    )
    assert "<doc:" not in admin_res.answer
    assert "<vid:" not in admin_res.answer
    assert "[16:06–16:46]" in admin_res.answer


async def test_answer_normalizes_parenthesised_timestamps_with_no_hidden_docs():
    # Production bug: the model drifts off the prompted "[MM:SS]" shape into a parenthesised
    # look-alike "(MM:SS)" — invisible to reconciliation, so a section whose ONLY cite is
    # paren-wrapped previously lost its video entirely. Must be fixed for every viewer.
    llm = _FakeLLM(
        "Used to justify extending payment terms across the portfolio (20:26–21:05)."
    )
    res = await _agent(_FakeRag(_ctx_with_video()), llm).answer(
        "q", user=User(id="u1", role="user")
    )
    assert "[20:26–21:05]" in res.answer
    assert "(20:26–21:05)" not in res.answer
    assert len(res.video_clips) == 1
    assert res.video_clips[0]["cited_ranges"] == [{"start_ms": 1226000, "end_ms": 1265000}]

    admin_llm = _FakeLLM(
        "Used to justify extending payment terms across the portfolio (20:26–21:05)."
    )
    admin_res = await _agent(_FakeRag(_ctx_with_video()), admin_llm).answer(
        "q", user=User(id="u1", role="global_platform_admin")
    )
    assert "[20:26–21:05]" in admin_res.answer
    assert len(admin_res.video_clips) == 1


def _ctx_multi_public_video_chunks():
    # Several retrieved chunks of the SAME public video, numbered [1]..[5] in the RAG prompt —
    # the model sometimes cites those chunk indices verbatim instead of a real timestamp.
    chunks = [
        RetrievalResult(
            id=f"c{i}", score=0.9 - i * 0.01, text=f"seg{i}", video_id="v1",
            start_ms=i * 60000, end_ms=i * 60000 + 30000,
            gcs_object="videos/v1.mp4", title="Supplier Entity Card",
        )
        for i in range(1, 6)
    ]
    ctx_lines = [f"### [{i}] video Supplier Entity Card" for i in range(1, 6)]
    return RAGContext(
        context_text="\n".join(ctx_lines),
        source_ids=[c.id for c in chunks], chunk_count=len(chunks), query="q",
        video_results=chunks, top_score=0.9,
    )


async def test_answer_strips_bare_chunk_index_footnotes_public_video_no_hidden_docs():
    # Production bug: an all-public, video-only answer where the model cites RAG chunk
    # indices ("[2][5]") instead of timestamps. No hidden docs are involved at all, so this
    # must be cleaned up regardless of role (admin or not).
    llm = _FakeLLM(
        "Supplier Parent Max finds the highest terms across a parent group [16:03–16:40]. "
        "It checks if a subsidiary already accepts longer terms [2][5]. "
        "It suggests aligning to the highest terms found [5]."
    )
    res = await _agent(_FakeRag(_ctx_multi_public_video_chunks()), llm).answer(
        "q", user=User(id="u1", role="user")
    )
    assert "[2]" not in res.answer
    assert "[5]" not in res.answer
    assert "[16:03–16:40]" in res.answer

    admin_llm = _FakeLLM(llm._text)
    admin_res = await _agent(_FakeRag(_ctx_multi_public_video_chunks()), admin_llm).answer(
        "q", user=User(id="u1", role="global_platform_admin")
    )
    assert "[2]" not in admin_res.answer
    assert "[5]" not in admin_res.answer
    assert "[16:03–16:40]" in admin_res.answer


async def test_answer_hides_rag_index_footnote_for_non_admin():
    # The model cites the RAG header index ``### [5] document …`` as a bare ``[5]``.
    # That number is the private document; it must not appear to a non-admin.
    priv = _doc_chunk("d2c1", "docB", "Concepts and Definitions", [1], is_public=False)
    ctx = RAGContext(
        context_text='### [5] document Concepts and Definitions — p. 1\nregulations',
        source_ids=["d2c1"], chunk_count=1, query="q",
        video_results=[], document_results=[priv], top_score=0.9,
    )
    llm = _FakeLLM(
        "Their primary function is to identify whether any regulations apply [5]. "
        "Government recommendations can be overridden [5]. "
        "Navigate to the Buyer Standard Group tab [08:30–09:09]."
    )
    res = await _agent(_FakeRag(ctx), llm).answer("q", user=User(id="u1", role="user"))
    assert res.document_sources == []
    assert "[5]" not in res.answer
    assert "Concepts and Definitions" not in res.answer
    assert "[08:30–09:09]" in res.answer
    assert "overridden" in res.answer


async def test_answer_shows_private_doc_refs_for_global_admin():
    res = await _agent(_FakeRag(_ctx_mixed_visibility()), _FakeLLM(_MIXED_ANSWER)).answer(
        "q", user=User(id="u1", role="global_platform_admin")
    )
    assert {d["document_id"] for d in res.document_sources} == {"docA", "docB"}
    assert "Internal Payroll Policy" in res.answer
    assert "Billing Guide" in res.answer


async def test_answer_hides_private_doc_refs_for_tenant_admin():
    # Chat citations stay global-admin-only; a tenant admin is treated like a plain user.
    res = await _agent(_FakeRag(_ctx_mixed_visibility()), _FakeLLM(_MIXED_ANSWER)).answer(
        "q", user=User(id="u1", role="admin")
    )
    assert [d["document_id"] for d in res.document_sources] == ["docA"]
    assert "Internal Payroll Policy" not in res.answer


async def test_stream_keeps_video_when_private_doc_also_retrieved():
    """Regression: a Buyer-Standards-style answer cites [[MM:SS]] while retrieval also
    returned a private document. Redaction must not drop the video on `done`."""
    video = RetrievalResult(
        id="c1", score=0.9, text="buyer standard", video_id="v1",
        start_ms=64000, end_ms=66000, gcs_object="videos/v1.mp4", title="Buyer Standards",
    )
    priv = _doc_chunk("d2c1", "docB", "Concepts and Definitions", [1], is_public=False)
    ctx = RAGContext(
        context_text=(
            "### [1] video Buyer Standards — [01:04–01:06]\n"
            "### [2] document Concepts and Definitions — p. 1\n"
        ),
        source_ids=["c1", "d2c1"], chunk_count=2, query="q",
        video_results=[video], document_results=[priv], top_score=0.9,
    )
    llm = _FakeLLM(
        "A Buyer Standard sets payment term targets [[1:01–1:06]]. "
        "Groups can target a country [[5:02–5:13]]."
    )
    events = await _collect(
        _agent(_FakeRag(ctx), llm).stream_answer("what are buyer standards?", user=User(id="u1", role="user"))
    )
    done = next(e for e in events if e["type"] == "done")
    clips = done["metadata"]["video_clips"]
    assert clips, "video clip must still attach for a non-admin when a private doc was also retrieved"
    assert clips[0]["video_id"] == "v1"
    assert clips[0]["cited_ranges"]
    assert "Concepts and Definitions" not in done["metadata"]["sections"][0]["text"]
    assert "[1:01–1:06]" in done["metadata"]["sections"][0]["text"] or "1:01" in done["metadata"]["sections"][0]["text"]
    att = next(e for e in events if e["type"] == "attachments")
    assert att["video_clips"] and att["video_clips"][0]["video_id"] == "v1"
    token_events = [e for e in events if e["type"] == "token"]
    assert len(token_events) > 1
    streamed = "".join(e["data"] for e in token_events)
    assert "Concepts and Definitions" not in streamed
    first_token_idx = next(i for i, e in enumerate(events) if e["type"] == "token")
    att_idx = next(i for i, e in enumerate(events) if e["type"] == "attachments")
    persist_done_idx = next(i for i, e in enumerate(events) if e["type"] == "done")
    assert first_token_idx < att_idx < persist_done_idx


async def test_stream_done_redacts_private_doc_refs_for_non_admin():
    events = await _collect(
        _agent(_FakeRag(_ctx_mixed_visibility()), _FakeLLM(_MIXED_ANSWER)).stream_answer(
            "q", user=User(id="u1", role="user")
        )
    )
    done = next(e for e in events if e["type"] == "done")
    streamed = "".join(e["data"] for e in events if e["type"] == "token")
    assert [d["document_id"] for d in done["metadata"]["document_sources"]] == ["docA"]
    assert "Internal Payroll Policy" not in done["metadata"]["sections"][0]["text"]
    assert "Billing Guide" in done["metadata"]["sections"][0]["text"]
    # Live stream: more than a single dump after the model finishes.
    assert "Internal Payroll Policy" not in streamed
    assert "p. 9" not in streamed
    assert "Billing Guide" in streamed
    assert "fees apply" in streamed
    token_events = [e for e in events if e["type"] == "token"]
    assert len(token_events) > 1


async def test_stream_keeps_private_doc_refs_for_global_admin():
    events = await _collect(
        _agent(_FakeRag(_ctx_mixed_visibility()), _FakeLLM(_MIXED_ANSWER)).stream_answer(
            "q", user=User(id="u1", role="global_platform_admin")
        )
    )
    streamed = "".join(e["data"] for e in events if e["type"] == "token")
    done = next(e for e in events if e["type"] == "done")
    assert "Internal Payroll Policy" in streamed
    assert "Internal Payroll Policy" in done["metadata"]["sections"][0]["text"]


async def test_answer_from_history_redacts_carried_private_doc_for_non_admin():
    recent = [
        {"role": "user", "content": "how do fees work?"},
        {"role": "assistant", "content": _MIXED_ANSWER,
         "metadata": {"sections": _durable_video_section("how do fees work?", _MIXED_ANSWER, docs=_MIXED_DOCS),
                      "resolved": True, "sources": ["d1c1", "d2c1"]}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    rag = _FakeRag(_ctx_with_video())
    llm = _RouteAwareLLM(
        route_reply='{"action": "answer", "answer": "' + _MIXED_ANSWER + '"}',
        answer_reply="must not be used",
    )
    res = await _agent(rag, llm, chat_store=store).answer(
        "just names", user=User(id="u1", role="user"), thread_id="t9"
    )
    assert rag.queried is False
    assert [d["document_id"] for d in res.document_sources] == ["docA"]
    assert "Billing Guide" in res.answer
    assert "Internal Payroll Policy" not in res.answer
    saved = [m for m in store.saved if m["role"] == "assistant"][0]
    assert "Internal Payroll Policy" in saved["content"]
    stored_ids = [d["document_id"] for d in saved["metadata"]["sections"][0]["document_sources"]]
    assert "docB" in stored_ids


async def test_stream_from_history_does_not_flash_private_doc():
    recent = [
        {"role": "user", "content": "how do fees work?"},
        {"role": "assistant", "content": _MIXED_ANSWER,
         "metadata": {"sections": _durable_video_section("how do fees work?", _MIXED_ANSWER, docs=_MIXED_DOCS),
                      "resolved": True, "sources": ["d1c1", "d2c1"]}},
    ]
    store = _FakeChatStore(threads={"t9": {"thread_id": "t9", "user_uuid": "u1"}}, recent=recent)
    llm = _RouteAwareLLM(
        route_reply='{"action": "answer", "answer": "' + _MIXED_ANSWER + '"}',
        answer_reply="must not be used",
    )
    events = await _collect(
        _agent(_FakeRag(_ctx_with_video()), llm, chat_store=store).stream_answer(
            "just names", user=User(id="u1", role="user"), thread_id="t9"
        )
    )
    streamed = "".join(e["data"] for e in events if e["type"] == "token")
    assert "Internal Payroll Policy" not in streamed
    assert "Billing Guide" in streamed
