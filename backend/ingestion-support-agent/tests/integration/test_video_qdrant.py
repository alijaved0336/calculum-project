import pytest

from config import settings
from domain.entities.ingestion import Chunk, ChunkType
from infrastructure.vector_store.ingestion_qdrant_adapter import build_video_point

pytestmark = pytest.mark.integration


def _video_chunk():
    return Chunk(
        id="00000000-0000-0000-0000-000000000001",
        text="how to set up authentication",
        page_numbers=[1],
        chunk_type=ChunkType.HYBRID,
        file_id="v1",
        metadata={
            "start_ms": 1000,
            "end_ms": 3000,
            "video_id": "v1",
            "gcs_object": "videos/v1.mp4",
            "title": "Auth setup",
        },
        embedding=[0.01] * settings.embed_dims,
        prev_id=None,
        next_id=None,
    )


async def test_upsert_and_retrieve_video_point(qdrant_mem):
    await qdrant_mem.upsert(
        collection_name=settings.collection_video_chunks,
        points=[build_video_point(_video_chunk())],
        wait=True,
    )
    res = await qdrant_mem.query_points(
        collection_name=settings.collection_video_chunks,
        query=[0.01] * settings.embed_dims,
        limit=1,
        with_payload=True,
    )
    assert res.points, "expected the upserted video point back"
    m = res.points[0].payload["metadata"]
    assert m["chunk_source"] == "video"
    assert m["start_ms"] == 1000
    assert m["end_ms"] == 3000
    assert m["video_id"] == "v1"
    assert res.points[0].payload["text"] == "how to set up authentication"
