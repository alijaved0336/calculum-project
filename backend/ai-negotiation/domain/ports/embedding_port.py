from __future__ import annotations

from abc import ABC, abstractmethod


class EmbeddingPort(ABC):
    @abstractmethod
    async def embed(self, text: str) -> list[float]: ...

    async def embed_query(self, text: str) -> list[float]:
        return await self.embed(text)
