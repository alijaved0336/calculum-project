from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, text
from sqlalchemy.dialects.postgresql import ARRAY, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from infrastructure.postgres.models.base import Base, TimestampMixin
from infrastructure.postgres.models.enums import ToneEnum, tone_enum

if TYPE_CHECKING:
    from infrastructure.postgres.models.tenant import Tenant
    from infrastructure.postgres.models.tone_settings import ToneSettings
    from infrastructure.postgres.models.prompt_instructions import PromptInstructions
    from infrastructure.postgres.models.tenant_strategy_availability import TenantStrategyAvailability


class Settings(Base, TimestampMixin):
    __tablename__ = "settings"
    __table_args__ = (
        CheckConstraint(
            "(is_global = true AND tenant_uuid IS NULL) "
            "OR (is_global = false AND tenant_uuid IS NOT NULL)",
            name="ck_settings_global_tenant_scope",
        ),
        Index(
            "uq_settings_platform_singleton",
            "is_global",
            unique=True,
            postgresql_where=text("is_global IS TRUE"),
        ),
        Index(
            "uq_settings_tenant",
            "tenant_uuid",
            unique=True,
            postgresql_where=text("is_global IS FALSE"),
        ),
    )

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )
    enabled_tones: Mapped[List[ToneEnum] | None] = mapped_column(ARRAY(tone_enum), nullable=True)
    is_global: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    tenant: Mapped["Tenant | None"] = relationship("Tenant", back_populates="settings")
    tone_settings: Mapped[list["ToneSettings"]] = relationship(
        "ToneSettings", back_populates="settings"
    )
    prompt_instructions: Mapped[list["PromptInstructions"]] = relationship(
        "PromptInstructions", back_populates="settings"
    )
    strategy_availabilities: Mapped[list["TenantStrategyAvailability"]] = relationship(
        "TenantStrategyAvailability", back_populates="platform_settings"
    )
