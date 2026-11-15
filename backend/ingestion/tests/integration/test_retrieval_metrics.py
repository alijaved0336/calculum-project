"""Integration tests for Layer 3: retrieval quality metrics.

Requires a live Qdrant instance and the embedding API to be reachable.
Run with:  uv run pytest tests/integration/ -v -m integration
"""
from __future__ import annotations

import math
import uuid
import pytest
from qdrant_client.http import models as qm

from domain.entities.ingestion import Chunk, ChunkType
from evaluation.retrieval_metrics import compute_retrieval_metrics
from evaluation.qdrant_search import scroll_by_file_uuid

pytestmark = pytest.mark.integration

TEST_COLLECTION = "eval_integration_test"
FILE_UUID = "eval-integration-file-uuid"
DIMS = 2560


@pytest.fixture(scope="module")
async def qdrant_client():
    from dependencies import get_async_qdrant_client
    return get_async_qdrant_client()


@pytest.fixture(scope="module")
async def embedder():
    from dependencies import get_embedder
    return get_embedder()


@pytest.fixture(scope="module")
async def seeded_collection(qdrant_client, sample_chunks):
    """Create a temporary collection, upsert sample_chunks, yield, then delete."""
    from qdrant_client.http import models as qm

    # Create collection
    existing = {c.name for c in (await qdrant_client.get_collections()).collections}
    if TEST_COLLECTION in existing:
        await qdrant_client.delete_collection(TEST_COLLECTION)
    await qdrant_client.create_collection(
        collection_name=TEST_COLLECTION,
        vectors_config=qm.VectorParams(size=DIMS, distance=qm.Distance.COSINE),
    )

    # Upsert sample chunks (use their deterministic embeddings)
    points = [
        qm.PointStruct(
            id=c.id,
            vector=c.embedding,
            payload={
                "text": c.text,
                "file_uuid": FILE_UUID,
                "metadata": {
                    "file_id": FILE_UUID,
                    "page_numbers": c.page_numbers,
                    "chunk_type": c.chunk_type.value,
                },
            },
        )
        for c in sample_chunks
    ]
    await qdrant_client.upsert(collection_name=TEST_COLLECTION, points=points, wait=True)

    yield TEST_COLLECTION

    # Teardown
    await qdrant_client.delete_collection(TEST_COLLECTION)


@pytest.mark.asyncio
async def test_scroll_by_file_uuid_returns_chunks(qdrant_client, seeded_collection):
    records = await scroll_by_file_uuid(qdrant_client, seeded_collection, FILE_UUID)
    assert len(records) == 5


@pytest.mark.asyncio
async def test_retrieval_hit_rate(qdrant_client, embedder, seeded_collection, sample_chunks):
    # Re-attach correct IDs — sample_chunks use "test-chunk-NNNN" which are
    # stored as strings in Qdrant, so IDs match without conversion issues.
    result = await compute_retrieval_metrics(
        sample_chunks, embedder, qdrant_client, seeded_collection, top_k=5
    )
    assert "query_count" in result
    assert result["query_count"] > 0
    # Each chunk's first sentence should retrieve itself — expect reasonable hit rate
    assert result["hit_rate@1"] >= 0.4
    assert result["mrr"] > 0.0


@pytest.mark.asyncio
async def test_retrieval_mrr_range(qdrant_client, embedder, seeded_collection, sample_chunks):
    result = await compute_retrieval_metrics(
        sample_chunks, embedder, qdrant_client, seeded_collection, top_k=3
    )
    assert 0.0 <= result["mrr"] <= 1.0
    assert 0.0 <= result["hit_rate@1"] <= 1.0
    assert 0.0 <= result["hit_rate@3"] <= 1.0
