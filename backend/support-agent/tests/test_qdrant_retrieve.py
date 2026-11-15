from config import settings
from infrastructure.vector_store.qdrant_adapter import QdrantAdapter


class _Hit:
    def __init__(self, id, score, payload, vector=None):
        self.id = id
        self.score = score
        self.payload = payload
        self.vector = vector


class _Resp:
    def __init__(self, points):
        self.points = points


class _FakeClient:
    def __init__(self, points):
        self._points = points
        self.last = None

    async def query_points(
        self, collection_name, query, limit, query_filter, with_payload, score_threshold,
        with_vectors=False,
    ):
        self.last = {
            "collection": collection_name, "limit": limit, "threshold": score_threshold,
            "with_vectors": with_vectors,
        }
        return _Resp(self._points)


class _FakeEmbedder:
    async def embed_query(self, text):
        return [0.01] * settings.embed_dims


def _hit():
    return _Hit(
        id="c1",
        score=0.9,
        payload={
            "text": "how to set up auth",
            "metadata": {
                "file_id": "v1",
                "video_id": "v1",
                "chunk_source": "video",
                "start_ms": 1000,
                "end_ms": 3000,
                "gcs_object": "videos/v1.mp4",
                "title": "Auth",
                "chunk_type": "hybrid",
                "prev_id": None,
                "next_id": "c2",
                "created_at": "2026-07-30T00:00:00+00:00",
            },
        },
        vector=[0.1, 0.2, 0.3],
    )


async def test_retrieve_maps_video_fields_and_uses_video_collection():
    client = _FakeClient([_hit()])
    adapter = QdrantAdapter(embedder=_FakeEmbedder(), client=client)
    results = await adapter.retrieve("auth?", top_k=5, score_threshold=0.5)
    assert client.last["collection"] == settings.collection_video_chunks
    assert client.last["with_vectors"] is True                 # needed for near-dup collapse
    r = results[0]
    assert r.id == "c1"
    assert r.video_id == "v1"
    assert r.start_ms == 1000
    assert r.end_ms == 3000
    assert r.gcs_object == "videos/v1.mp4"
    assert r.next_id == "c2"
    assert r.source_type == "video"
    assert r.text == "how to set up auth"
    assert r.vector == [0.1, 0.2, 0.3]                          # vector carried through
    assert r.indexed_at is not None                            # created_at parsed to epoch
