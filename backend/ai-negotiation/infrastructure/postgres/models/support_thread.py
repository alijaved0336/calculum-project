from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from .support_message import SupportMessage


class SupportThread(Base, TimestampMixin):
    __tablename__ = "support_threads"

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    user_uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    title: Mapped[str | None] = mapped_column(nullable=True)

    messages: Mapped[list[SupportMessage]] = relationship("SupportMessage", back_populates="thread")
