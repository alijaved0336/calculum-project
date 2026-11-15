from __future__ import annotations
import time

from domain.entities.pipeline import DocumentChunk


def group_by_page(chunks: list[DocumentChunk]) -> dict[int, list[DocumentChunk]]:
    """Bucket *chunks* by their page_number metadata field.

    Defaults to page 1 when the field is absent so callers don't need to
    guard against missing metadata — files like plain text have no pages.
    """
    pages: dict[int, list[DocumentChunk]] = {}
    for chunk in chunks:
        p_num = chunk.metadata.get("page_number", 1)
        pages.setdefault(p_num, []).append(chunk)
    return pages


def stamp_metadata(chunks: list[DocumentChunk], doc_type: str) -> None:
    """Attach ingestion provenance fields to each chunk in-place.

    Called just before writing to the vector store so doc_type and
    ingested_at are always present, regardless of which loader produced
    the chunk.
    """
    ts = time.time()
    for chunk in chunks:
        chunk.metadata.update({
            "doc_type": doc_type,
            "source_type": "document",
            "ingested_at": ts,
        })
