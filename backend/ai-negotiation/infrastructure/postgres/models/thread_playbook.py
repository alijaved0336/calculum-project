from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.thread import Thread


class ThreadPlaybook(Base, TimestampMixin):
    __tablename__ = "thread_playbooks"
    __table_args__ = (Index("idx_tp_thread_uuid", "thread_uuid"),)

    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    thread_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("threads.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    playbook_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    message_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("messages.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )

    thread: Mapped["Thread"] = relationship(
        "Thread",
        foreign_keys="ThreadPlaybook.thread_uuid",
        back_populates="playbooks",
    )
