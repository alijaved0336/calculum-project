from abc import ABC, abstractmethod

from domain.entities.retrieval_result import RetrievalResult


class VectorStorePort(ABC):
    @abstractmethod
    async def retrieve(
        self,
        query: str,
        *,
        top_k: int,
        score_threshold: float | None,
        playbook_strategy_types: list[str] | None = None,
        filenames: list[str] | None = None,
    ) -> list[RetrievalResult]:
        """Dense-search the knowledge base.

        ``top_k`` and ``score_threshold`` are REQUIRED and keyword-only on
        purpose. They used to carry defaults here (0.5) that disagreed with the
        defaults in the adapter (0.5) and in config.py (0.30); whichever caller
        forgot to pass them silently got a different pipeline. There is now
        exactly one place these numbers are chosen: ``config.Settings``.

        ``score_threshold=None`` means "no server-side gate" — return the
        ``top_k`` nearest and let the cross-encoder decide relevance.

        ``filenames`` scopes the search to chunks of those documents only
        (``metadata.filename``); None searches the whole collection.
        """
        ...

    @abstractmethod
    async def fetch_by_filenames(self, filenames: list[str]) -> list[RetrievalResult]:
        """Every chunk of the named documents, unranked (``score=0.0``)."""
        ...

    @abstractmethod
    async def fetch_by_ids(self, ids: list[str]) -> list[RetrievalResult]: ...

    @abstractmethod
    async def health_check(self) -> bool: ...
