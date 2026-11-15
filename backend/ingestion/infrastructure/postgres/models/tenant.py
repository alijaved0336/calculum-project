from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, NullableTimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.settings import Settings
    from infrastructure.postgres.models.spend_file_version import SpendFileVersion
    from infrastructure.postgres.models.tenant_strategy_availability import (
        TenantStrategyAvailability,
    )
    from infrastructure.postgres.models.users import User


class Tenant(Base, NullableTimestampMixin):
    __tablename__ = "tenants"

    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    ada_updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    spend_file_versions: Mapped[list[SpendFileVersion]] = relationship(
        "SpendFileVersion", back_populates="tenant"
    )
    users: Mapped[list[User]] = relationship("User", back_populates="tenant")
    settings: Mapped[list[Settings]] = relationship("Settings", back_populates="tenant")
    strategy_availability: Mapped[TenantStrategyAvailability | None] = relationship(
        "TenantStrategyAvailability", back_populates="tenant", uselist=False
    )
