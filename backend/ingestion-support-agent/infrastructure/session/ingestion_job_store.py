from __future__ import annotations

import threading

from domain.entities.ingestion import IngestionJob, JobStatus
from domain.ports.job_store import JobStorePort


class InMemoryIngestionJobStore(JobStorePort):

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._store: dict[str, IngestionJob] = {}

    def create(self, job: IngestionJob) -> None:
        with self._lock:
            self._store[job.job_id] = job

    def update_status(
        self,
        job_id: str,
        status: JobStatus,
        chunks_written: int | None = None,
        error: str | None = None,
    ) -> None:
        with self._lock:
            job = self._store.get(job_id)
            if job is None:
                return
            self._store[job_id] = IngestionJob(
                job_id=job.job_id,
                file_id=job.file_id,
                file_path=job.file_path,
                file_name=job.file_name,
                status=status,
                created_at=job.created_at,
                chunks_written=chunks_written if chunks_written is not None else job.chunks_written,
                error=error if error is not None else job.error,
            )

    def get(self, job_id: str) -> IngestionJob | None:
        with self._lock:
            return self._store.get(job_id)

    def remove(self, job_id: str) -> None:
        with self._lock:
            self._store.pop(job_id, None)
