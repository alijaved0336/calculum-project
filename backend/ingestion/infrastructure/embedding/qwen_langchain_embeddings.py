from __future__ import annotations
import logging
import time
import httpx
from domain.ports.embeddings import LangchainEmbeddingsPort

logger = logging.getLogger(__name__)


class QwenLangchainEmbeddings(LangchainEmbeddingsPort):

    def __init__(self, api_url: str, api_key: str, model: str, timeout: float = 180.0) -> None:
        self._client = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            timeout=timeout,
        )
        self._url = api_url.rstrip("/") + "/v1/embeddings"
        self._model = model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        total_chars = sum(len(t) for t in texts)
        logger.info("chunker.embed.preflight sentences=%d chars=%d", len(texts), total_chars)
        t0 = time.perf_counter()
        resp = self._client.post(self._url, json={"model": self._model, "input": texts})
        resp.raise_for_status()
        logger.info("chunker.http.response status=%d sentences=%d", resp.status_code, len(texts))
        data = sorted(resp.json()["data"], key=lambda x: x["index"])
        logger.info("chunker.embed.done sentences=%d chars=%d duration=%.2fs",
                    len(texts), total_chars, time.perf_counter() - t0)
        return [item["embedding"] for item in data]

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]
