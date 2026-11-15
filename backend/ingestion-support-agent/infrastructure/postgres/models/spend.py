from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, Text, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.buying_entity import BuyingEntity
    from infrastructure.postgres.models.spend_file_version import SpendFileVersion
    from infrastructure.postgres.models.supplier import Supplier


class Spend(Base, TimestampMixin):
    __tablename__ = "spends"

    spend_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    spend_file_version_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("spend_file_versions.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    supplier_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    buying_entity_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buying_entities.uuid", deferrable=True, initially="deferred"),
        nullable=False,
    )
    tenant_id: Mapped[str] = mapped_column(Text, nullable=False)
    alias: Mapped[str] = mapped_column(Text, nullable=False)
    spend_volume: Mapped[Any] = mapped_column(Numeric(20, 4), nullable=False)
    transaction_currency: Mapped[str] = mapped_column(Text, nullable=False)
    procurement_team: Mapped[str] = mapped_column(Text, nullable=False)
    commodity: Mapped[str | None] = mapped_column(Text, nullable=True)
    hs_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    hs_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    currently_on_scf: Mapped[bool] = mapped_column(Boolean, nullable=False)
    currently_on_vcard: Mapped[bool] = mapped_column(Boolean, nullable=False)
    program_applied: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_rate: Mapped[Any] = mapped_column(Numeric(10, 6), nullable=False)
    scf_rate: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    actual_payment_terms: Mapped[int] = mapped_column(Integer, nullable=False)
    term_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    contractual_without_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contractual_with_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cash_discount_percentage: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True
    )
    last_term_negotiation: Mapped[date | None] = mapped_column(Date, nullable=True)
    aggregated_lines_count: Mapped[int] = mapped_column(Integer, nullable=False)
    negotiation_status: Mapped[str] = mapped_column(Text, nullable=False)
    custom_data_points: Mapped[Any] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), nullable=False)
    target_opportunity_payment_terms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_payment_terms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_cash_flow: Mapped[Any | None] = mapped_column(Numeric(20, 4), nullable=True)
    agreed_terms_without_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agreed_terms_with_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agreed_cash_discount_percentage: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    scf_accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    vcard_accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    negotiation_strategy: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    ada_updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False
    )

    spend_file_version: Mapped["SpendFileVersion"] = relationship("SpendFileVersion", back_populates="spends")
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="spends")
    buying_entity: Mapped["BuyingEntity"] = relationship("BuyingEntity", back_populates="spends")
