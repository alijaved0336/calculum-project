from __future__ import annotations
from abc import ABC, abstractmethod

from domain.entities.ingestion import Chunk


class EmbeddingPort(ABC):
    @abstractmethod
    def embed_one_sync(self, chunk: Chunk) -> Chunk: ...

    @abstractmethod
    def embed_batch_sync(self, chunks: list[Chunk]) -> list[Chunk]: ...

    @abstractmethod
    def count_tokens(self, text: str) -> int: ...

    @abstractmethod
    async def aclose(self) -> None: ...


class LangchainEmbeddingsPort(ABC):
    @abstractmethod
    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    @abstractmethod
    def embed_query(self, text: str) -> list[float]: ...
