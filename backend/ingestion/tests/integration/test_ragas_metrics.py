"""Integration tests for Layer 4: Ragas evaluation.

Requires Qdrant, the embedding API, and the LLM API to be reachable,
and LLM_BASE_URL / LLM_API_KEY / LLM_MODEL to be set in .env.

Run with:  uv run pytest tests/integration/test_ragas_metrics.py -v -m ragas
"""
from __future__ import annotations

import os

import pytest
from langchain_core.documents import Document as LCDocument

from domain.entities.ingestion import Chunk
from evaluation.ragas_metrics import run_ragas_metrics

pytestmark = [
    pytest.mark.ragas,
    pytest.mark.integration,
    pytest.mark.skipif(
        not os.environ.get("EVAL_LLM_API_KEY"),
        reason="EVAL_LLM_API_KEY not set — skipping live Ragas tests",
    ),
]

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
    """Re-use the same seeded collection as the retrieval integration tests."""
    from qdrant_client.http import models as qm

    existing = {c.name for c in (await qdrant_client.get_collections()).collections}
    if TEST_COLLECTION not in existing:
        await qdrant_client.create_collection(
            collection_name=TEST_COLLECTION,
            vectors_config=qm.VectorParams(size=DIMS, distance=qm.Distance.COSINE),
        )
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


@pytest.mark.asyncio
async def test_ragas_metrics_skip_when_no_llm(monkeypatch, qdrant_client, embedder, seeded_collection, sample_chunks):
    """When LLM_BASE_URL is absent the function should return a 'skipped' result."""
    import config as cfg_module
    monkeypatch.setattr(cfg_module.settings, "llm_base_url", None)

    lc_docs = [LCDocument(page_content=c.text) for c in sample_chunks]
    result = await run_ragas_metrics(lc_docs, embedder, qdrant_client, seeded_collection, test_size=2)
    assert "skipped" in result


@pytest.mark.asyncio
async def test_ragas_metrics_returns_scores(qdrant_client, embedder, seeded_collection, sample_chunks):
    """Full Ragas run — scores must be floats in [0, 1]."""
    from config import settings
    if not settings.llm_base_url:
        pytest.skip("LLM_BASE_URL not configured — skipping full Ragas test")

    lc_docs = [LCDocument(page_content=c.text, metadata={"file_id": c.file_id}) for c in sample_chunks]
    result = await run_ragas_metrics(
        lc_docs, embedder, qdrant_client, seeded_collection, top_k=3, test_size=3
    )

    assert "skipped" not in result
    assert "error" not in result

    for key in ["faithfulness", "response_relevancy"]:
        if key in result:
            assert isinstance(result[key], float)
            assert 0.0 <= result[key] <= 1.0
