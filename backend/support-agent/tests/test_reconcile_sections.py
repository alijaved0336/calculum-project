"""Reconciliation of a section's attached videos/docs against the answer text (bugs 2, 3, 6)."""
from application.agent.support_agent import SupportAgent
from domain.entities.rag_context import RAGContext
from domain.entities.retrieval_result import RetrievalResult


class _FakeRag:
    def __init__(self, ctx):
        self._ctx = ctx

    async def query(self, q):
        return self._ctx


class _FakeLLM:
    def __init__(self, text):
        self._text = text
        self.streamed = False

    async def complete(self, prompt, system=None, max_tokens=1024):
        return self._text

    async def stream(self, prompt, system=None, max_tokens=1024):
        self.streamed = True
        yield self._text


def _agent(rag, llm):
    return SupportAgent(rag_service=rag, llm_client=llm, signer=lambda o: f"https://s/{o}",
                        answerable_threshold=0.5)


def _vid(id, video_id, start, end, title):
    return RetrievalResult(id=id, score=0.9, text=title, video_id=video_id, start_ms=start,
                           end_ms=end, gcs_object=f"videos/{video_id}.mp4", title=title)


def _doc(id, file_id, title):
    return RetrievalResult(id=id, score=0.8, text="d", source_type="document", title=title,
                           metadata={"file_id": file_id, "chunk_source": "document",
                                     "title": title, "page_numbers": [1], "is_public": True})


def _ctx(videos=(), docs=()):
    return RAGContext(context_text="ctx", source_ids=[v.id for v in videos] + [d.id for d in docs],
                      chunk_count=len(videos) + len(docs), query="q",
                      video_results=list(videos), document_results=list(docs), top_score=0.9)


async def test_uncited_video_is_dropped():
    # Two videos retrieved; the answer only cites video A's moment → video B is dropped (bug 2).
    a = _vid("a1", "vA", 60000, 90000, "Filters")     # 01:00–01:30
    b = _vid("b1", "vB", 600000, 630000, "Tones")      # 10:00–10:30
    res = await _agent(_FakeRag(_ctx(videos=[a, b])), _FakeLLM("Use filters [01:10].")).answer("q", user=None)
    assert [c["video_id"] for c in res.video_clips] == ["vA"]
    assert res.video_clips[0]["cited_ranges"] == [{"start_ms": 70000, "end_ms": 70000}]


async def test_cited_moment_attaches_to_correct_video_not_both():
    # Both videos have a chunk covering ~09:15, but the cited moment is attributed to exactly one
    # (the tightest-containing) — not shown under both (bug 3).
    a = _vid("a1", "vA", 540000, 555000, "A")   # 09:00–09:15 (15s window, tighter)
    b = _vid("b1", "vB", 500000, 600000, "B")   # 08:20–10:00 (100s window, looser)
    res = await _agent(_FakeRag(_ctx(videos=[a, b])), _FakeLLM("See [09:10].")).answer("q", user=None)
    kept = {c["video_id"] for c in res.video_clips}
    assert kept == {"vA"}   # attributed to the tighter-containing video only, not both


async def test_no_answer_reply_drops_uncited_videos_and_docs():
    # A soft refusal cites nothing → no video clips AND no document sources: the implicit-
    # reference fallback in _reconcile_docs is skipped for a non-answer (bug 6).
    a = _vid("a1", "vA", 60000, 90000, "Filters")
    d = _doc("d1", "docA", "Billing Guide")
    llm = _FakeLLM("I don't have an answer for this in the knowledge base.")
    res = await _agent(_FakeRag(_ctx(videos=[a], docs=[d])), llm).answer("q", user=None)
    assert res.video_clips == []
    assert res.document_sources == []


async def test_doc_kept_by_title_or_page_else_top_fallback():
    # A doc is kept when its title (or a cited page) appears in the answer; when nothing matches,
    # the top retrieved doc is kept as a fallback (implicit-reference handling in _reconcile_docs).
    d1 = _doc("d1", "docA", "Billing Guide")
    d2 = _doc("d2", "docB", "Refund Policy")
    # Title of docB mentioned → only docB kept (specific match wins over fallback).
    titled = await _agent(_FakeRag(_ctx(docs=[d1, d2])),
                          _FakeLLM("According to the Refund Policy, refunds apply.")).answer("q", user=None)
    assert [x["document_id"] for x in titled.document_sources] == ["docB"]
    # Nothing matches → fallback keeps the top retrieved doc (docA).
    fallback = await _agent(_FakeRag(_ctx(docs=[d1, d2])),
                            _FakeLLM("Fees apply per the policy.")).answer("q", user=None)
    assert [x["document_id"] for x in fallback.document_sources] == ["docA"]


async def test_multiple_cited_moments_merge_per_video():
    a = _vid("a1", "vA", 60000, 130000, "A")   # 01:00–02:10 covers both cites
    llm = _FakeLLM("First [01:05] then [01:06] and later [02:00].")
    res = await _agent(_FakeRag(_ctx(videos=[a])), llm).answer("q", user=None)
    # 01:05 and 01:06 merge (within 2s); 02:00 stays separate.
    assert res.video_clips[0]["cited_ranges"] == [
        {"start_ms": 65000, "end_ms": 66000}, {"start_ms": 120000, "end_ms": 120000}
    ]


async def test_overlapping_cite_attaches_when_start_is_outside_chunk():
    # Retrieved window is 05:08–05:13; the model cites 05:02–05:13 (start 6s early).
    # Start-in-window matching dropped the clip even though the range overlaps.
    a = _vid("a1", "vA", 308000, 313000, "Buyer Standards")
    res = await _agent(
        _FakeRag(_ctx(videos=[a])),
        _FakeLLM("Groups apply to a country or industry [[5:02–5:13]]."),
    ).answer("q", user=None)
    assert [c["video_id"] for c in res.video_clips] == ["vA"]
    assert res.video_clips[0]["cited_ranges"] == [{"start_ms": 302000, "end_ms": 313000}]


async def test_timestamped_answer_keeps_only_retrieved_video_via_nearest_chunk():
    # Cites at 01:01 when the retrieved chunk is later in the same video — still attach.
    a = _vid("a1", "vA", 308000, 313000, "Buyer Standards")
    res = await _agent(
        _FakeRag(_ctx(videos=[a])),
        _FakeLLM("A Buyer Standard sets payment term targets [[1:01–1:06]]."),
    ).answer("q", user=None)
    assert [c["video_id"] for c in res.video_clips] == ["vA"]
    assert res.video_clips[0]["cited_ranges"] == [{"start_ms": 61000, "end_ms": 66000}]
