"""Layer 2: Embedding-based semantic coherence metrics."""
from __future__ import annotations

import math

from domain.entities.ingestion import Chunk


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0.0 or mag_b == 0.0:
        return 0.0
    return dot / (mag_a * mag_b)


def compute_embedding_metrics(chunks: list[Chunk], expected_dims: int) -> dict:
    """Analyse embedding quality for a list of chunks.

    Uses the embeddings already stored on each Chunk (populated by the pipeline
    and available after fetching from Qdrant with vectors=True).

    Args:
        chunks: Chunks — must have `.embedding` populated for any meaningful result.
        expected_dims: The configured embedding dimension (settings.embed_dims).
    """
    embedded = [c for c in chunks if c.embedding is not None]

    dim_violations = [c.id for c in embedded if len(c.embedding) != expected_dims]
    malformed = [
        c.id for c in embedded
        if any(not math.isfinite(v) for v in c.embedding)
    ]

    # Cosine similarity between consecutive embedded chunks
    sims: list[float] = []
    for i in range(len(embedded) - 1):
        sims.append(_cosine(embedded[i].embedding, embedded[i + 1].embedding))

    result: dict = {
        "embedded_count": len(embedded),
        "missing_embeddings": len(chunks) - len(embedded),
        "dim_violations": len(dim_violations),
        "malformed_vectors": len(malformed),
    }
    if sims:
        result["semantic_continuity"] = {
            "mean": round(sum(sims) / len(sims), 4),
            "min": round(min(sims), 4),
            "max": round(max(sims), 4),
        }
    return result
