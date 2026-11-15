"""Support video library — list / search / paginate / get / play / remove-from-list.

Reads the ``video_kb_documents`` rows written by the ingestion service. Video upload +
compression + storage stays in the ingestion service; this service manages the library
and serves playback (signed URL + transcript cues). Every endpoint requires a valid
calculum-tokenize JWT (same auth model as the rest of the service — no role gating).
"""
from __future__ import annotations

import asyncio
import logging
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps.auth import current_user
from api.schemas.videos import (
    DeleteSegmentResponse,
    DeleteVideoResponse,
    TranscriptCue,
    VideoListResponse,
    VideoPlaybackResponse,
    VideoRow,
    VideoSegment,
    VideoSegmentsResponse,
)
from application.services.media_deleter import cascade_delete_media
from dependencies import get_signed_url, get_vector_store, get_video_store
from domain.entities.user import User
from infrastructure.storage.gcs_client import delete_object

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/videos", tags=["videos"])


@router.get(
    "",
    response_model=VideoListResponse,
    summary="List support videos (search + pagination)",
    description=(
        "Paginated list of support videos, newest first. Optional case-insensitive title "
        "search via `q`. Requires an authenticated user."
    ),
)
async def list_videos(
    q: str | None = Query(default=None, description="Case-insensitive title search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=100),
    _user: User = Depends(current_user),
) -> VideoListResponse:
    items, total = await get_video_store().list_videos(q=q, page=page, page_size=page_size)
    return VideoListResponse(
        items=[VideoRow(**it) for it in items], total=total, page=page, page_size=page_size
    )


@router.get(
    "/{video_id}",
    response_model=VideoRow,
    summary="Get a single support video row",
    responses={404: {"description": "Video not found"}, 422: {"description": "Malformed id"}},
)
async def get_video(video_id: str, _user: User = Depends(current_user)) -> VideoRow:
    try:
        uid = _uuid.UUID(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid video_id {video_id!r}.")
    doc = await get_video_store().get_video(uid)
    if doc is None:
        raise HTTPException(404, f"Video {video_id!r} not found.")
    return VideoRow(**doc)


@router.get(
    "/{video_id}/play",
    response_model=VideoPlaybackResponse,
    summary="Signed video URL + transcript cues for playback",
    description=(
        "Returns a short-lived signed GCS URL for the video plus its transcript cues "
        "(parsed from the stored transcript), so the in-app player can play the video "
        "and seek by cue. Requires an authenticated user."
    ),
    responses={404: {"description": "Video (or its stored file) not found"}},
)
async def play_video(video_id: str, _user: User = Depends(current_user)) -> VideoPlaybackResponse:
    from application.transcript import parse_transcript
    from infrastructure.storage.gcs_client import read_object

    try:
        uid = _uuid.UUID(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid video_id {video_id!r}.")
    doc = await get_video_store().get_video(uid)
    if doc is None:
        raise HTTPException(404, f"Video {video_id!r} not found.")

    meta = doc.get("metadata") or {}
    gcs_object = meta.get("gcs_object")
    if not gcs_object:
        raise HTTPException(404, "This video has no stored file to play yet.")

    video_url = await asyncio.to_thread(get_signed_url().sign, gcs_object)

    cues: list[TranscriptCue] = []
    transcript_object = meta.get("transcript_gcs_object")
    if transcript_object:
        try:
            raw = await asyncio.to_thread(read_object, transcript_object)
            cues = [TranscriptCue(**c) for c in parse_transcript(transcript_object, raw.decode("utf-8"))]
        except Exception:  # noqa: BLE001
            logger.warning("play.transcript_fetch_failed video_id=%s", video_id)

    return VideoPlaybackResponse(
        video_id=video_id, video_url=video_url, duration_ms=meta.get("duration_ms"), cues=cues
    )


def _segment_belongs(seg, video_id: str) -> bool:
    """A chunk belongs to this video when its ingestion-stamped file id matches. Ingestion sets
    ``metadata.file_id`` == ``metadata.video_id`` == the video id."""
    return seg.video_id == video_id or (seg.metadata or {}).get("file_id") == video_id


@router.get(
    "/{video_id}/segments",
    response_model=VideoSegmentsResponse,
    summary="List a video's transcript segments (admin — segment manager)",
    description=(
        "Global-admin only. Returns every transcript chunk of the video (id, text, timing) in "
        "timeline order, plus a signed URL so the admin can preview a segment before deleting it."
    ),
    responses={
        403: {"description": "Global admin required"},
        404: {"description": "Video not found"},
        422: {"description": "Malformed id"},
    },
)
async def list_video_segments(
    video_id: str, user: User = Depends(current_user)
) -> VideoSegmentsResponse:
    if not user.is_global_admin:
        raise HTTPException(403, "Global admin required.")
    try:
        uid = _uuid.UUID(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid video_id {video_id!r}.")
    doc = await get_video_store().get_video(uid)
    if doc is None:
        raise HTTPException(404, f"Video {video_id!r} not found.")

    results = await get_vector_store().scroll_by_file(video_id)
    # Timeline order; chunks with no start time sort last.
    results.sort(key=lambda r: (r.start_ms is None, r.start_ms or 0))

    meta = doc.get("metadata") or {}
    gcs_object = meta.get("gcs_object")
    video_url = (
        await asyncio.to_thread(get_signed_url().sign, gcs_object) if gcs_object else None
    )

    segments = [
        VideoSegment(
            id=r.id,
            text=r.text,
            start_ms=r.start_ms,
            end_ms=r.end_ms,
            chunk_type=r.chunk_type,
            page_numbers=(r.metadata or {}).get("page_numbers") or [],
        )
        for r in results
    ]
    return VideoSegmentsResponse(
        video_id=video_id,
        title=doc.get("title"),
        video_url=video_url,
        duration_ms=meta.get("duration_ms"),
        total=len(segments),
        segments=segments,
    )


@router.delete(
    "/{video_id}/segments/{segment_id}",
    response_model=DeleteSegmentResponse,
    summary="Delete one transcript segment (admin — segment manager)",
    description=(
        "Global-admin only. Removes a single transcript chunk from the vector store and recomputes "
        "the video's chunk_count. 404 if the segment doesn't exist; 403 if it belongs to a "
        "different video. Does not touch the video/transcript files — a later re-ingest rebuilds "
        "all segments."
    ),
    responses={
        403: {"description": "Global admin required, or segment belongs to another video"},
        404: {"description": "Video or segment not found"},
        422: {"description": "Malformed id"},
    },
)
async def delete_video_segment(
    video_id: str, segment_id: str, user: User = Depends(current_user)
) -> DeleteSegmentResponse:
    if not user.is_global_admin:
        raise HTTPException(403, "Global admin required.")
    try:
        uid = _uuid.UUID(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid video_id {video_id!r}.")
    store = get_video_store()
    doc = await store.get_video(uid)
    if doc is None:
        raise HTTPException(404, f"Video {video_id!r} not found.")

    vector_store = get_vector_store()
    found = await vector_store.fetch_by_ids([segment_id])
    if not found:
        raise HTTPException(404, f"Segment {segment_id!r} not found.")
    if not _segment_belongs(found[0], video_id):
        # Fail closed — never delete a chunk that belongs to a different video.
        raise HTTPException(403, "Segment does not belong to this video.")

    await vector_store.delete_by_ids([segment_id])
    new_count = await vector_store.count_by_file(video_id)
    await store.set_chunk_count(uid, new_count)
    return DeleteSegmentResponse(
        video_id=video_id, segment_id=segment_id, deleted=True, chunk_count=new_count
    )


@router.delete(
    "/{video_id}",
    response_model=DeleteVideoResponse,
    summary="Delete a video (file + transcript + chunks + row)",
    description=(
        "Permanently deletes the video: its Qdrant chunks, its GCS files (the video **and** its "
        "transcript), and its Postgres row. Idempotent — re-deleting a gone video returns 404."
    ),
    responses={404: {"description": "Video not found"}},
)
async def delete_video(video_id: str, _user: User = Depends(current_user)) -> DeleteVideoResponse:
    try:
        uid = _uuid.UUID(video_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid video_id {video_id!r}.")
    store = get_video_store()
    doc = await store.get_video(uid)
    if doc is None:
        raise HTTPException(404, f"Video {video_id!r} not found.")
    await cascade_delete_media(
        uid, doc, vector_store=get_vector_store(),
        gcs_delete=delete_object, delete_row=store.delete_video,
    )
    return DeleteVideoResponse(deleted=True, video_id=video_id)
