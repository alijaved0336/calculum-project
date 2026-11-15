from __future__ import annotations
import asyncio
import logging
import time
import uuid as _uuid
from datetime import datetime, timezone
from pathlib import Path

from domain.entities.ingestion import IngestionJob, JobStatus
from domain.entities.pipeline import KBDocumentStatus, TranscriptStatus
from domain.ports.job_store import JobStorePort
from domain.ports.kb_document_store import KBDocumentStorePort
from domain.ports.vector_store import VectorStorePort
from application.ingest.pipeline import DocumentPipeline
from application.ingest.utils import join_thread, cleanup_temp, file_metadata, format_error

logger = logging.getLogger(__name__)


class IngestDocumentUseCase:
    """Orchestrates one document's ingestion: tracking + the parse/chunk/embed pipeline."""

    def __init__(
        self,
        pipeline: DocumentPipeline,
        job_repo: JobStorePort,
        embed_dims: int,
        pg_adapter: KBDocumentStorePort | None = None,
        vector_store: VectorStorePort | None = None,
        broker=None,
        phase: str = "transcript",
        store=None,
    ) -> None:
        self._pipeline = pipeline
        self._embed_dims = embed_dims
        self._job_repo = job_repo
        self._pg = pg_adapter
        self._vector_store = vector_store
        self._broker = broker
        self._store = store  # media store: archives the source file to GCS/local (transcripts/ | documents/)
        # `phase` selects the SSE stream + DB status column for this ingest kind:
        #   "transcript" → transcript:<id> / set_transcript_status
        #   "document"   → document:<id>   / set_document_status
        self._phase = phase
        self._id_key = "video_id" if phase == "transcript" else f"{phase}_id"
        self._status_setter = f"set_{phase}_status"

    # ── Status streaming (transcript / document ingestion) ──────────────────────
    def _emit_event(self, file_id, status: str, terminal: bool = False, **extra) -> None:
        if self._broker is not None and file_id:
            self._broker.publish(
                f"{self._phase}:{file_id}",
                {"phase": self._phase, "status": status, self._id_key: str(file_id), **extra},
                terminal=terminal,
            )

    async def _set_phase_status(self, file_uuid, status_value: str, **extra) -> None:
        setter = getattr(self._pg, self._status_setter, None)
        if setter is None or not file_uuid:
            return
        try:
            await setter(_uuid.UUID(str(file_uuid)), status_value, **extra)
        except Exception as exc:
            logger.warning("pipeline.%s_failed file_uuid=%s error=%s", self._status_setter, file_uuid, exc)

    def create_job(self, job_id: str, file_id: str, file_path: str, file_name: str) -> IngestionJob:
        job = IngestionJob(job_id=job_id, file_id=file_id, file_path=file_path, file_name=file_name,
                           status=JobStatus.PENDING, created_at=datetime.now(timezone.utc))
        self._job_repo.create(job)
        return job

    async def execute(
        self,
        job_id: str,
        file_path: str,
        file_id: str,
        file_name: str,
        cleanup: bool = False,
        extra_metadata: dict | None = None,
    ) -> None:
        """Run the pipeline and record tracking status at each phase."""
        logger.info("pipeline.start job_id=%s file=%s", job_id, file_name)
        try:
            self._job_repo.update_status(job_id, JobStatus.RUNNING)
            await self._set_phase_status(file_id, TranscriptStatus.UPLOADING.value)
            file_size, file_type = file_metadata(file_path, file_name)
            await self._replace_if_exists(file_name, file_id)
            await self._purge_existing_chunks(file_id)
            await self._mark_started(file_id, file_name, file_size, file_type, extra_metadata)
            # Archive the source file to GCS/local (fail-fast: a storage error fails the job
            # here, before anything is chunked/embedded).
            await self._store_source(file_id, file_path, file_name)
            await self._set_phase_status(file_id, TranscriptStatus.PROCESSING.value)
            self._emit_event(file_id, TranscriptStatus.PROCESSING.value)

            await self._pipeline.ensure_collection(self._embed_dims)

            main_loop = asyncio.get_running_loop()
            t_start = time.perf_counter()
            state, parse_thread, chunk_thread, embed_thread = self._pipeline.start(
                main_loop, file_path, file_id, extra_metadata
            )

            await join_thread(main_loop, parse_thread)
            t_parse = time.perf_counter()
            if not state.errors:
                logger.info("pipeline.parsed job_id=%s total_pages=%d", job_id, state.pages_parsed)
                await self._record(file_id, KBDocumentStatus.PARSED, page_count=state.pages_parsed)

            await join_thread(main_loop, chunk_thread)
            t_chunk = time.perf_counter()
            if not state.errors:
                logger.info("pipeline.chunked job_id=%s total_chunks=%d", job_id, state.chunks_created)
                await self._record(file_id, KBDocumentStatus.CHUNKED)

            if not state.errors:
                await self._set_phase_status(file_id, TranscriptStatus.UPSERTING.value)
                self._emit_event(file_id, TranscriptStatus.UPSERTING.value)

            # The embed stage owns its internal worker pool; joining its manager thread
            # means every embed worker has finished.
            await join_thread(main_loop, embed_thread)
            await self._pipeline.flush_tail(state)
            t_embed = time.perf_counter()

            logger.info(
                "pipeline.timing job_id=%s parse=%.2fs chunk=%.2fs embed_upsert=%.2fs total=%.2fs (wall)"
                " | embed_active=%.2fs workers=%d",
                job_id, t_parse - t_start, t_chunk - t_parse, t_embed - t_chunk, t_embed - t_start,
                state.embed_seconds, self._pipeline.concurrency,
            )

            if state.errors:
                raise state.errors[0]

            await self._finalize(job_id, file_id, file_name, state.chunks_written, extra_metadata)

        except Exception as exc:
            await self._fail(job_id, file_id, exc)
        finally:
            if cleanup:
                cleanup_temp(file_path)
            self._job_repo.remove(job_id)

    async def _store_source(self, file_id, file_path: str, file_name: str) -> None:
        """Archive the source transcript/document to GCS (or local) and record its object path.

        Raises on failure so the caller fails the job (fail-fast, before chunk/embed).
        """
        if self._store is None:
            return
        kind = "document" if self._phase == "document" else "transcript"
        obj_key = "gcs_object" if kind == "document" else "transcript_gcs_object"
        ext = Path(file_name).suffix
        # Capture the prior source object (read the SAME key we write, so a transcript re-upload never
        # touches the video file) to delete it if the new extension changes the object name.
        prior_obj = None
        get_meta = getattr(self._pg, "get_document_metadata", None)
        if get_meta is not None and file_id:
            prior_obj = ((await get_meta(_uuid.UUID(str(file_id)))) or {}).get(obj_key)
        obj = await asyncio.to_thread(self._store.upload_source, kind, file_path, str(file_id), ext)
        patch = (
            {"gcs_object": obj}
            if kind == "document"
            else {"transcript_gcs_object": obj, "transcript_filename": file_name}
        )
        merge = getattr(self._pg, "merge_document_metadata", None)
        if merge is not None and file_id:
            await merge(_uuid.UUID(str(file_id)), patch)
        logger.info("pipeline.source_stored kind=%s file_id=%s object=%s", kind, file_id, obj)
        # A re-upload with a different extension writes a new object; delete the orphaned old one.
        if prior_obj and prior_obj != obj:
            try:
                await asyncio.to_thread(self._store.delete, prior_obj)
                logger.info("pipeline.old_source_deleted file_id=%s object=%s", file_id, prior_obj)
            except Exception:  # noqa: BLE001 — best-effort; a stale object must not fail the re-ingest
                logger.warning("pipeline.old_source_delete_failed file_id=%s object=%s", file_id, prior_obj)

    async def _replace_if_exists(self, file_name: str, current_file_id: str | None = None) -> None:
        if not self._pg or not (existing := await self._pg.get_uuid_by_filename(file_name)):
            return
        # Never delete the row we're currently ingesting (it was created up-front with the
        # uploader). Only replace a *previous* row that happens to share the filename.
        if current_file_id is not None and str(existing) == str(current_file_id):
            return
        if self._vector_store:
            await self._vector_store.delete_by_file_uuid(str(existing))
        await self._pg.delete_kb_document(existing)
        logger.info("pipeline.replaced_existing file=%s uuid=%s", file_name, existing)

    async def _purge_existing_chunks(self, file_id) -> None:
        """Re-ingest == replace: drop this file_id's existing Qdrant points BEFORE re-upserting, so an
        edited transcript/document can't leave stale or duplicate chunks (chunk ids are content-derived).
        No-op on first ingest (nothing matches). ``file_uuid`` (= file_id) is unchanged — only points go.
        Ordered before the pipeline's streaming upsert; delete_by_file_uuid waits for completion."""
        if self._vector_store is not None and file_id:
            await self._vector_store.delete_by_file_uuid(str(file_id))

    async def _mark_started(self, file_uuid, filename, file_size, file_type, extra_metadata):
        if not self._pg or not file_uuid:
            return
        try:
            strategies = (extra_metadata or {}).get("playbook_strategy_type") or None
            await self._pg.mark_ingestion_started(
                _uuid.UUID(file_uuid), filename, file_size, file_type, strategies)
        except Exception as exc:
            logger.warning("pipeline.db_mark_started_failed file_uuid=%s error=%s", file_uuid, exc)

    async def _record(self, file_uuid, status, **extra):
        if not self._pg or not file_uuid:
            return
        try:
            await self._pg.update_tracking(_uuid.UUID(file_uuid), status, **extra)
        except Exception as exc:
            logger.warning("pipeline.db_tracking_failed file_uuid=%s status=%s error=%s",
                           file_uuid, status, exc)

    async def _finalize(self, job_id, file_uuid, file_name, chunks_written, extra_metadata=None):
        if chunks_written == 0:
            self._job_repo.update_status(job_id, JobStatus.COMPLETED, chunks_written=0)
            await self._record(file_uuid, KBDocumentStatus.EMPTY, chunk_count=0)
            await self._set_phase_status(file_uuid, TranscriptStatus.EMPTY.value)
            self._emit_event(file_uuid, TranscriptStatus.EMPTY.value, terminal=True, chunk_count=0)
            return
        self._job_repo.update_status(job_id, JobStatus.COMPLETED, chunks_written=chunks_written)
        await self._record(file_uuid, KBDocumentStatus.UPSERTED, chunk_count=chunks_written)
        await self._merge_doc_metadata(file_uuid, extra_metadata)
        await self._set_phase_status(file_uuid, TranscriptStatus.UPSERTED.value)
        self._emit_event(
            file_uuid, TranscriptStatus.UPSERTED.value, terminal=True, chunk_count=chunks_written
        )
        logger.info("pipeline.complete job_id=%s file=%s chunks=%d", job_id, file_name, chunks_written)

    async def _merge_doc_metadata(self, file_uuid, extra_metadata):
        """Merge media-specific fields (e.g. video transcript_format) into the JSONB metadata.

        No-op for document ingestion (no such fields) and for stores that predate the
        merge method, so it stays safe for the shared use case.
        """
        if not self._pg or not file_uuid or not extra_metadata:
            return
        fmt = extra_metadata.get("transcript_format")
        if not fmt:
            return
        merge = getattr(self._pg, "merge_document_metadata", None)
        if merge is None:
            return
        try:
            await merge(_uuid.UUID(file_uuid), {"transcript_format": fmt})
        except Exception as exc:
            logger.warning("pipeline.db_metadata_merge_failed file_uuid=%s error=%s", file_uuid, exc)

    async def _fail(self, job_id, file_uuid, exc):
        error_msg = format_error(exc)
        logger.error("pipeline.failed job_id=%s error=%s", job_id, error_msg)
        self._job_repo.update_status(job_id, JobStatus.FAILED, error=error_msg)
        await self._record(file_uuid, KBDocumentStatus.FAILED, error_message=str(exc))
        await self._set_phase_status(file_uuid, TranscriptStatus.FAILED.value)
        self._emit_event(file_uuid, TranscriptStatus.FAILED.value, terminal=True, error=error_msg)
        if self._vector_store and file_uuid:
            try:
                await self._vector_store.delete_by_file_uuid(file_uuid)
                logger.info("pipeline.partial_discarded file_uuid=%s", file_uuid)
            except Exception as e:
                logger.warning("pipeline.discard_partial_failed file_uuid=%s error=%s", file_uuid, e)
