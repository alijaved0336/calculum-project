from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qm
from config import settings
import logging

logger = logging.getLogger(__name__)

async def ensure_collections(client: AsyncQdrantClient) -> None:
    dims = settings.embed_dims
    existing = {c.name for c in (await client.get_collections()).collections}
    name = settings.collection_knowledge_base
    if name not in existing:
        await client.create_collection(
            collection_name=name,
            vectors_config=qm.VectorParams(size=dims, distance=qm.Distance.COSINE),
        )
        logger.info("Created collection %s", name)
    logger.info("Qdrant collections verified.")
