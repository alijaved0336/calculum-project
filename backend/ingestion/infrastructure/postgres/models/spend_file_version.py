from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, NullableTimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.spend import Spend
    from infrastructure.postgres.models.tenant import Tenant


class SpendFileVersion(Base, NullableTimestampMixin):
    __tablename__ = "spend_file_versions"

    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )
    tenant_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    spend_volume: Mapped[Any | None] = mapped_column(Numeric(20, 4), nullable=True)
    supplier_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    spend_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ada_updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    tenant: Mapped[Tenant] = relationship("Tenant", back_populates="spend_file_versions")
    spends: Mapped[list[Spend]] = relationship("Spend", back_populates="spend_file_version")
