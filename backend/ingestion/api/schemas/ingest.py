import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from domain.entities.ingestion import PlaybookStrategyType


# ── Server-side path ingestion ────────────────────────────────────────────────

class IngestDocumentRequest(BaseModel):
    file_path: str
    is_already_uploaded: bool = False
    playbook_strategy_type: list[PlaybookStrategyType] = []
    file_uuid: Optional[uuid.UUID] = None
    description: Optional[str] = None


# ── Parallel pipeline upload (202 Accepted) ───────────────────────────────────

class UploadAcceptedResponse(BaseModel):
    job_id: str
    file_id: str
    status: str
    status_url: str
    events_url: str = Field(
        description="SSE stream of {file_uuid, status, progress?, error?} events")


class IngestionJobStatusResponse(BaseModel):
    job_id: str
    file_id: str
    file_name: str
    status: str
    chunks_written: Optional[int] = None
    error: Optional[str] = None


# ── Manual API sync trigger ───────────────────────────────────────────────────

class SyncTriggerRequest(BaseModel):
    feed: Optional[str] = None
    updated_after: Optional[str] = None


class SyncTriggerResponse(BaseModel):
    results: dict[str, int]
    next_updated_after: dict[str, Optional[str]] = {}


class AdabotIngestionLogResponse(BaseModel):
    uuid: uuid.UUID
    status: str
    started_at: datetime
    completed_at: datetime | None = None
    logs: dict


class IngestionLogsResponse(BaseModel):
    items: list[AdabotIngestionLogResponse]
    total: int


# ── Delete chunks ─────────────────────────────────────────────────────────────

class DeleteChunksResponse(BaseModel):
    deleted: bool
    file_uuid: str
    status: str
