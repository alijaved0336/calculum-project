from __future__ import annotations
import asyncio
import logging
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from domain.entities.ingestion import IngestionJob, JobStatus
from domain.entities.pipeline import FileIngestStatus, KBDocumentStatus
from domain.ports.job_store import JobStorePort
from domain.ports.kb_document_store import KBDocumentStorePort
from domain.ports.document_status_stream import DocumentStatusStream
from domain.ports.storage import StoragePort
from domain.ports.vector_store import VectorStorePort
from application.ingest.pipeline import DocumentPipeline
from application.ingest.document_status_tracker import DocumentStatusTracker
from application.ingest.utils import join_thread, cleanup_temp, file_metadata, file_checksum

logger = logging.getLogger(__name__)


class IngestDocumentUseCase(DocumentStatusTracker):
    """Orchestrates one document's ingestion: tracking + the parse/chunk/embed pipeline."""

    def __init__(
        self,
        pipeline: DocumentPipeline,
        job_repo: JobStorePort,
        embed_dims: int,
        notifier: DocumentStatusStream,
        storage: StoragePort,
        pg_adapter: KBDocumentStorePort | None = None,
        vector_store: VectorStorePort | None = None,
    ) -> None:
        self._pipeline = pipeline
        self._embed_dims = embed_dims
        self._job_repo = job_repo
        self._notifier = notifier
        self._storage = storage
        self._pg = pg_adapter
        self._vector_store = vector_store

    def create_job(self, job_id: str, file_id: str, file_path: str, file_name: str) -> IngestionJob:
        job = IngestionJob(job_id=job_id, file_id=file_id, file_path=file_path, file_name=file_name,
                           status=JobStatus.PENDING, created_at=datetime.now(timezone.utc))
        self._job_repo.create(job)
        return job

    async def execute(
        self,
        job_id: str,
        storage_key: str,
        file_id: str,
        file_name: str,
        uploaded_by_user_uuid: str,
        extra_metadata: dict | None = None,
    ) -> None:
        """Fetch the stored document by key, run the pipeline, record status at each phase."""
        logger.info("pipeline.start job_id=%s file=%s", job_id, file_name)
        local_path: str | None = None
        try:
            self._job_repo.update_status(job_id, JobStatus.RUNNING)
            await self._notify(file_id, FileIngestStatus.UPLOADED, progress=0)
            local_path = await self._download_to_temp(storage_key, file_name)
            file_size, file_type = file_metadata(local_path, file_name)
            checksum = await asyncio.to_thread(file_checksum, local_path)
            if existing := await self._find_duplicate(checksum):
                await self._skip_duplicate(job_id, file_id, file_name, existing)
                return
            await self._replace_if_exists(file_name)
            await self._mark_started(file_id, file_name, file_size, file_type, extra_metadata, uploaded_by_user_uuid, checksum)

            await self._pipeline.ensure_collection(self._embed_dims)

            main_loop = asyncio.get_running_loop()
            t_start = time.perf_counter()
            chunk_metadata = {**(extra_metadata or {}), "filename": file_name}  # stamped onto every chunk
            state, parse_thread, chunk_thread, embed_thread = self._pipeline.start(
                main_loop, local_path, file_id, chunk_metadata
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

            await join_thread(main_loop, embed_thread)  # returns once every embed worker has exited
            if not state.errors:
                await self._notify(file_id, FileIngestStatus.INDEXING, progress=85)
            await self._pipeline.flush_tail(state)
            t_embed = time.perf_counter()

            logger.info(
                "pipeline.timing job_id=%s parse=%.2fs chunk=%.2fs embed_upsert=%.2fs total=%.2fs (wall)"
                " | chunk_active=%.2fs embed_active=%.2fs workers=%d",
                job_id, t_parse - t_start, t_chunk - t_parse, t_embed - t_chunk, t_embed - t_start,
                state.chunk_seconds, state.embed_seconds, self._pipeline.concurrency,
            )

            if state.errors:
                raise state.errors[0]

            await self._finalize(job_id, file_id, file_name, state.chunks_written)

        except Exception as exc:
            await self._fail(job_id, file_id, exc)  # deletes the stored blob on failure
        finally:
            if local_path:
                cleanup_temp(local_path)  # durable copy lives in storage
            self._job_repo.remove(job_id)

    async def _download_to_temp(self, storage_key: str, file_name: str) -> str:
        """Fetch the stored document into a temp file for the loaders; caller cleans it up."""
        data = await asyncio.to_thread(self._storage.download, storage_key)
        suffix = Path(file_name).suffix.lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            try:
                tmp.write(data)
            except Exception:
                cleanup_temp(tmp.name)  # name never reaches caller, so clean up here
                raise
            return tmp.name
