from __future__ import annotations

import asyncio
import dataclasses
import logging
from functools import partial

from sentence_transformers import CrossEncoder

from domain.entities.retrieval_result import RetrievalResult
from domain.ports.reranker_port import RerankerPort

logger = logging.getLogger(__name__)


class CrossEncoderAdapter(RerankerPort):
    """Cross-encoder reranker backed by sentence-transformers.

    `CrossEncoder.predict()` is synchronous and CPU-bound; it is dispatched to
    the default thread-pool executor so the FastAPI event loop is never blocked.
    The model is loaded eagerly at construction time so the first query is not
    penalised by model initialisation cost.

    The score this produces is the pipeline's only usable relevance signal. On
    the live KB, dense cosine separates a real answer from gibberish by ~0.05,
    while this model separates the same pair by ~18 logits. It used to be
    computed, sorted on, and then discarded — every returned chunk still carried
    only its dense score, so nothing downstream could tell a good passage from a
    bad one. It is now attached to each result as `rerank_score`.
    """

    def __init__(self, model_name: str) -> None:
        self._model = CrossEncoder(model_name)

    def _predict_sync(self, query: str, texts: list[str]) -> list[float]:
        pairs = [(query, text) for text in texts]
        scores = self._model.predict(pairs)
        return scores.tolist()

    async def rerank(
        self,
        query: str,
        candidates: list[RetrievalResult],
        top_n: int,
    ) -> list[RetrievalResult]:
        if not candidates:
            return []

        texts = [r.text for r in candidates]
        loop = asyncio.get_running_loop()
        scores: list[float] = await loop.run_in_executor(
            None,
            partial(self._predict_sync, query, texts),
        )

        # `replace` rather than mutation: neighbour chunks come from
        # `fetch_by_ids` and may be shared with another in-flight result list.
        scored = [
            dataclasses.replace(result, rerank_score=float(score))
            for score, result in zip(scores, candidates)
        ]
        ranked = sorted(scored, key=lambda r: r.rerank_score or 0.0, reverse=True)

        # Log EVERY candidate, not just the survivors: this is the only place the
        # score distribution is observable, and it is what the
        # `rag_rerank_score_threshold` gate has to be calibrated against.
        for i, r in enumerate(ranked, 1):
            logger.info(
                "  rerank[%d] ce_score=%+.2f dense=%.4f id=%s pages=%s text_preview=%r",
                i,
                r.rerank_score if r.rerank_score is not None else float("nan"),
                r.score,
                r.id,
                r.page_numbers,
                r.text[:100],
            )

        return ranked[:top_n]
