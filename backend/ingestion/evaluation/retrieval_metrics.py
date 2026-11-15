"""Layer 3: Retrieval quality metrics — hit rate and MRR against Qdrant.

Computes two sets of metrics:
  vector_search  — Qdrant cosine similarity only (baseline)
  reranked        — vector search + cross-encoder re-ranker (ms-marco-MiniLM-L-6-v2)

Comparing both shows the precision gain from re-ranking.
"""
from __future__ import annotations

import logging

from domain.entities.ingestion import Chunk, ChunkType
from evaluation.qdrant_search import search as qdrant_search

logger = logging.getLogger(__name__)

_K_VALUES = [1, 3, 5]


def _first_sentence(text: str) -> str:
    """Extract the first meaningful sentence from a chunk as a synthetic query."""
    for sep in (". ", "! ", "? ", "\n"):
        idx = text.find(sep)
        if idx > 20:
            return text[: idx + 1].strip()
    return text[:200].strip()


def _compute_hits(result_ids: list[str], target_id: str, ks: list[int]) -> tuple[dict, float]:
    """Compute hit_at dict and reciprocal rank for a single query result."""
    hit_at = {k: int(target_id in result_ids[:k]) for k in ks}
    try:
        rr = 1.0 / (result_ids.index(target_id) + 1)
    except ValueError:
        rr = 0.0
    return hit_at, rr


async def compute_retrieval_metrics(
    chunks: list[Chunk],
    embedder,
    client,
    collection: str,
    top_k: int = 3,
) -> dict:
    """Evaluate retrieval quality using synthetic queries derived from chunk text.

    For each chunk, the first sentence is used as a query (no LLM needed).
    The chunk's own ID is the ground-truth target.

    Returns both vector-search-only and re-ranked metrics for comparison.

    Args:
        chunks: Chunks to evaluate (should be from a single ingested document).
        embedder: AsyncQwenEmbedder instance for embedding queries.
        client: AsyncQdrantClient instance.
        collection: Qdrant collection name.
        top_k: Maximum K value for hit-rate calculation.
    """
    if not chunks:
        return {}

    ks = sorted(set(_K_VALUES + [top_k]))
    search_limit = max(ks + [10])

    queries = [
        (c.id, _first_sentence(c.text))
        for c in chunks
        if len(c.text.split()) > 8
    ]

    if not queries:
        return {"error": "no chunks with sufficient text for query generation"}

    # ── Load re-ranker (lazy, singleton) ──────────────────────────────────────
    try:
        from evaluation.reranker import rerank_indices
        _rerank_available = True
    except ImportError:
        logger.warning("retrieval: sentence-transformers not installed — skipping re-rank metrics")
        _rerank_available = False

    # ── Per-query accumulators ────────────────────────────────────────────────
    vec_hit_at: dict[int, int] = {k: 0 for k in ks}
    vec_rrs: list[float] = []
    rrk_hit_at: dict[int, int] = {k: 0 for k in ks}
    rrk_rrs: list[float] = []

    for chunk_id, query_text in queries:
        dummy = Chunk(
            id="__query__",
            text=query_text,
            page_numbers=[0],
            chunk_type=ChunkType.RECURSIVE,
            file_id="__eval__",
            metadata={},
        )
        embedded = embedder.embed_one_sync(dummy)
        results = await qdrant_search(client, collection, embedded.embedding, top_k=search_limit)

        # Vector-search-only ranking
        vec_ids = [str(r.id) for r in results]
        hits, rr = _compute_hits(vec_ids, chunk_id, ks)
        for k in ks:
            vec_hit_at[k] += hits[k]
        vec_rrs.append(rr)

        # Cross-encoder re-ranked ranking
        if _rerank_available:
            texts = [r.payload.get("text", "") if r.payload else "" for r in results]
            ranked_idx = rerank_indices(query_text, texts)
            rrk_ids = [vec_ids[i] for i in ranked_idx]
            hits, rr = _compute_hits(rrk_ids, chunk_id, ks)
            for k in ks:
                rrk_hit_at[k] += hits[k]
            rrk_rrs.append(rr)

    n = len(queries)
    if not n:
        return {}

    # ── Format output ─────────────────────────────────────────────────────────
    out: dict = {"query_count": n}

    # Vector search baseline
    out["mrr"] = round(sum(vec_rrs) / n, 4)
    for k in ks:
        out[f"hit_rate@{k}"] = round(vec_hit_at[k] / n, 4)

    # Re-ranked (shown separately for comparison)
    if _rerank_available:
        reranked: dict = {"mrr": round(sum(rrk_rrs) / n, 4)}
        for k in ks:
            reranked[f"hit_rate@{k}"] = round(rrk_hit_at[k] / n, 4)
        out["reranked"] = reranked

    logger.info(
        "retrieval_metrics: %d queries  vec hit@1=%.3f mrr=%.3f  rrk hit@1=%.3f mrr=%.3f",
        n,
        out["hit_rate@1"],
        out["mrr"],
        out.get("reranked", {}).get("hit_rate@1", 0),
        out.get("reranked", {}).get("mrr", 0),
    )
    return out
