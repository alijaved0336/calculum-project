from __future__ import annotations

from domain.entities.rag_context import RAGContext


def is_resolved(rag_context: RAGContext, threshold: float) -> bool:
    """A turn is resolved only if we retrieved grounding above the answerable threshold."""
    if rag_context.chunk_count == 0:
        return False
    return rag_context.top_score >= threshold
