"""Cross-encoder re-ranker for retrieved Qdrant chunks.

Uses ms-marco-MiniLM-L-6-v2 — small (22 MB), CPU-friendly, ~10ms per query.
Loaded once as a singleton; subsequent calls reuse the loaded model.

Usage:
    from evaluation.reranker import rerank_indices
    indices = rerank_indices(query, passages)   # sorted best-first
    reranked = [passages[i] for i in indices]
"""
from __future__ import annotations

import logging
import threading

logger = logging.getLogger(__name__)

_MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L-6-v2"
_model = None
_lock = threading.Lock()


def _get_model():
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                try:
                    from sentence_transformers import CrossEncoder
                    logger.info("reranker: loading %s…", _MODEL_NAME)
                    _model = CrossEncoder(_MODEL_NAME, max_length=512)
                    logger.info("reranker: model loaded")
                except ImportError:
                    raise ImportError(
                        "sentence-transformers is required for re-ranking.\n"
                        "Install it: uv add --dev sentence-transformers"
                    )
    return _model


def rerank_indices(query: str, passages: list[str]) -> list[int]:
    """Return passage indices sorted by relevance to query (best first).

    Args:
        query: The search query / question.
        passages: Candidate passages to re-rank.

    Returns:
        List of integer indices into `passages`, sorted most-relevant first.
    """
    if not passages:
        return []
    model = _get_model()
    pairs = [(query, p) for p in passages]
    scores = model.predict(pairs)
    return sorted(range(len(passages)), key=lambda i: scores[i], reverse=True)


def rerank(query: str, passages: list[str], top_k: int | None = None) -> list[str]:
    """Return passages re-ordered by relevance to query.

    Args:
        query: The search query / question.
        passages: Candidate passages to re-rank.
        top_k: If set, return only the top-K passages after re-ranking.

    Returns:
        Re-ordered list of passages (best first), optionally truncated to top_k.
    """
    indices = rerank_indices(query, passages)
    ranked = [passages[i] for i in indices]
    return ranked[:top_k] if top_k else ranked
