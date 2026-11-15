from __future__ import annotations
from abc import ABC, abstractmethod

from domain.entities.ingestion import IngestionJob, JobStatus


class JobStorePort(ABC):
    @abstractmethod
    def create(self, job: IngestionJob) -> None: ...

    @abstractmethod
    def get(self, job_id: str) -> IngestionJob | None: ...

    @abstractmethod
    def remove(self, job_id: str) -> None: ...

    @abstractmethod
    def update_status(
        self,
        job_id: str,
        status: JobStatus,
        chunks_written: int | None = None,
        error: str | None = None,
    ) -> None: ...
