from __future__ import annotations

from dataclasses import dataclass, field

from domain.entities.retrieval_result import RetrievalResult


@dataclass
class RAGContext:
    """Injection-ready context block plus the video results behind it."""

    context_text: str
    source_ids: list[str]
    chunk_count: int
    query: str
    video_results: list[RetrievalResult] = field(default_factory=list)
    document_results: list[RetrievalResult] = field(default_factory=list)
    top_score: float = 0.0
