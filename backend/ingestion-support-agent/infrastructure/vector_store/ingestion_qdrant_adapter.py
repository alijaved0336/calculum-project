from __future__ import annotations
import logging
import time
from domain.entities.ingestion import Chunk
from domain.ports.vector_store import VectorStorePort

logger = logging.getLogger(__name__)


def build_point(chunk: Chunk, chunk_source: str | None = None):
    """Build a Qdrant PointStruct from a chunk.

    ``chunk_source`` (e.g. ``"video"``) is forced into the payload metadata so the
    query side can tell video transcript chunks from document chunks regardless of
    what the chunk's own metadata already contains.
    """
    from qdrant_client.models import PointStruct

    metadata = {
        "file_id": chunk.file_id,
        "page_numbers": chunk.page_numbers,
        "chunk_type": str(chunk.chunk_type),
        "prev_id": chunk.prev_id,
        "next_id": chunk.next_id,
        **chunk.metadata,
    }
    if chunk_source is not None:
        metadata["chunk_source"] = chunk_source
    return PointStruct(
        id=chunk.id,
        vector=chunk.embedding,
        payload={"text": chunk.text, "file_uuid": chunk.file_id, "metadata": metadata},
    )


def build_video_point(chunk: Chunk):
    """Build a PointStruct for a video transcript chunk (chunk_source='video')."""
    return build_point(chunk, chunk_source="video")


class AsyncIngestionQdrantAdapter(VectorStorePort):

    def __init__(
        self, client, collection: str, upsert_batch_size: int = 64, chunk_source: str | None = None
    ) -> None:
        self._client = client  # AsyncQdrantClient
        self._collection = collection
        self._batch_size = upsert_batch_size
        self._chunk_source = chunk_source  # tags every point ("video" | "document") for query-side filtering

    async def ensure_collection(self, vector_size: int) -> None:
        from qdrant_client.models import Distance, VectorParams
        try:
            await self._client.get_collection(self._collection)
        except Exception as exc:
            if "not found" in str(exc).lower() or "404" in str(exc):
                await self._client.create_collection(
                    collection_name=self._collection,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
                )
                logger.info("qdrant.collection_created collection=%s size=%d", self._collection, vector_size)
            else:
                raise

    async def _upsert_with_retry(self, points, attempts: int = 3) -> None:
        """Upsert a batch, retrying transient Qdrant errors (timeouts / 5xx / dropped
        responses) with exponential backoff. Under concurrent load these surface as
        ResponseHandlingException / UnexpectedResponse and previously hard-failed the job."""
        import asyncio

        try:
            from qdrant_client.http.exceptions import ResponseHandlingException, UnexpectedResponse
            transient: tuple = (ResponseHandlingException, UnexpectedResponse, TimeoutError, ConnectionError)
        except Exception:  # noqa: BLE001 — qdrant internals moved; fall back to a broad transient set
            transient = (TimeoutError, ConnectionError)

        last: Exception | None = None
        for attempt in range(1, attempts + 1):
            try:
                await self._client.upsert(collection_name=self._collection, points=points, wait=True)
                return
            except transient as exc:
                last = exc
                logger.warning(
                    "qdrant.upsert_retry attempt=%d/%d size=%d error=%s",
                    attempt, attempts, len(points), type(exc).__name__,
                )
                if attempt < attempts:
                    await asyncio.sleep(0.5 * (2 ** (attempt - 1)))  # 0.5s, 1s, 2s
        raise last if last else RuntimeError("qdrant upsert failed")

    async def upsert(self, chunks: list[Chunk]) -> tuple[int, int]:
        points_total, batches_total = 0, 0
        batches = [chunks[i : i + self._batch_size] for i in range(0, len(chunks), self._batch_size)]

        for batch in batches:
            points = [build_point(c, self._chunk_source) for c in batch if c.embedding is not None]
            if not points:
                continue
            t0 = time.perf_counter()
            await self._upsert_with_retry(points)
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

    async def set_metadata_fields(self, file_uuid: str, fields: dict) -> None:
        """Merge arbitrary keys into every chunk's ``metadata`` (e.g. an is_public toggle),
        so a flag change reflects at query time without re-ingesting. Same filter/merge as
        ``set_metadata_title``."""
        if not fields:
            return
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        await self._client.set_payload(
            collection_name=self._collection,
            payload=fields,
            key="metadata",
            points=Filter(should=[
                FieldCondition(key="file_uuid", match=MatchValue(value=file_uuid)),
                FieldCondition(key="metadata.file_id", match=MatchValue(value=file_uuid)),
            ]),
            wait=True,
        )
        logger.info("qdrant.metadata_updated file_uuid=%s fields=%s", file_uuid, list(fields.keys()))

    async def set_metadata_title(self, file_uuid: str, title: str) -> None:
        """Update ``metadata.title`` on every chunk of a media item.

        The query side reads the source/clip title from the chunk payload
        (``metadata.title``), so a title edit that only touched Postgres would leave chat
        answers citing the old title. ``key='metadata'`` merges into the nested object
        without clobbering the other metadata fields (file_id, chunk_source, …).
        """
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        await self._client.set_payload(
            collection_name=self._collection,
            payload={"title": title},
            key="metadata",
            points=Filter(should=[
                FieldCondition(key="file_uuid", match=MatchValue(value=file_uuid)),
                FieldCondition(key="metadata.file_id", match=MatchValue(value=file_uuid)),
            ]),
            wait=True,
        )
        logger.info("qdrant.title_updated file_uuid=%s collection=%s", file_uuid, self._collection)
