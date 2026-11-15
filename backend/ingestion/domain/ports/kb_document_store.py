from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Any


class KBDocumentStorePort(ABC):
    @abstractmethod
    async def kb_document_exists(self, file_uuid: uuid.UUID) -> bool: ...

    @abstractmethod
    async def update_kb_document(self, file_uuid: uuid.UUID, **fields: Any) -> None: ...

    @abstractmethod
    async def mark_ingestion_started(
        self,
        file_uuid: uuid.UUID,
        filename: str,
        uploaded_by_user_uuid: uuid.UUID,
        file_size: int | None = None,
        file_type: str | None = None,
        playbook_strategies: list[str] | None = None,
        checksum: str | None = None,
    ) -> None:
        """Set status='Processing' and clear any previous error. Creates record if missing."""
        ...

    @abstractmethod
    async def update_tracking(self, file_uuid: uuid.UUID, status: str, **extra: Any) -> None:
        """Granular status update at each pipeline phase."""
        ...

    @abstractmethod
    async def get_uuid_by_filename(self, filename: str) -> uuid.UUID | None:
        """Return the UUID of the most recent document with this filename, or None."""
        ...

    @abstractmethod
    async def get_uuid_by_checksum(self, checksum: str) -> uuid.UUID | None:
        """UUID of the most recent fully-upserted doc with this checksum, or None."""
        ...

    @abstractmethod
    async def delete_kb_document(self, file_uuid: uuid.UUID) -> None:
        """Hard-delete the KB document record."""
        ...

    @abstractmethod
    async def get_document_status(self, file_uuid: uuid.UUID) -> str | None:
        """Return current status string, or None if the record does not exist."""
        ...
