from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Numeric, Text, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, NullableTimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.buying_entity import BuyingEntity
    from infrastructure.postgres.models.spend_file_version import SpendFileVersion
    from infrastructure.postgres.models.supplier import Supplier


class Spend(Base, NullableTimestampMixin):
    __tablename__ = "spends"

    spend_uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    spend_file_version_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("spend_file_versions.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )
    supplier_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )
    buying_entity_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("buying_entities.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )
    tenant_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    alias: Mapped[str | None] = mapped_column(Text, nullable=True)
    spend_volume: Mapped[Any | None] = mapped_column(Numeric(20, 4), nullable=True)
    transaction_currency: Mapped[str | None] = mapped_column(Text, nullable=True)
    procurement_team: Mapped[str | None] = mapped_column(Text, nullable=True)
    commodity: Mapped[str | None] = mapped_column(Text, nullable=True)
    hs_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    hs_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    currently_on_scf: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    currently_on_vcard: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    program_applied: Mapped[str | None] = mapped_column(Text, nullable=True)
    base_rate: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    scf_rate: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    actual_payment_terms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    term_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    contractual_without_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contractual_with_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cash_discount_percentage: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True
    )
    last_term_negotiation: Mapped[date | None] = mapped_column(Date, nullable=True)
    aggregated_lines_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    negotiation_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_data_points: Mapped[Any | None] = mapped_column(JSONB, server_default=text("'[]'::jsonb"), nullable=True)
    target_opportunity_payment_terms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_payment_terms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_cash_flow: Mapped[Any | None] = mapped_column(Numeric(20, 4), nullable=True)
    agreed_terms_without_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agreed_terms_with_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agreed_cash_discount_percentage: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    scf_accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    vcard_accepted: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    negotiation_strategy: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    ada_updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    spend_file_version: Mapped[SpendFileVersion] = relationship("SpendFileVersion", back_populates="spends")
    supplier: Mapped[Supplier] = relationship("Supplier", back_populates="spends")
    buying_entity: Mapped[BuyingEntity] = relationship("BuyingEntity", back_populates="spends")
