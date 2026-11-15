from __future__ import annotations

from typing import Any

from domain.entities.facts import (
    StrategyBenchmark,
    SupplierFacts,
    harmonise_term_days,
    rescale_cash_flow_for_term,
)

# Internal-only figures specific enough to literal-redact safely (the guard
# requires >= 2 digits — see asymmetry_guard._is_specific). Categorical levels
# such as success_probability/leverage ("low"/"high"...) are deliberately
# excluded: redacting a bare common word would clobber unrelated text. They're
# still marked "[internal]" in the guide prompt — just not literal-redactable.
_INTERNAL_ONLY_FIELDS = frozenset({
    "batna_term_days",
    "wacc_pre_tax",
    "wacc_after_tax",
    "scf_rate",
    "supplier_financing_rate",
    "spend_volume",
    "target_cash_flow",
    "cost_of_debt_spread",
    # supplierStandard (the supplier's own segment) is INTERNAL ONLY in
    # supplier-facing text per the SUPPLIER_FACING_DISCLOSURE_POLICY — its value,
    # average, and Q3 must never reach the supplier. Deterministic backstop to the
    # prompt policy + the argument-formatter exclusion. (Occurrence COUNT is left
    # out: it's a small number that would collide with unrelated figures; the
    # formatters drop it and the policy forbids it instead.)
    "supplier_segment_term_days",
    "supplier_segment_avg_term_days",
    "supplier_segment_q3_term_days",
})

# Every `negotiationStrategy.<name>` field, keyed to a human-readable label —
# used to build `SupplierFacts.strategy_benchmarks`. Order here is preserved
# in the resulting list, roughly strongest/most-common-first.
_STRATEGY_BENCHMARK_LABELS = {
    "peerGroupStandard": "comparable peer group",
    "industryRegionStandard": "industry/region standard",
    "supplierStandard": "this supplier's own segment",
    "buyerStandard": "buyer (internal AP) standard",
    "parentOrSupplierMax": "parent/supplier maximum term",
    "payOnTerms": "pay-on-terms baseline",
    "regulatoryTerm": "regulatory limit",
    "scfPeerStandard": "SCF peer standard",
    "scfCostPositive": "SCF cost-positive threshold",
    "vCard": "vCard programme term",
    "cashDiscountConversion": "cash-discount conversion term",
}

_SOURCE_PATHS = {
    "supplier_name": "supplier.name",
    "country": "supplier.country",
    "industry": "supplier.mainIndustryName",
    "company_size": "supplier.companySize",
    "description": "supplier.description",
    "address": "supplier.address",
    "website": "supplier.url",
    "ownership": "supplier.ownership",
    "stock_ticker": "supplier.stockTicker",
    "entity_type": "supplier.entityType",
    "is_sme": "supplier.isSme",
    "protected_flags": "supplier.womanOwnedBusiness | supplier.veteranOwnedBusiness | supplier.ethnicMinorityOwnedBusiness",
    "target_term_days": "target.targetPaymentTerms | target.opportunityPaymentTerms",
    "current_term_days": (
        "spend.contractualPaymentTermsWithoutCashDiscount "
        "| agreement.agreedTermsWithoutCashDiscounts"
    ),
    "batna_term_days": "negotiationStrategy.parentOrSupplierMax.value",
    "benchmark_term_days": "negotiationStrategy.industryRegionStandard.value",
    "regulatory_max_term_days": "negotiationStrategy.regulatoryTerm.group.value",
    "wacc_pre_tax": "supplier.waccPreTax",
    "wacc_after_tax": "supplier.waccAfterTax",
    "scf_rate": "supplier.scfRate",
    "supplier_financing_rate": "supplier.supplierFinancingRate",
    "spend_volume": "supplier.spendVolume",
    "target_cash_flow": "target.targetCashFlow",
    "nine_box_term_extension": "supplier.nineBoxTermExtension",
    "buyer_leverage_level": "supplier.entityBuyerLeverageLevel",
    "success_probability": "supplier.successProbability",
    "credit_rating": "supplier.creditRating",
    "country_rating": "supplier.countryRating",
    "pay_on_terms_term_days": "negotiationStrategy.payOnTerms.value",
    "buyer_standard_term_days": "negotiationStrategy.buyerStandard.value",
    "buyer_standard_description": "negotiationStrategy.buyerStandard.group.description",
    "buyer_standard_limit_type": "negotiationStrategy.buyerStandard.group.limitType",
    "regulatory_limit_type": "negotiationStrategy.regulatoryTerm.group.limitType",
    "regulatory_applied": (
        "negotiationStrategy.regulatoryTerm.applied "
        "| negotiationStrategy.regulatoryTerm.group.applied"
    ),
    "supplier_segment_term_days": "negotiationStrategy.supplierStandard.value",
    "supplier_segment_avg_term_days": "negotiationStrategy.supplierStandard.avg",
    "supplier_segment_q3_term_days": "negotiationStrategy.supplierStandard.q3",
    "supplier_segment_occurrences": "negotiationStrategy.supplierStandard.occurrences",
    "peer_group_term_days": "negotiationStrategy.peerGroupStandard.value",
    "peer_group_avg_term_days": "negotiationStrategy.peerGroupStandard.avg",
    "peer_group_q3_term_days": "negotiationStrategy.peerGroupStandard.q3",
    "peer_group_occurrences": "negotiationStrategy.peerGroupStandard.occurrences",
    "dso": "supplier.dso",
    "actual_payment_terms_days": "spend.actualPaymentTerms",
    "opportunity_term_days": "target.opportunityPaymentTerms",
    "agreed_terms_with_cash_discounts": "agreement.agreedTermsWithCashDiscounts",
    "agreed_cash_discount_percentage": "agreement.agreedCashDiscountPercentage",
    "cost_of_debt_spread": "supplier.costOfDebtSpread",
}


def _extract_strategy_benchmarks(strategy: dict[str, Any]) -> list[StrategyBenchmark]:
    """Turn every non-null `negotiationStrategy.<name>` entry into a
    :class:`StrategyBenchmark`, preserving its `applied` flag verbatim.

    Entries with a null `value` (e.g. an unenforced `regulatoryTerm`) are
    skipped — there's no benchmark figure to compare against.
    """
    benchmarks: list[StrategyBenchmark] = []
    for name, label in _STRATEGY_BENCHMARK_LABELS.items():
        entry = strategy.get(name)
        if not isinstance(entry, dict) or entry.get("value") is None:
            continue
        group = entry.get("group") if isinstance(entry.get("group"), dict) else {}
        benchmarks.append(StrategyBenchmark(
            name=name,
            label=label,
            value=entry.get("value"),
            applied=bool(entry.get("applied", False)),
            occurrences=entry.get("occurrences"),
            avg=entry.get("avg"),
            q3=entry.get("q3"),
            description=group.get("description"),
            limit_type=group.get("limitType") or entry.get("limitType"),
        ))
    return benchmarks


def extract_supplier_facts(payload: dict[str, Any]) -> SupplierFacts:
    """Pull the Tier-1 "given" facts out of a raw supplier payload, verbatim.

    No interpretation happens here — every value is read straight from its
    source field. This is the single place that knows the payload's shape;
    everything downstream (analysis, prompts, guards) reads typed facts
    instead of re-parsing ``raw``.
    """
    supplier = payload.get("supplier", {})
    target = payload.get("target", {})
    strategy = payload.get("negotiationStrategy", {})
    agreement = payload.get("agreement", {})
    spend = payload.get("spend", {})
    # The regulatory entry carries its figures under `group` (value, enforced,
    # limitType) and its decision flag, `applied`, on the entry itself — the
    # same place every other `negotiationStrategy.<name>` entry carries one.
    # Some payloads flatten the whole thing, so the flag is read from the entry
    # first and the group second, and the figures the other way round.
    regulatory_entry = strategy.get("regulatoryTerm") or {}
    regulatory = regulatory_entry.get("group") or {}

    def _regulatory_field(name: str, default=None):
        """The group's value for ``name``, falling back to the entry's own."""
        for source in (regulatory, regulatory_entry):
            value = source.get(name)
            if value is not None:
                return value
        return default

    regulatory_value = _regulatory_field("value")
    regulatory_applied = bool(_regulatory_field("applied", False))
    buyer_standard = strategy.get("buyerStandard", {})
    supplier_segment = strategy.get("supplierStandard", {})
    peer_group = strategy.get("peerGroupStandard", {})

    # Target rule: the negotiator's OWN target (targetPaymentTerms) wins when
    # set; a null target means the user hasn't chosen one, so we fall back to
    # Calculum's modeled opportunity term as the recommended opening.
    # `target_is_user_set` records which of the two we used.
    raw_target = (
        target.get("targetPaymentTerms")
        if target.get("targetPaymentTerms") is not None
        else target.get("opportunityPaymentTerms")
    )
    raw_opportunity = target.get("opportunityPaymentTerms")

    # Baseline rule: the CURRENT term is CONTRACTUAL, not actual. Prefer the
    # spend-weighted contractual average (spend.contractualPaymentTermsWithout-
    # CashDiscount, computed per line with a per-line fallback to that line's
    # actual figure — see the supplier-data adapter), then the supplier-level
    # agreedTermsWithoutCashDiscounts, then payOnTerms from strategy.
    #
    # actualPaymentTerms is deliberately NOT in this chain. It is what we
    # historically PAID, net of late/early payment behaviour; quoting it as the
    # current term is what produced the 27-vs-28 / 36-vs-34 / 77-vs-91
    # mismatches against the platform's supplier card. It survives as
    # `actual_payment_terms_days` for the behavioural assessments (DSO
    # alignment, payment reliability) and nothing else.
    #
    # Never invent a baseline — leave None if all three are absent.
    current_term = (
        spend.get("contractualPaymentTermsWithoutCashDiscount")
        if spend.get("contractualPaymentTermsWithoutCashDiscount") is not None
        else agreement.get("agreedTermsWithoutCashDiscounts")
        if agreement.get("agreedTermsWithoutCashDiscounts") is not None
        else strategy.get("payOnTerms", {}).get("value")
    )

    # ── Harmonisation: the ask is always a whole multiple of 15 days ────────
    # Done HERE, at the payload boundary, so every consumer of the facts — the
    # argument buckets, the BATNA band, the opening anchor, every prompt —
    # sees the harmonised figure and none of them rounds its own.
    #
    # An APPLIED regulatory maximum binds here too: the ask is pulled down to
    # the cap and then harmonised to the ladder beneath it (90 under a 60-day
    # cap is 60; 90 under a 50-day cap is 45). `applied` is the upstream
    # system's own verdict on whether the limit type (NONE / ONLY_EXCEPTIONS /
    # ALL) makes this regulation binding — never re-derived here. See
    # `harmonise_term_days` and `regulatory_cap_days`.
    cap = regulatory_value if regulatory_applied else None
    target_term = harmonise_term_days(raw_target, cap=cap)
    opportunity_term = harmonise_term_days(raw_opportunity, cap=cap)

    # The unlock upstream computed is keyed to the UNHARMONISED target, so a
    # rounded-up ask would otherwise be quoted alongside the cash flow of the
    # shorter one. Scaled on the extension, exactly as the negotiator's own
    # target override does (`negotiation_overrides._rescale_target_cash_flow`).
    target_cash_flow = rescale_cash_flow_for_term(
        target.get("targetCashFlow"),
        base_term=raw_target,
        new_term=target_term,
        current_term=current_term,
    )

    return SupplierFacts(
        supplier_name=supplier.get("name"),
        country=supplier.get("country"),
        industry=supplier.get("mainIndustryName"),
        company_size=supplier.get("companySize"),
        description=supplier.get("description"),
        address=supplier.get("address"),
        website=supplier.get("url"),
        ownership=supplier.get("ownership"),
        stock_ticker=supplier.get("stockTicker"),
        entity_type=supplier.get("entityType"),

        target_term_days=target_term,
        target_is_user_set=target.get("targetPaymentTerms") is not None,
        current_term_days=current_term,
        batna_term_days=strategy.get("parentOrSupplierMax", {}).get("value"),
        benchmark_term_days=strategy.get("industryRegionStandard", {}).get("value"),
        regulatory_max_term_days=regulatory_value,
        regulatory_enforced=bool(_regulatory_field("enforced", False)),
        regulatory_applied=regulatory_applied,

        wacc_pre_tax=supplier.get("waccPreTax"),
        wacc_after_tax=supplier.get("waccAfterTax"),
        scf_rate=supplier.get("scfRate"),
        supplier_financing_rate=supplier.get("supplierFinancingRate"),

        spend_volume=supplier.get("spendVolume"),
        target_cash_flow=target_cash_flow,
        nine_box_term_extension=supplier.get("nineBoxTermExtension"),

        buyer_leverage_level=supplier.get("entityBuyerLeverageLevel"),
        success_probability=supplier.get("successProbability"),
        credit_rating=supplier.get("creditRating"),
        country_rating=supplier.get("countryRating"),
        is_sme=bool(supplier.get("isSme", False)),
        protected_flags={
            "woman_owned": supplier.get("womanOwnedBusiness"),
            "veteran_owned": supplier.get("veteranOwnedBusiness"),
            "ethnic_minority_owned": supplier.get("ethnicMinorityOwnedBusiness"),
        },

        # Verbatim, with NO fallback chain — unlike `current_term_days`. This is
        # the actual-payment side of the payment-reliability variance, so a
        # missing figure must stay missing rather than silently borrow the
        # contractual one (see `assess_payment_reliability`).
        actual_payment_terms_days=spend.get("actualPaymentTerms"),
        pay_on_terms_term_days=strategy.get("payOnTerms", {}).get("value"),
        buyer_standard_term_days=buyer_standard.get("value"),
        buyer_standard_description=buyer_standard.get("group", {}).get("description"),
        buyer_standard_limit_type=buyer_standard.get("group", {}).get("limitType"),
        regulatory_limit_type=_regulatory_field("limitType"),
        supplier_segment_term_days=supplier_segment.get("value"),
        supplier_segment_avg_term_days=supplier_segment.get("avg"),
        supplier_segment_q3_term_days=supplier_segment.get("q3"),
        supplier_segment_occurrences=supplier_segment.get("occurrences"),
        peer_group_term_days=peer_group.get("value"),
        peer_group_avg_term_days=peer_group.get("avg"),
        peer_group_q3_term_days=peer_group.get("q3"),
        peer_group_occurrences=peer_group.get("occurrences"),

        dso=supplier.get("dso"),
        opportunity_term_days=opportunity_term,
        agreed_terms_with_cash_discounts=agreement.get("agreedTermsWithCashDiscounts"),
        agreed_cash_discount_percentage=agreement.get("agreedCashDiscountPercentage"),
        cost_of_debt_spread=supplier.get("costOfDebtSpread"),
        strategy_benchmarks=_extract_strategy_benchmarks(strategy),
        updated_at=supplier.get("updatedAt"),

        source_paths=dict(_SOURCE_PATHS),
        internal_only_fields=_INTERNAL_ONLY_FIELDS,
    )
