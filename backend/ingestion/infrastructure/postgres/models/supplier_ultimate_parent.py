from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Boolean, Integer, Numeric, Text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, NullableTimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.supplier import Supplier


class SupplierUltimateParent(Base, NullableTimestampMixin):
    __tablename__ = "supplier_ultimate_parents"

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    spend_file_version_uuid: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    received_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(Text, nullable=True)
    ownership: Mapped[str | None] = mapped_column(Text, nullable=True)
    stock_ticker: Mapped[str | None] = mapped_column(Text, nullable=True)
    entity_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    country_rating: Mapped[str | None] = mapped_column(Text, nullable=True)
    credit_rating: Mapped[str | None] = mapped_column(Text, nullable=True)
    credit_rating_source: Mapped[str | None] = mapped_column(Text, nullable=True)
    main_industry_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    main_industry_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_size: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    provided_internal_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost_of_debt_spread: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    wacc_pre_tax: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    wacc_after_tax: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    supplier_financing_rate: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    scf_rate: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    ethnic_minority_owned_business: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    woman_owned_business: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    veteran_owned_business: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    spend_volume: Mapped[Any | None] = mapped_column(Numeric(20, 4), nullable=True)
    negotiation_status: Mapped[str | None] = mapped_column(Text, nullable=True)
    program_applied: Mapped[str | None] = mapped_column(Text, nullable=True)
    success_probability: Mapped[str | None] = mapped_column(Text, nullable=True)
    nine_box_term_extension: Mapped[int | None] = mapped_column(Integer, nullable=True)
    entity_buyer_leverage_level: Mapped[str | None] = mapped_column(Text, nullable=True)
    entity_supplier_leverage_level: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_sme: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    sme_source: Mapped[str | None] = mapped_column(Text, nullable=True)
    dso: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_opportunity_payment_terms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_payment_terms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    target_cash_flow: Mapped[Any | None] = mapped_column(Numeric(20, 4), nullable=True)
    agreed_terms_without_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agreed_terms_with_cash_discounts: Mapped[int | None] = mapped_column(Integer, nullable=True)
    agreed_cash_discount_percentage: Mapped[Any | None] = mapped_column(Numeric(10, 6), nullable=True)
    negotiation_strategy: Mapped[Any | None] = mapped_column(JSONB, nullable=True)
    ada_updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    suppliers: Mapped[list[Supplier]] = relationship(
        "Supplier", back_populates="ultimate_parent"
    )
