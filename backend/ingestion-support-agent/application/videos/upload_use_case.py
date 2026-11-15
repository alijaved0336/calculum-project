from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid as _uuid

from domain.entities.pipeline import VideoStatus
from infrastructure.storage.gcs_video_store import (
    compress_video,
    probe_duration_ms,
)

logger = logging.getLogger(__name__)


class VideoUploadUseCase:
    """Compress + store an uploaded video and stream its status.

    Runs in the background (dispatched by ``POST /videos`` after the kb_documents row is
    created with ``video_status='processing'``). Publishes ``processing → uploading →
    uploaded`` (or ``failed``) to the progress broker and mirrors each into the DB via
    ``set_video_status``. Owns cleanup of the temp upload files.

    Collaborators are duck-typed for testability:
      - gcs_store.upload(local_path, video_id) -> gcs_object
      - kb_store.set_video_status(video_id, video_status, status=?, **extra) -> awaitable
      - kb_store.merge_document_metadata(video_id, patch) -> awaitable
      - broker.publish(stream_id, event, terminal=?)  (optional)
    """

    def __init__(self, gcs_store, kb_store, broker=None, transcript_uc_factory=None) -> None:
        self._gcs = gcs_store
        self._kb = kb_store
        self._broker = broker
        # Optional: () -> transcript ingest use case, used to chain transcript indexing
        # server-side once the video is stored (so it can't be lost if the client goes away).
        self._transcript_uc_factory = transcript_uc_factory

    def _emit(self, video_id: str, status: str, terminal: bool = False, **extra) -> None:
        if self._broker is not None:
            self._broker.publish(
                f"video:{video_id}",
                {"phase": "video", "status": status, "video_id": video_id, **extra},
                terminal=terminal,
            )

    async def execute(
        self,
        video_id: str,
        tmp_path: str,
        size_bytes: int,
        filename: str | None,
        title: str | None,
        uploaded_by: str | None = None,
        transcript_path: str | None = None,
        transcript_filename: str | None = None,
        cue_count: int | None = None,
    ) -> None:
        vid = str(video_id)
        uid = _uuid.UUID(vid)
        compressed_path: str | None = None
        gcs_object: str | None = None
        duration_ms: int | None = None
        t0 = time.monotonic()

        def since(t: float) -> int:  # elapsed ms, for timing the stages
            return int((time.monotonic() - t) * 1000)

        try:
            self._emit(vid, VideoStatus.PROCESSING.value, elapsed_ms=0)

            # Compress before storing so the bucket/local file is the smaller re-encode.
            # compress_video falls back to the original path on any failure.
            await self._kb.set_video_status(uid, VideoStatus.COMPRESSING.value)
            self._emit(vid, VideoStatus.COMPRESSING.value, elapsed_ms=since(t0))
            t_compress = time.monotonic()
            compressed_path, size_before, size_after = await asyncio.to_thread(compress_video, tmp_path)
            compress_ms = since(t_compress)
            saved_pct = (1 - size_after / size_before) * 100 if size_before else 0.0
            logger.info(
                "videos.compress video_id=%s size_before=%d bytes (%.2f MB) "
                "size_after=%d bytes (%.2f MB) saved=%.1f%% compress_ms=%d compressed=%s",
                vid, size_before, size_before / 1_048_576,
                size_after, size_after / 1_048_576, saved_pct, compress_ms,
                compressed_path != tmp_path,
            )

            await self._kb.set_video_status(uid, VideoStatus.UPLOADING.value)
            self._emit(
                vid, VideoStatus.UPLOADING.value, elapsed_ms=since(t0),
                compress_ms=compress_ms, size_before=size_before, size_after=size_after,
            )
            t_upload = time.monotonic()
            duration_ms = await asyncio.to_thread(probe_duration_ms, compressed_path)
            gcs_object = await asyncio.to_thread(self._gcs.upload, compressed_path, vid)
            upload_ms = since(t_upload)

            metadata = {
                "gcs_object": gcs_object,
                "duration_ms": duration_ms,
                "size_bytes": size_after,
                "original_size_bytes": size_before,
            }
            await self._kb.merge_document_metadata(uid, metadata)
            await self._kb.set_video_status(uid, VideoStatus.UPLOADED.value, status="uploaded")
            total_ms = since(t0)
            self._emit(
                vid, VideoStatus.UPLOADED.value, terminal=True,
                gcs_object=gcs_object, duration_ms=duration_ms,
                size_before=size_before, size_after=size_after,
                compress_ms=compress_ms, upload_ms=upload_ms,
                elapsed_ms=total_ms, total_ms=total_ms,
            )
            logger.info(
                "videos.uploaded video_id=%s duration_ms=%s stored_size=%d bytes object=%s "
                "compress_ms=%d upload_ms=%d total_ms=%d",
                vid, duration_ms, size_after, gcs_object, compress_ms, upload_ms, total_ms,
            )

            # ── Chain transcript indexing server-side ──────────────────────────────────
            # Only runs after a SUCCESSFUL store, so the transcript can never be lost if the
            # client goes away. A transcript failure is isolated (the video stays uploaded).
            if transcript_path and self._transcript_uc_factory is not None:
                try:
                    await self._ingest_transcript(
                        vid, gcs_object, title, transcript_path, transcript_filename, cue_count
                    )
                except Exception:  # noqa: BLE001 — transcript use case records its own failure status
                    logger.exception("videos.chain_transcript_failed video_id=%s", vid)
        except Exception as exc:
            logger.exception("videos.upload_failed video_id=%s", vid)
            try:
                await self._kb.set_video_status(
                    uid, VideoStatus.FAILED.value, status="Failed", error_message=str(exc)
                )
            except Exception:  # never let a status-write failure mask the original error
                logger.warning("videos.status_write_failed video_id=%s", vid)
            self._emit(vid, VideoStatus.FAILED.value, terminal=True, error=str(exc))
        finally:
            # transcript_path is normally unlinked by the chained transcript use case
            # (cleanup=True); include it here for the paths that skip chaining.
            for path in {tmp_path, compressed_path, transcript_path}:
                if path:
                    try:
                        os.unlink(path)
                    except OSError:
                        pass

    async def _ingest_transcript(
        self, vid: str, gcs_object: str | None, title: str | None,
        transcript_path: str, transcript_filename: str | None, cue_count: int | None,
    ) -> None:
        """Run the transcript ingest use case for a just-stored video (chained)."""
        from pathlib import Path

        suffix = Path(transcript_filename or transcript_path).suffix.lower()
        name = transcript_filename or f"{vid}{suffix}"
        extra_metadata = {
            "video_id": vid,
            "title": title,
            "gcs_object": gcs_object,
            "chunk_source": "video",
            "transcript_format": suffix.lstrip("."),
        }
        uc = self._transcript_uc_factory()
        job_id = str(_uuid.uuid4())
        uc.create_job(job_id, vid, transcript_path, name)
        await uc.execute(job_id, transcript_path, vid, name, cleanup=True, extra_metadata=extra_metadata)
        logger.info("videos.chain_transcript_done video_id=%s job_id=%s", vid, job_id)
