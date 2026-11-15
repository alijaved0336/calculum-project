from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin
from .enums import StrategyEnum, ToneEnum, strategy_enum, tone_enum

if TYPE_CHECKING:
    from infrastructure.postgres.models.settings import Settings


class ToneSettings(Base, TimestampMixin):
    __tablename__ = "tone_settings"
    __table_args__ = (
        UniqueConstraint("settings_uuid", "strategy_name", name="uq_tone_settings_settings_strategy"),
    )

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_global: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    settings_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("settings.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    strategy_name: Mapped[StrategyEnum | None] = mapped_column(strategy_enum, nullable=True)
    tone: Mapped[ToneEnum | None] = mapped_column(tone_enum, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    settings: Mapped["Settings"] = relationship("Settings", back_populates="tone_settings")
