from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.postgres.models.base import TimestampMixin
from infrastructure.postgres.models.ingestion_base import IngestionBase


class VideoKBDocument(IngestionBase, TimestampMixin):
    """Ingestion-owned tracking row for an uploaded video or general document.

    A self-owned copy of the ``kb_documents`` fields this service uses, plus the granular
    per-lifecycle status columns and a JSONB ``metadata`` blob. Lives in the same DB but is
    managed by this repo's Alembic so the shared ``kb_documents`` schema is untouched.
    """

    __tablename__ = "video_kb_documents"

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    uploaded_by_user_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    filename: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_url: Mapped[str | None] = mapped_column(Text, nullable=True)

    media_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default="document", server_default="document"
    )
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Document visibility: public docs are cited/downloadable by all users; private only by
    # admins. Private by default. (Not meaningful for videos.)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Coarse legacy status kept in sync with the granular columns below.
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="uploading")
    video_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    transcript_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    document_status: Mapped[str | None] = mapped_column(String(32), nullable=True)

    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_already_uploaded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    chunk_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Media-specific attributes (gcs_object, duration_ms, transcript_format, size_bytes, page fields).
    doc_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB, nullable=True)
