from domain.entities.ingestion import Chunk, ChunkType
from infrastructure.vector_store.ingestion_qdrant_adapter import (
    AsyncIngestionQdrantAdapter,
    build_point,
)


def _chunk():
    return Chunk(
        id="d1", text="policy text", page_numbers=[2], chunk_type=ChunkType.RECURSIVE,
        file_id="doc1", metadata={"title": "Handbook"}, embedding=[0.1] * 4,
    )


def test_build_point_tags_document_source_without_timestamps():
    p = build_point(_chunk(), chunk_source="document")
    m = p.payload["metadata"]
    assert m["chunk_source"] == "document"
    assert m["page_numbers"] == [2]
    assert "start_ms" not in m and "end_ms" not in m and "gcs_object" not in m


def test_adapter_carries_its_chunk_source():
    captured = {}

    class FakeClient:
        async def upsert(self, collection_name, points, wait):
            captured["points"] = points

    import asyncio
    store = AsyncIngestionQdrantAdapter(FakeClient(), "video-chunks-v2", chunk_source="document")
    asyncio.run(store.upsert([_chunk()]))
    assert captured["points"][0].payload["metadata"]["chunk_source"] == "document"
