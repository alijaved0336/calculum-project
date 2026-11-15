from application.services.rag_service import RAGService
from domain.entities.retrieval_result import RetrievalResult


class _StubStore:
    def __init__(self, results, neighbours=None):
        self._results = results
        self._neighbours = neighbours or {}

    async def retrieve(self, query, top_k, score_threshold):
        return list(self._results)

    async def fetch_by_ids(self, ids):
        return [self._neighbours[i] for i in ids if i in self._neighbours]


class _PassthroughReranker:
    async def rerank(self, query, candidates, top_n):
        return candidates[:top_n]


def _svc(store, top_n=5):
    return RAGService(store, _PassthroughReranker(), top_k=10, top_n=top_n, score_threshold=0.5)


def _video(id, video_id, score, start, end, gcs="videos/x.mp4", title="T", **kw):
    return RetrievalResult(
        id=id, score=score, text=f"text-{id}", source_type="video",
        video_id=video_id, start_ms=start, end_ms=end, gcs_object=gcs, title=title, **kw,
    )


def _doc(id, score, title="Doc"):
    return RetrievalResult(id=id, score=score, text=f"doc-{id}", source_type="document", title=title)


async def test_keeps_all_distinct_videos_for_multi_intent():
    # r1 (v1) + its neighbour c2 (v1) + a chunk from a different video v2. A multi-intent
    # answer keeps BOTH videos (each becomes its own clip downstream).
    r1 = _video("c1", "v1", 0.9, 1000, 3000, title="Auth", next_id="c2")
    r_other = _video("c9", "v2", 0.8, 65000, 70000, title="Billing")
    neighbour = _video("c2", "v1", 0.0, 3000, 5000, title="Auth")
    ctx = await _svc(_StubStore([r1, r_other], {"c2": neighbour})).query("auth and billing?")

    assert {r.video_id for r in ctx.video_results} == {"v1", "v2"}    # both videos kept
    assert set(ctx.source_ids) == {"c1", "c2", "c9"}                  # nothing dropped by video
    assert "00:01" in ctx.context_text                               # v1 span present
    assert "01:05" in ctx.context_text                               # v2 span (65_000 ms) present
    assert ctx.document_results == []                                # video-only → no doc sources
    assert ctx.top_score == 0.9


async def test_documents_kept_alongside_primary_video():
    r1 = _video("c1", "v1", 0.9, 1000, 3000, title="Auth")
    doc = _doc("d1", 0.7, title="Setup Guide")
    ctx = await _svc(_StubStore([r1, doc])).query("auth setup")

    assert "video Auth" in ctx.context_text                           # video labeled + timestamped
    assert "document Setup Guide" in ctx.context_text                 # document labeled, no timestamp
    assert [r.id for r in ctx.video_results] == ["c1"]                # clip source is video-only
    assert [r.id for r in ctx.document_results] == ["d1"]             # doc surfaced separately
    assert ctx.chunk_count == 2                                       # both ground the answer


async def test_documents_only_answer_has_no_video_results():
    d1 = _doc("d1", 0.8, title="Refund Policy")
    d2 = _doc("d2", 0.6, title="Billing FAQ")
    ctx = await _svc(_StubStore([d1, d2])).query("refunds?")

    assert ctx.video_results == []                                    # nothing to build a clip from
    assert {r.id for r in ctx.document_results} == {"d1", "d2"}       # both docs surfaced
    assert "document Refund Policy" in ctx.context_text
    assert ctx.chunk_count == 2
    assert ctx.top_score == 0.8                                       # still groundable → resolvable


async def test_query_empty_when_no_hits():
    ctx = await _svc(_StubStore([])).query("nothing")
    assert ctx.chunk_count == 0
    assert ctx.context_text == ""
    assert ctx.video_results == []


# ── "prefer latest" near-duplicate collapse ──────────────────────────────────────────

async def test_prefers_latest_when_old_and_new_cover_same_feature():
    # An old long video and a newer short clip cover the same feature (near-identical vectors,
    # different files) AND are equally relevant. The older one is dropped so the answer uses the
    # newer clip. (Relevance-aware: the newer only supersedes when it's at least as relevant.)
    old = _video("c_old", "v_old", 0.90, 1000, 3000, title="Export (old)",
                 vector=[1.0, 0.0, 0.0], indexed_at=100.0)
    new = _video("c_new", "v_new", 0.90, 1000, 3000, title="Export (new)",
                 vector=[1.0, 0.02, 0.0], indexed_at=200.0)
    ctx = await _svc(_StubStore([old, new])).query("how do I export?")
    assert {r.video_id for r in ctx.video_results} == {"v_new"}   # newest wins on a relevance tie
    assert ctx.source_ids == ["c_new"]                            # stale old chunk gone


def test_collapse_keeps_more_relevant_older_over_newer_mention():
    # Bug fix: a NEWER but LESS-relevant "passing mention" must NOT evict the older substantive
    # chunk. Relevance wins; recency only breaks ties.
    svc = _svc(_StubStore([]))
    old = _video("o1", "v_old", 0.95, 0, 0, vector=[1.0, 0.0, 0.0], indexed_at=100.0)   # substantive
    new = _video("n1", "v_new", 0.60, 0, 0, vector=[1.0, 0.02, 0.0], indexed_at=200.0)  # newer, shallow
    out = svc._collapse_stale([old, new])
    assert {c.id for c in out} == {"o1", "n1"}   # older kept (more relevant) — nothing dropped


def test_collapse_drops_all_older_chunks_of_the_same_feature():
    # A newer clip that is AT LEAST as relevant retires both older chunks of the same feature.
    svc = _svc(_StubStore([]))
    old1 = _video("o1", "v_old", 0.85, 0, 0, vector=[1.0, 0.0, 0.0], indexed_at=100.0)
    old2 = _video("o2", "v_old", 0.85, 0, 0, vector=[1.0, 0.01, 0.0], indexed_at=100.0)
    new = _video("n1", "v_new", 0.95, 0, 0, vector=[1.0, 0.02, 0.0], indexed_at=200.0)
    out = svc._collapse_stale([old1, old2, new])
    assert {c.id for c in out} == {"n1"}


def test_collapse_keeps_distinct_features_and_same_file_chunks():
    svc = _svc(_StubStore([]))
    a = _video("a1", "vA", 0.95, 0, 0, vector=[1.0, 0.0, 0.0], indexed_at=100.0)
    a2 = _video("a2", "vA", 0.50, 0, 0, vector=[1.0, 0.0, 0.0], indexed_at=100.0)  # same file
    b = _video("b1", "vB", 0.90, 0, 0, vector=[0.0, 1.0, 0.0], indexed_at=50.0)    # orthogonal
    out = svc._collapse_stale([a, a2, b])
    assert {c.id for c in out} == {"a1", "a2", "b1"}   # nothing collapsed


def test_collapse_keeps_both_when_recency_unknown_or_no_vectors():
    svc = _svc(_StubStore([]))
    # near-duplicate across files but neither has a timestamp → can't decide → keep both
    a = _video("a1", "vA", 0.95, 0, 0, vector=[1.0, 0.0], indexed_at=None)
    b = _video("b1", "vB", 0.90, 0, 0, vector=[1.0, 0.0], indexed_at=None)
    assert {c.id for c in svc._collapse_stale([a, b])} == {"a1", "b1"}
    # no vectors at all → fail-open, nothing dropped
    c = _video("c1", "vC", 0.95, 0, 0, indexed_at=100.0)
    d = _video("d1", "vD", 0.90, 0, 0, indexed_at=200.0)
    assert {x.id for x in svc._collapse_stale([c, d])} == {"c1", "d1"}
