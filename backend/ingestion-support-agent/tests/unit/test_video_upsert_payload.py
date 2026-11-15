from domain.entities.ingestion import Chunk, ChunkType
from infrastructure.vector_store.ingestion_qdrant_adapter import build_video_point


def _chunk():
    return Chunk(
        id="v1_c1",
        text="how to set up auth",
        page_numbers=[1],
        chunk_type=ChunkType.HYBRID,
        file_id="v1",
        metadata={
            "start_ms": 1000,
            "end_ms": 3000,
            "video_id": "v1",
            "gcs_object": "videos/v1.mp4",
            "title": "T",
        },
        embedding=[0.0] * 2560,
        prev_id=None,
        next_id=None,
    )


def test_video_point_payload_has_video_fields():
    p = build_video_point(_chunk())
    m = p.payload["metadata"]
    assert m["chunk_source"] == "video"
    assert m["start_ms"] == 1000
    assert m["end_ms"] == 3000
    assert m["video_id"] == "v1"
    assert m["gcs_object"] == "videos/v1.mp4"
    assert p.payload["text"] == "how to set up auth"
    assert p.id == "v1_c1"


def test_video_point_forces_source_even_if_absent():
    c = _chunk()
    c.metadata.pop("video_id", None)  # chunk_source must be set regardless of metadata contents
    p = build_video_point(c)
    assert p.payload["metadata"]["chunk_source"] == "video"
