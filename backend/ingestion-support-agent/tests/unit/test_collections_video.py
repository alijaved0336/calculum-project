import pytest

from config import settings
from infrastructure.vector_store.collections import ensure_collections


class FakeClient:
    def __init__(self):
        self.created = []

    async def get_collections(self):
        class R:
            collections = []

        return R()

    async def create_collection(self, collection_name, vectors_config):
        self.created.append((collection_name, vectors_config.size, str(vectors_config.distance)))


@pytest.mark.asyncio
async def test_creates_video_collection():
    c = FakeClient()
    await ensure_collections(c)
    names = {n for (n, _sz, _d) in c.created}
    assert settings.collection_video_chunks in names
    size = next(sz for (n, sz, _d) in c.created if n == settings.collection_video_chunks)
    assert size == settings.embed_dims
