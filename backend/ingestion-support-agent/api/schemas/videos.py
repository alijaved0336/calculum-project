from __future__ import annotations

from pydantic import BaseModel, Field


class VideoInitUploadRequest(BaseModel):
    """Ask the backend for a direct-to-bucket upload URL (no bytes through the API)."""

    filename: str = Field(..., description="Original filename, e.g. 'town-hall.mp4'")
    content_type: str = Field("video/mp4", description="MIME type (video/mp4)")
    size_bytes: int = Field(..., ge=0, description="File size in bytes (validated against the max)")
    title: str | None = Field(default=None, description="Display title; falls back to the filename stem if omitted")
    # Replace mode: when set, re-issue an upload URL for an EXISTING video row (swap its
    # file in place via the same signed direct-to-GCS path — no bytes through the API, so
    # large replacements don't time out). Omit for a normal new upload.
    video_id: str | None = Field(default=None, description="Existing video to replace in place (edit)")
    has_new_transcript: bool = Field(
        default=False,
        description="Replace mode only: true when a fresh transcript is staged alongside the new "
        "video, so the old transcript's embeddings are purged and re-indexed; false keeps them.",
    )
    video_duration_ms: int | None = Field(
        default=None,
        description="Replace mode only: the new video's duration (measured client-side). When the "
        "transcript is kept (has_new_transcript=false), the server validates the transcript fits this "
        "duration up front and rejects the swap (422) if the video is too short — no reliance on the "
        "post-upload notification, which may be handled elsewhere.",
    )


class VideoInitUploadResponse(BaseModel):
    """Signed URL for the client to upload the ORIGINAL directly to GCS."""

    video_id: str = Field(..., description="Track the video and drive ingestion with this id")
    status: str = Field("awaiting_upload", description="Initial video_status")
    title: str = Field(..., description="Original filename without extension (for display)")
    upload_url: str = Field(..., description="Signed URL — PUT the file here directly")
    method: str = Field("PUT", description="HTTP method for the direct upload")
    headers: dict = Field(default_factory=dict, description="Headers the client must send on the upload (e.g. Content-Type)")
    events_url: str = Field(..., description="SSE stream of post-upload status")
    status_url: str = Field(..., description="Poll this for the current row")


class VideoUploadAcceptedResponse(BaseModel):
    """202 result of accepting a video for background compress + store.

    The kb_documents row is created immediately (``video_status='processing'``); the
    compress→store work runs in the background. Watch progress live at ``events_url``
    (SSE: processing → compressing → uploading → uploaded) or poll ``status_url``.
    """

    video_id: str = Field(..., description="ID of the video being processed. Pass this to POST /ingest/video/transcript.")
    status: str = Field("processing", description="Initial video_status when accepted")
    title: str = Field(..., description="Original filename of the uploaded video (for display in the frontend)")
    events_url: str = Field(..., description="SSE stream of upload status transitions")
    status_url: str = Field(..., description="Poll this for the current kb_documents row")
    ingest_hint: str = Field(..., description="How to attach the transcript once uploaded")

    model_config = {
        "json_schema_extra": {
            "example": {
                "video_id": "3f6b1c2a-9d0e-4a11-8b22-0c1d2e3f4a55",
                "status": "processing",
                "title": "how-to-reset-password.mp4",
                "events_url": "/videos/3f6b1c2a-9d0e-4a11-8b22-0c1d2e3f4a55/events",
                "status_url": "/videos/3f6b1c2a-9d0e-4a11-8b22-0c1d2e3f4a55",
                "ingest_hint": "POST /ingest/video/transcript with video_id=3f6b1c2a-... and the transcript file",
            }
        }
    }


class VideoUpdateResponse(BaseModel):
    """Result of editing a video row (title / transcript / video file)."""

    video_id: str = Field(..., description="ID of the edited video")
    updated: list[str] = Field(
        default_factory=list, description="Fields that changed: any of 'title', 'transcript', 'video'"
    )
    reprocessing: bool = Field(
        False,
        description="True when a transcript or video change kicked off background re-indexing "
        "(watch /videos/{id}/events and /ingest/video/{id}/events).",
    )


class VideoUploadResponse(BaseModel):
    """Result of storing a video in GCS and registering it in kb_documents."""

    video_id: str = Field(..., description="ID of the stored video. Pass this to POST /ingest/video/transcript.")
    gcs_object: str = Field(..., description="Object path inside the GCS bucket, e.g. videos/<id>.mp4")
    duration_ms: int | None = Field(None, description="Video duration in ms (null if ffprobe unavailable)")
    size_bytes: int = Field(..., description="Size of the stored (compressed) file in bytes")
    original_size_bytes: int | None = Field(
        None, description="Size of the uploaded file before compression, in bytes"
    )
    status: str = Field("uploading", description="kb_documents lifecycle status")
    ingest_hint: str = Field(
        ...,
        description="How to attach the transcript to this video",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "video_id": "3f6b1c2a-9d0e-4a11-8b22-0c1d2e3f4a55",
                "gcs_object": "videos/3f6b1c2a-9d0e-4a11-8b22-0c1d2e3f4a55.mp4",
                "duration_ms": 5400000,
                "size_bytes": 268435456,
                "original_size_bytes": 734003200,
                "status": "uploading",
                "ingest_hint": "POST /ingest/video/transcript with video_id=3f6b1c2a-... and the transcript file",
            }
        }
    }
