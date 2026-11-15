from fastapi.testclient import TestClient

import api.routes.support as support_mod
from api.deps.auth import current_user
from api.main import app
from domain.entities.answer_result import AnswerResult
from domain.entities.user import User


class _FakeAgent:
    def __init__(self, result):
        self._result = result
        self.calls = []

    async def answer(self, question, user=None, thread_id=None):
        self.calls.append({"question": question, "user": user, "thread_id": thread_id})
        return self._result

    async def stream_answer(self, question, user=None, thread_id=None):
        self.calls.append({"question": question, "user": user, "thread_id": thread_id})
        for part in self._result.answer.split(" "):
            yield {"type": "token", "data": part + " "}
        yield {
            "type": "done",
            "metadata": {
                "video_clips": self._result.video_clips,
                "document_sources": self._result.document_sources,
                "resolved": self._result.resolved,
                "sources": self._result.sources,
                "escalated": self._result.escalated,
            },
        }


def _install(monkeypatch, result, auth=True):
    agent = _FakeAgent(result)
    monkeypatch.setattr(support_mod, "get_support_agent", lambda: agent)
    if auth:
        app.dependency_overrides[current_user] = lambda: User(id="u1", email="u1@x.com")
    return agent


def _result():
    return AnswerResult(
        answer="SSO is under Settings [00:01–00:03]",
        video_clips=[{"video_id": "v1", "start_ms": 1000, "end_ms": 3000, "video_url": "https://s/v1"}],
        document_sources=[{"document_id": "docA", "title": "Billing Guide", "page_numbers": [3, 4]}],
        resolved=True,
        sources=["c1"],
        thread_id="t1",
    )


def teardown_function():
    app.dependency_overrides.clear()


def test_query_returns_answer_clips_resolved(monkeypatch):
    agent = _install(monkeypatch, _result())
    client = TestClient(app)
    r = client.post("/support/query", json={"question": "how do I enable SSO?"})
    assert r.status_code == 200
    body = r.json()
    assert body["answer"].startswith("SSO")
    assert body["video_clips"][0]["video_id"] == "v1"
    assert body["document_sources"][0]["document_id"] == "docA"
    assert body["document_sources"][0]["page_numbers"] == [3, 4]
    assert body["resolved"] is True
    assert body["sources"] == ["c1"]
    assert body["thread_id"] == "t1"
    assert agent.calls[0]["question"] == "how do I enable SSO?"
    assert agent.calls[0]["thread_id"] is None            # new conversation


def test_query_continues_thread(monkeypatch):
    agent = _install(monkeypatch, _result())
    client = TestClient(app)
    r = client.post("/support/query", json={"question": "and then?", "thread_id": "t1"})
    assert r.status_code == 200
    assert agent.calls[0]["thread_id"] == "t1"            # thread_id threaded through


def test_query_unknown_thread_returns_404(monkeypatch):
    from application.agent.support_agent import ThreadAccessError

    class _Boom:
        async def answer(self, question, user=None, thread_id=None):
            raise ThreadAccessError(thread_id)

    monkeypatch.setattr(support_mod, "get_support_agent", lambda: _Boom())
    app.dependency_overrides[current_user] = lambda: User(id="u1", email="u1@x.com")
    r = TestClient(app).post("/support/query", json={"question": "q", "thread_id": "nope"})
    assert r.status_code == 404


def test_query_requires_auth(monkeypatch):
    _install(monkeypatch, _result(), auth=False)
    client = TestClient(app)
    r = client.post("/support/query", json={"question": "hi"})  # no Authorization header
    assert r.status_code == 401


def test_chat_ws_streams_tokens_then_done(monkeypatch):
    import time

    import jwt

    import api.deps.auth as auth_mod

    _install(monkeypatch, _result(), auth=False)  # WS authenticates via token, not the dependency
    monkeypatch.setattr(auth_mod.settings, "jwt_secret", "test-secret")
    token = jwt.encode({"sub": "u1", "exp": int(time.time()) + 3600}, "test-secret", algorithm="HS256")

    client = TestClient(app)
    with client.websocket_connect(f"/support/chat?token={token}") as ws:
        ws.send_json({"message": "how do I enable SSO?"})
        messages = []
        while True:
            m = ws.receive_json()
            messages.append(m)
            if m["type"] == "done":
                break

    assert any(m["type"] == "token" for m in messages)
    done = next(m for m in messages if m["type"] == "done")
    assert done["metadata"]["resolved"] is True
    assert done["metadata"]["video_clips"][0]["video_id"] == "v1"
    assert done["metadata"]["document_sources"][0]["document_id"] == "docA"


def test_chat_ws_stays_open_after_done_so_the_final_frame_survives(monkeypatch, caplog):
    # The server must NOT close on the heels of `done`: a proxy (Cloud Run) drops whatever is
    # still buffered when the socket closes right after the last send, which silently cost the
    # client the one frame carrying the reconciled clips. The socket stays live until the
    # CLIENT closes, so a post-`done` send from the client still lands.
    import logging
    import time

    import jwt

    import api.deps.auth as auth_mod

    _install(monkeypatch, _result(), auth=False)
    monkeypatch.setattr(auth_mod.settings, "jwt_secret", "test-secret")
    token = jwt.encode({"sub": "u1", "exp": int(time.time()) + 3600}, "test-secret", algorithm="HS256")

    # Asserting the send doesn't raise isn't enough on its own — a TestClient/Starlette version
    # that silently swallowed a send to an already-closed socket would pass this too. Assert the
    # server-side log line instead: it only fires if the server's linger `ws.receive()` actually
    # picked up this frame, which proves the socket really was still open server-side.
    with caplog.at_level(logging.WARNING, logger="api.routes.support"):
        with TestClient(app).websocket_connect(f"/support/chat?token={token}") as ws:
            ws.send_json({"message": "how do I enable SSO?"})
            while ws.receive_json()["type"] != "done":
                pass
            ws.send_json({"message": "still there?"})  # would raise if the server had closed

    assert any(r.message.startswith("support_chat.linger_message_dropped") for r in caplog.records)


def test_chat_ws_sends_error_frame_on_unexpected_failure(monkeypatch):
    # A downstream failure mid-stream (after tokens, before `done`) must not just drop the
    # socket silently — the client needs a frame to react to instead of a bare disconnect.
    import time

    import jwt

    import api.deps.auth as auth_mod

    class _BoomAfterTokensAgent:
        async def stream_answer(self, question, user=None, thread_id=None):
            yield {"type": "token", "data": "partial "}
            raise RuntimeError("downstream stall")

    monkeypatch.setattr(support_mod, "get_support_agent", lambda: _BoomAfterTokensAgent())
    monkeypatch.setattr(auth_mod.settings, "jwt_secret", "test-secret")
    token = jwt.encode({"sub": "u1", "exp": int(time.time()) + 3600}, "test-secret", algorithm="HS256")

    client = TestClient(app)
    with client.websocket_connect(f"/support/chat?token={token}") as ws:
        ws.send_json({"message": "how do I enable SSO?"})
        messages = []
        while True:
            m = ws.receive_json()
            messages.append(m)
            if m["type"] == "error":
                break

    assert any(m["type"] == "token" for m in messages)
    assert messages[-1] == {"type": "error", "data": "Something went wrong. Please try again."}


def test_chat_ws_client_disconnect_is_not_logged_as_a_failure(monkeypatch, caplog):
    # An ordinary client disconnect mid-stream (ws.send_json raises WebSocketDisconnect once the
    # socket is gone) must NOT be treated like a genuine downstream failure: no ERROR-level
    # traceback, no doomed retry-send, no crash out of the `finally: ws.close()`.
    import logging
    import time

    import jwt
    from starlette.websockets import WebSocketDisconnect

    import api.deps.auth as auth_mod

    class _DisconnectsAfterTokenAgent:
        async def stream_answer(self, question, user=None, thread_id=None):
            yield {"type": "token", "data": "partial "}
            raise WebSocketDisconnect(code=1006)

    monkeypatch.setattr(support_mod, "get_support_agent", lambda: _DisconnectsAfterTokenAgent())
    monkeypatch.setattr(auth_mod.settings, "jwt_secret", "test-secret")
    token = jwt.encode({"sub": "u1", "exp": int(time.time()) + 3600}, "test-secret", algorithm="HS256")

    client = TestClient(app)
    with caplog.at_level(logging.INFO, logger="api.routes.support"):
        with client.websocket_connect(f"/support/chat?token={token}") as ws:
            ws.send_json({"message": "how do I enable SSO?"})
            m = ws.receive_json()
            assert m["type"] == "token"
            # No further frames: the (simulated) disconnect happens on the NEXT send, so the
            # client never sees an error frame — it just observes the socket end.

    assert not any(r.levelno >= logging.ERROR for r in caplog.records)
    assert any(r.message.startswith("support_chat.client_disconnected") for r in caplog.records)


def test_chat_ws_rejects_missing_token(monkeypatch):
    from starlette.websockets import WebSocketDisconnect

    _install(monkeypatch, _result(), auth=False)
    client = TestClient(app)
    import pytest

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/support/chat") as ws:
            ws.receive_json()
