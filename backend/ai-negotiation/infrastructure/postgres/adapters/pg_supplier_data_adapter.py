from __future__ import annotations

import uuid as _uuid
from decimal import ROUND_CEILING, Decimal
from typing import Any
from sqlalchemy import func, or_, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from domain.ports.supplier_data_port import SupplierDataPort
from infrastructure.postgres.models.spend import Spend
from infrastructure.postgres.models.supplier import Supplier
from infrastructure.postgres.models.supplier_ultimate_parent import SupplierUltimateParent


class SupplierNotFoundError(Exception):
    def __init__(self, supplier_uuid: str) -> None:
        super().__init__(f"Supplier {supplier_uuid!r} not found")


def _f(val) -> float | None:
    return float(val) if val is not None else None


def _weighted_average_days(weighted_sum, total_volume) -> int | None:
    """A spend-weighted term average, ROUNDED UP to the next whole day.

    Always ceiling, never half-up: 74.1 and 74.9 both become 75, and an exact
    75.0 stays 75. Applies to both the contractual (current) and actual
    averages so the two figures round the same way and can be compared.

    ``None`` in the numerator (no line carried a term at all) stays ``None``
    rather than becoming a 0-day term.
    """
    if weighted_sum is None:
        return None
    average = Decimal(weighted_sum) / Decimal(total_volume)
    return int(average.quantize(Decimal("1"), rounding=ROUND_CEILING))


class PostgresSupplierDataAdapter(SupplierDataPort):
    """Reads supplier data directly from the suppliers table."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_supplier_context(
        self, supplier_uuid: str, tenant_id: str
    ) -> dict[str, Any]:
        row = await self._get_row(supplier_uuid, tenant_id)
        contractual_payment_terms, actual_payment_terms = await self._spend_aggregates(
            row.uuid, tenant_id
        )
        strategy: dict[str, Any] = dict(row.negotiation_strategy or {})
        for key, entry in list(strategy.items()):
            if isinstance(entry, dict) and "value" not in entry:
                strategy[key] = {"value": None, **entry}
        return {
            "supplier": {
                "uuid": str(row.uuid),
                "name": row.name,
                "description": row.description,
                "address": row.address,
                "phoneNumber": row.phone_number,
                "ownership": row.ownership,
                "stockTicker": row.stock_ticker,
                "entityType": row.entity_type,
                "country": row.country,
                "countryRating": row.country_rating,
                "creditRating": row.credit_rating,
                "creditRatingSource": row.credit_rating_source,
                "mainIndustryCode": row.main_industry_code,
                "mainIndustryName": row.main_industry_name,
                "url": row.url,
                "companySize": row.company_size,
                "externalId": row.external_id,
                "providedInternalId": row.provided_internal_id,
                "costOfDebtSpread": _f(row.cost_of_debt_spread),
                "waccPreTax": _f(row.wacc_pre_tax),
                "waccAfterTax": _f(row.wacc_after_tax),
                "supplierFinancingRate": _f(row.supplier_financing_rate),
                "scfRate": _f(row.scf_rate),
                "ethnicMinorityOwnedBusiness": row.ethnic_minority_owned_business,
                "womanOwnedBusiness": row.woman_owned_business,
                "veteranOwnedBusiness": row.veteran_owned_business,
                "spendVolume": _f(row.spend_volume),
                "negotiationStatus": row.negotiation_status,
                "programApplied": row.program_applied,
                "successProbability": row.success_probability,
                "nineBoxTermExtension": row.nine_box_term_extension,
                "entityBuyerLeverageLevel": row.entity_buyer_leverage_level,
                # entitySupplierLeverageLevel is NOT emitted (§3). Only
                # buyer-side leverage is considered — the supplier's rating is
                # never used for calculations, argument selection, strength
                # evaluation or user-facing text, so it does not enter the
                # payload at all. The column stays in the table, dormant.
                "isSme": row.is_sme,
                "smeSource": row.sme_source,
                "dso": row.dso,
                "updatedAt": row.ada_updated_at.isoformat() if row.ada_updated_at else None,
            },
            "target": {
                "opportunityPaymentTerms": row.target_opportunity_payment_terms,
                "targetPaymentTerms": row.target_payment_terms,
                "targetCashFlow": _f(row.target_cash_flow),
            },
            "agreement": {
                "agreedTermsWithoutCashDiscounts": row.agreed_terms_without_cash_discounts,
                "agreedTermsWithCashDiscounts": row.agreed_terms_with_cash_discounts,
                "agreedCashDiscountPercentage": _f(row.agreed_cash_discount_percentage),
            },
            "spend": {
                # CURRENT payment terms — the negotiation baseline. Spend-volume
                # weighted average of the supplier's per-line CONTRACTUAL terms
                # without cash discount, falling back per line to that line's
                # actual_payment_terms where the contractual figure is null (see
                # _spend_aggregates). This is the figure the platform's supplier
                # card shows as "Contractual". None if no spend rows.
                "contractualPaymentTermsWithoutCashDiscount": contractual_payment_terms,
                # ACTUAL payment terms — how many days we really take to pay.
                # Spend-volume-weighted average of per-line actual_payment_terms.
                # Behavioural signal only (DSO alignment, payment reliability);
                # never the negotiation baseline. None if no spend rows.
                "actualPaymentTerms": actual_payment_terms,
            },
            "negotiationStrategy": strategy,
        }

    async def _spend_aggregates(
        self, supplier_uuid: _uuid.UUID, tenant_id: str
    ) -> tuple[int | None, int | None]:
        """Session-start aggregates over the supplier's spend lines.

        Returns ``(contractual_payment_terms, actual_payment_terms)``:

        - the CURRENT payment term — the spend-volume-weighted average of the
          per-line CONTRACTUAL terms without cash discount, ROUNDED UP to the
          next whole day:

              contractualPaymentTermsWithoutCashDiscount
                  = Σ(COALESCE(contractual_without_cash_discounts_i,
                               actual_payment_terms_i) × spend_volume_i)
                    ÷ Σ(spend_volume_i)

          The fallback is applied PER LINE, not per supplier: a line with no
          contractual figure contributes its actual figure, and keeps its own
          spend volume in the denominator either way. This is the baseline
          every benchmark, target and no-improvement check is measured
          against, and it is what the platform's supplier card shows;

        - the ACTUAL payment term — the same weighted average over per-line
          ``actual_payment_terms``, also rounded up. Behavioural signal only
          (DSO alignment, payment reliability); never the baseline;

          (both are None when the supplier has no spend rows or the total
          spend volume is zero — the average is undefined).

        Rounding is CEILING on both averages, never half-up: a fractional
        weighted average is rounded up to the next whole day (74.1 → 75,
        74.9 → 75, 75.0 → 75). Rounding the current term up is the
        conservative direction for the buyer — it can only narrow the gap to
        the target, never inflate the improvement opportunity.
        """
        result = await self._session.execute(
            select(
                func.sum(
                    func.coalesce(
                        Spend.contractual_without_cash_discounts,
                        Spend.actual_payment_terms,
                    )
                    * Spend.spend_volume
                ),
                func.sum(Spend.actual_payment_terms * Spend.spend_volume),
                func.sum(Spend.spend_volume),
            ).where(
                Spend.supplier_uuid == supplier_uuid,
                Spend.tenant_id == tenant_id,
            )
        )
        (
            contractual_weighted_sum,
            actual_weighted_sum,
            total_volume,
        ) = result.one()
        if not total_volume:
            return None, None
        return (
            _weighted_average_days(contractual_weighted_sum, total_volume),
            _weighted_average_days(actual_weighted_sum, total_volume),
        )

    async def _get_row(self, supplier_uuid: str, tenant_id: str) -> Supplier:
        result = await self._session.execute(
            select(Supplier).where(
                Supplier.uuid == _uuid.UUID(supplier_uuid),
                Supplier.tenant_id == tenant_id,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise SupplierNotFoundError(supplier_uuid)
        return row

    async def get_supplier(self, supplier_id: str) -> dict[str, Any] | None:
        raise NotImplementedError

    async def list_suppliers(
        self,
        tenant_id: str,
        limit: int = 200,
        offset: int = 0,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        filters = [Supplier.tenant_id == tenant_id]
        cleaned_search = search.strip() if search else ""
        if cleaned_search:
            pattern = f"%{cleaned_search}%"
            filters.append(
                or_(
                    Supplier.name.ilike(pattern),
                    Supplier.received_name.ilike(pattern),
                    Supplier.country.ilike(pattern),
                    Supplier.external_id.ilike(pattern),
                    Supplier.provided_internal_id.ilike(pattern),
                    SupplierUltimateParent.name.ilike(pattern),
                )
            )

        result = await self._session.execute(
            select(Supplier, SupplierUltimateParent.name)
            .outerjoin(
                SupplierUltimateParent,
                Supplier.ultimate_parent_uuid == SupplierUltimateParent.uuid,
            )
            .where(*filters)
            .order_by(desc(Supplier.spend_volume).nullslast(), Supplier.name.asc())
            .limit(limit)
            .offset(offset)
        )
        rows = result.all()
        return [
            {
                "supplier_id": str(supplier.uuid),
                "name": supplier.name,
                "received_name": supplier.received_name,
                "country": supplier.country,
                "parent_name": parent_name,
                "spend_volume": _f(supplier.spend_volume),
                "is_sme": supplier.is_sme,
            }
            for supplier, parent_name in rows
        ]

    async def health_check(self) -> bool:
        try:
            await self._session.execute(select(Supplier).limit(1))
            return True
        except Exception:
            return False
