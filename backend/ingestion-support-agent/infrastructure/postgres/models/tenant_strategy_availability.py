from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, List

from sqlalchemy import Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from infrastructure.postgres.models.base import Base, TimestampMixin
from infrastructure.postgres.models.enums import StrategyEnum, strategy_enum

if TYPE_CHECKING:
    from infrastructure.postgres.models.tenant import Tenant
    from infrastructure.postgres.models.settings import Settings


class TenantStrategyAvailability(Base, TimestampMixin):
    __tablename__ = "tenant_strategy_availability"
    __table_args__ = (UniqueConstraint("tenant_uuid", name="uq_tenant_strategy_availability_tenant"),)

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    settings_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("settings.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    is_global: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    enabled_strategies: Mapped[List[StrategyEnum] | None] = mapped_column(ARRAY(strategy_enum), nullable=True)

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="strategy_availability")
    platform_settings: Mapped["Settings"] = relationship("Settings", back_populates="strategy_availabilities")
