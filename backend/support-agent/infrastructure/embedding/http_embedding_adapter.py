from __future__ import annotations

from typing import Callable

from domain.ports.embedding_port import EmbeddingPort


class HttpEmbeddingAdapter(EmbeddingPort):
    """Query embeddings via an OpenAI-compatible ``/v1/embeddings`` endpoint.

    Must use the SAME model as ingestion (Qwen3-Embedding-4B, 2560-dim) so the query
    vector lives in the same space as the indexed transcript chunks.
    """

    def __init__(
        self,
        base_url: str,
        api_key: str,
        model: str,
        timeout: float = 60.0,
        client_factory: Callable | None = None,
    ) -> None:
        self._url = base_url.rstrip("/") + "/v1/embeddings"
        self._key = api_key
        self._model = model
        if client_factory is not None:
            self._client_factory = client_factory
        else:
            import httpx

            self._client_factory = lambda: httpx.AsyncClient(timeout=timeout)

    async def embed_query(self, text: str) -> list[float]:
        headers = {"Authorization": f"Bearer {self._key}"} if self._key else {}
        async with self._client_factory() as client:
            resp = await client.post(
                self._url, json={"model": self._model, "input": [text]}, headers=headers
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
