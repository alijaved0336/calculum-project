from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.settings import Settings
    from infrastructure.postgres.models.users import User


class PromptInstructions(Base, TimestampMixin):
    __tablename__ = "prompt_instructions"

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    settings_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("settings.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    user_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_conflicted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    is_global: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    settings: Mapped["Settings"] = relationship("Settings", back_populates="prompt_instructions")
    user: Mapped["User | None"] = relationship("User")
