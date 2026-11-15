from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.thread import Thread


class ThreadSummary(Base, TimestampMixin):
    __tablename__ = "thread_summaries"
    __table_args__ = (Index("idx_ts_thread_uuid", "thread_uuid"),)
    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    thread_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    thread_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    thread: Mapped["Thread"] = relationship("Thread", back_populates="summaries")
