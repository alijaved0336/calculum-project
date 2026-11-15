from __future__ import annotations

from pydantic import BaseModel, Field, computed_field


class DocumentRow(BaseModel):
    """A support-document tracking row (read from video_kb_documents, media_type='document')."""

    document_id: str
    status: str
    media_type: str
    title: str | None = None
    filename: str | None = None
    is_public: bool = False
    metadata: dict = Field(default_factory=dict)
    chunk_count: int | None = None
    document_status: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @computed_field
    @property
    def ingested(self) -> bool:
        """True once the document has been chunked into Qdrant (chunk_count > 0)."""
        return bool((self.chunk_count or 0) > 0)


class DocumentListResponse(BaseModel):
    """Paginated list of support documents."""

    items: list[DocumentRow]
    total: int = Field(..., description="Total matching documents (across all pages)")
    page: int
    page_size: int


class DeleteDocumentResponse(BaseModel):
    deleted: bool
    document_id: str


class DocumentDownloadResponse(BaseModel):
    document_id: str
    download_url: str = Field(..., description="Short-lived signed GCS URL for the original file")
    filename: str | None = None
