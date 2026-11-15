from __future__ import annotations

import json
import re
from typing import AsyncIterator, Callable

_THINK_BLOCK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_OPEN_TAG = "<think>"
_CLOSE_TAG = "</think>"


def strip_reasoning(text: str) -> str:
    """Remove Qwen3 ``<think>...</think>`` reasoning blocks from a completion."""
    return _THINK_BLOCK.sub("", text).strip()


def _partial_suffix_len(text: str, tag: str) -> int:
    """Longest suffix of ``text`` that is a proper prefix of ``tag`` (0 if none).

    Used when streaming to hold back the minimal tail that could still turn into a
    ``<think>``/``</think>`` tag once the next token arrives.
    """
    for k in range(min(len(text), len(tag) - 1), 0, -1):
        if tag.startswith(text[-k:]):
            return k
    return 0


class ThinkFilter:
    """Incremental ``<think>...</think>`` remover for streamed tokens.

    ``feed(chunk)`` returns the visible text so far, suppressing everything inside a
    reasoning block even when the open/close tags are split across chunks. Call
    ``flush()`` at the end to release any buffered non-reasoning tail.
    """

    def __init__(self) -> None:
        self._in_think = False
        self._buf = ""

    def feed(self, chunk: str) -> str:
        self._buf += chunk
        out: list[str] = []
        while self._buf:
            if not self._in_think:
                idx = self._buf.find(_OPEN_TAG)
                if idx != -1:
                    out.append(self._buf[:idx])
                    self._buf = self._buf[idx + len(_OPEN_TAG):]
                    self._in_think = True
                    continue
                keep = _partial_suffix_len(self._buf, _OPEN_TAG)
                out.append(self._buf[: len(self._buf) - keep])
                self._buf = self._buf[len(self._buf) - keep:]
                break
            else:
                idx = self._buf.find(_CLOSE_TAG)
                if idx != -1:
                    self._buf = self._buf[idx + len(_CLOSE_TAG):]
                    self._in_think = False
                    continue
                keep = _partial_suffix_len(self._buf, _CLOSE_TAG)
                self._buf = self._buf[len(self._buf) - keep:] if keep else ""
                break
        return "".join(out)

    def flush(self) -> str:
        tail = "" if self._in_think else self._buf
        self._buf = ""
        return tail


class LLMClient:
    """Self-hosted Qwen via an OpenAI-compatible chat-completions endpoint.

    ``temperature`` is sent explicitly on every request. Left unset, the inference server's
    own default applies — which for Qwen is well above 0, so the SAME prompt (including the
    strict citation-format instructions) can sample a different token sequence on every call:
    a real timestamp one turn, a paraphrased/parenthesised one the next, or none at all. A low,
    explicit temperature makes citation formatting (and everything else the prompt mandates)
    reproducible run-to-run instead of appearing to work "sometimes" depending on sampling luck.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        chat_path: str = "/v1/chat/completions",
        timeout: float = 120.0,
        temperature: float = 0.1,
        client_factory: Callable | None = None,
    ) -> None:
        self._url = base_url.rstrip("/") + chat_path
        self._key = api_key
        self._model = model
        self._temperature = temperature
        if client_factory is not None:
            self._client_factory = client_factory
        else:
            import httpx

            self._client_factory = lambda: httpx.AsyncClient(timeout=timeout)

    async def complete(self, prompt: str, system: str | None = None, max_tokens: int = 1024) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        headers = {"Authorization": f"Bearer {self._key}"} if self._key else {}
        async with self._client_factory() as client:
            resp = await client.post(
                self._url,
                json={
                    "model": self._model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": self._temperature,
                },
                headers=headers,
            )
            resp.raise_for_status()
            content = resp.json()["choices"][0]["message"]["content"]
        return strip_reasoning(content)

    async def stream(
        self, prompt: str, system: str | None = None, max_tokens: int = 1024
    ) -> AsyncIterator[str]:
        """Stream the completion token-by-token (OpenAI SSE), stripping reasoning live."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        headers = {"Authorization": f"Bearer {self._key}"} if self._key else {}
        think = ThinkFilter()
        async with self._client_factory() as client:
            async with client.stream(
                "POST",
                self._url,
                json={
                    "model": self._model,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": self._temperature,
                    "stream": True,
                },
                headers=headers,
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line or not line.startswith("data:"):
                        continue
                    data = line[len("data:"):].strip()
                    if data == "[DONE]":
                        break
                    try:
                        delta = json.loads(data)["choices"][0]["delta"].get("content")
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
                    if not delta:
                        continue
                    visible = think.feed(delta)
                    if visible:
                        yield visible
        tail = think.flush()
        if tail:
            yield tail
