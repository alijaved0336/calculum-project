"""Thin async helpers for read-only Qdrant operations used in evaluation.

Wraps AsyncQdrantClient directly so the existing write-only port interface
does not need to be modified.
"""
from __future__ import annotations

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qm


async def search(
    client: AsyncQdrantClient,
    collection: str,
    query_vector: list[float],
    top_k: int = 10,
    filter_: qm.Filter | None = None,
) -> list[qm.ScoredPoint]:
    # qdrant-client >= 1.7 uses query_points(); search() was removed.
    result = await client.query_points(
        collection_name=collection,
        query=query_vector,
        limit=top_k,
        query_filter=filter_,
        with_payload=True,
        with_vectors=False,
    )
    return result.points


async def scroll_by_file_uuid(
    client: AsyncQdrantClient,
    collection: str,
    file_uuid: str,
    limit: int = 2000,
) -> list[qm.Record]:
    """Fetch all points for a given file_uuid, with vectors included."""
    records, _ = await client.scroll(
        collection_name=collection,
        scroll_filter=qm.Filter(
            must=[
                qm.FieldCondition(
                    key="file_uuid",
                    match=qm.MatchValue(value=file_uuid),
                )
            ]
        ),
        limit=limit,
        with_payload=True,
        with_vectors=True,
    )
    return records
