from __future__ import annotations

from dataclasses import dataclass, field

from domain.entities.economic_profit import EconomicProfitAnalysis


@dataclass(frozen=True)
class CounterOfferExtraction:
    """Structured extraction from the negotiator's description of the supplier's counter-offer.

    Produced by the extraction LLM call in the evaluate_counter_offer node.
    ``counter_type`` drives which deterministic calculations run next.
    """

    counter_type: str
    # "days_only" | "days_with_price_premium" | "days_with_cash_discount"
    # | "days_with_ramp" | "conditional_non_financial" | "unclear"

    counter_term_days: float | None = None
    # Days the supplier proposed. None when accepts_proposed_days=True (supplier agreed to our ask).

    accepts_proposed_days: bool = False
    # True when the supplier explicitly agreed to our proposed term but attached a condition.

    price_premium_pct: float | None = None
    # Price increase as a decimal (e.g. 0.01 = 1%). Present for "days_with_price_premium".

    cash_discount_pct: float | None = None
    # Early-payment discount as a decimal (e.g. 0.01 = 1%). Present for "days_with_cash_discount".

    early_payment_days: float | None = None
    # N in "pay within N days to receive the cash discount". Present alongside cash_discount_pct.

    ramp_months: float | None = None
    # Months to phase in the term change. Present for "days_with_ramp".

    non_financial_condition: str | None = None
    # Description of a non-financial condition (volume commitment, exclusivity, …).

    reasoning: str | None = None
    assumptions: str | None = None


@dataclass(frozen=True)
class CounterOfferAnalysis:
    """Deterministic analysis of a supplier counter-offer.

    Produced by :func:`domain.services.counter_offer_calculator.analyze_counter_offer`.
    The drafting LLM receives this as a fait accompli — it phrases results in prose
    but never recomputes any figure.
    """

    # Effective term of the counter-offer
    # (counter_term_days, or target_term_days when the supplier accepted our ask)
    effective_counter_term_days: float | None

    # Zone based on where the effective term sits vs. our known thresholds
    zone: str | None  # "accept" | "counter" | "borderline" | "reject" | None
    zone_rationale: str | None

    # Gap vs. our target (negative = counter is below our ask)
    gap_vs_target_days: float | None       # counter_term - target_term
    cash_gap_vs_target: float | None       # $ cost of conceding from target to counter

    # Gross working-capital unlock (counter term vs. current term)
    gross_unlock: float | None
    gross_unlock_formula: str = ""

    # Price-for-terms value — the buyer economic-profit model, and ONLY it
    # (`domain.services.economic_profit`, the same one `run_scenario` uses).
    #
    #   * days_with_price_premium  → one scenario: the counter term at the
    #     premium, plus the break-even premium for that term move.
    #   * days_with_cash_discount  → a comparison: the counter term with the
    #     discount declined, against paying early and taking it. The discount
    #     is the buyer's OPTION, so the better of the two is what the counter
    #     is worth.
    #
    # What this replaced, and must not come back: `net_unlock` subtracted an
    # ANNUAL premium cost from a ONE-OFF working-capital swing - a unit error
    # that told a negotiator to accept a +2% premium for 15 extra days that
    # destroys ~$0.8M a year - and an "implied annualized cost of the premium"
    # the drafting model then read as the buyer's own return. A cash discount
    # was also filed as a cost ("annual exposure"); it is money to the buyer.
    economic_profit: EconomicProfitAnalysis | None = None

    # The supplier's implied charge for financing the extension - the premium
    # divided by the extension in years. SUPPLIER-side, and used for exactly
    # one thing: whether our SCF rate is a cheaper way to give them the same
    # liquidity. It is NOT a buyer cost of capital and is never rendered to the
    # drafting model, which read "48.67%, well above our cost of capital" as a
    # reason to accept.
    supplier_implied_financing_rate_pct: float | None = None

    # Ramp analysis (days_with_ramp)
    ramp_foregone_unlock: float | None = None   # $ foregone vs. switching immediately

    # SCF lever
    scf_viable: bool = False
    scf_rate_spread_pts: float | None = None    # signed: supplier_financing_rate − scf_rate (pct points); ≤0 within the viability tolerance
    # True when SCF is cheaper than what the supplier is implicitly charging for the extension via the premium
    scf_undercuts_implied_rate: bool = False

    # Overall verdict — pre-computed, never re-derived by the LLM
    verdict: str = "unclear"
    # "accept" | "counter_push_days" | "counter_with_scf" | "counter_reject_premium"
    # | "reject" | "borderline" | "non_financial_flag" | "unclear"
    verdict_rationale: str = ""

    notes: list[str] = field(default_factory=list)
