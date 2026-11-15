"""Langfuse tracing: one trace per negotiation turn, one generation per model call.

Before this module only the RAG pipeline was decorated, so every trace was a
detached `rag_pipeline` and the prompts the nodes actually sent (supplier facts,
analysis, instructions) never reached Langfuse. Now a turn opens a parent span
carrying the session id, and every model call underneath it is recorded as a
generation with its full messages and reply.

Fully no-op when LANGFUSE_PUBLIC_KEY is empty, LANGFUSE_TRACING_ENABLED is false
or the SDK is missing. Tracing must never fail a turn, so every Langfuse call is
guarded and only logged when it breaks.
"""

from __future__ import annotations

import logging
import os
from collections.abc import AsyncIterator, Callable, Mapping, Sequence
from contextlib import ExitStack, asynccontextmanager
from typing import Any

logger = logging.getLogger(__name__)

_client: Any = None
_resolved = False


def _get_client() -> Any:
    """The Langfuse client, or ``None`` when tracing is off. Resolved once."""
    global _client, _resolved
    if _resolved:
        return _client
    _resolved = True
    try:
        from config import settings

        if not settings.langfuse_tracing_enabled or not settings.langfuse_public_key:
            return None
        # pydantic-settings loads .env into attributes, not os.environ, and the
        # SDK reads os.environ — so propagate before importing it.
        os.environ.setdefault("LANGFUSE_PUBLIC_KEY", settings.langfuse_public_key)
        os.environ.setdefault("LANGFUSE_SECRET_KEY", settings.langfuse_secret_key)
        os.environ.setdefault("LANGFUSE_BASE_URL", settings.langfuse_base_url)

        from langfuse import get_client

        _client = get_client()
        logger.info("langfuse tracing enabled (host=%s)", settings.langfuse_base_url)
    except Exception:
        logger.warning("langfuse tracing unavailable; continuing without it", exc_info=True)
        _client = None
    return _client


def observe(name: str) -> Callable[[Callable], Callable]:
    """``langfuse.observe`` when tracing is on, otherwise an identity decorator."""
    if _get_client() is not None:
        try:
            from langfuse import observe as lf_observe

            return lf_observe(name=name)
        except Exception:
            logger.warning("langfuse observe unavailable for %s", name, exc_info=True)
    return lambda fn: fn


class TraceHandle:
    """A started observation that is safe to update when tracing is off or broken."""

    def __init__(self, observation: Any = None) -> None:
        self._obs = observation

    def update(self, **fields: Any) -> None:
        if self._obs is None:
            return
        try:
            self._obs.update(**fields)
        except Exception:
            logger.debug("langfuse update failed", exc_info=True)


@asynccontextmanager
async def trace_turn(
    *,
    name: str,
    session_id: str | None,
    user_id: str | None = None,
    input: Any = None,
    metadata: Mapping[str, Any] | None = None,
) -> AsyncIterator[TraceHandle]:
    """Open the parent span for one turn; everything awaited inside nests under it.

    The span and the session attributes are entered on the caller's task, so it
    must wrap the code that runs the graph directly (not a task created before
    the span opened).
    """
    stack = ExitStack()
    handle = TraceHandle()
    client = _get_client()
    if client is not None:
        try:
            from langfuse import propagate_attributes

            span = stack.enter_context(
                client.start_as_current_observation(
                    name=name, as_type="span", input=input, metadata=dict(metadata or {})
                )
            )
            stack.enter_context(
                propagate_attributes(
                    session_id=str(session_id)[:200] if session_id else None,
                    user_id=str(user_id)[:200] if user_id else None,
                    trace_name=name,
                )
            )
            handle = TraceHandle(span)
        except Exception:
            logger.warning("langfuse turn trace could not start", exc_info=True)
            stack.close()
            stack = ExitStack()
            handle = TraceHandle()
    # Body exceptions pass through the span, which records them and re-raises.
    with stack:
        yield handle


class Generation:
    """One model call. ``end`` records the reply (or the error) exactly once."""

    def __init__(self, observation: Any = None) -> None:
        self._obs = observation

    def end(
        self,
        *,
        output: Any = None,
        usage: Mapping[str, Any] | None = None,
        error: BaseException | None = None,
    ) -> None:
        obs, self._obs = self._obs, None
        if obs is None:
            return
        try:
            fields: dict[str, Any] = {"output": output}
            usage_details = _usage_details(usage)
            if usage_details:
                fields["usage_details"] = usage_details
            if error is not None:
                fields["level"] = "ERROR"
                fields["status_message"] = f"{type(error).__name__}: {error}"[:500]
            obs.update(**fields)
            obs.end()
        except Exception:
            logger.debug("langfuse generation end failed", exc_info=True)


def start_generation(
    *,
    model: str,
    messages: Sequence[Mapping[str, Any]],
    name: str | None = None,
    model_parameters: Mapping[str, Any] | None = None,
    metadata: Mapping[str, Any] | None = None,
) -> Generation:
    """Record a model call as a child of the current span.

    Deliberately not a context manager and not made current: the streaming
    paths hold it across ``yield``s, where attaching an OTel context would be
    detached on a different task.
    """
    client = _get_client()
    if client is None:
        return Generation()
    try:
        node = current_graph_node()
        params = {
            k: v for k, v in (model_parameters or {}).items() if isinstance(v, (str, int, float, bool))
        }
        obs = client.start_observation(
            name=name or (f"llm:{node}" if node else "llm"),
            as_type="generation",
            model=model,
            input=[dict(m) for m in messages],
            model_parameters=params or None,
            metadata={**({"graph_node": node} if node else {}), **dict(metadata or {})},
        )
        return Generation(obs)
    except Exception:
        logger.debug("langfuse generation could not start", exc_info=True)
        return Generation()


def current_graph_node() -> str | None:
    """The LangGraph node running this call, when there is one."""
    try:
        from langgraph.config import get_config

        return (get_config().get("metadata") or {}).get("langgraph_node")
    except Exception:
        return None


def flush_tracing() -> None:
    """Send buffered spans; call on shutdown so the last turns are not lost."""
    client = _client if _resolved else None
    if client is None:
        return
    try:
        client.flush()
    except Exception:
        logger.warning("langfuse flush failed", exc_info=True)


def _usage_details(usage: Mapping[str, Any] | None) -> dict[str, int]:
    if not usage:
        return {}
    mapping = {"prompt_tokens": "input", "completion_tokens": "output", "total_tokens": "total"}
    return {
        target: int(usage[source])
        for source, target in mapping.items()
        if isinstance(usage.get(source), int)
    }
