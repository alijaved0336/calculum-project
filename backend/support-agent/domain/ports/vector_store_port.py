from __future__ import annotations

from abc import ABC, abstractmethod

from domain.entities.retrieval_result import RetrievalResult


class VectorStorePort(ABC):
    @abstractmethod
    async def retrieve(
        self, query: str, top_k: int, score_threshold: float
    ) -> list[RetrievalResult]:
        """Embed the query and return the top_k nearest video transcript chunks."""

    @abstractmethod
    async def fetch_by_ids(self, ids: list[str]) -> list[RetrievalResult]:
        """Fetch specific chunks by id (used for prev/next neighbour expansion)."""

    @abstractmethod
    async def delete_by_file(self, file_uuid: str) -> None:
        """Delete every chunk belonging to a video/document (its transcript chunks included)."""

    @abstractmethod
    async def scroll_by_file(self, file_uuid: str) -> list[RetrievalResult]:
        """List every chunk belonging to a file (no vector search) — for the segment manager."""

    @abstractmethod
    async def delete_by_ids(self, ids: list[str]) -> int:
        """Delete specific chunks by point id. Idempotent (unknown ids are no-ops)."""

    @abstractmethod
    async def count_by_file(self, file_uuid: str) -> int:
        """Exact count of the chunks belonging to a file (authoritative post-delete count)."""
