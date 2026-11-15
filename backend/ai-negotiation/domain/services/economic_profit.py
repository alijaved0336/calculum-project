"""Buyer-side economic profit — the pure calculator.

This module is the arithmetic and NOTHING else. It takes numbers, returns
numbers, and imports no supplier, no facts, no benchmarks and no prompt. That
separation is the point: benchmark selection, buyer leverage and whether an
ask is realistic are negotiation judgments that belong upstream of the money,
and every time they have been folded into a calculation the calculation
stopped being checkable against the client's workbook.

Binding the result to a supplier (where annual spend and the contract term
come from, what the negotiator actually asked) is
:func:`domain.services.scenario_calculator.run_economic_profit_scenarios`;
wording it is `utils.prompts.scenario_prompt`.

THE MODEL
---------
Two effects, netted:

1. The price change hits the P&L directly, after tax.
2. The term change moves accounts payable, and the buyer earns its WACC on
   the cash that frees up.

      volume_adjustment      = annual_spend x price_change
      adjusted_annual_spend  = annual_spend + volume_adjustment
      after_tax_op_change    = -volume_adjustment x (1 - tax_rate)
      current_ap             = annual_spend / 365 x contract_terms
      proposed_ap            = adjusted_annual_spend / 365 x target_terms
      cash_flow_impact       = proposed_ap - current_ap
      value_of_capital       = cash_flow_impact x buyer_wacc
      economic_profit        = after_tax_op_change + value_of_capital

Two details that are easy to get wrong and are load-bearing:

* The PROPOSED AP is computed on the ADJUSTED spend. The new price is what
  will actually be invoiced at the new term, so the price change feeds the
  working-capital leg as well as the P&L leg.
* The value of the freed cash is ``cash_flow_impact x WACC``, not the cash
  flow itself. The cash-flow impact is a one-off balance-sheet move; only the
  return earned on it is annual profit. Quoting the whole $1.0M swing as the
  gain overstates this scenario by roughly 300x.

THE BASELINE
------------
``contract_terms`` is the CONTRACTUAL payment term (``SupplierFacts.
current_term_days``), per the client's workbook. It is never the actual paid
term (``SupplierFacts.actual_payment_terms_days``), which is a behavioural
signal about how we pay, not the term the negotiation moves.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from domain.entities.economic_profit import (
    BREAK_EVEN,
    EconomicProfitResult,
    FINANCIALLY_NEGATIVE,
    FINANCIALLY_POSITIVE,
)

# ── Financial assumptions ────────────────────────────────────────────────
#
# The authoritative defaults, in one place, per the client's current
# workbook. Neither figure is on the supplier payload today; when either
# becomes per-tenant or per-supplier configuration, it arrives as the
# already-present keyword argument on every function below and nothing else
# has to change.
DEFAULT_APPLICABLE_TAX_RATE = Decimal("0.35")
DEFAULT_BUYER_WACC = Decimal("0.08")

DAYS_PER_YEAR = Decimal("365")

# Money is carried to the cent. Every stored figure is derived from the
# already-rounded figure before it, so the chain the negotiator is shown adds
# up exactly as printed: -78,000.00 + 81,271.23 = 3,271.23, and not a
# presentation that sums to 3,271.24.
_CENTS = Decimal("0.01")

# How close to zero counts as break-even, as a fraction of annual spend.
# Absolute thresholds cannot work across a $200K supplier and a $200M one, and
# exact equality is meaningless once rates are involved. At 0.001% of spend
# this is $120 on the client's $12M workbook case — comfortably below the
# +$3,271 that case produces (which stays POSITIVE, as the workbook has it),
# and comfortably above the sub-cent residue a solved break-even leaves.
BREAK_EVEN_TOLERANCE_FRACTION_OF_SPEND = Decimal("0.00001")
_MIN_BREAK_EVEN_TOLERANCE = Decimal("0.01")


def _dec(value: Decimal | float | int) -> Decimal:
    """Coerce to Decimal without importing a float's binary error.

    ``Decimal(0.1)`` is 0.1000000000000000055511151231257827; ``Decimal("0.1")``
    is 0.1. Extraction hands us JSON numbers (floats), so every entry point
    goes through here.
    """
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def parse_price_change(value: object) -> Decimal | None:
    """An extracted price change as a signed Decimal fraction, or None.

    The ONE reading of an LLM-extracted price change, shared by every surface
    that hands one to this model (the scenario node, the counter-offer node),
    so a "2%" cannot mean 0.02 on one surface and 2.0 on another.

    * Built from the string form - ``Decimal(0.01)`` carries a float's binary
      error into money arithmetic.
    * A magnitude of 1 or more is read as PERCENTAGE POINTS and divided by 100.
      Extraction is asked for a fraction, but "2% increase" coming back as
      ``2`` is the plausible slip, and a 100%+ supplier price change is not a
      thing this product sees. Unnormalised, that slip prices a 200% premium.
    """
    if value is None or isinstance(value, bool):
        return None
    try:
        price = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None
    if not price.is_finite():
        return None
    if abs(price) >= 1:
        price = price / 100
    return price


def _money(value: Decimal) -> Decimal:
    return value.quantize(_CENTS, rounding=ROUND_HALF_UP)


def break_even_tolerance(annual_spend: Decimal | float | int) -> Decimal:
    """The zero-band for :data:`~domain.entities.economic_profit.BREAK_EVEN`."""
    spend = abs(_dec(annual_spend))
    return max(spend * BREAK_EVEN_TOLERANCE_FRACTION_OF_SPEND, _MIN_BREAK_EVEN_TOLERANCE)


def classify_outcome(economic_profit: Decimal, annual_spend: Decimal | float | int) -> str:
    """Positive / negative / break-even, with a tolerance rather than ``== 0``."""
    tolerance = break_even_tolerance(annual_spend)
    if abs(economic_profit) <= tolerance:
        return BREAK_EVEN
    return FINANCIALLY_POSITIVE if economic_profit > 0 else FINANCIALLY_NEGATIVE


def calculate_economic_profit(
    annual_spend: Decimal | float | int,
    contract_terms: int,
    target_terms: int,
    price_change: Decimal | float | int,
    tax_rate: Decimal | float | int = DEFAULT_APPLICABLE_TAX_RATE,
    buyer_wacc: Decimal | float | int = DEFAULT_BUYER_WACC,
) -> EconomicProfitResult:
    """Net annual economic profit to the BUYER of a term and/or price change.

    ``price_change`` is a signed fraction from the buyer's point of view:
    ``+0.01`` the supplier charges 1% more, ``-0.01`` they give 1% back, ``0``
    the price is unchanged. ``contract_terms`` is the contractual baseline and
    ``target_terms`` the proposed term; ``target_terms == contract_terms`` is a
    valid scenario (a price move with no term move), and
    ``target_terms < contract_terms`` is equally valid and correctly returns a
    reduced working-capital value.
    """
    spend = _dec(annual_spend)
    price = _dec(price_change)
    tax = _dec(tax_rate)
    wacc = _dec(buyer_wacc)
    contract = int(contract_terms)
    target = int(target_terms)

    # Step 1 — price / volume adjustment.
    volume_adjustment = _money(spend * price)
    adjusted_annual_spend = _money(spend + volume_adjustment)

    # Step 2 — after-tax operating-profit impact. Negated: a supplier price
    # INCREASE is a cost to the buyer, so it lands as negative profit.
    after_tax_operating_profit_change = _money(-volume_adjustment * (Decimal(1) - tax))

    # Steps 3-5 — accounts payable, before and after, and the swing between.
    # The proposed side uses ADJUSTED spend: the new price is what will be
    # invoiced at the new term.
    current_ap = _money(spend / DAYS_PER_YEAR * contract)
    proposed_ap = _money(adjusted_annual_spend / DAYS_PER_YEAR * target)
    cash_flow_impact = _money(proposed_ap - current_ap)

    # Step 6 — only the RETURN on the freed cash is profit, not the cash.
    value_of_invested_capital = _money(cash_flow_impact * wacc)

    # Step 7 — the net.
    economic_profit = _money(after_tax_operating_profit_change + value_of_invested_capital)
    pct_spend = (economic_profit / spend) if spend else Decimal(0)

    return EconomicProfitResult(
        annual_spend=_money(spend),
        contract_terms=contract,
        target_terms=target,
        term_change_days=target - contract,
        price_change_pct=price,
        tax_rate=tax,
        buyer_wacc=wacc,
        volume_adjustment=volume_adjustment,
        adjusted_annual_spend=adjusted_annual_spend,
        after_tax_operating_profit_change=after_tax_operating_profit_change,
        current_ap=current_ap,
        proposed_ap=proposed_ap,
        cash_flow_impact=cash_flow_impact,
        value_of_invested_capital=value_of_invested_capital,
        economic_profit=economic_profit,
        economic_profit_pct_spend=pct_spend,
        financial_outcome=classify_outcome(economic_profit, spend),
    )


def break_even_price_change(
    contract_terms: int,
    target_terms: int,
    tax_rate: Decimal | float | int = DEFAULT_APPLICABLE_TAX_RATE,
    buyer_wacc: Decimal | float | int = DEFAULT_BUYER_WACC,
) -> Decimal | None:
    """The price change at which economic profit is exactly zero.

    Closed form, obtained by setting the model above to 0 and solving for the
    price change — annual spend cancels out entirely, which is why this
    function does not take it:

        p = [wacc x (target - contract) / 365]
            / [(1 - tax) - (wacc x target / 365)]

    Returned as a signed fraction, so a term EXTENSION gives a positive result
    (the price increase the move can absorb) and a term REDUCTION gives a
    negative one (the discount needed to pay for it).

    Returns None when the denominator vanishes — ``(1 - tax) == wacc x target
    / 365``, a rate combination at which no price change moves the result and
    there is no break-even to report.
    """
    tax = _dec(tax_rate)
    wacc = _dec(buyer_wacc)
    numerator = wacc * (Decimal(int(target_terms)) - Decimal(int(contract_terms))) / DAYS_PER_YEAR
    denominator = (Decimal(1) - tax) - (wacc * Decimal(int(target_terms)) / DAYS_PER_YEAR)
    if denominator == 0:
        return None
    return numerator / denominator


def compensating_price_change(
    contract_terms: int,
    target_terms: int,
    tax_rate: Decimal | float | int = DEFAULT_APPLICABLE_TAX_RATE,
    buyer_wacc: Decimal | float | int = DEFAULT_BUYER_WACC,
) -> Decimal | None:
    """The price change at TODAY'S term worth as much as moving to ``target_terms``
    at today's price.

    "If they will not give us the extension, what discount makes up for it?"
    The same question :func:`solve_price_change_for_target_economic_profit`
    answers when handed the extension's economic profit, specialised to the
    case every caller asks it in - staying on the contract term - where annual
    spend cancels out:

        EP(contract -> target, price 0)  =  EP(contract -> contract, price p)

        p = [wacc x (target - contract) / 365]
            / [wacc x contract / 365 - (1 - tax)]

    Spend-free for the same reason :func:`break_even_price_change` is, which is
    what lets the playbook's Equivalent Discount concession quote it for a
    supplier with no spend on file. Returned as a signed fraction: an extension
    comes back NEGATIVE (a discount). Tested equal to the general solver.
    """
    tax = _dec(tax_rate)
    wacc = _dec(buyer_wacc)
    contract = Decimal(int(contract_terms))
    target = Decimal(int(target_terms))
    denominator = (wacc * contract / DAYS_PER_YEAR) - (Decimal(1) - tax)
    if denominator == 0:
        return None
    return (wacc * (target - contract) / DAYS_PER_YEAR) / denominator


def solve_price_change_for_target_economic_profit(
    annual_spend: Decimal | float | int,
    contract_terms: int,
    target_terms: int,
    desired_economic_profit: Decimal | float | int,
    tax_rate: Decimal | float | int = DEFAULT_APPLICABLE_TAX_RATE,
    buyer_wacc: Decimal | float | int = DEFAULT_BUYER_WACC,
) -> Decimal | None:
    """The price change that makes this scenario worth ``desired_economic_profit``.

    The general inverse of :func:`calculate_economic_profit` — the one solver
    behind every reverse question, so no reverse answer is ever produced by a
    second, differently-rounded formula:

      * "how much price increase can I absorb?" — desired 0 (and identical to
        :func:`break_even_price_change`, which is the same solve with spend
        cancelled out);
      * "they refuse the extension — what discount compensates us?" — desired
        = the economic profit of the extension scenario, evaluated at the
        terms they WILL accept. The answer comes back negative: a discount.

    Economic profit is linear in the price change, so this is exact, not a
    search:

        p = [desired - wacc x spend x (target - contract) / 365]
            / [wacc x spend x target / 365 - spend x (1 - tax)]

    Returns None when annual spend is zero or the denominator vanishes — no
    price change reaches the target, and a made-up figure would be worse than
    saying so.
    """
    spend = _dec(annual_spend)
    if spend == 0:
        return None
    tax = _dec(tax_rate)
    wacc = _dec(buyer_wacc)
    desired = _dec(desired_economic_profit)
    contract = Decimal(int(contract_terms))
    target = Decimal(int(target_terms))

    term_leg = wacc * spend * (target - contract) / DAYS_PER_YEAR
    denominator = (wacc * spend * target / DAYS_PER_YEAR) - (spend * (Decimal(1) - tax))
    if denominator == 0:
        return None
    return (desired - term_leg) / denominator
