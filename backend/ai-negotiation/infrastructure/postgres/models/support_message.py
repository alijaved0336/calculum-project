from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .support_thread import SupportThread


class SupportMessage(Base, TimestampMixin):
    __tablename__ = "support_messages"

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    thread_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_threads.uuid"), index=True, nullable=False
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_metadata: Mapped[Any | None] = mapped_column("metadata", JSONB, nullable=True)

    thread: Mapped[SupportThread] = relationship("SupportThread", back_populates="messages")
