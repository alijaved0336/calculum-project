from __future__ import annotations

import logging
import os
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile

from api.deps.auth import User, require_admin
from api.schemas.ingest import (
    DocumentUpdateResponse,
    IngestionJobStatusResponse,
    UploadAcceptedResponse,
)
from api.sse import sse_response
from application.ingest.transcript_validator import (
    TranscriptValidationError,
    validate_transcript,
)
from config import settings
from dependencies import (
    get_document_ingest_use_case,
    get_document_vector_store,
    get_ingestion_job_store,
    get_kb_document_store,
    get_progress_broker,
    get_video_ingest_use_case,
    get_video_store,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingestion"])


async def _lookup_video(video_id: str) -> dict | None:
    """Return the already-uploaded video's metadata (gcs_object, duration_ms) or None.

    The video row is created by ``POST /videos``; here we only reference it by id.
    Returns None when no such video row exists.
    """
    return await get_kb_document_store().get_document_metadata(uuid.UUID(video_id))


def _dispatch_video(
    background_tasks: BackgroundTasks,
    file_path: str,
    filename: str,
    file_id: str,
    extra_metadata: dict,
    title: str | None = None,
) -> UploadAcceptedResponse:
    """Dispatch transcript ingestion for an already-uploaded video (video collection)."""
    job_id = str(uuid.uuid4())
    use_case = get_video_ingest_use_case()
    use_case.create_job(job_id, file_id, file_path, filename)
    # Buffer the first status event so a client that connects to the SSE stream right
    # after this 202 still sees "uploading" before the background task emits "processing".
    get_progress_broker().publish(
        f"transcript:{file_id}",
        {"phase": "transcript", "status": "uploading", "video_id": str(file_id)},
    )
    background_tasks.add_task(
        use_case.execute, job_id, file_path, file_id, filename, True, extra_metadata,
    )
    return UploadAcceptedResponse(job_id=job_id, file_id=file_id, status="pending", title=title,
                                  status_url=f"/ingest/jobs/{job_id}")


@router.post(
    "/video/transcript",
    status_code=202,
    response_model=UploadAcceptedResponse,
    summary="Ingest (or re-upload) a video transcript (superadmin only)",
    description=(
        "Ingests a transcript for an already-uploaded video. **Idempotent-replace:** re-posting for the "
        "same `video_id` purges the prior transcript's Qdrant vectors and deletes the old GCS transcript "
        "object before re-indexing the new one. The `video_id`/`file_uuid` is unchanged."
    ),
    responses={
        202: {"description": "Transcript accepted for background ingestion (replaces any prior transcript)."},
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
        404: {"description": "Referenced video not found (upload it via POST /videos first)."},
        422: {"description": "Unsupported/invalid transcript."},
    },
)
async def ingest_video(
    background_tasks: BackgroundTasks,
    transcript: UploadFile,
    video_id: str = Form(..., description="ID of an already-uploaded video (from POST /videos)"),
    title: str | None = Form(default=None),
    _admin: User = Depends(require_admin),
) -> UploadAcceptedResponse:
    """Ingest a timestamped transcript for an already-uploaded video.

    The video bytes are handled up front by ``POST /videos``; this route consumes only
    the transcript + a reference (``video_id``) to that video, validates the transcript
    against the video's duration, and indexes the aligned transcript chunks into the
    video collection. Poll ``GET /ingest/jobs/{job_id}`` for status.
    """
    suffix = Path(transcript.filename or "").suffix.lower()
    if suffix not in settings.allowed_transcript_ext:
        raise HTTPException(
            422, f"Unsupported transcript type {suffix!r}. Allowed: {settings.allowed_transcript_ext}"
        )

    try:
        video_meta = await _lookup_video(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid video_id {video_id!r}.")
    if video_meta is None:
        raise HTTPException(404, f"Video {video_id!r} not found. Upload it first via POST /videos.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await transcript.read())
        tmp_path = tmp.name

    try:
        validate_transcript(Path(tmp_path), video_meta.get("duration_ms"))
    except TranscriptValidationError as exc:
        os.unlink(tmp_path)
        raise HTTPException(422, f"Invalid transcript: {exc}")
    except Exception:
        os.unlink(tmp_path)
        raise

    extra_metadata = {
        "video_id": video_id,
        "title": title,
        "gcs_object": video_meta.get("gcs_object"),
        "chunk_source": "video",
        "transcript_format": suffix.lstrip("."),
    }
    try:
        return _dispatch_video(
            background_tasks, tmp_path, transcript.filename or f"{video_id}{suffix}",
            file_id=video_id, extra_metadata=extra_metadata,
            title=title or Path(transcript.filename or "").stem,
        )
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


@router.post(
    "/document",
    status_code=202,
    response_model=UploadAcceptedResponse,
    summary="Ingest a general document (PDF/DOCX/TXT) — superadmin only",
    description=(
        "Ingests a **general document** (not linked to any video) into the shared knowledge base, "
        "tagged `chunk_source='document'`. Parses → chunks → embeds → upserts in the background and "
        "returns `202` with a `job_id`. Watch progress at `GET /ingest/document/{document_id}/events` "
        "(SSE: `uploading` → `processing` → `upserting` → `upserted`)."
    ),
    responses={
        202: {"description": "Document accepted for background ingestion."},
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
        422: {"description": "Unsupported document type."},
        502: {"description": "Could not register the document row."},
    },
)
async def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="PDF / DOCX / DOC / TXT / MD document"),
    title: str | None = Form(default=None),
    is_public: bool = Form(default=False, description="Public docs are cited to all users; private only to admins"),
    admin: User = Depends(require_admin),
) -> UploadAcceptedResponse:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in settings.allowed_document_ext:
        raise HTTPException(
            422, f"Unsupported document type {suffix!r}. Allowed: {settings.allowed_document_ext}"
        )

    data = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    document_id = uuid.uuid4()
    # Display title = provided title, else the original filename WITHOUT its extension.
    display_title = title or Path(file.filename or "").stem or str(document_id)
    try:
        await get_kb_document_store().create_document_row(
            document_id, display_title,
            {"filename": file.filename, "size_bytes": len(data)}, admin.id, is_public=is_public,
        )
    except Exception as exc:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        logger.exception("ingest.document_register_failed")
        raise HTTPException(502, f"Failed to register the document row (DB): {type(exc).__name__}: {exc}")

    filename = file.filename or f"{document_id}{suffix}"
    job_id = str(uuid.uuid4())
    use_case = get_document_ingest_use_case()
    use_case.create_job(job_id, str(document_id), tmp_path, filename)
    # Buffer the first status event so a client that connects right after the 202 sees "uploading".
    get_progress_broker().publish(
        f"document:{document_id}",
        {"phase": "document", "status": "uploading", "document_id": str(document_id)},
    )
    background_tasks.add_task(
        use_case.execute, job_id, tmp_path, str(document_id), filename, True,
        {"chunk_source": "document", "title": title, "is_public": is_public},
    )
    return UploadAcceptedResponse(job_id=job_id, file_id=str(document_id), status="pending",
                                  status_url=f"/ingest/jobs/{job_id}",
                                  title=display_title)


@router.patch(
    "/document/{document_id}",
    response_model=DocumentUpdateResponse,
    summary="Edit a document row — title and/or file (superadmin only)",
    description=(
        "Edit an existing document. Both fields are optional:\n\n"
        "- **title** — updates the DB row and the title on every indexed chunk (so chat "
        "citations reflect the new title). No re-embedding.\n"
        "- **file** — replaces the source document: the old file's embeddings are deleted from "
        "the vector DB and the old file from storage, then the new file is re-indexed in the "
        "background (`reprocessing=true`; watch `GET /ingest/document/{id}/events`)."
    ),
    responses={
        200: {"description": "Row updated (a new file re-indexes in the background)."},
        400: {"description": "Nothing to update."},
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
        404: {"description": "Unknown document_id."},
        422: {"description": "Invalid id / not a document / unsupported file type."},
    },
)
async def update_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    title: str | None = Form(default=None, description="New display title"),
    file: UploadFile | None = File(default=None, description="Replacement document (PDF/DOCX/DOC/TXT/MD)"),
    is_public: bool | None = Form(default=None, description="Toggle public (cited to all) / private (admins only)"),
    admin: User = Depends(require_admin),
) -> DocumentUpdateResponse:
    try:
        uid = uuid.UUID(document_id)
    except (ValueError, TypeError):
        raise HTTPException(422, "Invalid document_id.")

    store = get_kb_document_store()
    doc = await store.get_kb_document(uid)
    if doc is None:
        raise HTTPException(404, "Unknown document_id.")
    if doc.get("media_type") != "document":
        raise HTTPException(422, "Not a document row — use PATCH /videos/{id} for videos.")

    meta = doc.get("metadata") or {}
    updated: list[str] = []
    new_title = (title or "").strip() or None
    effective_title = new_title or doc.get("title")
    # Effective visibility carried into a re-ingest so replaced chunks keep the flag.
    effective_public = bool(is_public) if is_public is not None else bool(doc.get("is_public"))

    # ── Title (DB + already-indexed chunks) ──────────────────────────────────────
    if new_title and new_title != doc.get("title"):
        await store.update_kb_document(uid, title=new_title)
        try:
            await get_document_vector_store().set_metadata_title(str(uid), new_title)
        except Exception:  # noqa: BLE001 — a stale chunk title must not fail the edit
            logger.warning("ingest.update_title_qdrant_failed document_id=%s", uid)
        updated.append("title")

    # ── Visibility toggle (public/private) — chunk payload FIRST, then DB column ──
    # Ordering is a privacy control, not a nicety: query-time citation gating reads the
    # chunk payload, so we flip it BEFORE the DB. If the payload write fails we abort
    # (propagate) without touching the DB — both stores stay on the old value, so a
    # private doc is never left publicly citable. Because this branch's guard reads the
    # DB (written last), an identical retry re-runs and converges; set_payload is
    # idempotent, so retrying is safe. When the file is also being replaced below, the
    # chunks are purged + re-indexed with `effective_public`, so the payload write here
    # is both redundant and would needlessly gate on soon-to-be-deleted chunks — skip it.
    if is_public is not None and bool(is_public) != bool(doc.get("is_public")):
        target = bool(is_public)
        if file is None or not file.filename:
            try:
                await get_document_vector_store().set_metadata_fields(str(uid), {"is_public": target})
            except Exception as exc:  # noqa: BLE001
                logger.warning("ingest.update_public_qdrant_failed document_id=%s", uid)
                raise HTTPException(502, "Failed to update document visibility — please retry.") from exc
        await store.update_kb_document(uid, is_public=target)
        updated.append("visibility")

    # ── Replace the file (re-embed) ──────────────────────────────────────────────
    if file is not None and file.filename:
        suffix = Path(file.filename).suffix.lower()
        if suffix not in settings.allowed_document_ext:
            raise HTTPException(
                422, f"Unsupported document type {suffix!r}. Allowed: {settings.allowed_document_ext}"
            )
        data = await file.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        try:
            await get_document_vector_store().delete_by_file_uuid(str(uid))
        except Exception:  # noqa: BLE001
            logger.warning("ingest.update_purge_chunks_failed document_id=%s", uid)
        old_obj = meta.get("gcs_object")
        if old_obj:
            try:
                get_video_store().delete(old_obj)
            except Exception:  # noqa: BLE001
                logger.warning("ingest.update_delete_old_file_failed document_id=%s object=%s", uid, old_obj)

        filename = file.filename
        job_id = str(uuid.uuid4())
        uc = get_document_ingest_use_case()
        uc.create_job(job_id, str(uid), tmp_path, filename)
        # Flip the status to processing SYNCHRONOUSLY so the client's immediate reload shows
        # the row re-indexing (and attaches its live watcher) instead of a stale "Indexed" —
        # the background task hasn't run yet when the client refetches.
        await store.set_document_status(uid, "uploading", status="Processing")
        get_progress_broker().publish(
            f"document:{uid}",
            {"phase": "document", "status": "uploading", "document_id": str(uid)},
        )
        background_tasks.add_task(
            uc.execute, job_id, tmp_path, str(uid), filename, True,
            {"chunk_source": "document", "title": effective_title, "is_public": effective_public},
        )
        updated.append("file")
        logger.info("ingest.update_document document_id=%s fields=%s", uid, updated)
        return DocumentUpdateResponse(document_id=str(uid), updated=updated, reprocessing=True)

    if not updated:
        raise HTTPException(400, "Nothing to update — provide a title or a file.")
    logger.info("ingest.update_document document_id=%s fields=%s", uid, updated)
    return DocumentUpdateResponse(document_id=str(uid), updated=updated, reprocessing=False)


@router.get(
    "/document/{document_id}/events",
    summary="Stream a document's ingest status (SSE, superadmin only)",
    description=(
        "Server-Sent Events stream of the document-ingest lifecycle: `uploading` → `processing` → "
        "`upserting` → `upserted` (or `empty`/`failed`). Keyed by the `document_id` (== the `file_id` "
        "returned by `POST /ingest/document`). Replays already-emitted events on connect."
    ),
    responses={401: {"description": "Missing/invalid token."}, 403: {"description": "Not a superadmin."}},
)
async def document_events(
    document_id: str, request: Request, _admin: User = Depends(require_admin)
):
    return sse_response(get_progress_broker(), f"document:{document_id}", request)


@router.get("/jobs/{job_id}", response_model=IngestionJobStatusResponse)
def get_ingestion_job_status(job_id: str) -> IngestionJobStatusResponse:
    """Return status and chunks written for a transcript-ingestion job."""
    job = get_ingestion_job_store().get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id!r} not found.")
    return IngestionJobStatusResponse(
        job_id=job.job_id, file_id=job.file_id, file_name=job.file_name,
        status=job.status, chunks_written=job.chunks_written, error=job.error,
    )


@router.get(
    "/video/{video_id}/events",
    summary="Stream a video transcript's ingest status (SSE, superadmin only)",
    description=(
        "Server-Sent Events stream of the transcript-ingest lifecycle: `uploading` → `processing` "
        "→ `upserting` → `upserted` (or `empty`/`failed`). Keyed by the `video_id` passed to "
        "`POST /ingest/video/transcript`. Replays already-emitted events on connect and closes on a terminal event."
    ),
    responses={
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
    },
)
async def transcript_events(
    video_id: str, request: Request, _admin: User = Depends(require_admin)
):
    return sse_response(get_progress_broker(), f"transcript:{video_id}", request)
