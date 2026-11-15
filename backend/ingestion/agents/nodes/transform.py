"""
Transform node — converts raw API item dicts into typed domain entities.

Each `parse_*` function accepts the raw item dict (with context) from the
feed and returns the corresponding domain entity.
"""

from __future__ import annotations

from domain.entities import (
    Agreement,
    BuyingEntity,
    BuyingEntityUltimateParent,
    CustomDataPoint,
    Spend,
    SpendFileVersion,
    Supplier,
    SupplierUltimateParent,
    Target,
    Tenant,
)
from infrastructure.supplier_data.response_models import (
    AgreementModel,
    BuyingEntityFeedItem,
    BuyingEntityUltimateParentFeedItem,
    SfvFeedItem,
    SpendFeedItem,
    SupplierFeedItem,
    SupplierUltimateParentFeedItem,
    TargetModel,
    TenantFeedItem,
)


# ── Public dispatch ────────────────────────────────────────────────────────────

def parse_tenant(item: dict) -> Tenant:
    m = TenantFeedItem.model_validate(item).tenant
    return Tenant(
        uuid=m.uuid,
        tenant_id=m.tenantId,
        name=m.name,
        country=m.country,
        ada_updated_at=m.updatedAt,
    )


def parse_spend_file_version(item: dict) -> SpendFileVersion:
    fi = SfvFeedItem.model_validate(item)
    m = fi.spendFileVersion
    return SpendFileVersion(
        uuid=m.uuid,
        tenant_uuid=m.tenantUuid,
        name=m.name,
        start_date=m.startDate,
        end_date=m.endDate,
        spend_volume=m.spendVolume,
        supplier_count=m.supplierCount,
        spend_count=m.spendCount,
        ada_updated_at=m.updatedAt,
        tenant_id=fi.context.tenantId or "",
    )


def parse_spend(item: dict) -> Spend:
    fi = SpendFeedItem.model_validate(item)
    m = fi.spend
    return Spend(
        spend_uuid=m.spendUuid,
        spend_file_version_uuid=m.spendFileVersionUuid,
        supplier_uuid=m.supplierUuid,
        buying_entity_uuid=m.buyingEntityUuid,
        alias=m.alias,
        spend_volume=m.spendVolume,
        transaction_currency=m.transactionCurrency,
        procurement_team=m.procurementTeam,
        commodity=m.commodity,
        hs_code=m.hsCode,
        hs_description=m.hsDescription,
        currently_on_scf=m.currentlyOnScf,
        currently_on_vcard=m.currentlyOnVcard,
        program_applied=m.programApplied,
        base_rate=m.baseRate,
        scf_rate=m.scfRate,
        actual_payment_terms=m.actualPaymentTerms,
        term_description=m.termDescription,
        contractual_without_cash_discounts=m.contractualWithoutCashDiscounts,
        contractual_with_cash_discounts=m.contractualWithCashDiscounts,
        cash_discount_percentage=m.cashDiscountPercentage,
        last_term_negotiation=m.lastTermNegotiation,
        aggregated_lines_count=m.aggregatedLinesCount,
        negotiation_status=m.negotiationStatus,
        custom_data_points=[
            CustomDataPoint(name=p.name, value=p.value) for p in m.customDataPoints
        ],
        ada_updated_at=m.updatedAt,
        tenant_id=fi.context.tenantId or "",
        target=_target(fi.target),
        agreement=_agreement(fi.agreement),
        negotiation_strategy=(
            fi.negotiationStrategy.model_dump(exclude_none=True)
            if fi.negotiationStrategy else None
        ),
    )


def parse_supplier(item: dict) -> Supplier:
    fi = SupplierFeedItem.model_validate(item)
    m = fi.supplier
    return Supplier(
        uuid=m.uuid,
        ultimate_parent_uuid=m.ultimateParentUuid,
        name=m.name,
        received_name=m.receivedName,
        description=m.description,
        address=m.address,
        phone_number=m.phoneNumber,
        ownership=m.ownership,
        stock_ticker=m.stockTicker,
        entity_type=m.entityType,
        country=m.country,
        country_rating=m.countryRating,
        credit_rating=m.creditRating,
        credit_rating_source=m.creditRatingSource,
        main_industry_code=m.mainIndustryCode,
        main_industry_name=m.mainIndustryName,
        url=m.url,
        company_size=m.companySize,
        external_id=m.externalId,
        provided_internal_id=m.providedInternalId,
        cost_of_debt_spread=m.costOfDebtSpread,
        wacc_pre_tax=m.waccPreTax,
        wacc_after_tax=m.waccAfterTax,
        supplier_financing_rate=m.supplierFinancingRate,
        scf_rate=m.scfRate,
        ethnic_minority_owned_business=m.ethnicMinorityOwnedBusiness,
        woman_owned_business=m.womanOwnedBusiness,
        veteran_owned_business=m.veteranOwnedBusiness,
        spend_volume=m.spendVolume,
        negotiation_status=m.negotiationStatus,
        program_applied=m.programApplied,
        success_probability=m.successProbability,
        nine_box_term_extension=m.nineBoxTermExtension,
        entity_buyer_leverage_level=m.entityBuyerLeverageLevel,
        entity_supplier_leverage_level=m.entitySupplierLeverageLevel,
        is_sme=m.isSme,
        sme_source=m.smeSource,
        dso=m.dso,
        ada_updated_at=m.updatedAt,
        tenant_id=fi.context.tenantId or "",
        spend_file_version_uuid=fi.context.spendFileVersionUuid or None,
        target=_target(fi.target),
        agreement=_agreement(fi.agreement),
        negotiation_strategy=(
            fi.negotiationStrategy.model_dump(exclude_none=True)
            if fi.negotiationStrategy else None
        ),
    )


def parse_supplier_ultimate_parent(item: dict) -> SupplierUltimateParent:
    fi = SupplierUltimateParentFeedItem.model_validate(item)
    m = fi.supplierUltimateParent
    return SupplierUltimateParent(
        uuid=m.uuid,
        name=m.name,
        received_name=m.receivedName,
        description=m.description,
        address=m.address,
        phone_number=m.phoneNumber,
        ownership=m.ownership,
        stock_ticker=m.stockTicker,
        entity_type=m.entityType,
        country=m.country,
        country_rating=m.countryRating,
        credit_rating=m.creditRating,
        credit_rating_source=m.creditRatingSource,
        main_industry_code=m.mainIndustryCode,
        main_industry_name=m.mainIndustryName,
        url=m.url,
        company_size=m.companySize,
        external_id=m.externalId,
        provided_internal_id=m.providedInternalId,
        cost_of_debt_spread=m.costOfDebtSpread,
        wacc_pre_tax=m.waccPreTax,
        wacc_after_tax=m.waccAfterTax,
        supplier_financing_rate=m.supplierFinancingRate,
        scf_rate=m.scfRate,
        ethnic_minority_owned_business=m.ethnicMinorityOwnedBusiness,
        woman_owned_business=m.womanOwnedBusiness,
        veteran_owned_business=m.veteranOwnedBusiness,
        spend_volume=m.spendVolume,
        negotiation_status=m.negotiationStatus,
        program_applied=m.programApplied,
        success_probability=m.successProbability,
        nine_box_term_extension=m.nineBoxTermExtension,
        entity_buyer_leverage_level=m.entityBuyerLeverageLevel,
        entity_supplier_leverage_level=m.entitySupplierLeverageLevel,
        is_sme=m.isSme,
        sme_source=m.smeSource,
        dso=m.dso,
        ada_updated_at=m.updatedAt,
        tenant_id=fi.context.tenantId or "",
        spend_file_version_uuid=fi.context.spendFileVersionUuid or None,
        target=_target(fi.target),
        agreement=_agreement(fi.agreement),
        negotiation_strategy=(
            fi.negotiationStrategy.model_dump(exclude_none=True)
            if fi.negotiationStrategy else None
        ),
    )


def parse_buying_entity(item: dict) -> BuyingEntity:
    fi = BuyingEntityFeedItem.model_validate(item)
    m = fi.buyingEntity
    return BuyingEntity(
        uuid=m.uuid,
        name=m.name,
        country=m.country,
        ada_updated_at=m.updatedAt,
        ultimate_parent_uuid=m.ultimateParentUuid,
        tenant_id=fi.context.tenantId or "",
        spend_file_version_uuid=fi.context.spendFileVersionUuid or None,
    )


def parse_buying_entity_ultimate_parent(item: dict) -> BuyingEntityUltimateParent:
    fi = BuyingEntityUltimateParentFeedItem.model_validate(item)
    m = fi.buyingEntityUltimateParent
    return BuyingEntityUltimateParent(
        uuid=m.uuid,
        name=m.name,
        description=m.description,
        address=m.address,
        country=m.country,
        main_industry_code=m.mainIndustryCode,
        main_industry_name=m.mainIndustryName,
        url=m.url,
        company_size=m.companySize,
        external_id=m.externalId,
        ada_updated_at=m.updatedAt,
        tenant_id=fi.context.tenantId or "",
        spend_file_version_uuid=fi.context.spendFileVersionUuid or None,
    )


# ── Private helpers ────────────────────────────────────────────────────────────

def _target(m: TargetModel | None) -> Target | None:
    if m is None:
        return None
    return Target(
        opportunity_payment_terms=m.opportunityPaymentTerms,
        target_payment_terms=m.targetPaymentTerms,
        target_cash_flow=m.targetCashFlow,
    )


def _agreement(m: AgreementModel | None) -> Agreement | None:
    if m is None:
        return None
    return Agreement(
        agreed_terms_without_cash_discounts=m.agreedTermsWithoutCashDiscounts,
        agreed_terms_with_cash_discounts=m.agreedTermsWithCashDiscounts,
        agreed_cash_discount_percentage=m.agreedCashDiscountPercentage,
        scf_accepted=m.scfAccepted,
        vcard_accepted=m.vCardAccepted,
    )
