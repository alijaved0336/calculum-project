from __future__ import annotations
import logging
import time
import httpx
from domain.ports.embeddings import LangchainEmbeddingsPort

logger = logging.getLogger(__name__)


class QwenLangchainEmbeddings(LangchainEmbeddingsPort):

    def __init__(
        self, api_url: str, api_key: str, model: str, timeout: float = 180.0, max_retries: int = 3
    ) -> None:
        self._client = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=timeout,
        )
        self._url = api_url.rstrip("/") + "/v1/embeddings"
        self._model = model
        self._max_retries = max(1, max_retries)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        total_chars = sum(len(t) for t in texts)
        logger.info("chunker.embed.preflight sentences=%d chars=%d", len(texts), total_chars)
        t0 = time.perf_counter()
        resp = None
        for attempt in range(self._max_retries):
            try:
                resp = self._client.post(self._url, json={"model": self._model, "input": texts})
            except httpx.TransportError as exc:
                # RemoteProtocolError / ConnectError / ReadError / timeouts — transient under load.
                logger.warning("chunker.embed.transport_retry attempt=%d error=%s", attempt + 1, exc)
                if attempt == self._max_retries - 1:
                    raise
                time.sleep(2 ** (attempt + 1))
                continue
            if resp.status_code >= 500 and attempt < self._max_retries - 1:
                logger.warning("chunker.embed.retry attempt=%d status=%d", attempt + 1, resp.status_code)
                time.sleep(2 ** (attempt + 1))
                continue
            break
        resp.raise_for_status()
        logger.info("chunker.http.response status=%d sentences=%d", resp.status_code, len(texts))
        data = sorted(resp.json()["data"], key=lambda x: x["index"])
        logger.info("chunker.embed.done sentences=%d chars=%d duration=%.2fs",
                    len(texts), total_chars, time.perf_counter() - t0)
        return [item["embedding"] for item in data]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]
