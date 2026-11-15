"""Status-tracking helpers for ``IngestDocumentUseCase``.

Split out as a mixin (mirrors ``infrastructure.postgres.KBDocumentMixin``) so the
use case stays small. Records each pipeline phase to Postgres and emits the same
transition to the real-time notifier. Relies on the host providing
``self._pg``, ``self._vector_store``, ``self._storage``, ``self._job_repo`` and ``self._notifier``.
"""
from __future__ import annotations
import asyncio
import logging
import uuid as _uuid

from domain.entities.ingestion import JobStatus
from domain.entities.pipeline import FileIngestStatus, KBDocumentStatus
from application.ingest.utils import format_error

logger = logging.getLogger(__name__)

# Pipeline phase (DB status) → public SSE status + milestone progress % (None = omit).
_SSE_PHASE: dict[KBDocumentStatus, tuple[FileIngestStatus, int | None]] = {
    KBDocumentStatus.PARSED: (FileIngestStatus.CHUNKING, 35),
    KBDocumentStatus.CHUNKED: (FileIngestStatus.EMBEDDING, 60),
    KBDocumentStatus.UPSERTED: (FileIngestStatus.COMPLETED, 100),
    KBDocumentStatus.EMPTY: (FileIngestStatus.COMPLETED, 100),
    KBDocumentStatus.FAILED: (FileIngestStatus.FAILED, None),
}


class DocumentStatusTracker:
    async def _discard_blob(self, file_id) -> None:
        """Best-effort removal of a document's stored object; never raises."""
        if not self._storage or not file_id:
            return
        try:
            await asyncio.to_thread(self._storage.delete, str(file_id))
        except Exception as exc:
            logger.warning("pipeline.blob_discard_failed file_id=%s error=%s", file_id, exc)

    async def _replace_if_exists(self, file_name: str) -> None:
        if not self._pg or not (existing := await self._pg.get_uuid_by_filename(file_name)):
            return
        if self._vector_store:
            await self._vector_store.delete_by_file_uuid(str(existing))
        await self._discard_blob(existing)
        await self._pg.delete_kb_document(existing)
        logger.info("pipeline.replaced_existing file=%s uuid=%s", file_name, existing)

    async def _find_duplicate(self, checksum: str | None):
        if not self._pg or not checksum:
            return None
        return await self._pg.get_uuid_by_checksum(checksum)

    async def _skip_duplicate(self, job_id, file_id, file_name, existing) -> None:
        logger.info("pipeline.duplicate_skipped file=%s existing_uuid=%s", file_name, existing)
        await self._discard_blob(file_id)  # same content already stored under the original's key
        self._job_repo.update_status(job_id, JobStatus.COMPLETED, chunks_written=0)
        await self._notify(file_id, FileIngestStatus.DUPLICATED, progress=100,
                           existing_file_uuid=str(existing))

    async def _mark_started(self, file_uuid, filename, file_size, file_type, extra_metadata, uploaded_by_user_uuid, checksum=None):
        if not file_uuid:
            logger.warning("pipeline.mark_started_skipped_no_file_uuid filename=%s", filename)
            return
        if not self._pg:
            return
        try:
            strategies = (extra_metadata or {}).get("playbook_strategy_type") or None
            await self._pg.mark_ingestion_started(
                _uuid.UUID(file_uuid), filename, _uuid.UUID(uploaded_by_user_uuid),
                file_size, file_type, strategies, checksum)
        except Exception as exc:
            logger.warning("pipeline.db_mark_started_failed file_uuid=%s error=%s", file_uuid, exc)
        await self._notify(file_uuid, FileIngestStatus.PARSING, progress=10)

    async def _record(self, file_uuid, status, **extra):
        if not file_uuid:
            logger.warning("pipeline.record_skipped_no_file_uuid status=%s", status)
            return
        if self._pg:
            try:
                await self._pg.update_tracking(_uuid.UUID(file_uuid), status, **extra)
            except Exception as exc:
                logger.warning("pipeline.db_tracking_failed file_uuid=%s status=%s error=%s",
                               file_uuid, status, exc)
        if (sse := _SSE_PHASE.get(status)) is not None:
            sse_status, progress = sse
            sse_extra = {} if progress is None else {"progress": progress}
            if "error_message" in extra:
                sse_extra["error"] = extra["error_message"]
            await self._notify(file_uuid, sse_status, **sse_extra)

    async def _notify(self, file_uuid, status: FileIngestStatus, **extra):
        await self._notifier.publish_document_status(str(file_uuid), status.value, **extra)

    async def _finalize(self, job_id, file_uuid, file_name, chunks_written):
        if chunks_written == 0:
            self._job_repo.update_status(job_id, JobStatus.COMPLETED, chunks_written=0)
            await self._record(file_uuid, KBDocumentStatus.EMPTY, chunk_count=0)
            return
        self._job_repo.update_status(job_id, JobStatus.COMPLETED, chunks_written=chunks_written)
        await self._record(file_uuid, KBDocumentStatus.UPSERTED, chunk_count=chunks_written)
        logger.info("pipeline.complete job_id=%s file=%s chunks=%d", job_id, file_name, chunks_written)

    async def _fail(self, job_id, file_uuid, exc):
        error_msg = format_error(exc)
        logger.error("pipeline.failed job_id=%s error=%s", job_id, error_msg)
        self._job_repo.update_status(job_id, JobStatus.FAILED, error=error_msg)
        await self._record(file_uuid, KBDocumentStatus.FAILED, error_message=str(exc))
        await self._discard_blob(file_uuid)  # remove the stored object so failed docs leave no junk
        if self._vector_store and file_uuid:
            try:
                await self._vector_store.delete_by_file_uuid(file_uuid)
                logger.info("pipeline.partial_discarded file_uuid=%s", file_uuid)
            except Exception as e:
                logger.warning("pipeline.discard_partial_failed file_uuid=%s error=%s", file_uuid, e)
