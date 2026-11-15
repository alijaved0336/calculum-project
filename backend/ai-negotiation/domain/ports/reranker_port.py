from __future__ import annotations

from abc import ABC, abstractmethod

from domain.entities.retrieval_result import RetrievalResult


class RerankerPort(ABC):
    @abstractmethod
    async def rerank(
        self,
        query: str,
        candidates: list[RetrievalResult],
        top_n: int,
    ) -> list[RetrievalResult]: ...
