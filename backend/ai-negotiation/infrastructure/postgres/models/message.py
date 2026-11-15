from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin
from .enums import MessageRoleEnum, message_role_enum

if TYPE_CHECKING:
    from infrastructure.postgres.models.thread import Thread


class Message(Base, TimestampMixin):
    __tablename__ = "messages"
    __table_args__ = (Index("idx_messages_thread_uuid", "thread_uuid"),)

    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    thread_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    role: Mapped[MessageRoleEnum] = mapped_column(message_role_enum, nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    tokens_in: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tokens_out: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    rag_sources: Mapped[list[dict] | None] = mapped_column(JSONB, nullable=True)
    thread: Mapped["Thread"] = relationship("Thread", back_populates="messages")
