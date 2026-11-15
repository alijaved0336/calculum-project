from config import settings
from infrastructure.vector_store.qdrant_adapter import QdrantAdapter


class _FakeEmbedder:
    async def embed_query(self, text):
        return [0.0] * settings.embed_dims


class _FakeClient:
    def __init__(self):
        self.last = None

    async def delete(self, collection_name, points_selector, wait):
        self.last = {"collection": collection_name, "selector": points_selector, "wait": wait}


def _adapter():
    client = _FakeClient()
    return QdrantAdapter(embedder=_FakeEmbedder(), client=client), client


async def test_delete_by_file_matches_both_id_fields():
    adapter, client = _adapter()
    await adapter.delete_by_file("vid-123")

    assert client.last is not None
    assert client.last["collection"] == settings.collection_video_chunks
    assert client.last["wait"] is True

    # The filter should match EITHER top-level file_uuid OR nested metadata.file_id.
    conds = client.last["selector"].should
    keys = {c.key: c.match.value for c in conds}
    assert keys == {"file_uuid": "vid-123", "metadata.file_id": "vid-123"}
