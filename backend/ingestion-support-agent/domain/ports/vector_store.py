from __future__ import annotations
from abc import ABC, abstractmethod

from domain.entities.ingestion import Chunk


class VectorStorePort(ABC):
    @abstractmethod
    async def ensure_collection(self, vector_size: int) -> None: ...

    @abstractmethod
    async def upsert(self, chunks: list[Chunk]) -> tuple[int, int]: ...

    @abstractmethod
    async def delete_by_file_uuid(self, file_uuid: str) -> None: ...
