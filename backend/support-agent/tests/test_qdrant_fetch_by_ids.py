from config import settings
from infrastructure.vector_store.qdrant_adapter import QdrantAdapter


class _Point:
    def __init__(self, id, payload):
        self.id = id
        self.payload = payload


class _FakeClient:
    def __init__(self, points):
        self._points = points
        self.last = None

    async def retrieve(self, collection_name, ids, with_payload, with_vectors):
        self.last = {"collection": collection_name, "ids": ids}
        return self._points


class _FakeEmbedder:
    async def embed_query(self, text):
        return [0.0] * settings.embed_dims


def _adapter(points):
    return QdrantAdapter(embedder=_FakeEmbedder(), client=_FakeClient(points))


async def test_fetch_by_ids_maps_points_with_zero_score():
    points = [
        _Point("c2", {"text": "next", "metadata": {"video_id": "v1", "start_ms": 3000, "end_ms": 5000}}),
        _Point("c0", {"text": "prev", "metadata": {"video_id": "v1", "start_ms": 0, "end_ms": 1000}}),
    ]
    res = await _adapter(points).fetch_by_ids(["c2", "c0"])
    assert len(res) == 2
    assert all(r.score == 0.0 for r in res)
    assert res[0].id == "c2" and res[0].end_ms == 5000


async def test_fetch_by_ids_empty_returns_empty():
    assert await _adapter([]).fetch_by_ids([]) == []
