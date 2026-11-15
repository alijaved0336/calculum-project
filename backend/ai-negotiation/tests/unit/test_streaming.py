# tests/unit/test_streaming.py
import json
import pytest
from httpx import AsyncClient, ASGITransport
from api.main import app
from dependencies import get_llm

# ── Mock LLM that yields fixed tokens ────────────────────────────────────────
class MockLLM:
    async def complete(self, prompt: str, **kwargs) -> str:
        return "This is a full response."

    async def stream(self, prompt: str, **kwargs):
        for token in ["You", " should", " lead", " with", " benchmarks."]:
            yield token


# ── SSE endpoint integration test ─────────────────────────────────────────────
async def test_stream_sse_returns_event_stream():
    app.dependency_overrides[get_llm] = lambda: MockLLM()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/test-123/chat/stream/sse",
            json={"message": "What should I lead with for ABB?"},
        )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    frames = [
        line[6:] for line in response.text.splitlines()
        if line.startswith("data: ")
    ]
    events = [json.loads(f) for f in frames]
    event_types = [e["event"] for e in events]

    assert "token" in event_types
    assert event_types[-1] == "done"

    app.dependency_overrides.clear()

# ── REST endpoint integration test ────────────────────────────────────────────
async def test_handle_message_returns_full_response():
    app.dependency_overrides[get_llm] = lambda: MockLLM()

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as client:
        response = await client.post(
            "/test-123/chat",
            json={"message": "What should I lead with for ABB?"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "test-123"
    assert data["passed"] is True
    assert data["generated_message"] == "This is a full response."

    app.dependency_overrides.clear()