"""
WebSocket tests for /{session_id}/negotiation/chat.

All external adapters (LLM, graph, thread, settings, CrossEncoder) are mocked
so the suite runs without a live database, LLM server, or ML model.

Uses starlette.testclient.TestClient which is synchronous; each test drives
the full request/response cycle without a running uvicorn process.
"""
from __future__ import annotations

import pytest
import jwt as pyjwt
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect
from fastapi import HTTPException

from api.main import app
from config import settings
from dependencies import (
    get_graph,
    get_llm,
    get_session_by_id,
    get_pg_thread_adapter,
    get_pg_settings_adapter,
)
from domain.entities.intent import Intent


# ── Token helpers ─────────────────────────────────────────────────────────────

def _make_token(hours: float = 1.0) -> str:
    now = datetime.now(timezone.utc)
    return pyjwt.encode(
        {
            "sub": "u1",
            "email": "test@example.com",
            "tenant_id": "ten1",
            "role": "user",
            "iat": now,
            "exp": now + timedelta(hours=hours),
        },
        settings.jwt_secret,
        algorithm=settings.ALGORITHM,
    )


# ── Shared test data ──────────────────────────────────────────────────────────

SESSION_ID = "sess-unit-001"
WS_URL = f"/{SESSION_ID}/negotiation/chat"

_MOCK_SESSION_BASE: dict = {
    "user_id": "u1",
    "tenant_id": "ten1",
    "supplier_id": "sup1",
    "thread_id": None,
    "context": None,
    "prompt_instructions": [],
}


# ── Mock implementations ──────────────────────────────────────────────────────

class _MockGraph:
    async def ainvoke(self, state):
        return {
            "intent": Intent.GREETING,
            "intent_confidence": 0.99,
            "intent_low_confidence": False,
            "intent_group": None,
            "intent_agent": None,
            "intent_reasoning": "unit test",
            "response_mode": "quick",
            "response": "Hello there!",
            "source": None,
            "rag_sources": [],
        }


class _MockGraphFirstFails:
    """Raises on the first ainvoke call, succeeds on all subsequent calls."""

    def __init__(self):
        self._calls = 0

    async def ainvoke(self, state):
        self._calls += 1
        if self._calls == 1:
            raise RuntimeError("deliberate graph failure for test")
        return {
            "intent": Intent.GREETING,
            "intent_confidence": 0.95,
            "intent_low_confidence": False,
            "intent_group": None,
            "intent_agent": None,
            "intent_reasoning": "recovery call",
            "response_mode": "quick",
            "response": "Recovered!",
            "source": None,
            "rag_sources": [],
        }


class _MockLLM:
    async def complete(self, prompt: str, **kwargs) -> str:
        return "follow-up suggestion"

    async def stream(self, prompt: str, **kwargs):
        yield "test"


class _MockThreadAdapter:
    def __init__(self, *, fail_get_recent: bool = False):
        self.fail_get_recent = fail_get_recent
        self.created_threads: list[dict] = []
        self.saved_messages: list[dict] = []

    async def create_thread(self, **kwargs):
        self.created_threads.append(dict(kwargs))
        m = MagicMock()
        m.uuid = "thr-unit-001"
        return m

    async def save_message(self, **kwargs):
        self.saved_messages.append(dict(kwargs))

    async def get_recent_messages(self, thread_id: str, limit: int = 10):
        if self.fail_get_recent:
            raise RuntimeError("db unavailable")
        return []


class _MockSettingsPort:
    async def get_kb_document_filenames(self, uuids):
        return {}


# ── Session-scoped TestClient ─────────────────────────────────────────────────

@pytest.fixture(scope="module")
def client():
    """
    A single TestClient shared for the module.
    api.main.get_graph is patched so the lifespan warm-up does not attempt
    to load the CrossEncoder model or connect to an LLM.
    """
    with patch("api.main.get_graph", return_value=_MockGraph()):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


@pytest.fixture(autouse=True)
def _clear_overrides():
    """Wipe app.dependency_overrides after each test to prevent leakage."""
    yield
    app.dependency_overrides.clear()


# ── Override helpers ──────────────────────────────────────────────────────────

def _setup(
    *,
    graph=None,
    session: dict | None = None,
    thread_adapter=None,
) -> None:
    """Apply standard dependency overrides for a happy-path WebSocket test."""
    _session = dict(_MOCK_SESSION_BASE) if session is None else session
    app.dependency_overrides[get_graph] = lambda: (graph or _MockGraph())
    app.dependency_overrides[get_llm] = lambda: _MockLLM()
    app.dependency_overrides[get_session_by_id] = lambda: _session
    app.dependency_overrides[get_pg_thread_adapter] = lambda: (thread_adapter or _MockThreadAdapter())
    app.dependency_overrides[get_pg_settings_adapter] = lambda: _MockSettingsPort()


def _recv_until_done(ws, max_msgs: int = 60) -> list[dict]:
    """Receive messages until a 'done' event or the connection closes."""
    events: list[dict] = []
    for _ in range(max_msgs):
        try:
            msg = ws.receive_json()
            events.append(msg)
            if msg.get("type") == "done":
                break
        except Exception:
            break
    return events


def _recv_n(ws, n: int) -> list[dict]:
    """Collect exactly n messages (or fewer if the connection closes)."""
    events: list[dict] = []
    for _ in range(n):
        try:
            events.append(ws.receive_json())
        except Exception:
            break
    return events


# ═══════════════════════════════════════════════════════════════════════════════
# Auth / connection rejection tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_missing_token_closes_4001(client):
    """Connecting without ?token= is rejected with close code 4001."""
    _setup()
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(WS_URL):
            pass
    assert exc_info.value.code == 4001


def test_ws_malformed_token_closes_4001(client):
    """A syntactically invalid JWT is rejected with close code 4001."""
    _setup()
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"{WS_URL}?token=not.a.valid.jwt"):
            pass
    assert exc_info.value.code == 4001


def test_ws_expired_token_closes_4001(client):
    """An expired JWT is rejected with close code 4001."""
    _setup()
    expired = _make_token(hours=-1)
    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect(f"{WS_URL}?token={expired}"):
            pass
    assert exc_info.value.code == 4001


def test_ws_session_not_found_rejects(client):
    """A valid token with an unknown session_id is refused (404 → connection rejected)."""
    def _not_found():
        raise HTTPException(status_code=404, detail="Session not found")

    app.dependency_overrides[get_graph] = lambda: _MockGraph()
    app.dependency_overrides[get_llm] = lambda: _MockLLM()
    app.dependency_overrides[get_session_by_id] = _not_found
    app.dependency_overrides[get_pg_thread_adapter] = lambda: _MockThreadAdapter()
    app.dependency_overrides[get_pg_settings_adapter] = lambda: _MockSettingsPort()

    token = _make_token()
    with pytest.raises((WebSocketDisconnect, Exception)):
        with client.websocket_connect(f"{WS_URL}?token={token}"):
            pass


def test_ws_valid_credentials_connect(client):
    """A well-formed JWT + known session successfully establishes a connection."""
    _setup()
    token = _make_token()
    with client.websocket_connect(f"{WS_URL}?token={token}") as ws:
        assert ws is not None


# ═══════════════════════════════════════════════════════════════════════════════
# Message handling tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_invalid_json_returns_error_keeps_connection(client):
    """Sending malformed JSON returns exactly one error event; the connection stays open."""
    _setup()
    token = _make_token()
    with client.websocket_connect(f"{WS_URL}?token={token}") as ws:
        ws.send_text("{not valid json{{")
        # Server sends exactly 1 "error" event then loops back waiting for the next message.
        events = _recv_n(ws, 1)
    assert len(events) == 1
    assert events[0].get("type") == "error"


def test_ws_valid_message_event_order(client):
    """A valid message must produce: intent → one-or-more tokens → done, in that order."""
    _setup()
    token = _make_token()
    with client.websocket_connect(f"{WS_URL}?token={token}") as ws:
        ws.send_json({"message": "Hello!", "thread_tone": "neutral"})
        events = _recv_until_done(ws)

    types = [e["type"] for e in events]
    assert "intent" in types, "expected an intent event"
    assert "token" in types, "expected at least one token event"
    assert "done" in types, "expected a done event"
    assert types.index("intent") < types.index("token"), "intent must precede first token"
    assert types[-1] == "done", "done must be the last event"


@pytest.mark.parametrize("tier", ["small", "large"])
def test_ws_summary_exposes_category_before_text_and_card_in_done(client, tier):
    from agents.nodes.summarize import make_summarize_node
    from domain.entities.context import SupplierContext
    from domain.services.brief_builder import brief_from
    from tests.unit.prompt_fixtures import client_sample_facts

    class SummaryGraph:
        async def ainvoke(self, state):
            facts = client_sample_facts()
            state.update(context=SupplierContext(supplier_id="s", facts=facts),
                         brief=brief_from(facts), summary_tier=tier)
            return {"intent": Intent.SUMMARIZE_SUPPLIER_POSITION,
                    **await make_summarize_node(_MockLLM())(state)}

    _setup(graph=SummaryGraph())
    with client.websocket_connect(f"{WS_URL}?token={_make_token()}") as ws:
        ws.send_json({"message": "summary"})
        events = _recv_until_done(ws, max_msgs=500)
    assert events[0]["type"] == "intent"
    assert events[0]["data"]["summary_tier"] == tier
    done = events[-1]["data"]
    assert done["summary_tier"] == tier
    assert done["summary_card"] is not None
    assert done["summary_card"]["target_term_days"] == 60
    if tier == "large":
        assert done["summary_card"]["spend_volume"] == 908_000
    else:
        assert done["summary_card"]["standards"] == []
        assert done["summary_card"]["cash_flow_opportunity"] is None
    # The client opens the reply bubble on its first non-empty token, so a
    # card-only body must still stream one — and never the not-implemented
    # fallback in place of the summary.
    tokens = [e["data"] for e in events if e["type"] == "token"]
    assert any(tokens)
    assert "isn't implemented" not in "".join(tokens)
    if tier == "small":
        assert "".join(tokens).strip() == ""


def test_rest_card_only_summary_is_not_replaced_by_the_fallback(client):
    class SummaryGraph:
        async def ainvoke(self, state):
            return {
                "intent": Intent.SUMMARIZE_SUPPLIER_POSITION,
                "response": "", "summary_scope": "summary", "summary_tier": "small",
                "summary_card": {"current_term_days": 45, "target_term_days": 60},
            }
    _setup(graph=SummaryGraph())
    response = client.post(f"/{SESSION_ID}/chat", json={"message": "Show key facts about the supplier."},
                           headers={"Authorization": f"Bearer {_make_token()}"})
    assert response.status_code == 200
    body = response.json()
    assert body["generated_message"] == ""
    assert body["summary_tier"] == "small"
    assert body["summary_card"]["target_term_days"] == 60


def test_empty_reply_without_a_card_still_falls_back():
    from api.routes.negotiation import _response_text

    assert "isn't implemented" in _response_text({"response": None, "intent": Intent.RUN_SCENARIO})
    assert "isn't implemented" in _response_text({"response": "", "summary_card": None})
    assert "went wrong" in _response_text({"response": None, "errors": ["x"], "summary_card": {"a": 1}})


def test_rest_summary_preserves_card_and_category(client):
    class SummaryGraph:
        async def ainvoke(self, state):
            return {
                "intent": Intent.SUMMARIZE_SUPPLIER_POSITION,
                "response": "Supplier snapshot.", "summary_scope": "summary", "summary_tier": "large",
                "summary_card": {"current_term_days": 45, "target_term_days": 60,
                                 "batna_days": 45, "spend_volume": 908000},
            }
    _setup(graph=SummaryGraph())
    response = client.post(f"/{SESSION_ID}/chat", json={"message": "Summarize supplier data"},
                           headers={"Authorization": f"Bearer {_make_token()}"})
    assert response.status_code == 200
    body = response.json()
    assert body["summary_scope"] == "summary" and body["summary_tier"] == "large"
    assert body["summary_card"]["spend_volume"] == 908000
    assert body["summary_card"]["target_term_days"] == 60


def test_ws_graph_failure_sends_error_and_loop_continues(client):
    """
    When graph.ainvoke raises, an error event is sent but the connection is
    kept open so the client can retry. A second message must succeed.
    """
    graph = _MockGraphFirstFails()
    _setup(graph=graph)
    token = _make_token()
    with client.websocket_connect(f"{WS_URL}?token={token}") as ws:
        # First message — graph explodes
        ws.send_json({"message": "crash now", "thread_tone": "neutral"})
        # Handler sends "error" then "intent: None" before continuing the loop
        first_batch = _recv_n(ws, 2)
        assert any(e.get("type") == "error" for e in first_batch), "expected error event"

        # Second message — graph now succeeds (call count == 2)
        ws.send_json({"message": "recover", "thread_tone": "neutral"})
        second_batch = _recv_until_done(ws)

    assert any(e.get("type") == "done" for e in second_batch), "expected done on recovery"


# ═══════════════════════════════════════════════════════════════════════════════
# Session / history persistence tests
# ═══════════════════════════════════════════════════════════════════════════════

def test_ws_no_thread_created_when_user_id_absent(client):
    """
    When the session has no user_id, ensure_thread skips DB thread creation.
    The in-memory store is used as the fallback history backend.
    """
    session_no_user = dict(_MOCK_SESSION_BASE)
    session_no_user["user_id"] = None
    adapter = _MockThreadAdapter()
    _setup(session=session_no_user, thread_adapter=adapter)

    token = _make_token()
    with client.websocket_connect(f"{WS_URL}?token={token}") as ws:
        ws.send_json({"message": "no thread please", "thread_tone": "neutral"})
        _recv_until_done(ws)

    assert adapter.created_threads == [], "create_thread must not be called without user_id"


def test_ws_thread_created_and_messages_saved_when_user_present(client):
    """
    When user_id and supplier_id are present, a DB thread is created on the
    first message and both user and AI messages are persisted via the adapter.
    """
    adapter = _MockThreadAdapter()
    _setup(thread_adapter=adapter)

    token = _make_token()
    with client.websocket_connect(f"{WS_URL}?token={token}") as ws:
        ws.send_json({"message": "let us begin", "thread_tone": "neutral"})
        _recv_until_done(ws)

    assert len(adapter.created_threads) == 1, "expected exactly one thread creation"
    roles = {m["role"] for m in adapter.saved_messages}
    assert "user" in roles, "user message must be persisted"
    assert "ai" in roles, "AI response must be persisted"


def test_ws_history_fallback_on_get_recent_messages_failure(client):
    """
    When get_recent_messages raises (e.g. DB transient error), the handler
    falls back to in-memory history and still returns a 'done' event.
    """
    session_with_thread = dict(_MOCK_SESSION_BASE)
    session_with_thread["thread_id"] = "thr-existing-001"
    adapter = _MockThreadAdapter(fail_get_recent=True)
    _setup(session=session_with_thread, thread_adapter=adapter)

    token = _make_token()
    with client.websocket_connect(f"{WS_URL}?token={token}") as ws:
        ws.send_json({"message": "db is failing", "thread_tone": "neutral"})
        events = _recv_until_done(ws)

    assert any(e.get("type") == "done" for e in events), (
        "response must complete even when get_recent_messages raises"
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Session store unit tests (async, no WebSocket)
# ═══════════════════════════════════════════════════════════════════════════════

async def test_session_store_delete_removes_data():
    """delete() must remove both session metadata and message history."""
    from infrastructure.session.in_memory_session_store import InMemorySessionStore

    store = InMemorySessionStore()
    await store.create("s1", {"key": "value"})
    await store.append_history("s1", {"role": "user", "content": "hi"})
    await store.append_history("s1", {"role": "ai", "content": "hello"})

    assert await store.get("s1") is not None
    assert len(await store.get_history("s1")) == 2

    await store.delete("s1")

    assert await store.get("s1") is None, "session must be gone after delete"
    assert await store.get_history("s1") == [], "history must be empty after delete"


async def test_session_store_delete_nonexistent_is_noop():
    """delete() on a non-existent session must not raise."""
    from infrastructure.session.in_memory_session_store import InMemorySessionStore

    store = InMemorySessionStore()
    await store.delete("does-not-exist")  # must not raise
