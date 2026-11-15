from __future__ import annotations
import logging
import time
from domain.entities.ingestion import Chunk
from domain.ports.vector_store import VectorStorePort

logger = logging.getLogger(__name__)


class AsyncIngestionQdrantAdapter(VectorStorePort):

    def __init__(self, client, collection: str, upsert_batch_size: int = 64) -> None:
        self._client = client  # AsyncQdrantClient
        self._collection = collection
        self._batch_size = upsert_batch_size

    async def ensure_collection(self, vector_size: int) -> None:
        from qdrant_client.models import (
            Distance, VectorParams, OptimizersConfigDiff, HnswConfigDiff,
        )
        try:
            await self._client.get_collection(self._collection)
        except Exception as exc:
            if "not found" in str(exc).lower() or "404" in str(exc):
                await self._client.create_collection(
                    collection_name=self._collection,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE, on_disk=True),
                    # Flush temp segments to disk-indexed segments after 1k vectors
                    # so temp_segments don't accumulate indefinitely in GCS.
                    optimizers_config=OptimizersConfigDiff(
                        indexing_threshold=1000,
                        memmap_threshold=1000,
                    ),
                    hnsw_config=HnswConfigDiff(on_disk=True),
                    on_disk_payload=True,
                )
                logger.info("qdrant.collection_created collection=%s size=%d", self._collection, vector_size)
            else:
                raise

    async def upsert(self, chunks: list[Chunk]) -> tuple[int, int]:
        from qdrant_client.models import PointStruct
        points_total, batches_total = 0, 0
        batches = [chunks[i : i + self._batch_size] for i in range(0, len(chunks), self._batch_size)]

        for batch in batches:
            points = [
                PointStruct(id=c.id, vector=c.embedding, payload={
                    "text": c.text,
                    "file_uuid": c.file_id,
                    "metadata": {
                        "page_numbers": c.page_numbers,
                        "chunk_type": str(c.chunk_type),
                        "prev_id": c.prev_id,
                        "next_id": c.next_id,
                        **c.metadata,
                    },
                })
                for c in batch if c.embedding is not None
            ]
            if not points:
                continue
            t0 = time.perf_counter()
            await self._client.upsert(collection_name=self._collection, points=points, wait=True)
            elapsed = time.perf_counter() - t0
            logger.info("qdrant.batch_insert size=%d duration=%.2fs status=success", len(points), elapsed)
            points_total += len(points)
            batches_total += 1

        return points_total, batches_total

    async def delete_by_file_uuid(self, file_uuid: str) -> None:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        await self._client.delete(
            collection_name=self._collection,
            points_selector=Filter(should=[
                FieldCondition(key="file_uuid", match=MatchValue(value=file_uuid)),
                FieldCondition(key="metadata.file_id", match=MatchValue(value=file_uuid)),
            ]),
            wait=True,
        )
        logger.info("qdrant.points_deleted file_uuid=%s collection=%s", file_uuid, self._collection)
