"""Layer 1: Structural chunk quality metrics — no model calls required."""
from __future__ import annotations

import statistics
from typing import Callable

from domain.entities.ingestion import Chunk, ChunkType


def _word_set(text: str) -> set[str]:
    return set(text.lower().split())


def compute_chunk_metrics(
    chunks: list[Chunk],
    count_tokens: Callable[[str], int],
) -> dict:
    """Return structural metrics for a list of chunks.

    Args:
        chunks: The chunks to evaluate.
        count_tokens: A callable that returns the token count for a given text
                      (reuses the existing Qwen tokenizer).
    """
    if not chunks:
        return {}

    token_counts = [count_tokens(c.text) for c in chunks]

    sorted_counts = sorted(token_counts)
    n = len(sorted_counts)

    def _percentile(p: float) -> float:
        idx = min(int(n * p / 100), n - 1)
        return float(sorted_counts[idx])

    # Consecutive word-level overlap (Jaccard similarity)
    overlaps: list[float] = []
    for i in range(len(chunks) - 1):
        a = _word_set(chunks[i].text)
        b = _word_set(chunks[i + 1].text)
        union = a | b
        overlaps.append(len(a & b) / len(union) if union else 0.0)

    # Chunk type distribution
    type_counts: dict[str, int] = {t.value: 0 for t in ChunkType}
    for c in chunks:
        type_counts[c.chunk_type.value] += 1

    # Empty / near-empty chunks (< 10 tokens)
    empty = sum(1 for tc in token_counts if tc < 10)

    return {
        "chunk_count": n,
        "token_stats": {
            "mean": round(statistics.mean(token_counts), 2),
            "stdev": round(statistics.stdev(token_counts) if n > 1 else 0.0, 2),
            "min": sorted_counts[0],
            "max": sorted_counts[-1],
            "p5": _percentile(5),
            "p25": _percentile(25),
            "p75": _percentile(75),
            "p95": _percentile(95),
        },
        "overlap": {
            "mean": round(statistics.mean(overlaps) if overlaps else 0.0, 4),
            "max": round(max(overlaps) if overlaps else 0.0, 4),
        },
        "type_distribution": type_counts,
        "empty_chunks": empty,
    }
