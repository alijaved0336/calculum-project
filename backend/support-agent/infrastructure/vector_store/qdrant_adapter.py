from __future__ import annotations

from config import settings
from domain.entities.retrieval_result import RetrievalResult
from domain.ports.embedding_port import EmbeddingPort
from domain.ports.vector_store_port import VectorStorePort


class QdrantAdapter(VectorStorePort):
    """Retrieval over the single ``video-chunks-v1`` collection.

    The AI Negotiation document KB collection is intentionally never queried here —
    this agent's knowledge base is videos only.
    """

    def __init__(self, embedder: EmbeddingPort, client) -> None:
        self._embedder = embedder
        self._client = client
        self._collection = settings.collection_video_chunks

    async def retrieve(
        self, query: str, top_k: int, score_threshold: float
    ) -> list[RetrievalResult]:
        vector = await self._embedder.embed_query(query)
        resp = await self._client.query_points(
            collection_name=self._collection,
            query=vector,
            limit=top_k,
            query_filter=None,
            with_payload=True,
            with_vectors=True,  # needed for the "prefer latest" near-duplicate collapse
            score_threshold=score_threshold,
        )
        return [
            RetrievalResult.from_payload(h.id, h.score, h.payload, getattr(h, "vector", None))
            for h in resp.points
        ]

    async def fetch_by_ids(self, ids: list[str]) -> list[RetrievalResult]:
        if not ids:
            return []
        points = await self._client.retrieve(
            collection_name=self._collection, ids=ids, with_payload=True, with_vectors=True
        )
        return [
            RetrievalResult.from_payload(p.id, 0.0, p.payload, getattr(p, "vector", None))
            for p in points
        ]

    @staticmethod
    def _file_filter(file_uuid: str):
        """Match every chunk of a file. Ingestion stamps the id on both ``file_uuid`` (top-level)
        and ``metadata.file_id`` — for videos (transcript chunks) and documents alike — so match
        either."""
        from qdrant_client.models import FieldCondition, Filter, MatchValue

        return Filter(
            should=[
                FieldCondition(key="file_uuid", match=MatchValue(value=file_uuid)),
                FieldCondition(key="metadata.file_id", match=MatchValue(value=file_uuid)),
            ]
        )

    async def delete_by_file(self, file_uuid: str) -> None:
        """Delete all chunks for a file. Idempotent: deleting a filter that matches nothing is a
        no-op."""
        await self._client.delete(
            collection_name=self._collection,
            points_selector=self._file_filter(file_uuid),
            wait=True,
        )

    async def scroll_by_file(self, file_uuid: str) -> list[RetrievalResult]:
        """List every chunk of a file via paginated scroll (no vector search). Vectors are omitted
        — the segment manager only needs text + timing, keeping the payload small for long
        videos."""
        results: list[RetrievalResult] = []
        offset = None
        while True:
            points, offset = await self._client.scroll(
                collection_name=self._collection,
                scroll_filter=self._file_filter(file_uuid),
                limit=256,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            )
            results.extend(
                RetrievalResult.from_payload(p.id, 0.0, p.payload) for p in points
            )
            if offset is None:
                break
        return results

    async def delete_by_ids(self, ids: list[str]) -> int:
        """Delete specific chunks by point id. Idempotent — Qdrant treats unknown ids as no-ops."""
        if not ids:
            return 0
        from qdrant_client.models import PointIdsList

        await self._client.delete(
            collection_name=self._collection,
            points_selector=PointIdsList(points=ids),
            wait=True,
        )
        return len(ids)

    async def count_by_file(self, file_uuid: str) -> int:
        """Exact count of a file's chunks (authoritative post-delete count)."""
        resp = await self._client.count(
            collection_name=self._collection,
            count_filter=self._file_filter(file_uuid),
            exact=True,
        )
        return int(resp.count)
