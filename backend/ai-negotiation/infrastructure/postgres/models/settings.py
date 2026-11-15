from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.postgres.models.base import Base, TimestampMixin
from infrastructure.postgres.models.enums import (
    StrategyEnum,
    ToneEnum,
    strategy_enum,
    tone_enum,
)

if TYPE_CHECKING:
    from infrastructure.postgres.models.tenant import Tenant


class Settings(Base, TimestampMixin):
    __tablename__ = "settings"
    __table_args__ = (
        Index(
            "uq_settings_platform_singleton",
            text("(1)"),
            unique=True,
            postgresql_where=text("tenant_uuid IS NULL"),
        ),
        Index(
            "uq_settings_tenant",
            "tenant_uuid",
            unique=True,
            postgresql_where=text("tenant_uuid IS NOT NULL"),
        ),
    )

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )
    tones: Mapped[list[ToneEnum] | None] = mapped_column(ARRAY(tone_enum), nullable=True)
    strategies: Mapped[list[StrategyEnum] | None] = mapped_column(ARRAY(strategy_enum), nullable=True)
    global_strategy: Mapped[list[StrategyEnum] | None] = mapped_column(ARRAY(strategy_enum), nullable=True)
    view_data_inputs: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=text("false"))
    strategy_tone_map: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    prompt_instructions: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    tenant: Mapped[Tenant | None] = relationship("Tenant", back_populates="settings")
