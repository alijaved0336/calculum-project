"""Buyer-side economic profit — the entities for the financial what-if.

Economic profit is the calculation the client asks for when a scenario mixes
BOTH levers at once: the cash-flow gain from moving payment terms and the
direct P&L hit (or gain) from a supplier price change. Either lever alone has
a simpler answer — the working-capital unlock in
:mod:`domain.services.scenario_calculator` — but "90 days instead of 60, and
they want 1% more" cannot be answered by either half.

Everything here is BUYER-side. There is a second, unrelated economic-profit
figure in this codebase: ``CostImpact.supplier_economic_profit``
(:mod:`domain.services.negotiation_arguments`) estimates what the extension
costs the SUPPLIER, off the supplier's own WACC, and is a negotiation
argument. The two are deliberately kept apart — different subject, different
rates, different purpose — and neither should be quoted for the other.

The figures carried here are :class:`~decimal.Decimal` throughout: these are
money answers a negotiator reads back to a supplier, and binary floats put a
cent of drift into a number that has to reconcile with a workbook.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal

# ``financial_outcome`` values. This is a verdict about the ARITHMETIC under
# the stated assumptions — never a recommendation to accept or refuse. See
# `utils.prompts.scenario_prompt.economic_profit_response_system_prompt`,
# which keeps financial attractiveness and negotiation feasibility apart in
# the answer the negotiator reads.
FINANCIALLY_POSITIVE = "financially_positive"
FINANCIALLY_NEGATIVE = "financially_negative"
BREAK_EVEN = "break_even"

# ── The four economic-profit calc types ──────────────────────────────────
#
# They ride on the EXISTING `run_scenario` intent rather than an intent of
# their own: the negotiator is asking a what-if either way, and splitting the
# routing would mean the classifier deciding between two scenario intents on
# wording alone. The extraction step picks one of these instead — see
# `utils.prompts.scenario_prompt.scenario_extraction_system_prompt`.
#
# A pure term question with no price and no economic-profit wording is NOT one
# of these: it stays with the working-capital unlock calc types, which already
# answer it correctly.
CALC_ECONOMIC_PROFIT = "economic_profit"
CALC_ECONOMIC_PROFIT_COMPARE = "economic_profit_compare"
CALC_BREAK_EVEN_PRICE = "break_even_price"
CALC_COMPENSATING_PRICE_CHANGE = "compensating_price_change"

ECONOMIC_PROFIT_CALC_TYPES = frozenset({
    CALC_ECONOMIC_PROFIT,
    CALC_ECONOMIC_PROFIT_COMPARE,
    CALC_BREAK_EVEN_PRICE,
    CALC_COMPENSATING_PRICE_CHANGE,
})


@dataclass(frozen=True)
class EconomicProfitResult:
    """One fully-computed economic-profit scenario.

    Every intermediate is carried, not just the bottom line: the negotiator is
    shown the price impact and the working-capital value side by side, because
    a +$3.3K net result is two large numbers nearly cancelling and reads as
    noise without them.

    Rate and percentage fields are FRACTIONS, not percentage points:
    ``price_change_pct`` is ``Decimal("0.01")`` for a 1% supplier increase and
    ``Decimal("-0.01")`` for a 1% discount; ``economic_profit_pct_spend`` is
    ``economic_profit / annual_spend``.
    """

    annual_spend: Decimal
    contract_terms: int
    target_terms: int
    term_change_days: int

    price_change_pct: Decimal
    tax_rate: Decimal
    buyer_wacc: Decimal

    volume_adjustment: Decimal
    adjusted_annual_spend: Decimal

    after_tax_operating_profit_change: Decimal

    current_ap: Decimal
    proposed_ap: Decimal
    cash_flow_impact: Decimal

    value_of_invested_capital: Decimal
    economic_profit: Decimal
    economic_profit_pct_spend: Decimal

    financial_outcome: str


@dataclass(frozen=True)
class EconomicProfitScenarioSpec:
    """One scenario as the extraction step described it, before resolution.

    ``target_term_days`` and ``extension_days`` are the two readings the
    client called out as the ambiguity to get right: "move TO 90 days" is a
    destination, "extend BY 30 days" is a delta off the CONTRACT term. Exactly
    one of them is expected; both None means "terms unchanged".

    ``price_change`` is a fraction, signed from the BUYER's point of view:
    ``+0.01`` the supplier charges 1% more, ``-0.01`` they give 1% back. None
    means the message named no price change — which is not the same as zero
    for :data:`CALC_ECONOMIC_PROFIT`, where it is what makes the answer the
    break-even price instead of a point estimate.

    ``current_term_days`` and ``annual_spend`` are the BASELINE as the
    negotiator stated it, and both are normally None: the supplier's
    contractual term and spend volume are the baseline, and that is what the
    calculation should use. They are filled ONLY when the message names its
    own baseline — "move FROM 60 to 90", "assume annual spend is $12M" — and
    they then take precedence over the supplier facts in
    :func:`domain.services.scenario_calculator.run_economic_profit_scenarios`.
    A negotiator who states a figure out loud is running a hypothetical
    against THAT figure; silently substituting the supplier's would answer a
    question they did not ask, and the wrong baseline is invisible in a net
    number that is two large legs nearly cancelling.
    """

    label: str | None = None
    target_term_days: float | None = None
    extension_days: float | None = None
    price_change: Decimal | None = None
    current_term_days: int | None = None
    annual_spend: Decimal | None = None


@dataclass(frozen=True)
class EconomicProfitScenarioResult:
    """A computed scenario with the label the answer refers to it by."""

    label: str
    result: EconomicProfitResult


@dataclass(frozen=True)
class EconomicProfitAnalysis:
    """Everything one economic-profit turn computed, ready to be worded.

    Handed to the response LLM as a fait accompli, exactly as
    :class:`~domain.entities.scenario.ScenarioCalculation` is: the model
    explains these numbers and never recomputes them.

    ``error`` is set (and ``scenarios`` empty) when an input the calculation
    cannot proceed without is missing — annual spend or the contract term. It
    names the missing figure precisely rather than inviting a generic "I need
    more information", and nothing is fabricated to fill the gap.
    """

    calc_type: str
    scenarios: list[EconomicProfitScenarioResult] = field(default_factory=list)
    # EP=0 price change for the headline scenario's term move. Always computed
    # where the terms actually move, because it is the number that says how
    # much room a "+1%" answer really has — and it is the whole answer when the
    # negotiator asked a price-for-terms trade-off without naming a price.
    break_even_price_change: Decimal | None = None
    # The price change solved for by CALC_COMPENSATING_PRICE_CHANGE: what the
    # supplier would have to give back for the alternative to be worth as much
    # as the reference scenario.
    solved_price_change: Decimal | None = None
    # scenarios[0].economic_profit - scenarios[1].economic_profit, for a
    # two-scenario comparison. None for anything else.
    difference: Decimal | None = None
    notes: list[str] = field(default_factory=list)
    error: str | None = None
