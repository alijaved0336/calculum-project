"""End-to-end tests: upload a document → wait for ingestion → run all eval layers.

Requires the full stack to be running:
  - Ingestion API on localhost:8001 (make run)
  - Qdrant (docker-compose up -d)
  - Embedding API (EMBED_API_URL in .env)

Run with:  uv run pytest tests/e2e/ -v -m e2e
"""
from __future__ import annotations

import asyncio
from pathlib import Path

import httpx
import pytest

pytestmark = pytest.mark.e2e

API_URL = "http://localhost:8001"
FIXTURE_TEXT = (
    "Procurement is the process of finding, agreeing terms, and acquiring goods or services. "
    "The procurement team evaluates suppliers based on quality, cost, and reliability. "
    "Contract terms typically include payment conditions, delivery schedules, and penalty clauses. "
    "Spend analysis helps identify savings opportunities across all categories. "
    "Supplier scorecards track performance metrics such as on-time delivery and defect rates."
)


@pytest.fixture(scope="module")
def fixture_txt(tmp_path_factory) -> Path:
    """Write a small plain-text fixture document and return its path."""
    p = tmp_path_factory.mktemp("eval_e2e") / "eval_fixture.txt"
    p.write_text(FIXTURE_TEXT * 10)  # ~500 words
    return p


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


async def _api_alive() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as c:
            r = await c.get(f"{API_URL}/health")
            return r.status_code == 200
    except Exception:
        return False


@pytest.fixture(scope="module")
async def ingested_file_uuid(fixture_txt) -> str:
    if not await _api_alive():
        pytest.skip(f"Ingestion API not reachable at {API_URL}")

    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(fixture_txt, "rb") as f:
            resp = await client.post(
                f"{API_URL}/ingest/upload",
                files={"file": (fixture_txt.name, f, "text/plain")},
            )
        assert resp.status_code == 202, f"Upload failed: {resp.text}"
        job_id = resp.json()["job_id"]
        file_uuid = resp.json()["file_id"]

    # Poll until done (max 5 minutes)
    for _ in range(100):
        await asyncio.sleep(3)
        async with httpx.AsyncClient(timeout=10.0) as c:
            s = (await c.get(f"{API_URL}/ingest/jobs/{job_id}")).json()
        if s["status"] == "completed":
            return file_uuid
        if s["status"] == "failed":
            pytest.fail(f"Ingestion failed: {s.get('error')}")

    pytest.fail("Ingestion timed out after 5 minutes")


@pytest.fixture(scope="module")
async def chunks_and_deps(ingested_file_uuid):
    from config import settings
    from dependencies import get_async_qdrant_client, get_embedder
    from scripts.eval.run_eval import _fetch_chunks

    qdrant_client = get_async_qdrant_client()
    embedder = get_embedder()
    collection = settings.collection_knowledge_base
    chunks = await _fetch_chunks(ingested_file_uuid, collection, qdrant_client)
    return chunks, embedder, qdrant_client, collection


@pytest.mark.asyncio
async def test_chunks_created(chunks_and_deps):
    chunks, *_ = chunks_and_deps
    assert len(chunks) > 0, "No chunks found after ingestion"


@pytest.mark.asyncio
async def test_layer1_structural_metrics(chunks_and_deps):
    chunks, embedder, _, _ = chunks_and_deps
    from evaluation.chunk_metrics import compute_chunk_metrics

    result = compute_chunk_metrics(chunks, embedder.count_tokens)
    assert result["chunk_count"] > 0
    assert result["empty_chunks"] == 0
    ts = result["token_stats"]
    assert 10 <= ts["mean"] <= 600, f"Unexpected mean token count: {ts['mean']}"


@pytest.mark.asyncio
async def test_layer2_embedding_metrics(chunks_and_deps):
    from config import settings
    from evaluation.embedding_metrics import compute_embedding_metrics

    chunks, *_ = chunks_and_deps
    result = compute_embedding_metrics(chunks, settings.embed_dims)
    assert result["missing_embeddings"] == 0
    assert result["dim_violations"] == 0
    assert result["malformed_vectors"] == 0
    if "semantic_continuity" in result:
        assert result["semantic_continuity"]["mean"] > -0.5


@pytest.mark.asyncio
async def test_layer3_retrieval_metrics(chunks_and_deps):
    from evaluation.retrieval_metrics import compute_retrieval_metrics

    chunks, embedder, qdrant_client, collection = chunks_and_deps
    result = await compute_retrieval_metrics(chunks, embedder, qdrant_client, collection, top_k=5)

    assert result["query_count"] > 0
    assert result["hit_rate@1"] >= 0.3, f"hit_rate@1 too low: {result['hit_rate@1']}"
    assert result["mrr"] > 0.0
