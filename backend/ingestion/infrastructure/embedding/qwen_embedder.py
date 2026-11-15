from __future__ import annotations
import dataclasses
import logging
import re
import time
import httpx
from domain.entities.ingestion import Chunk
from domain.ports.embeddings import EmbeddingPort

_TOKEN_LIMIT_RE = re.compile(r"input \((\d+) tokens\).*?batch size[^\d]*(\d+)", re.IGNORECASE | re.DOTALL)

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)


def _with_embedding(chunk: Chunk, vector: list[float]) -> Chunk:
    return dataclasses.replace(chunk, embedding=vector)


class AsyncQwenEmbedder(EmbeddingPort):

    def __init__(
        self, api_url: str, api_key: str, model: str,
        max_tokens_per_text: int = 600, timeout: float = 180.0,
    ) -> None:
        self._url = api_url.rstrip("/") + "/v1/embeddings"
        self._headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        self._model = model
        self._max_tokens = max_tokens_per_text
        self._timeout = timeout
        self._sync_client = httpx.Client()
        self._enc = self._load_tokenizer(model)
        logger.info("embedder.init max_tokens=%d tokenizer=%s", max_tokens_per_text, type(self._enc).__name__)

    @staticmethod
    def _load_tokenizer(model: str):
        """Raises on failure — never falls back to word-split (token count too low corrupts batching)."""
        from calculum_tokenizer import tokenizer_dir
        base = re.sub(r"\.(gguf|bin|safetensors)$", "", model, flags=re.IGNORECASE)
        base = re.sub(r"-(Q\d+_\w+|GGUF|FP16|BF16)$", "", base, flags=re.IGNORECASE)
        source = str(tokenizer_dir(base))
        try:
            from transformers import AutoTokenizer
            return AutoTokenizer.from_pretrained(source, trust_remote_code=True)
        except Exception as exc:
            raise RuntimeError(
                f"tokenizer load failed (source={source!r}): {exc}. Check calculum-tokenizer."
            ) from exc

    async def aclose(self) -> None:
        self._sync_client.close()

    # ── Token helpers ─────────────────────────────────────────────────────────

    def count_tokens(self, text: str) -> int:
        return len(self._enc.encode(text))

    def _truncate(self, text: str) -> str:
        ids = self._enc.encode(text)
        if len(ids) <= self._max_tokens:
            return text
        logger.warning("embed.truncate tokens=%d limit=%d — content cut", len(ids), self._max_tokens)
        return self._enc.decode(ids[: self._max_tokens])

    # ── Public API ────────────────────────────────────────────────────────────

    def _post_embeddings(self, texts: list[str]) -> list[list[float]]:
        """POST texts with transport-retry; splits batch on token-limit errors."""
        total_tokens = sum(self.count_tokens(t) for t in texts)
        logger.info("embed.preflight model=%s chunks=%d tokens=%d", self._model, len(texts), total_tokens)
        t0 = time.perf_counter()
        resp = None
        for attempt in range(3):
            try:
                resp = self._sync_client.post(
                    self._url, json={"model": self._model, "input": texts},
                    headers=self._headers, timeout=self._timeout,
                )
            except httpx.TransportError as exc:
                logger.warning("embed.transport_retry attempt=%d error=%s", attempt + 1, exc)
                if attempt == 2:
                    raise
                time.sleep(2 ** (attempt + 1))
                continue
            err_body = resp.text[:300]
            if resp.status_code in (400, 413) or (
                resp.status_code >= 500 and _TOKEN_LIMIT_RE.search(err_body)
            ):
                if len(texts) == 1:
                    resp.raise_for_status()
                mid = len(texts) // 2
                logger.warning("embed.batch_split size=%d → %d + %d", len(texts), mid, len(texts) - mid)
                return self._post_embeddings(texts[:mid]) + self._post_embeddings(texts[mid:])
            if resp.status_code < 500:
                break
            logger.warning("embed.retry attempt=%d status=%d body=%s", attempt + 1, resp.status_code, err_body)
            if attempt < 2:
                time.sleep(2 ** (attempt + 1))
        resp.raise_for_status()
        logger.info("embed.http.response status=%d chunks=%d", resp.status_code, len(texts))
        body = resp.json()
        if "data" not in body:
            raise ValueError(f"embed API unexpected response: {resp.text[:200]}")
        vectors = [item["embedding"] for item in sorted(body["data"], key=lambda x: x["index"])]
        logger.info("embed.done model=%s chunks=%d tokens=%d duration=%.2fs",
                    self._model, len(texts), total_tokens, time.perf_counter() - t0)
        return vectors

    def embed_one_sync(self, chunk: Chunk) -> Chunk:
        vectors = self._post_embeddings([self._truncate(chunk.text)])
        return _with_embedding(chunk, vectors[0])

    def embed_batch_sync(self, chunks: list[Chunk]) -> list[Chunk]:
        vectors = self._post_embeddings([self._truncate(c.text) for c in chunks])
        if len(vectors) != len(chunks):
            raise ValueError(f"embed API returned {len(vectors)} vectors for {len(chunks)} chunks")
        return [_with_embedding(c, v) for c, v in zip(chunks, vectors, strict=True)]
