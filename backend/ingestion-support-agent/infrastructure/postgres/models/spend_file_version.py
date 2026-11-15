from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, ForeignKey, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.spend import Spend
    from infrastructure.postgres.models.tenant import Tenant


class SpendFileVersion(Base, TimestampMixin):
    __tablename__ = "spend_file_versions"

    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    tenant_id: Mapped[str] = mapped_column(Text, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    spend_volume: Mapped[Any] = mapped_column(Numeric(20, 4), nullable=False)
    supplier_count: Mapped[int] = mapped_column(Integer, nullable=False)
    spend_count: Mapped[int] = mapped_column(Integer, nullable=False)
    ada_updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="spend_file_versions")
    spends: Mapped[list["Spend"]] = relationship("Spend", back_populates="spend_file_version")
