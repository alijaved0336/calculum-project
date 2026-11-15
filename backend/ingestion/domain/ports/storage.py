from __future__ import annotations
from abc import ABC, abstractmethod


class StoragePort(ABC):
    """Durable object storage for original uploaded documents."""

    @abstractmethod
    def upload(self, key: str, data: bytes, content_type: str | None = None) -> None:
        """Persist *data* under *key* (overwrites)."""
        ...

    @abstractmethod
    def download(self, key: str) -> bytes:
        """Return the bytes stored under *key*."""
        ...

    @abstractmethod
    def delete(self, file_id: str) -> int:
        """Best-effort delete every object stored under *file_id*; return count removed."""
        ...
