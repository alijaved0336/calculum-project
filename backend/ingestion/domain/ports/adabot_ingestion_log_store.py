from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from typing import Any


class AdabotIngestionLogStorePort(ABC):
    @abstractmethod
    async def get_adabot_ingestion_logs(self, limit: int, offset: int) -> tuple[list[dict[str, Any]], int]:
        """Return a page of scheduler ingestion runs, newest first, with its total."""
        ...

    @abstractmethod
    async def mark_adabot_ingestion_started(self, log_uuid: uuid.UUID) -> None:
        """Create a Processing record for one scheduler trigger."""
        ...

    @abstractmethod
    async def update_adabot_ingestion_tracking(
        self, log_uuid: uuid.UUID, status: str, **extra: Any
    ) -> None:
        """Set the terminal status and optional error details."""
        ...
