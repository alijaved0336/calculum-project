"""A dropped Qdrant connection must not send an answer out without its KB context.

Every [RAG_FAILURE] in the logs of 2026-09-14..18 was the same error —
"Server disconnected without sending a response" from a stale keep-alive
connection — and the symptom the negotiator saw was an answer from the model's
own knowledge that turned into a grounded one when the same question was asked
again.
"""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

import httpx
import pytest
from qdrant_client.http.exceptions import ResponseHandlingException, UnexpectedResponse

import infrastructure.vector_store.qdrant_adapter as adapter_module
from application.services.rag_service import RAGService
from infrastructure.vector_store.qdrant_adapter import QdrantAdapter
from tests.unit.test_rag_pipeline_order import _CE, _r, _Store

_DROPPED = ResponseHandlingException(
    httpx.RemoteProtocolError("Server disconnected without sending a response.")
)


@pytest.fixture(autouse=True)
def _no_backoff(monkeypatch):
    monkeypatch.setattr(adapter_module, "_BACKOFF_SECONDS", 0)


class _Embedder:
    async def embed_query(self, query):
        return [0.0]


class _FlakyClient:
    """Fails the first ``failures`` calls of each method with ``error``."""

    def __init__(self, failures: int, error: Exception = _DROPPED):
        self.failures = failures
        self.error = error
        self.calls: dict[str, int] = {}

    def _tick(self, name):
        self.calls[name] = self.calls.get(name, 0) + 1
        if self.calls[name] <= self.failures:
            raise self.error

    async def query_points(self, **_):
        self._tick("query_points")
        point = SimpleNamespace(id="p1", score=0.7, payload={"text": "chunk", "file_uuid": "f", "metadata": {}})
        return SimpleNamespace(points=[point])

    async def retrieve(self, **_):
        self._tick("retrieve")
        return [SimpleNamespace(id="n1", payload={"text": "neighbour", "file_uuid": "f", "metadata": {}})]

    async def scroll(self, **_):
        self._tick("scroll")
        return [SimpleNamespace(id="s1", payload={"text": "chunk", "file_uuid": "f", "metadata": {}})], None


def _adapter(client) -> QdrantAdapter:
    adapter = QdrantAdapter.__new__(QdrantAdapter)
    adapter._embedder = _Embedder()
    adapter._client = client
    return adapter


def test_a_dropped_connection_is_retried_on_every_read():
    client = _FlakyClient(failures=1)
    adapter = _adapter(client)
    assert [r.id for r in asyncio.run(adapter.retrieve("q", top_k=5, score_threshold=None))] == ["p1"]
    assert [r.id for r in asyncio.run(adapter.fetch_by_ids(["n1"]))] == ["n1"]
    assert [r.id for r in asyncio.run(adapter.fetch_by_filenames(["pb.pdf"]))] == ["s1"]
    assert client.calls == {"query_points": 2, "retrieve": 2, "scroll": 2}


def test_it_gives_up_after_three_attempts():
    client = _FlakyClient(failures=5)
    with pytest.raises(ResponseHandlingException):
        asyncio.run(_adapter(client).fetch_by_ids(["n1"]))
    assert client.calls["retrieve"] == 3


@pytest.mark.parametrize("error", [
    ResponseHandlingException(httpx.ReadTimeout("slow")),  # slow, not gone: don't multiply the wait
    UnexpectedResponse(status_code=404, reason_phrase="Not Found", content=b"", headers=httpx.Headers()),
    ValueError("bad payload"),
])
def test_other_errors_are_not_retried(error):
    client = _FlakyClient(failures=1, error=error)
    with pytest.raises(type(error)):
        asyncio.run(_adapter(client).fetch_by_ids(["n1"]))
    assert client.calls["retrieve"] == 1


class _StoreWithBrokenExpansion(_Store):
    async def fetch_by_ids(self, ids):
        raise _DROPPED


def test_a_failed_neighbour_fetch_keeps_the_reranked_chunks():
    winner = _r("w", "the definition of supplier standard", next_id="n")
    store = _StoreWithBrokenExpansion([winner])
    service = RAGService(
        store, _CE({"the definition of supplier standard": 9.0}),
        top_k_retrieve=25, top_n_rerank=4, rerank_max_candidates=30,
        rerank_score_threshold=-4.0, dense_score_floor=None, context_max_chars=6000,
    )
    context = asyncio.run(service.query("define supplier standard"))
    assert context.status == "ok"
    assert context.chunk_count == 1
    assert "the definition of supplier standard" in context.context_text
