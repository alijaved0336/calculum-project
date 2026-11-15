"""
Domain entities that mirror the Calculum API contract (api-design.md).
These are plain dataclasses — no ORM or HTTP concerns.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


# ── Supporting value objects ───────────────────────────────────────────────────

@dataclass(frozen=True)
class CustomDataPoint:
    name: Optional[str]
    value: Optional[str]


@dataclass(frozen=True)
class Target:
    opportunity_payment_terms: Optional[int]
    target_payment_terms: Optional[int]
    target_cash_flow: Optional[float]


@dataclass(frozen=True)
class Agreement:
    agreed_terms_without_cash_discounts: Optional[int]
    agreed_terms_with_cash_discounts: Optional[int]
    agreed_cash_discount_percentage: Optional[float]
    # spend-level only (not present in WAVG aggregates)
    scf_accepted: Optional[bool] = None
    vcard_accepted: Optional[bool] = None


# ── Top-level entities ─────────────────────────────────────────────────────────

@dataclass
class Tenant:
    uuid: str
    tenant_id: Optional[str]
    name: Optional[str]
    country: Optional[str]
    ada_updated_at: Optional[str]


@dataclass
class SpendFileVersion:
    uuid: str
    tenant_uuid: Optional[str]
    name: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    spend_volume: Optional[float]
    supplier_count: Optional[int]
    spend_count: Optional[int]
    ada_updated_at: Optional[str]
    # context
    tenant_id: Optional[str] = None


@dataclass
class Spend:
    spend_uuid: str
    spend_file_version_uuid: Optional[str]
    supplier_uuid: Optional[str]
    buying_entity_uuid: Optional[str]
    alias: Optional[str]
    spend_volume: Optional[float]
    transaction_currency: Optional[str]
    procurement_team: Optional[str]
    commodity: Optional[str]
    hs_code: Optional[str]
    hs_description: Optional[str]
    currently_on_scf: Optional[bool]
    currently_on_vcard: Optional[bool]
    program_applied: Optional[str]
    base_rate: Optional[float]
    scf_rate: Optional[float]
    actual_payment_terms: Optional[int]
    term_description: Optional[str]
    contractual_without_cash_discounts: Optional[int]
    contractual_with_cash_discounts: Optional[int]
    cash_discount_percentage: Optional[float]
    last_term_negotiation: Optional[str]
    aggregated_lines_count: Optional[int]
    negotiation_status: Optional[str]
    custom_data_points: list[CustomDataPoint] = field(default_factory=list)
    ada_updated_at: Optional[str] = None
    # context
    tenant_id: Optional[str] = None
    # siblings
    target: Optional[Target] = None
    agreement: Optional[Agreement] = None
    negotiation_strategy: Optional[dict] = None


@dataclass
class Supplier:
    uuid: str
    name: Optional[str]
    received_name: Optional[str]
    ownership: Optional[str]
    entity_type: Optional[str]
    country: Optional[str]
    country_rating: Optional[str]
    main_industry_code: Optional[str]
    main_industry_name: Optional[str]
    company_size: Optional[str]
    external_id: Optional[str]
    provided_internal_id: Optional[str]
    cost_of_debt_spread: Optional[float]
    wacc_pre_tax: Optional[float]
    wacc_after_tax: Optional[float]
    supplier_financing_rate: Optional[float]
    ethnic_minority_owned_business: Optional[bool]
    woman_owned_business: Optional[bool]
    veteran_owned_business: Optional[bool]
    spend_volume: Optional[float]
    negotiation_status: Optional[str]
    success_probability: Optional[str]
    nine_box_term_extension: Optional[int]
    entity_buyer_leverage_level: Optional[str]
    entity_supplier_leverage_level: Optional[str]
    is_sme: Optional[bool]
    dso: Optional[int]
    ada_updated_at: Optional[str]
    ultimate_parent_uuid: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    stock_ticker: Optional[str] = None
    url: Optional[str] = None
    credit_rating: Optional[str] = None
    credit_rating_source: Optional[str] = None
    scf_rate: Optional[float] = None
    program_applied: Optional[str] = None
    sme_source: Optional[str] = None
    # context
    tenant_id: Optional[str] = None
    spend_file_version_uuid: Optional[str] = None
    # siblings
    target: Optional[Target] = None
    agreement: Optional[Agreement] = None
    negotiation_strategy: Optional[dict] = None


@dataclass
class SupplierUltimateParent:
    """Same shape as Supplier minus ultimate_parent_uuid."""
    uuid: str
    name: Optional[str]
    received_name: Optional[str]
    ownership: Optional[str]
    entity_type: Optional[str]
    country: Optional[str]
    country_rating: Optional[str]
    main_industry_code: Optional[str]
    main_industry_name: Optional[str]
    company_size: Optional[str]
    external_id: Optional[str]
    provided_internal_id: Optional[str]
    cost_of_debt_spread: Optional[float]
    wacc_pre_tax: Optional[float]
    wacc_after_tax: Optional[float]
    supplier_financing_rate: Optional[float]
    ethnic_minority_owned_business: Optional[bool]
    woman_owned_business: Optional[bool]
    veteran_owned_business: Optional[bool]
    spend_volume: Optional[float]
    negotiation_status: Optional[str]
    success_probability: Optional[str]
    nine_box_term_extension: Optional[int]
    entity_buyer_leverage_level: Optional[str]
    entity_supplier_leverage_level: Optional[str]
    is_sme: Optional[bool]
    dso: Optional[int]
    ada_updated_at: Optional[str]
    description: Optional[str] = None
    address: Optional[str] = None
    phone_number: Optional[str] = None
    stock_ticker: Optional[str] = None
    url: Optional[str] = None
    credit_rating: Optional[str] = None
    credit_rating_source: Optional[str] = None
    scf_rate: Optional[float] = None
    program_applied: Optional[str] = None
    sme_source: Optional[str] = None
    # context
    tenant_id: Optional[str] = None
    spend_file_version_uuid: Optional[str] = None
    # siblings
    target: Optional[Target] = None
    agreement: Optional[Agreement] = None
    negotiation_strategy: Optional[dict] = None


@dataclass
class BuyingEntity:
    uuid: str
    name: Optional[str]
    country: Optional[str]
    ada_updated_at: Optional[str]
    ultimate_parent_uuid: Optional[str] = None
    # context
    tenant_id: Optional[str] = None
    spend_file_version_uuid: Optional[str] = None


@dataclass
class BuyingEntityUltimateParent:
    uuid: str
    name: Optional[str]
    ada_updated_at: Optional[str]
    address: Optional[str] = None
    country: Optional[str] = None
    main_industry_code: Optional[str] = None
    main_industry_name: Optional[str] = None
    company_size: Optional[str] = None
    external_id: Optional[str] = None
    description: Optional[str] = None
    url: Optional[str] = None
    # context
    tenant_id: Optional[str] = None
    spend_file_version_uuid: Optional[str] = None
