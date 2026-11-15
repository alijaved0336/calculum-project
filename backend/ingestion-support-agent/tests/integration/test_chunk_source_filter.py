import pytest
from qdrant_client.models import FieldCondition, Filter, MatchValue

from domain.entities.ingestion import Chunk, ChunkType
from infrastructure.vector_store.ingestion_qdrant_adapter import AsyncIngestionQdrantAdapter

pytestmark = pytest.mark.integration


async def test_chunk_source_filter_isolates_sources(qdrant_mem):
    coll = "video-chunks-v2"
    vstore = AsyncIngestionQdrantAdapter(qdrant_mem, coll, chunk_source="video")
    dstore = AsyncIngestionQdrantAdapter(qdrant_mem, coll, chunk_source="document")

    vid = Chunk(id="11111111-1111-1111-1111-111111111111", text="video chunk", page_numbers=[1],
                chunk_type=ChunkType.HYBRID, file_id="v1",
                metadata={"start_ms": 0, "end_ms": 1000}, embedding=[0.1] * 2560)
    doc = Chunk(id="22222222-2222-2222-2222-222222222222", text="doc chunk", page_numbers=[3],
                chunk_type=ChunkType.RECURSIVE, file_id="d1", metadata={}, embedding=[0.2] * 2560)
    await vstore.upsert([vid])
    await dstore.upsert([doc])

    res = await qdrant_mem.query_points(
        collection_name=coll, query=[0.2] * 2560, limit=10, with_payload=True,
        query_filter=Filter(must=[
            FieldCondition(key="metadata.chunk_source", match=MatchValue(value="document"))
        ]),
    )
    assert {h.payload["metadata"]["chunk_source"] for h in res.points} == {"document"}
    assert res.points[0].payload["metadata"]["page_numbers"] == [3]
