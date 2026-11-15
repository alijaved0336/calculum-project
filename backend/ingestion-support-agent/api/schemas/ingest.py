from typing import Optional
from pydantic import BaseModel


# ── Parallel pipeline upload (202 Accepted) ───────────────────────────────────

class UploadAcceptedResponse(BaseModel):
    job_id: str
    file_id: str
    status: str
    status_url: str
    title: Optional[str] = None  # original filename, for display in the frontend


class IngestionJobStatusResponse(BaseModel):
    job_id: str
    file_id: str
    file_name: str
    status: str
    chunks_written: Optional[int] = None
    error: Optional[str] = None


class DocumentUpdateResponse(BaseModel):
    """Result of editing a document row (title / file)."""

    document_id: str
    updated: list[str] = []          # any of 'title', 'file'
    reprocessing: bool = False       # True when a file change kicked off background re-indexing
