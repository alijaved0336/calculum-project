from __future__ import annotations

import asyncio

from config import settings
from domain.entities.retrieval_result import RetrievalResult
from domain.ports.reranker_port import RerankerPort


class CrossEncoderAdapter(RerankerPort):
    """Cross-encoder reranking (default: ms-marco-MiniLM-L-6-v2).

    The model reads (query, chunk) jointly, which is far more precise than vector
    similarity. ``sentence-transformers`` is imported lazily so unit tests can inject
    a fake model without pulling in torch.
    """

    def __init__(self, model=None, model_name: str | None = None, model_factory=None) -> None:
        self._model = model
        self._model_name = model_name or settings.reranker_model
        self._model_factory = model_factory  # injectable for tests / custom loaders
        # One shared model instance; serialize predict so concurrent turns/users can't
        # corrupt each other's scores (sentence-transformers predict isn't concurrency-safe).
        self._lock = asyncio.Lock()

    def _get_model(self):
        if self._model is None:
            if self._model_factory is not None:
                self._model = self._model_factory(self._model_name)
            else:
                from sentence_transformers import CrossEncoder

                self._model = CrossEncoder(self._model_name)
        return self._model

    def load(self) -> "CrossEncoderAdapter":
        """Eagerly load the cross-encoder model. Call once at startup so the heavy
        load never happens on the event loop during the first query. Idempotent."""
        self._get_model()
        return self

    async def rerank(
        self, query: str, candidates: list[RetrievalResult], top_n: int
    ) -> list[RetrievalResult]:
        if not candidates:
            return []
        model = self._get_model()
        pairs = [(query, c.text) for c in candidates]
        async with self._lock:
            scores = await asyncio.to_thread(model.predict, pairs)
        # Stamp the cross-encoder relevance onto each candidate so downstream steps (e.g. the
        # relevance-aware "prefer latest" collapse) can compare rerank relevance without touching
        # the retrieval ``score`` that thresholds depend on.
        for c, s in zip(candidates, scores):
            c.rerank_score = float(s)
        ranked = sorted(zip(candidates, scores), key=lambda pair: pair[1], reverse=True)
        return [c for c, _ in ranked[:top_n]]
