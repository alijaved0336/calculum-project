from __future__ import annotations

import asyncio
import logging
import time

import httpx

from config import settings
from domain.ports.embedding_port import EmbeddingPort

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3


class HttpEmbeddingAdapter(EmbeddingPort):
    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=30.0)

    async def embed(self, text: str) -> list[float]:
        last_exc: Exception | None = None
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                _t = time.perf_counter()
                resp = await self._client.post(
                    f"{settings.embedding_model_base_url}/v1/embeddings",
                    json={"model": settings.embed_model, "input": [text]},
                    headers={"Authorization": f"Bearer {settings.embedding_model_key}"},
                )
                resp.raise_for_status()
                logger.info("[TIMING] embedding.embed_query: %.0fms", (time.perf_counter() - _t) * 1000)
                return resp.json()["data"][0]["embedding"]
            except Exception as exc:
                last_exc = exc
                if attempt < _MAX_RETRIES:
                    await asyncio.sleep(2 ** (attempt - 1))
        raise RuntimeError(
            f"Embedding failed after {_MAX_RETRIES} attempts: {last_exc}"
        ) from last_exc

    async def embed_query(self, text: str) -> list[float]:
        """Embed a SEARCH QUERY, with Qwen3's instruction prefix.

        Qwen3-Embedding is trained for asymmetric retrieval: documents go in raw,
        queries go in behind an "Instruct: ...\nQuery: ..." preamble. We were
        sending queries raw (the port's default `embed_query` is a bare alias for
        `embed`), which compresses the score band and is a large part of why the
        dense threshold could not separate signal from noise.

        Measured against the live KB: relevant queries gain ~0.06-0.07, while an
        off-topic query drops 0.3166 -> 0.1633.

        `embed()` is deliberately NOT touched — the document side is indexed by a
        separate ingestion service, and prefixing only one side of an already-built
        index would be worse than prefixing neither.
        """
        if not settings.embed_query_instruction_enabled:
            return await self.embed(text)
        return await self.embed(
            f"Instruct: {settings.embed_query_instruction}\nQuery: {text}"
        )
