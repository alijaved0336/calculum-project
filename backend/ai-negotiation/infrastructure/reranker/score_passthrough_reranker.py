from __future__ import annotations

from domain.entities.retrieval_result import RetrievalResult
from domain.ports.reranker_port import RerankerPort


class ScorePassthroughReranker(RerankerPort):
    """Fallback reranker that returns candidates ordered by their original
    Qdrant vector-search score, keeping the top_n highest-scored results.

    Use in environments where sentence-transformers is unavailable (e.g. CI,
    unit tests) by overriding the `get_reranker` FastAPI dependency.

    Deliberately leaves `rerank_score` as None. There is no cross-encoder here,
    so there is no relevance judgement to report — and `RAGService` treats a
    None score as "unjudged, let it through". Writing a fake score instead would
    either fail every chunk closed or make CI silently disagree with production
    about which chunks are good.
    """

    async def rerank(
        self,
        query: str,
        candidates: list[RetrievalResult],
        top_n: int,
    ) -> list[RetrievalResult]:
        sorted_candidates = sorted(candidates, key=lambda r: r.score, reverse=True)
        return sorted_candidates[:top_n]
