from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from typing import AsyncGenerator

import httpx

_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL)

from domain.ports.llm_port import LLMPort
from domain.services.asymmetry_guard import (
    SUPPLIER_FACING_CLOSE,
    SUPPLIER_FACING_OPEN,
)
from infrastructure.observability.langfuse_tracing import Generation, start_generation
from infrastructure.streaming_context import active_stream_queue
# Imported across the layer boundary on purpose: the tag vocabulary has exactly
# one definition, next to the `rank_tag` that produces it. Re-listing the
# strings here is how a scrubber quietly stops matching what is emitted.
from utils.prompts.brief.rules import strip_rank_tags

# Machine-only delimiters the mixed-surface advice prompts wrap around the
# sayable, supplier-facing span. They must survive into the full draft (the
# asymmetry guard scopes its redaction to them) but must never be shown to the
# negotiator — so they are stripped from the tokens forwarded to the live
# stream, then dropped from the stored text by the guard.
_SUPPLIER_FACING_MARKERS = (SUPPLIER_FACING_OPEN, SUPPLIER_FACING_CLOSE)

# A trailing "[" with no closing "]" yet could be the start of a rank tag
# arriving split across tokens. Held back until it completes or the stream
# flushes — capped so a legitimate bracket (a markdown link, an aside) delays a
# few characters rather than an unbounded span of text.
_MAX_HELD_BRACKET = 48

logger = logging.getLogger(__name__)

# Extra attempts to reach the server when a pooled connection turns out to be
# stale (see `_retry_on_stale_connection`). Applies to BOTH transports — the
# streamed one before any token has arrived, and the blocking one, which cannot
# fail part-way through: it either gets a whole response or none.
_CONNECT_RETRIES = 2

# How long httpx may reuse an idle pooled connection. The default is 5.0s and
# expiry is only checked when the pool hands the connection back, so a socket
# idle 4.9s is served as live even though the inference server (or a proxy in
# front of it) may already have closed its end — the request then fails with
# `RemoteProtocolError` before any response byte arrives. A playbook turn idles
# the pool for almost exactly that long while embedding, retrieval and reranking
# run, so it sat on the boundary. A shorter window makes the pool discard those
# sockets rather than hand them out; `_retry_on_stale_connection` still covers
# the drop, because the server's own idle timeout is not ours to know.
_KEEPALIVE_EXPIRY_SECONDS = 2.0

# Qwen3 (and other reasoning models) emit their chain-of-thought inline as a
# <think>...</think> block before the actual answer. Left untouched it leaks to
# the user and breaks JSON parsing downstream, so we strip it here, in the one
# place every call passes through.
_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_OPEN_TAG = "<think>"
_CLOSE_TAG = "</think>"


def _strip_reasoning(text: str) -> str:
    """Remove a reasoning model's ``<think>...</think>`` block from a completion.

    Handles the well-formed case plus the two truncated ones: only the opening
    tag survived (model hit ``max_tokens`` mid-thought) or only a stray closing
    tag is present (server emitted reasoning out-of-band but kept the tag).
    """
    if not text:
        return text
    cleaned = _THINK_BLOCK.sub("", text)
    open_idx = cleaned.lower().find(_OPEN_TAG)
    if open_idx != -1:  # unterminated <think> — drop from it to the end
        cleaned = cleaned[:open_idx]
    else:
        close_idx = cleaned.lower().rfind(_CLOSE_TAG)
        if close_idx != -1:  # stray </think> with no opener — drop everything before it
            cleaned = cleaned[close_idx + len(_CLOSE_TAG):]
    return cleaned.strip()


def _partial_tag_suffix_len(buf: str, tag: str) -> int:
    """Length of the longest suffix of ``buf`` that is a prefix of ``tag``.

    Used while streaming so a tag arriving split across two chunks (e.g. ``"<th"``
    then ``"ink>"``) is held back rather than emitted as visible text.
    """
    for k in range(min(len(buf), len(tag) - 1), 0, -1):
        if buf[-k:].lower() == tag[:k].lower():
            return k
    return 0


def _drain_markers(buf: str, *, flush: bool) -> tuple[str, str]:
    """Split ``buf`` into (text safe to emit now, text to hold for next chunk).

    Removes any complete supplier-facing marker, and — unless ``flush`` — holds
    back a trailing partial that could be the start of a marker arriving split
    across tokens (e.g. ``"[[SUPP"`` now, ``"LIER_FACING]]"`` next). On flush,
    whatever remains is emitted verbatim.
    """
    for marker in _SUPPLIER_FACING_MARKERS:
        buf = buf.replace(marker, "")
    # Rank tags ([STRONGEST], [3rd STRONGEST], ...) are prompt annotations the
    # model copies into its answer. Removed here so they never flash live, and
    # again from the finished draft so the stored reply matches what was shown.
    buf = strip_rank_tags(buf)
    if flush:
        return buf, ""
    keep = max(
        (_partial_tag_suffix_len(buf, marker) for marker in _SUPPLIER_FACING_MARKERS),
        default=0,
    )
    # An unclosed "[" near the end may be a rank tag still arriving.
    open_bracket = buf.rfind("[")
    if open_bracket != -1 and "]" not in buf[open_bracket:]:
        held = len(buf) - open_bracket
        if held <= _MAX_HELD_BRACKET:
            keep = max(keep, held)
    # Hold a trailing ASCII hyphen so ``limited-`` + ``impact`` cannot become
    # ``limitedimpact`` if a scrubber ever trims end-of-buffer separators.
    if buf.endswith("-"):
        keep = max(keep, 1)
    if keep:
        return buf[:-keep], buf[-keep:]
    return buf, ""


async def _strip_reasoning_stream(
    source: AsyncGenerator[str, None],
) -> AsyncGenerator[str, None]:
    """Yield ``source`` tokens with any ``<think>...</think>`` spans removed.

    Tags can span multiple tokens, so we buffer the minimum needed to recognise
    a (possibly partial) tag at the chunk boundary before emitting.
    """
    buf = ""
    in_think = False
    async for token in source:
        buf += token
        while buf:
            if in_think:
                idx = buf.lower().find(_CLOSE_TAG)
                if idx == -1:
                    keep = _partial_tag_suffix_len(buf, _CLOSE_TAG)
                    buf = buf[len(buf) - keep:] if keep else ""
                    break
                buf = buf[idx + len(_CLOSE_TAG):]
                in_think = False
                continue
            idx = buf.lower().find(_OPEN_TAG)
            if idx == -1:
                keep = _partial_tag_suffix_len(buf, _OPEN_TAG)
                emit = buf[: len(buf) - keep] if keep else buf
                if emit:
                    yield emit
                buf = buf[len(buf) - keep:] if keep else ""
                break
            if idx > 0:
                yield buf[:idx]
            buf = buf[idx + len(_OPEN_TAG):]
            in_think = True
            continue
    if buf and not in_think:
        yield buf


async def _retry_on_stale_connection(send, *, what: str):
    """Run ``send`` again when a pooled connection turns out to be dead.

    A keep-alive connection can go stale between requests: the remote inference
    server, or a proxy in front of it, closes it server-side while httpx still
    considers it live. It surfaces as ``RemoteProtocolError`` raised while
    reading the response headers — before any response byte arrives — so nothing
    was received and nothing was shown to the user. Retrying is therefore safe:
    there is no partial output to duplicate.

    Only that failure is retried. Every other transport error propagates
    untouched — a refused connection or a timeout means retrying will not help.

    Used by the blocking transport, which either gets a whole response or none.
    The streamed one keeps its own copy of this loop inline: it yields from
    inside the `try`, so it cannot be expressed as a callable handed to a
    wrapper, and it carries the extra condition that makes a retry safe there
    (no token yielded yet). Both share `_CONNECT_RETRIES`.
    """
    for attempt in range(_CONNECT_RETRIES + 1):
        try:
            return await send()
        except httpx.RemoteProtocolError:
            if attempt >= _CONNECT_RETRIES:
                raise
            logger.warning(
                "LLM %s connection dropped before any response arrived "
                "(attempt %d/%d) — retrying",
                what,
                attempt + 1,
                _CONNECT_RETRIES + 1,
            )
            await asyncio.sleep(0.2)


def _start_generation(payload: dict) -> Generation:
    """Record one model call in Langfuse with exactly the messages sent."""
    return start_generation(
        model=payload["model"],
        messages=payload["messages"],
        model_parameters={
            "temperature": payload.get("temperature"),
            "max_tokens": payload.get("max_tokens"),
            "stream": payload.get("stream"),
            "enable_thinking": (payload.get("chat_template_kwargs") or {}).get("enable_thinking"),
        },
    )


class LLMClient(LLMPort):
    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: str = "",
        chat_path: str = "/v1/chat/completions",
        enable_thinking: bool = False,
        supports_chat_template_kwargs: bool = True,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self._enable_thinking = enable_thinking
        self._supports_chat_template_kwargs = supports_chat_template_kwargs
        self._chat_url = f"{self.base_url}{chat_path}"
        self._headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        }
        self._http_client = httpx.AsyncClient(
            timeout=120,
            limits=httpx.Limits(keepalive_expiry=_KEEPALIVE_EXPIRY_SECONDS),
        )

    def _build_payload(self, prompt: str, stream: bool, **kwargs) -> dict:
        messages = []

        if system := kwargs.get("system"):
            messages.append({"role": "system", "content": system})

        messages.append({"role": "user", "content": prompt})

        payload: dict = {
            "model": kwargs.get("model", self.model),
            "messages": messages,
            "stream": stream,
        }

        if (temperature := kwargs.get("temperature")) is not None:
            payload["temperature"] = temperature

        if (max_tokens := kwargs.get("max_tokens")) is not None:
            payload["max_tokens"] = max_tokens

        # Toggle Qwen3-style reasoning. `chat_template_kwargs` is a vLLM / SGLang
        # extension — other chat-completions-compatible backends (llama.cpp, TGI,
        # hosted APIs) may 400 on the unknown field, so it's gated behind
        # `supports_chat_template_kwargs`. Defaults to the instance setting (off)
        # so every node skips the costly <think> block, but any call can override
        # per-request.
        if self._supports_chat_template_kwargs:
            enable_thinking = kwargs.get("enable_thinking")
            if enable_thinking is None:
                enable_thinking = self._enable_thinking
            payload["chat_template_kwargs"] = {"enable_thinking": bool(enable_thinking)}

        return payload

    async def _token_generator(
        self, prompt: str, **kwargs
    ) -> AsyncGenerator[str, None]:
        payload = self._build_payload(prompt, stream=True, **kwargs)
        yielded_any = False

        for attempt in range(_CONNECT_RETRIES + 1):
            try:
                async with self._http_client.stream(
                    "POST",
                    self._chat_url,
                    json=payload,
                    headers=self._headers,
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line.startswith("data:"):
                            continue

                        chunk = line[5:].strip()

                        if chunk == "[DONE]":
                            return

                        try:
                            data = json.loads(chunk)
                            token = (
                                data["choices"][0]
                                .get("delta", {})
                                .get("content", "")
                            )
                            if token:
                                yielded_any = True
                                yield token

                        except (json.JSONDecodeError, KeyError, IndexError):
                            logger.warning("Unparseable chunk: %s", chunk)
                            continue
                return
            except httpx.RemoteProtocolError:
                # The stale-pooled-connection retry — see
                # `_retry_on_stale_connection`, which this loop is the streamed
                # twin of. The extra condition is `yielded_any`: a drop *after*
                # some tokens reached the client is a different failure, and
                # replaying it would duplicate output, so it propagates.
                if yielded_any or attempt >= _CONNECT_RETRIES:
                    raise
                logger.warning(
                    "LLM stream connection dropped before any tokens arrived "
                    "(attempt %d/%d) — retrying",
                    attempt + 1,
                    _CONNECT_RETRIES + 1,
                )
                await asyncio.sleep(0.2)

    async def complete(self, prompt: str, *, stream_to_client: bool = False, **kwargs) -> str:
        """Non-streaming — waits for full response.

        If ``stream_to_client=True`` is passed **and** ``active_stream_queue``
        context var is set, the response is streamed token-by-token into that
        queue so the WebSocket handler can forward tokens to the client in real
        time.  A ``None`` sentinel is pushed after the last token.  The full
        accumulated text is still returned as usual so the graph state is
        unaffected.
        """
        queue = active_stream_queue.get() if stream_to_client else None

        if queue is not None:
            generation = _start_generation(self._build_payload(prompt, stream=True, **kwargs))
            _t = time.perf_counter()
            draft = ""
            marker_buf = ""
            try:
                async for token in _strip_reasoning_stream(self._token_generator(prompt, **kwargs)):
                    # The full draft keeps the markers — the asymmetry guard
                    # needs them to scope its redaction. Only the tokens sent to
                    # the client are stripped, so the markers never flash live.
                    draft += token
                    marker_buf += token
                    emit, marker_buf = _drain_markers(marker_buf, flush=False)
                    if emit:
                        await queue.put(emit)
                emit, marker_buf = _drain_markers(marker_buf, flush=True)
                if emit:
                    await queue.put(emit)
            except BaseException as exc:
                generation.end(output=draft or None, error=exc)
                raise
            finally:
                await queue.put(None)  # sentinel: this node's streaming is done
            logger.info(
                "[TIMING] llm.stream (to_client): %.0fms (max_tokens=%s)",
                (time.perf_counter() - _t) * 1000,
                kwargs.get("max_tokens"),
            )
            # Markers stay (the asymmetry guard scopes on them); rank tags go,
            # so the stored reply matches the one the negotiator watched arrive.
            result = strip_rank_tags(draft)
            generation.end(output=result)
            return result

        # ── Standard blocking path ────────────────────────────────────────
        payload = self._build_payload(prompt, stream=False, **kwargs)
        generation = _start_generation(payload)

        _t = time.perf_counter()
        try:
            # Retried on a stale pooled connection exactly as the streamed path is.
            # This path is the one that surfaces the failure to the user: the nodes
            # on it (the playbook, the opening email, every extraction call, and —
            # since `queue` is None off the WebSocket — every node on the REST
            # route) have no tokens on screen to contradict, so a drop becomes the
            # generic "something went wrong" reply instead of a slight stutter.
            response = await _retry_on_stale_connection(
                lambda: self._http_client.post(
                    self._chat_url,
                    json=payload,
                    headers=self._headers,
                ),
                what="request",
            )
            response.raise_for_status()
            data = response.json()
        except BaseException as exc:
            generation.end(error=exc)
            raise
        logger.info(
            "[TIMING] llm.complete: %.0fms (max_tokens=%s)",
            (time.perf_counter() - _t) * 1000,
            kwargs.get("max_tokens"),
        )

        content = data["choices"][0]["message"].get("content") or ""
        result = strip_rank_tags(_strip_reasoning(content))
        generation.end(output=result, usage=data.get("usage"))
        return result

    async def stream(self, prompt: str, **kwargs) -> AsyncGenerator[str, None]:
        """Yields tokens one by one — transport agnostic, reasoning stripped."""
        generation = _start_generation(self._build_payload(prompt, stream=True, **kwargs))
        parts: list[str] = []
        try:
            async for token in _strip_reasoning_stream(self._token_generator(prompt, **kwargs)):
                parts.append(token)
                yield token
        except GeneratorExit:
            # The consumer stopped early: record what it received, not an error.
            generation.end(output="".join(parts))
            raise
        except BaseException as exc:
            generation.end(output="".join(parts) or None, error=exc)
            raise
        generation.end(output="".join(parts))

    async def aclose(self) -> None:
        """Release the underlying HTTP connection pool.

        The app keeps a single cached client for the whole process, but
        short-lived users (tests, scripts) need to close the pool deterministically
        within the loop that created it.
        """
        await self._http_client.aclose()
