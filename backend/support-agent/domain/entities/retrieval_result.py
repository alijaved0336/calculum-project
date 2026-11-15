from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


def _parse_indexed_at(value: Any) -> float | None:
    """Parse a chunk's ``metadata.created_at`` (ISO-8601) into an epoch float for recency
    comparison. Missing/unparseable → None, which callers treat as oldest (never wins)."""
    if not value or not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
    except (ValueError, TypeError):
        return None


@dataclass
class RetrievalResult:
    """A retrieved (or neighbour) video transcript chunk.

    Video-specific fields (video_id/start_ms/end_ms/gcs_object) are hoisted from the
    Qdrant payload metadata so the RAG service and clip builder can use them directly.
    ``vector`` and ``indexed_at`` back the "prefer latest" near-duplicate collapse.
    """

    id: str
    score: float
    text: str
    source_type: str = "video"
    video_id: str | None = None
    start_ms: int | None = None
    end_ms: int | None = None
    gcs_object: str | None = None
    title: str | None = None
    chunk_type: str | None = None
    prev_id: str | None = None
    next_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    vector: list[float] | None = None
    indexed_at: float | None = None  # epoch seconds from metadata.created_at (None = oldest)
    # Cross-encoder relevance from the reranker (set in RerankerPort.rerank). Kept SEPARATE from
    # ``score`` (the 0–1 retrieval score that answerable thresholds depend on) because encoder
    # logits are a different scale. None until reranked.
    rerank_score: float | None = None

    @classmethod
    def from_payload(cls, id: str, score: float, payload: dict, vector: Any = None) -> "RetrievalResult":
        meta = payload.get("metadata", {}) or {}
        return cls(
            id=str(id),
            score=score,
            text=payload.get("text", ""),
            source_type=meta.get("chunk_source", "video"),
            video_id=meta.get("video_id"),
            start_ms=meta.get("start_ms"),
            end_ms=meta.get("end_ms"),
            gcs_object=meta.get("gcs_object"),
            title=meta.get("title"),
            chunk_type=meta.get("chunk_type"),
            prev_id=meta.get("prev_id"),
            next_id=meta.get("next_id"),
            metadata=meta,
            vector=list(vector) if vector is not None else None,
            indexed_at=_parse_indexed_at(meta.get("created_at")),
        )
