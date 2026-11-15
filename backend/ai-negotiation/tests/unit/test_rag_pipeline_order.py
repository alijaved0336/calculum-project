"""RAGService's stage order and the cross-encoder gate.

The old pipeline filtered on the dense score before the only component able to
judge relevance. On the live KB that score separates a real answer from gibberish
by ~0.05, while the cross-encoder separates the same pair by ~18 logits.
"""
from __future__ import annotations

from application.services.rag_service import RAGService
from domain.entities.retrieval_result import RetrievalResult


def _r(id_: str, text: str, score: float = 0.4, **kw) -> RetrievalResult:
    return RetrievalResult(
        id=id_, score=score, text=text, file_id="f", chunk_type="hybrid",
        page_numbers=[1], prev_id=kw.get("prev_id"), next_id=kw.get("next_id"),
        metadata={}, rerank_score=kw.get("rerank_score"),
    )


class _Store:
    def __init__(self, results, neighbours=None):
        self._results = results
        self._neighbours = neighbours or {}
        self.retrieve_kwargs = None

    async def retrieve(self, query, *, top_k, score_threshold, playbook_strategy_types=None):
        self.retrieve_kwargs = {"top_k": top_k, "score_threshold": score_threshold}
        return list(self._results)[:top_k]

    async def fetch_by_ids(self, ids):
        return [self._neighbours[i] for i in ids if i in self._neighbours]

    async def health_check(self):
        return True


class _CE:
    """Stand-in cross-encoder: scores come from a {text: logit} map."""

    def __init__(self, scores):
        self._scores = scores
        self.seen: list[str] = []

    async def rerank(self, query, candidates, top_n):
        import dataclasses
        self.seen = [c.text for c in candidates]
        scored = [
            dataclasses.replace(c, rerank_score=self._scores.get(c.text, -11.0))
            for c in candidates
        ]
        return sorted(scored, key=lambda r: r.rerank_score, reverse=True)[:top_n]


def _service(store, reranker, **over):
    kw = dict(
        top_k_retrieve=25, top_n_rerank=4, rerank_max_candidates=30,
        rerank_score_threshold=-4.0, dense_score_floor=None, context_max_chars=6000,
    )
    kw.update(over)
    return RAGService(vector_store=store, reranker=reranker, **kw)


async def test_duplicates_are_collapsed_before_the_reranker_sees_them():
    """59% of the live KB is duplicate text; deduping after retrieval with no
    back-fill is what turned top_k=5 into ONE unique chunk."""
    dupes = [_r(f"id{i}", "the same passage six times") for i in range(6)]
    unique = [_r("u1", "a genuinely different passage")]
    ce = _CE({"the same passage six times": 5.0, "a genuinely different passage": 4.0})

    await _service(_Store(dupes + unique), ce).query("q")

    assert ce.seen == ["the same passage six times", "a genuinely different passage"]


async def test_chunks_below_the_gate_are_dropped():
    ce = _CE({"BUYER_STANDARD_DEFINITION": 10.7, "UNRELATED_CONTRACT_CLAUSE": -7.4})
    ctx = await _service(
        _Store([_r("a", "BUYER_STANDARD_DEFINITION"), _r("b", "UNRELATED_CONTRACT_CLAUSE")]),
        ce,
    ).query("q")

    assert ctx.chunk_count == 1
    assert "BUYER_STANDARD_DEFINITION" in ctx.context_text
    assert "UNRELATED_CONTRACT_CLAUSE" not in ctx.context_text


async def test_an_all_noise_result_returns_no_context_at_all():
    """Answering from a confidently irrelevant passage is worse than answering
    from none — this is the sourdough/gibberish control."""
    ce = _CE({"junk one": -11.2, "junk two": -11.4})
    ctx = await _service(_Store([_r("a", "junk one"), _r("b", "junk two")]), ce).query("q")

    assert ctx.chunk_count == 0
    assert ctx.context_text == ""
    assert ctx.status == "empty"
    assert dict(ctx.stages)["passed_gate"] == 0


async def test_an_unjudged_chunk_fails_open():
    """ScorePassthroughReranker (CI) leaves rerank_score None; failing closed
    would silently empty the context everywhere the cross-encoder is absent."""
    class _Passthrough:
        async def rerank(self, query, candidates, top_n):
            return sorted(candidates, key=lambda r: r.score, reverse=True)[:top_n]

    ctx = await _service(_Store([_r("a", "some passage")]), _Passthrough()).query("q")

    assert ctx.chunk_count == 1


async def test_neighbours_are_spliced_after_their_parent_not_appended():
    """collect_rag_source shows chunk_file_info[0] as the cited passage, so the
    top-ranked chunk has to stay first."""
    parent = _r("p", "winner", next_id="n")
    neighbour = _r("n", "neighbour text", score=0.0)
    ce = _CE({"winner": 9.0})

    ctx = await _service(_Store([parent], {"n": neighbour}), ce).query("q")

    assert [c["id"] for c in ctx.chunk_file_info] == ["p", "n"]


async def test_the_dense_floor_is_passed_through_and_defaults_to_no_gate():
    store = _Store([_r("a", "x")])
    await _service(store, _CE({"x": 5.0})).query("q")
    assert store.retrieve_kwargs == {"top_k": 25, "score_threshold": None}


async def test_the_candidate_cap_bounds_cross_encoder_cost():
    """The cross-encoder is CPU-bound at ~60ms/pair."""
    many = [_r(f"id{i}", f"passage {i}") for i in range(50)]
    ce = _CE({f"passage {i}": 5.0 for i in range(50)})

    await _service(_Store(many), ce, top_k_retrieve=50, rerank_max_candidates=30).query("q")

    assert len(ce.seen) == 30
