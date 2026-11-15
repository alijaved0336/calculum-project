from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qm
from config import settings
import logging

logger = logging.getLogger(__name__)

async def ensure_collections(client: AsyncQdrantClient) -> None:
    dims = settings.embed_dims
    existing = {c.name for c in (await client.get_collections()).collections}
    name = settings.collection_video_chunks
    if name not in existing:
        await client.create_collection(
            collection_name=name,
            vectors_config=qm.VectorParams(size=dims, distance=qm.Distance.COSINE),
        )
        logger.info("Created collection %s", name)

    # Keyword index on the source discriminator so query-side chunk_source filters
    # (video vs document) are fast. Idempotent — ignore "already exists".
    try:
        await client.create_payload_index(
            collection_name=name,
            field_name="metadata.chunk_source",
            field_schema=qm.PayloadSchemaType.KEYWORD,
        )
    except Exception as exc:  # index already present or transient — safe to ignore
        logger.debug("payload index metadata.chunk_source: %s", exc)
    logger.info("Qdrant collections verified.")
