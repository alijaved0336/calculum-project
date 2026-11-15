from __future__ import annotations

from abc import ABC, abstractmethod


class EmbeddingPort(ABC):
    @abstractmethod
    async def embed_query(self, text: str) -> list[float]:
        """Return the dense embedding vector for a query string."""
