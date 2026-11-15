from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import tempfile
from pathlib import Path

import uuid as _uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile

from infrastructure.storage.gcs_video_store import probe_duration_ms
from infrastructure.transcoder.transcoder_client import (
    get_job,
    job_state,
    job_video_id,
    submit_compress_job,
)

from api.deps.auth import User, require_admin
from api.schemas.videos import (
    VideoInitUploadRequest,
    VideoInitUploadResponse,
    VideoUpdateResponse,
    VideoUploadAcceptedResponse,
)
from api.sse import sse_response
from application.ingest.transcript_validator import (
    TranscriptValidationError,
    validate_transcript,
)
from config import settings
from dependencies import (
    get_kb_document_store,
    get_progress_broker,
    get_video_ingest_use_case,
    get_video_store,
    get_video_upload_use_case,
    get_video_vector_store,
)
from domain.entities.pipeline import TranscriptStatus, VideoStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/videos", tags=["videos"])

_ALLOWED_VIDEO_CONTENT = {"video/mp4", "application/mp4", "application/octet-stream"}


@router.post(
    "/init-upload",
    status_code=202,
    response_model=VideoInitUploadResponse,
    summary="Start a direct-to-GCS video upload (signed URL) — superadmin only",
    description=(
        "Returns a **signed URL** to upload the video **directly to the bucket** (no bytes through the "
        "API — solves 1-hour/GB uploads + HTTP timeouts). Registers the row (`video_status=awaiting_upload`). "
        "After the client PUTs the file to `upload_url`, a GCS→Pub/Sub notification triggers managed "
        "compression (Transcoder API); watch `GET /videos/{video_id}/events` for `uploaded → compressing → ready`."
    ),
    responses={
        202: {"description": "Signed upload URL issued."},
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
        413: {"description": "Declared size exceeds the maximum."},
        422: {"description": "Only .mp4 is supported."},
        502: {"description": "Could not register the video row."},
    },
)
async def init_video_upload(
    body: VideoInitUploadRequest, admin: User = Depends(require_admin)
) -> VideoInitUploadResponse:
    suffix = Path(body.filename or "").suffix.lower()
    if suffix != ".mp4" or (body.content_type and body.content_type not in _ALLOWED_VIDEO_CONTENT):
        raise HTTPException(422, "Only .mp4 (H.264/AAC) videos are supported.")
    if body.size_bytes > settings.max_video_bytes:
        raise HTTPException(413, f"Video exceeds the maximum size of {settings.max_video_bytes} bytes.")

    store = get_kb_document_store()

    # ── Replace mode: swap an existing video's file in place (edit) ───────────────
    # Reuses the same signed direct-to-GCS path so large replacements never time out —
    # the exact reason the through-API upload was retired for the create flow.
    if body.video_id:
        try:
            video_id = _uuid.UUID(body.video_id)
        except (ValueError, TypeError):
            raise HTTPException(422, "Invalid video_id.")
        doc = await store.get_kb_document(video_id)
        if doc is None:
            raise HTTPException(404, "Unknown video_id.")
        if doc.get("media_type") not in (None, "video"):
            raise HTTPException(422, "Not a video row.")
        meta = doc.get("metadata") or {}
        final_object = f"{settings.gcp_storage_prefix.strip('/')}/{video_id}.mp4"
        staging_object = f"{settings.gcp_upload_staging_prefix.strip('/')}/{video_id}.mp4"

        # Reject a too-short replacement BEFORE touching anything: if the transcript is being
        # kept, validate it against the new video's (client-measured) duration here — the
        # post-upload notification that would otherwise catch this may be handled by a
        # different instance, so this synchronous check is the reliable guard.
        if not body.has_new_transcript and body.video_duration_ms is not None:
            mismatch = await asyncio.to_thread(_kept_transcript_mismatch, doc, body.video_duration_ms)
            if mismatch:
                raise HTTPException(422, mismatch)

        new_title = (body.title or "").strip() or None
        if new_title and new_title != doc.get("title"):
            await store.update_kb_document(video_id, title=new_title)
            try:
                await get_video_vector_store().set_metadata_title(str(video_id), new_title)
            except Exception:  # noqa: BLE001
                logger.warning("videos.replace_title_qdrant_failed video_id=%s", video_id)
        display_title = new_title or doc.get("title") or str(video_id)

        # Drop the old stored video (the new one lands at the same path after processing).
        old_obj = meta.get("gcs_object")
        if old_obj:
            try:
                get_video_store().delete(old_obj)
            except Exception:  # noqa: BLE001
                logger.warning("videos.replace_delete_old_video_failed video_id=%s object=%s", video_id, old_obj)
        # A fresh transcript replaces the index → purge old chunks (the new one is staged
        # next and re-chained after storing). No new transcript → keep the existing index.
        if body.has_new_transcript:
            try:
                await get_video_vector_store().delete_by_file_uuid(str(video_id))
            except Exception:  # noqa: BLE001
                logger.warning("videos.replace_purge_chunks_failed video_id=%s", video_id)
        # Clear any stale staged transcript so the post-store chaining can't re-index an
        # old one (a fresh transcript, if any, is staged after this call).
        await store.merge_document_metadata(
            video_id,
            {"gcs_object": final_object, "staged_transcript": None,
             "staged_transcript_filename": None, "staged_transcript_cue_count": None},
        )
        await store.set_video_status(video_id, VideoStatus.AWAITING_UPLOAD.value, status="uploading")

        upload_url = get_video_store().generate_upload_url(
            staging_object, body.content_type, settings.video_upload_url_ttl_seconds
        )
        get_progress_broker().publish(
            f"video:{video_id}",
            {"phase": "video", "status": "awaiting_upload", "video_id": str(video_id)},
        )
        logger.info("videos.replace_init video_id=%s has_new_transcript=%s", video_id, body.has_new_transcript)
        return VideoInitUploadResponse(
            video_id=str(video_id), status="awaiting_upload", title=display_title,
            upload_url=upload_url, method="PUT", headers={"Content-Type": body.content_type},
            events_url=f"/videos/{video_id}/events", status_url=f"/videos/{video_id}",
        )

    video_id = _uuid.uuid4()
    # Prefer the admin-supplied display title. The signed (direct-to-GCS) flow never posts
    # the file to this API, so init-upload is the only chance to persist the title —
    # without it the row would silently fall back to the filename. Filename stem is the
    # fallback for callers that omit a title (e.g. Swagger, scripts).
    display_title = (body.title or "").strip() or (Path(body.filename).stem if body.filename else "") or str(video_id)
    staging_object = f"{settings.gcp_upload_staging_prefix.strip('/')}/{video_id}.mp4"
    final_object = f"{settings.gcp_storage_prefix.strip('/')}/{video_id}.mp4"

    try:
        await store.create_video_row(
            video_id, display_title,
            {"original_filename": body.filename, "size_bytes": body.size_bytes, "gcs_object": final_object},
            admin.id,
        )
        await store.set_video_status(video_id, VideoStatus.AWAITING_UPLOAD.value)
    except Exception as exc:
        logger.exception("videos.init_register_failed")
        raise HTTPException(502, f"Failed to register the video row (DB): {type(exc).__name__}: {exc}")

    upload_url = get_video_store().generate_upload_url(
        staging_object, body.content_type, settings.video_upload_url_ttl_seconds
    )
    get_progress_broker().publish(
        f"video:{video_id}",
        {"phase": "video", "status": "awaiting_upload", "video_id": str(video_id)},
    )
    return VideoInitUploadResponse(
        video_id=str(video_id),
        status="awaiting_upload",
        title=display_title,
        upload_url=upload_url,
        method="PUT",
        headers={"Content-Type": body.content_type},
        events_url=f"/videos/{video_id}/events",
        status_url=f"/videos/{video_id}",
    )


@router.post(
    "/{video_id}/transcript",
    status_code=202,
    summary="Stage a transcript for a signed direct-to-GCS upload",
    description=(
        "Companion to `POST /videos/init-upload`. The signed flow sends the video straight "
        "to GCS, so the transcript can't ride along with it — upload it here instead and the "
        "server indexes it automatically once the video reaches `ready` (no second client "
        "call, and nothing is lost if the browser goes away mid-upload)."
    ),
)
async def stage_video_transcript(
    video_id: str,
    transcript: UploadFile = File(..., description="Transcript (.vtt/.srt/.json)"),
    cue_count: int | None = Form(default=None),
    admin: User = Depends(require_admin),
) -> dict:
    try:
        uid = _uuid.UUID(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, "Invalid video_id.")

    suffix = Path(transcript.filename or "").suffix.lower()
    if suffix not in settings.allowed_transcript_ext:
        raise HTTPException(
            422, f"Unsupported transcript type {suffix!r}. Allowed: {settings.allowed_transcript_ext}"
        )

    store = get_kb_document_store()
    if await store.get_kb_document(uid) is None:
        raise HTTPException(404, "Unknown video_id — call POST /videos/init-upload first.")

    # Park it in the bucket (NOT local disk): the Pub/Sub webhook that consumes it may be
    # served by a different instance than the one handling this request.
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await transcript.read())
        tmp_path = tmp.name
    try:
        staged_object = get_video_store().upload_source("transcript", tmp_path, str(uid), suffix)
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    await store.merge_document_metadata(
        uid,
        {
            "staged_transcript": staged_object,
            "staged_transcript_filename": transcript.filename,
            "staged_transcript_cue_count": cue_count,
        },
    )
    logger.info("videos.transcript_staged video_id=%s object=%s", uid, staged_object)
    return {"video_id": str(uid), "staged": True, "transcript_object": staged_object}


@router.patch(
    "/{video_id}",
    response_model=VideoUpdateResponse,
    summary="Edit a video row — title and/or transcript (superadmin only)",
    description=(
        "Edit an existing video's title and/or transcript. Both are optional; send only what "
        "changed:\n\n"
        "- **title** — updates the DB row and the title stored on every indexed chunk "
        "(so chat citations reflect the new title). No re-embedding.\n"
        "- **transcript** — replaces the transcript: the old transcript's embeddings are "
        "deleted from the vector DB and the old transcript file from storage, then the new "
        "transcript is re-indexed in the background (`reprocessing=true`; watch "
        "`GET /ingest/video/{id}/events`).\n\n"
        "Replacing the **video file** goes through the signed direct-to-GCS flow instead — "
        "call `POST /videos/init-upload` with `video_id` set (so large files never time out)."
    ),
    responses={
        200: {"description": "Row updated (a new transcript re-indexes in the background)."},
        400: {"description": "Nothing to update."},
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
        404: {"description": "Unknown video_id."},
        422: {"description": "Invalid id / not a video / unsupported or invalid transcript."},
    },
)
async def update_video(
    video_id: str,
    background_tasks: BackgroundTasks,
    title: str | None = Form(default=None, description="New display title"),
    transcript: UploadFile | None = File(default=None, description="Replacement transcript (.vtt/.srt/.json)"),
    cue_count: int | None = Form(default=None),
    admin: User = Depends(require_admin),
) -> VideoUpdateResponse:
    try:
        uid = _uuid.UUID(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, "Invalid video_id.")

    store = get_kb_document_store()
    doc = await store.get_kb_document(uid)
    if doc is None:
        raise HTTPException(404, "Unknown video_id.")
    if doc.get("media_type") not in (None, "video"):
        raise HTTPException(422, "Not a video row — use PATCH /ingest/document/{id} for documents.")

    meta = doc.get("metadata") or {}
    updated: list[str] = []
    new_title = (title or "").strip() or None
    # Title carried into re-embedded chunks / the replace pipeline (new one wins).
    effective_title = new_title or doc.get("title")

    # ── Title (DB + already-indexed chunks) ──────────────────────────────────────
    if new_title and new_title != doc.get("title"):
        await store.update_kb_document(uid, title=new_title)
        try:
            await get_video_vector_store().set_metadata_title(str(uid), new_title)
        except Exception:  # noqa: BLE001 — a stale chunk title must not fail the edit
            logger.warning("videos.update_title_qdrant_failed video_id=%s", uid)
        updated.append("title")

    # ── Validate + buffer a replacement transcript (if any) ──────────────────────
    transcript_path: str | None = None
    transcript_name: str | None = None
    if transcript is not None and transcript.filename:
        t_suffix = Path(transcript.filename).suffix.lower()
        if t_suffix not in settings.allowed_transcript_ext:
            raise HTTPException(
                422, f"Unsupported transcript type {t_suffix!r}. Allowed: {settings.allowed_transcript_ext}"
            )
        with tempfile.NamedTemporaryFile(delete=False, suffix=t_suffix) as t_tmp:
            t_tmp.write(await transcript.read())
            transcript_path = t_tmp.name
        transcript_name = transcript.filename
        try:
            validate_transcript(Path(transcript_path), meta.get("duration_ms"))
        except TranscriptValidationError as exc:
            os.unlink(transcript_path)
            raise HTTPException(422, f"Invalid transcript: {exc}")

    # ── Replace the transcript only (re-embed) ───────────────────────────────────
    if transcript_path and transcript_name:
        try:
            await get_video_vector_store().delete_by_file_uuid(str(uid))
        except Exception:  # noqa: BLE001
            logger.warning("videos.update_purge_chunks_failed video_id=%s", uid)
        old_tx = meta.get("transcript_gcs_object")
        if old_tx:
            try:
                get_video_store().delete(old_tx)
            except Exception:  # noqa: BLE001
                logger.warning("videos.update_delete_old_transcript_failed video_id=%s object=%s", uid, old_tx)

        extra_metadata = {
            "video_id": str(uid),
            "title": effective_title,
            "gcs_object": meta.get("gcs_object"),
            "chunk_source": "video",
            "transcript_format": Path(transcript_name).suffix.lstrip("."),
        }
        uc = get_video_ingest_use_case()
        job_id = str(_uuid.uuid4())
        uc.create_job(job_id, str(uid), transcript_path, transcript_name)
        # Flip the status to processing SYNCHRONOUSLY so the client's immediate reload shows
        # the row re-indexing (and attaches its live watcher) instead of a stale "Indexed" —
        # the background task hasn't run yet when the client refetches.
        await store.set_transcript_status(uid, TranscriptStatus.UPLOADING.value, status="Processing")
        get_progress_broker().publish(
            f"transcript:{uid}",
            {"phase": "transcript", "status": "uploading", "video_id": str(uid)},
        )
        background_tasks.add_task(
            uc.execute, job_id, transcript_path, str(uid), transcript_name, True, extra_metadata,
        )
        updated.append("transcript")
        logger.info("videos.update video_id=%s fields=%s", uid, updated)
        return VideoUpdateResponse(video_id=str(uid), updated=updated, reprocessing=True)

    if not updated:
        raise HTTPException(400, "Nothing to update — provide a title or a transcript.")
    logger.info("videos.update video_id=%s fields=%s", uid, updated)
    return VideoUpdateResponse(video_id=str(uid), updated=updated, reprocessing=False)


# ── Pub/Sub webhooks (direct-upload flow) ─────────────────────────────────────
def verify_pubsub_push(request: Request) -> None:
    """Verify a Pub/Sub push request via its OIDC token (audience match). Dev: no-op if unset."""
    if not settings.pubsub_audience:
        return
    auth = request.headers.get("authorization", "")
    token = auth[7:] if auth.lower().startswith("bearer ") else ""
    if not token:
        raise HTTPException(401, "missing Pub/Sub OIDC token")
    try:
        from google.auth.transport import requests as g_requests
        from google.oauth2 import id_token

        id_token.verify_oauth2_token(token, g_requests.Request(), audience=settings.pubsub_audience)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(401, f"invalid Pub/Sub token: {exc}")


async def _chain_staged_transcript(video_id) -> None:
    """Index the transcript staged at init-upload time, once the video is stored.

    The signed direct-to-GCS flow can't bundle the transcript with the video, so it is
    parked in the bucket by ``POST /videos/{id}/transcript`` and indexed here — server
    side — as soon as the video reaches ``ready``. This mirrors the through-API flow's
    chaining so a transcript is never lost when the browser goes away mid-upload.

    Failures are swallowed: the video is already stored and must stay that way.
    """
    kb = get_kb_document_store()
    doc = await kb.get_kb_document(video_id)
    meta = (doc or {}).get("metadata") or {}
    staged = meta.get("staged_transcript")
    if not staged:
        return  # through-API upload, or no transcript supplied

    suffix = Path(staged).suffix.lower()
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name
        store = get_video_store()
        store.download_to(staged, tmp_path)

        from dependencies import get_video_ingest_use_case

        vid = str(video_id)
        name = meta.get("staged_transcript_filename") or f"{vid}{suffix}"
        uc = get_video_ingest_use_case()
        job_id = str(_uuid.uuid4())
        uc.create_job(job_id, vid, tmp_path, name)
        await uc.execute(
            job_id,
            tmp_path,
            vid,
            name,
            cleanup=True,  # the use case unlinks tmp_path when done
            extra_metadata={
                "video_id": vid,
                "title": (doc or {}).get("title"),
                "gcs_object": meta.get("gcs_object"),
                "chunk_source": "video",
                "transcript_format": suffix.lstrip("."),
            },
        )
        logger.info("videos.chain_staged_transcript_done video_id=%s job_id=%s", vid, job_id)
    except Exception:  # noqa: BLE001 — never regress a stored video over a transcript failure
        logger.exception("videos.chain_staged_transcript_failed video_id=%s", video_id)
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def _kept_transcript_mismatch(doc: dict | None, duration_ms: int | None) -> str | None:
    """Return a friendly error if the row's indexed transcript doesn't fit ``duration_ms``, else None.

    Downloads the transcript at ``transcript_gcs_object`` and validates it against the given
    duration. No-op (None) when there's no indexed transcript or the duration is unknown.
    Callers decide whether a transcript is being KEPT (validate) vs replaced (skip) — this
    only looks at the currently-indexed transcript. Blocking I/O — call via ``asyncio.to_thread``.
    """
    if duration_ms is None:
        return None
    meta = (doc or {}).get("metadata") or {}
    tx_obj = meta.get("transcript_gcs_object")
    if not tx_obj or not (doc or {}).get("chunk_count"):
        return None
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=Path(tx_obj).suffix.lower()) as tmp:
            tmp_path = tmp.name
        get_video_store().download_to(tx_obj, tmp_path)
        validate_transcript(Path(tmp_path), duration_ms)
        return None
    except TranscriptValidationError as exc:
        return str(exc)
    except Exception:  # noqa: BLE001 — a check hiccup must not block/regress the video
        logger.exception("videos.kept_transcript_check_failed")
        return None
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


async def _validate_kept_transcript(video_id, duration_ms: int | None) -> bool:
    """Fail a video-only replacement whose new file is too short for the kept transcript.

    Backstop for the SYNCHRONOUS check at init-upload (which runs on whichever instance the
    client hit): once the new video's duration is known post-store, mark the row failed (with
    the friendly message) if the kept transcript no longer fits. Returns True when it failed
    the video (caller then skips 'ready'). No-op for create / fresh-transcript replaces.
    """
    if duration_ms is None:
        return False
    kb = get_kb_document_store()
    doc = await kb.get_kb_document(video_id)
    # A freshly-staged transcript re-indexes itself downstream — don't validate the old one.
    if ((doc or {}).get("metadata") or {}).get("staged_transcript"):
        return False
    msg = await asyncio.to_thread(_kept_transcript_mismatch, doc, duration_ms)
    if not msg:
        return False
    await kb.set_video_status(video_id, VideoStatus.FAILED.value, status="Failed", error_message=msg)
    _emit_video(video_id, VideoStatus.FAILED.value, terminal=True, error=msg)
    logger.warning("videos.replace_transcript_mismatch video_id=%s %s", video_id, msg)
    return True


def _pubsub_object_name(body: dict) -> str | None:
    msg = (body or {}).get("message", {}) if isinstance(body, dict) else {}
    if (msg.get("attributes") or {}).get("objectId"):
        return msg["attributes"]["objectId"]
    data = msg.get("data")
    if data:
        try:
            return json.loads(base64.b64decode(data).decode()).get("name")
        except Exception:  # noqa: BLE001
            return None
    return None


def _emit_video(video_id, status: str, terminal: bool = False, **extra) -> None:
    get_progress_broker().publish(
        f"video:{video_id}",
        {"phase": "video", "status": status, "video_id": str(video_id), **extra},
        terminal=terminal,
    )


@router.post("/gcs-notification", status_code=204, include_in_schema=False)
async def gcs_notification(request: Request):
    """GCS OBJECT_FINALIZE (prefix uploads/) → mark uploaded + submit the Transcoder compress job."""
    verify_pubsub_push(request)
    object_name = _pubsub_object_name(await request.json())
    prefix = settings.gcp_upload_staging_prefix.strip("/") + "/"
    if not object_name or not object_name.startswith(prefix):
        return  # not a staged upload → ack + ignore
    try:
        video_id = _uuid.UUID(Path(object_name).stem)
    except (ValueError, TypeError):
        return
    kb = get_kb_document_store()
    doc = await kb.get_kb_document(video_id)
    if doc is None or doc.get("video_status") not in (None, VideoStatus.AWAITING_UPLOAD.value):
        return  # unknown or already processed → idempotent no-op

    await kb.set_video_status(video_id, VideoStatus.UPLOADED.value)
    _emit_video(video_id, VideoStatus.UPLOADED.value)

    store = get_video_store()
    final_object = f"{settings.gcp_storage_prefix.strip('/')}/{video_id}.mp4"

    # Store the original as-is (no re-encode) when either compression is disabled entirely,
    # or the source is small enough that CRF re-encoding would only inflate it. When disabled
    # the size gate is skipped entirely — any video, any size, is copied straight to videos/.
    try:
        original_size = store.staging_size(object_name)
    except Exception:  # noqa: BLE001 — size unknown → fall through and compress (safe default)
        original_size = None
    compress_disabled = not settings.video_compress_enabled
    below_min = original_size is not None and original_size < settings.video_compress_min_bytes
    if compress_disabled or below_min:
        logger.info(
            "videos.compress_skipped reason=%s size=%s min=%d; storing original video_id=%s",
            "disabled" if compress_disabled else "below_min",
            original_size, settings.video_compress_min_bytes, video_id,
        )
        store.copy_to_storage(object_name, final_object)
        duration_ms = _probe_duration_best_effort(final_object)
        patch: dict = {"gcs_object": final_object, "compressed": False}
        if original_size is not None:
            patch["size_bytes"] = original_size
        if duration_ms is not None:
            patch["duration_ms"] = duration_ms
        await kb.merge_document_metadata(video_id, patch)
        try:
            store.delete_staging(object_name)
        except Exception:  # noqa: BLE001
            logger.warning("videos.staging_delete_failed video_id=%s", video_id)
        if await _validate_kept_transcript(video_id, duration_ms):
            return  # new clip too short for the kept transcript → marked failed, not ready
        await kb.set_video_status(video_id, VideoStatus.READY.value, status="uploaded")
        _emit_video(video_id, VideoStatus.READY.value, terminal=True)
        await _chain_staged_transcript(video_id)
        return

    job = submit_compress_job(
        input_uri=f"gs://{settings.upload_bucket}/{object_name}",           # original (upload bucket)
        output_dir=f"gs://{settings.gcp_storage_bucket}/{settings.gcp_storage_prefix.strip('/')}/",  # compressed (storage bucket)
        video_id=str(video_id),
        crf=settings.video_compress_crf,
        height=settings.video_target_height,
        pubsub_topic=settings.gcp_transcoder_pubsub_topic or None,
    )
    await kb.merge_document_metadata(video_id, {"transcoder_job": job})
    await kb.set_video_status(video_id, VideoStatus.COMPRESSING.value)
    _emit_video(video_id, VideoStatus.COMPRESSING.value)


def _probe_duration_best_effort(object_name: str) -> int | None:
    """ffprobe the compressed output over a signed READ URL (moov-only). Never raises."""
    try:
        url = get_video_store().generate_read_url(object_name, 600)
        return probe_duration_ms(url)
    except Exception:  # noqa: BLE001
        return None


@router.post("/transcoder-notification", status_code=204, include_in_schema=False)
async def transcoder_notification(request: Request):
    """Transcoder job completion → mark ready (+ delete staging original) or failed."""
    verify_pubsub_push(request)
    info = ((await request.json()) or {}).get("message", {})
    try:
        payload = json.loads(base64.b64decode(info.get("data") or "").decode())
    except Exception:  # noqa: BLE001
        payload = {}

    # Real Transcoder messages nest the job: {"job": {"name": ..., "state": ...}} with NO labels.
    # Our manual/test shape is flat: {"name"/"labels"/"state": ...}. Support both.
    job_obj = payload.get("job")
    if isinstance(job_obj, dict):
        job_name, labels, state_raw = job_obj.get("name"), job_obj.get("labels") or {}, job_obj.get("state")
    elif isinstance(job_obj, str):
        job_name, labels, state_raw = job_obj, {}, payload.get("state")
    else:
        job_name, labels, state_raw = payload.get("name"), payload.get("labels") or {}, payload.get("state")

    video_id = labels.get("video_id")
    state = str(state_raw or "").rsplit(".", 1)[-1].upper()
    if not video_id and job_name:  # real messages carry no labels — fetch the job to recover them
        try:
            job = get_job(job_name)
            video_id, state = job_video_id(job), job_state(job)
        except Exception:  # noqa: BLE001
            return
    if not video_id:
        return
    try:
        uid = _uuid.UUID(str(video_id))
    except (ValueError, TypeError):
        return

    kb = get_kb_document_store()
    doc = await kb.get_kb_document(uid)
    if doc is None or doc.get("video_status") in (VideoStatus.READY.value, VideoStatus.FAILED.value):
        return  # unknown or already terminal → idempotent no-op

    if state == "SUCCEEDED":
        final_object = f"{settings.gcp_storage_prefix.strip('/')}/{uid}.mp4"
        duration_ms = _probe_duration_best_effort(final_object)
        patch: dict = {"gcs_object": final_object}
        if duration_ms is not None:
            patch["duration_ms"] = duration_ms
        await kb.merge_document_metadata(uid, patch)
        try:
            get_video_store().delete_staging(f"{settings.gcp_upload_staging_prefix.strip('/')}/{uid}.mp4")
        except Exception:  # noqa: BLE001
            logger.warning("videos.staging_delete_failed video_id=%s", uid)
        if await _validate_kept_transcript(uid, duration_ms):
            return  # new clip too short for the kept transcript → marked failed, not ready
        await kb.set_video_status(uid, VideoStatus.READY.value, status="uploaded")
        _emit_video(uid, VideoStatus.READY.value, terminal=True)
        await _chain_staged_transcript(uid)
    else:
        await kb.set_video_status(uid, VideoStatus.FAILED.value, status="Failed")
        _emit_video(uid, VideoStatus.FAILED.value, terminal=True, error="transcode failed")


@router.post(
    "",
    status_code=202,
    response_model=VideoUploadAcceptedResponse,
    summary="[DEPRECATED] Upload a support video through the API — use POST /videos/init-upload",
    deprecated=True,
    description=(
        "**Deprecated** — routes the whole file through the API and compresses on the server, which "
        "times out for large/1-hour videos. Use **`POST /videos/init-upload`** (direct-to-GCS signed "
        "URL + managed Transcoder compression) instead.\n\n"
        "Still functional for small/legacy uploads: accepts an **MP4**, registers the row, and runs "
        "compress→store in the background (set `VIDEO_COMPRESS_ENABLED=false` to skip server ffmpeg)."
    ),
    responses={
        202: {"description": "Video accepted; compress + store running in the background."},
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
        413: {"description": "File exceeds the maximum allowed size."},
        422: {"description": "Unsupported file type (only .mp4)."},
        502: {"description": "Could not register the video row."},
    },
)
async def upload_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(..., description="MP4 (H.264/AAC) support video"),
    title: str | None = Form(default=None, description="Optional display title"),
    transcript: UploadFile | None = File(
        default=None, description="Optional transcript (.vtt/.srt/.json) — indexed server-side after the video is stored"
    ),
    cue_count: int | None = Form(default=None),
    admin: User = Depends(require_admin),
) -> VideoUploadAcceptedResponse:
    suffix = Path(video.filename or "").suffix.lower()
    if suffix != ".mp4" or (video.content_type and video.content_type not in _ALLOWED_VIDEO_CONTENT):
        raise HTTPException(422, "Only .mp4 (H.264/AAC) videos are supported.")

    # Optional attached transcript → validate type + stage it so the upload use case can
    # chain indexing after the video is stored (no second client request needed).
    transcript_path: str | None = None
    transcript_filename: str | None = None
    if transcript is not None and transcript.filename:
        t_suffix = Path(transcript.filename).suffix.lower()
        if t_suffix not in settings.allowed_transcript_ext:
            raise HTTPException(
                422, f"Unsupported transcript type {t_suffix!r}. Allowed: {settings.allowed_transcript_ext}"
            )
        with tempfile.NamedTemporaryFile(delete=False, suffix=t_suffix) as t_tmp:
            t_tmp.write(await transcript.read())
            transcript_path = t_tmp.name
        transcript_filename = transcript.filename

    data = await video.read()
    size_bytes = len(data)
    if size_bytes > settings.max_video_bytes:
        if transcript_path:
            try:
                os.unlink(transcript_path)
            except OSError:
                pass
        raise HTTPException(413, f"Video exceeds the maximum size of {settings.max_video_bytes} bytes.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    video_id = _uuid.uuid4()
    # Display title = provided title, else the original filename WITHOUT its extension.
    display_title = title or Path(video.filename or "").stem or str(video_id)
    # Create the row up front (status uploading / video_status processing) so GET /videos/{id}
    # works immediately and the uploader FK is recorded before the background task runs.
    try:
        await get_kb_document_store().create_video_row(
            video_id, display_title, {"original_size_bytes": size_bytes, "size_bytes": size_bytes},
            admin.id,
        )
    except Exception as exc:
        for p in (tmp_path, transcript_path):
            if p:
                try:
                    os.unlink(p)
                except OSError:
                    pass
        logger.exception("videos.register_failed")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to register the video row (DB): {type(exc).__name__}: {exc}",
        )

    # Background: compress → store → (if a transcript was attached) index it server-side,
    # updating status and cleaning up the temp files.
    background_tasks.add_task(
        get_video_upload_use_case().execute,
        str(video_id), tmp_path, size_bytes, video.filename, title, admin.id,
        transcript_path, transcript_filename, cue_count,
    )

    return VideoUploadAcceptedResponse(
        video_id=str(video_id),
        status="processing",
        title=display_title,
        events_url=f"/videos/{video_id}/events",
        status_url=f"/videos/{video_id}",
        ingest_hint=f"POST /ingest/video/transcript with video_id={video_id} and the transcript file",
    )


@router.get(
    "/{video_id}",
    summary="Get a video's status (superadmin only)",
    description=(
        "Returns the video's kb_documents record: status (`uploading` → `Processing` → "
        "`Upserted`/`Empty`/`Failed`), title, metadata (gcs_object, duration_ms, size_bytes, "
        "transcript_format) and chunk_count. Use this to confirm upload and track transcript ingestion."
    ),
    responses={
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
        404: {"description": "Video not found."},
    },
)
async def get_video_status(video_id: str, _admin: User = Depends(require_admin)) -> dict:
    try:
        uid = _uuid.UUID(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid video_id {video_id!r}.")
    doc = await get_kb_document_store().get_kb_document(uid)
    if doc is None:
        raise HTTPException(404, f"Video {video_id!r} not found.")
    return doc


@router.get(
    "/{video_id}/events",
    summary="Stream a video's upload status (SSE, superadmin only)",
    description=(
        "Server-Sent Events stream of the video-upload lifecycle: `processing` → `compressing` → "
        "`uploading` → `uploaded` (or `failed`). Each event is a JSON `data:` frame "
        "`{phase:'video', status, video_id, ...}`. The stream replays already-emitted events on "
        "connect (so a late subscriber still sees the full sequence) and closes on a terminal event."
    ),
    responses={
        401: {"description": "Missing/invalid token."},
        403: {"description": "Not a superadmin."},
    },
)
async def video_events(
    video_id: str, request: Request, _admin: User = Depends(require_admin)
):
    return sse_response(get_progress_broker(), f"video:{video_id}", request)
