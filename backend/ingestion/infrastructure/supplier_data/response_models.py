"""
Pydantic models that map 1:1 to the Calculum API JSON contract.
These live in infrastructure only — domain entities are parsed from these.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ── Shared embedded blocks ────────────────────────────────────────────────────

class TargetModel(BaseModel):
    opportunityPaymentTerms: Optional[int] = None
    targetPaymentTerms: Optional[int] = None
    targetCashFlow: Optional[float] = None


class AgreementModel(BaseModel):
    agreedTermsWithoutCashDiscounts: Optional[int] = None
    agreedTermsWithCashDiscounts: Optional[int] = None
    agreedCashDiscountPercentage: Optional[float] = None
    scfAccepted: Optional[bool] = None
    vCardAccepted: Optional[bool] = None


class StrategyEntryModel(BaseModel):
    value: Optional[int] = None
    applied: Optional[bool] = None
    occurrences: Optional[int] = None
    avg: Optional[float] = None
    q3: Optional[float] = None
    group: Optional[dict] = None


class NegotiationStrategyModel(BaseModel):
    payOnTerms: Optional[StrategyEntryModel] = None
    parentOrSupplierMax: Optional[StrategyEntryModel] = None
    industryRegionStandard: Optional[StrategyEntryModel] = None
    buyerStandard: Optional[StrategyEntryModel] = None
    supplierStandard: Optional[StrategyEntryModel] = None
    peerGroupStandard: Optional[StrategyEntryModel] = None
    regulatoryTerm: Optional[StrategyEntryModel] = None
    scfPeerStandard: Optional[StrategyEntryModel] = None
    harmonization: Optional[StrategyEntryModel] = None
    scfCostPositive: Optional[StrategyEntryModel] = None
    vCard: Optional[StrategyEntryModel] = None
    cashDiscountConversion: Optional[StrategyEntryModel] = None


class CustomDataPointModel(BaseModel):
    name: Optional[str] = None
    value: Optional[str] = None


# ── Feed context block ────────────────────────────────────────────────────────

class ContextModel(BaseModel):
    tenantId: Optional[str] = None
    spendFileVersionUuid: Optional[str] = None


# ── Top-level entity payloads ─────────────────────────────────────────────────

class TenantModel(BaseModel):
    uuid: str
    tenantId: Optional[str] = None
    name: Optional[str] = None
    country: Optional[str] = None
    updatedAt: Optional[str] = None


class SpendFileVersionModel(BaseModel):
    uuid: str
    tenantUuid: Optional[str] = None
    name: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    spendVolume: Optional[float] = None
    supplierCount: Optional[int] = None
    spendCount: Optional[int] = None
    updatedAt: Optional[str] = None


class SpendModel(BaseModel):
    spendUuid: str
    spendFileVersionUuid: Optional[str] = None
    supplierUuid: Optional[str] = None
    buyingEntityUuid: Optional[str] = None
    alias: Optional[str] = None
    spendVolume: Optional[float] = None
    transactionCurrency: Optional[str] = None
    procurementTeam: Optional[str] = None
    commodity: Optional[str] = None
    hsCode: Optional[str] = None
    hsDescription: Optional[str] = None
    currentlyOnScf: Optional[bool] = None
    currentlyOnVcard: Optional[bool] = None
    programApplied: Optional[str] = None
    baseRate: Optional[float] = None
    scfRate: Optional[float] = None
    actualPaymentTerms: Optional[int] = None
    termDescription: Optional[str] = None
    contractualWithoutCashDiscounts: Optional[int] = None
    contractualWithCashDiscounts: Optional[int] = None
    cashDiscountPercentage: Optional[float] = None
    lastTermNegotiation: Optional[str] = None
    aggregatedLinesCount: Optional[int] = None
    negotiationStatus: Optional[str] = None
    customDataPoints: Optional[list[CustomDataPointModel]] = Field(
        default_factory=list
    )
    updatedAt: Optional[str] = None


class SupplierModel(BaseModel):
    uuid: str
    ultimateParentUuid: Optional[str] = None
    name: Optional[str] = None
    receivedName: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    phoneNumber: Optional[str] = None
    ownership: Optional[str] = None
    stockTicker: Optional[str] = None
    entityType: Optional[str] = None
    country: Optional[str] = None
    countryRating: Optional[str] = None
    creditRating: Optional[str] = None
    creditRatingSource: Optional[str] = None
    mainIndustryCode: Optional[str] = None
    mainIndustryName: Optional[str] = None
    url: Optional[str] = None
    companySize: Optional[str] = None
    externalId: Optional[str] = None
    providedInternalId: Optional[str] = None
    costOfDebtSpread: Optional[float] = None
    waccPreTax: Optional[float] = None
    waccAfterTax: Optional[float] = None
    supplierFinancingRate: Optional[float] = None
    scfRate: Optional[float] = None
    ethnicMinorityOwnedBusiness: Optional[bool] = None
    womanOwnedBusiness: Optional[bool] = None
    veteranOwnedBusiness: Optional[bool] = None
    spendVolume: Optional[float] = None
    negotiationStatus: Optional[str] = None
    programApplied: Optional[str] = None
    successProbability: Optional[str] = None
    nineBoxTermExtension: Optional[int] = None
    entityBuyerLeverageLevel: Optional[str] = None
    entitySupplierLeverageLevel: Optional[str] = None
    isSme: Optional[bool] = None
    smeSource: Optional[str] = None
    dso: Optional[int] = None
    updatedAt: Optional[str] = None


class SupplierUltimateParentModel(SupplierModel):
    """Identical to Supplier minus ultimateParentUuid."""
    ultimateParentUuid: Optional[str] = None  # always absent; kept for compat


class BuyingEntityModel(BaseModel):
    uuid: str
    ultimateParentUuid: Optional[str] = None
    name: Optional[str] = None
    country: Optional[str] = None
    updatedAt: Optional[str] = None


class BuyingEntityUltimateParentModel(BaseModel):
    uuid: str
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    country: Optional[str] = None
    mainIndustryCode: Optional[str] = None
    mainIndustryName: Optional[str] = None
    url: Optional[str] = None
    companySize: Optional[str] = None
    externalId: Optional[str] = None
    updatedAt: Optional[str] = None


# ── Feed item wrappers ────────────────────────────────────────────────────────

class TenantFeedItem(BaseModel):
    tenant: TenantModel


class SfvFeedItem(BaseModel):
    context: ContextModel
    spendFileVersion: SpendFileVersionModel


class SpendFeedItem(BaseModel):
    context: ContextModel
    spend: SpendModel
    target: Optional[TargetModel] = None
    agreement: Optional[AgreementModel] = None
    negotiationStrategy: Optional[NegotiationStrategyModel] = None


class SupplierFeedItem(BaseModel):
    context: ContextModel
    supplier: SupplierModel
    target: Optional[TargetModel] = None
    agreement: Optional[AgreementModel] = None
    negotiationStrategy: Optional[NegotiationStrategyModel] = None


class SupplierUltimateParentFeedItem(BaseModel):
    context: ContextModel
    supplierUltimateParent: SupplierUltimateParentModel
    target: Optional[TargetModel] = None
    agreement: Optional[AgreementModel] = None
    negotiationStrategy: Optional[NegotiationStrategyModel] = None


class BuyingEntityFeedItem(BaseModel):
    context: ContextModel
    buyingEntity: BuyingEntityModel


class BuyingEntityUltimateParentFeedItem(BaseModel):
    context: ContextModel
    buyingEntityUltimateParent: BuyingEntityUltimateParentModel


# ── Pagination envelope ───────────────────────────────────────────────────────

class PaginationModel(BaseModel):
    nextCursor: Optional[str] = None
    pageSize: Optional[int] = None


class FeedResponse(BaseModel):
    pagination: Optional[PaginationModel] = None
    data: Optional[list[dict]] = None
