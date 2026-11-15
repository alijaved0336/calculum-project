from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class VideoKBDocument(Base, TimestampMixin):
    __tablename__ = "video_kb_documents"

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
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
    media_type: Mapped[str] = mapped_column(String(16), nullable=False, server_default=text("'document'"))
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(64), nullable=False, server_default=text("'uploading'"))
    video_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    transcript_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    document_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_already_uploaded: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    chunk_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    doc_metadata: Mapped[Any | None] = mapped_column("metadata", JSONB, nullable=True)
    is_public: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
