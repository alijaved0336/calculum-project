"""A dead pooled connection must not become a failed turn.

A keep-alive connection can be closed server-side (by the inference server or a
proxy) while httpx still hands it out as live. The request then raises
`RemoteProtocolError` before any response byte arrives — nothing was received,
so retrying cannot duplicate output.

The streamed transport has retried this since it was first hit. The blocking one
did not, and it is the path that reaches the user: a real playbook turn died on
it with "Server disconnected without sending a response" after ~5s of retrieval
idled the pool past httpx's 5.0s keepalive expiry.
"""
from __future__ import annotations

import httpx
import pytest

from infrastructure.llm.llm_client import (
    _CONNECT_RETRIES,
    _KEEPALIVE_EXPIRY_SECONDS,
    LLMClient,
)


def _client() -> LLMClient:
    return LLMClient(base_url="http://llm.invalid", model="m", api_key="k", chat_path="/v1/chat/completions")


def _completion(text: str) -> httpx.Response:
    return httpx.Response(
        200,
        json={"choices": [{"message": {"content": text}}]},
        request=httpx.Request("POST", "http://llm.invalid/v1/chat/completions"),
    )


class _FakeTransport:
    """Raises `RemoteProtocolError` for the first `drops` calls, then answers."""

    def __init__(self, drops: int, response=None):
        self.drops = drops
        self.calls = 0
        self._response = response or _completion("the playbook")

    async def post(self, url, **kwargs):
        self.calls += 1
        if self.calls <= self.drops:
            raise httpx.RemoteProtocolError("Server disconnected without sending a response.")
        return self._response


@pytest.mark.asyncio
async def test_blocking_call_retries_a_stale_connection():
    llm = _client()
    transport = _FakeTransport(drops=1)
    llm._http_client = transport

    assert await llm.complete("prompt") == "the playbook"
    assert transport.calls == 2  # dropped once, succeeded on the retry


@pytest.mark.asyncio
async def test_blocking_call_gives_up_after_the_retry_budget():
    llm = _client()
    transport = _FakeTransport(drops=99)
    llm._http_client = transport

    with pytest.raises(httpx.RemoteProtocolError):
        await llm.complete("prompt")
    # The initial attempt plus the budget — not an unbounded loop.
    assert transport.calls == _CONNECT_RETRIES + 1


@pytest.mark.asyncio
async def test_other_transport_errors_are_not_retried():
    """A refused connection or a timeout will not be fixed by trying again."""
    llm = _client()
    calls = 0

    async def post(url, **kwargs):
        nonlocal calls
        calls += 1
        raise httpx.ConnectError("connection refused")

    llm._http_client = type("T", (), {"post": staticmethod(post)})()

    with pytest.raises(httpx.ConnectError):
        await llm.complete("prompt")
    assert calls == 1


@pytest.mark.asyncio
async def test_a_drop_after_tokens_streamed_still_propagates():
    """The streamed path's extra condition: replaying would duplicate output."""
    llm = _client()
    calls = 0

    class _Stream:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        def raise_for_status(self):
            return None

        async def aiter_lines(self):
            yield 'data: {"choices":[{"delta":{"content":"Open at "}}]}'
            raise httpx.RemoteProtocolError("Server disconnected without sending a response.")

    def stream(method, url, **kwargs):
        nonlocal calls
        calls += 1
        return _Stream()

    llm._http_client = type("T", (), {"stream": staticmethod(stream)})()

    seen = []
    with pytest.raises(httpx.RemoteProtocolError):
        async for token in llm.stream("prompt"):
            seen.append(token)

    assert seen == ["Open at "]
    assert calls == 1  # not retried — the client already has those tokens


@pytest.mark.asyncio
async def test_stream_retries_when_the_drop_precedes_every_token():
    llm = _client()
    calls = 0

    class _Dead:
        async def __aenter__(self):
            raise httpx.RemoteProtocolError("Server disconnected without sending a response.")

        async def __aexit__(self, *exc):
            return False

    class _Live:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        def raise_for_status(self):
            return None

        async def aiter_lines(self):
            yield 'data: {"choices":[{"delta":{"content":"Open at 80 days"}}]}'
            yield "data: [DONE]"

    def stream(method, url, **kwargs):
        nonlocal calls
        calls += 1
        return _Dead() if calls == 1 else _Live()

    llm._http_client = type("T", (), {"stream": staticmethod(stream)})()

    assert [t async for t in llm.stream("prompt")] == ["Open at 80 days"]
    assert calls == 2


def test_pool_does_not_hold_connections_to_the_expiry_boundary():
    """The drop was a race against httpx's 5.0s default, so we sit below it."""
    assert _KEEPALIVE_EXPIRY_SECONDS < httpx.Limits().keepalive_expiry

    # And it actually reaches the pool. Read through a private path, so a future
    # httpx release may move it — skip rather than fail, since the retry is what
    # guarantees correctness here and this only checks the mitigation is wired.
    llm = _client()
    try:
        configured = llm._http_client._transport._pool._keepalive_expiry
    except AttributeError:  # pragma: no cover - depends on the httpx version
        pytest.skip("httpx no longer exposes the pool's keepalive expiry here")
    assert configured == _KEEPALIVE_EXPIRY_SECONDS
