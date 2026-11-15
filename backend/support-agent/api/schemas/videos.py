from __future__ import annotations

from pydantic import BaseModel, Field, computed_field


class VideoRow(BaseModel):
    """A support-video tracking row (read from video_kb_documents)."""

    video_id: str
    status: str
    media_type: str
    title: str | None = None
    metadata: dict = Field(default_factory=dict)
    chunk_count: int | None = None
    video_status: str | None = None
    transcript_status: str | None = None
    document_status: str | None = None
    error_message: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @computed_field
    @property
    def ingested(self) -> bool:
        """True once its transcript has been chunked into Qdrant (chunk_count > 0)."""
        return bool((self.chunk_count or 0) > 0)


class VideoListResponse(BaseModel):
    """Paginated list of support videos."""

    items: list[VideoRow]
    total: int = Field(..., description="Total matching videos (across all pages)")
    page: int
    page_size: int


class DeleteVideoResponse(BaseModel):
    deleted: bool
    video_id: str


class TranscriptCue(BaseModel):
    t: float = Field(..., description="Cue start time in seconds")
    text: str


class VideoPlaybackResponse(BaseModel):
    """Signed video URL + transcript cues for the in-app player."""

    video_id: str
    video_url: str = Field(..., description="Short-lived signed GCS URL for the video")
    duration_ms: int | None = None
    cues: list[TranscriptCue] = Field(default_factory=list)


class VideoSegment(BaseModel):
    """One transcript chunk of a video, as shown in the segment manager."""

    id: str = Field(..., description="Qdrant point id — pass back to delete this segment")
    text: str = ""
    start_ms: int | None = None
    end_ms: int | None = None
    chunk_type: str | None = None
    page_numbers: list[int] = Field(default_factory=list)


class VideoSegmentsResponse(BaseModel):
    """All transcript segments of a video plus a signed URL for in-modal preview."""

    video_id: str
    title: str | None = None
    video_url: str | None = Field(
        default=None, description="Signed GCS URL for previewing segments (null if no stored file)"
    )
    duration_ms: int | None = None
    total: int
    segments: list[VideoSegment] = Field(default_factory=list)


class DeleteSegmentResponse(BaseModel):
    video_id: str
    segment_id: str
    deleted: bool
    chunk_count: int = Field(..., description="Authoritative remaining chunk count for the video")
