from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, AsyncIterator


class DocumentStatusStream(ABC):
    """Pub/sub contract for real-time document-status updates to the frontend."""

    @abstractmethod
    async def publish_document_status(self, file_uuid: str, status: str, **extra: Any) -> None:
        """Emit one status transition for a document. Must never raise."""
        ...

    @abstractmethod
    async def subscribe(self, file_uuid: str) -> AsyncIterator[Any]:
        """Async-iterate status events for one document until it reaches a terminal state."""
        ...
