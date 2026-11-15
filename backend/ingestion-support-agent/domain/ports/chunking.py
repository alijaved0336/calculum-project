from __future__ import annotations
from abc import ABC, abstractmethod

from domain.entities.ingestion import Chunk, Page


class ChunkerPort(ABC):
    @abstractmethod
    def chunk_pages(self, pages: list[Page], file_id: str) -> list[Chunk]:
        """Chunk a group of pages as one unit; cross-group linking is the caller's job."""
        ...
