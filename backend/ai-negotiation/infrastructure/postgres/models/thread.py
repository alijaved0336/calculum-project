from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin
from .enums import ToneEnum, tone_enum

if TYPE_CHECKING:
    from infrastructure.postgres.models.supplier import Supplier
    from infrastructure.postgres.models.thread_summary import ThreadSummary
    from infrastructure.postgres.models.thread_playbook import ThreadPlaybook
    from infrastructure.postgres.models.users import User
    from infrastructure.postgres.models.message import Message


class Thread(Base, TimestampMixin):
    __tablename__ = "threads"
    __table_args__ = (
        Index("idx_threads_supplier_uuid", "supplier_uuid"),
        Index("idx_threads_user_uuid", "user_uuid"),
    )

    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    supplier_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    user_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    tone: Mapped[ToneEnum | None] = mapped_column(tone_enum, nullable=True)
    reaction: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    feedback: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=None)
    pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="threads")
    user: Mapped["User"] = relationship("User", back_populates="threads")

    messages: Mapped[list["Message"]] = relationship(
        "Message", back_populates="thread"
    )
    summaries: Mapped[list["ThreadSummary"]] = relationship(
        "ThreadSummary", back_populates="thread"
    )
    playbooks: Mapped[list["ThreadPlaybook"]] = relationship(
        "ThreadPlaybook", back_populates="thread"
    )
