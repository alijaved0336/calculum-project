from __future__ import annotations
import uuid
from typing import List

from typing import Any

from sqlalchemy import BigInteger, Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from infrastructure.postgres.models.base import Base, TimestampMixin
from infrastructure.postgres.models.enums import StrategyEnum, strategy_enum


class KBDocument(Base, TimestampMixin):
    __tablename__ = "kb_documents"

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
    status: Mapped[str] = mapped_column(String(64), nullable=False, default="uploading")
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_already_uploaded: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    chunk_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    playbook_strategies: Mapped[List[StrategyEnum] | None] = mapped_column(
        ARRAY(strategy_enum), nullable=True
    )

    # ── Normalized text/video document fields ─────────────────────────────────
    # media_type discriminates text docs from videos; title is a display label.
    # Media-specific attributes (video gcs_object, duration_ms, transcript_format,
    # size_bytes) live in the JSONB `metadata` column so the schema stays normalized
    # for both document types.
    media_type: Mapped[str] = mapped_column(
        String(16), nullable=False, default="document", server_default="document"
    )
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    doc_metadata: Mapped[dict[str, Any] | None] = mapped_column("metadata", JSONB, nullable=True)
