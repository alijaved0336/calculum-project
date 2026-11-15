from __future__ import annotations

from dataclasses import replace
from decimal import Decimal

from domain.entities.economic_profit import (
    CALC_BREAK_EVEN_PRICE,
    CALC_COMPENSATING_PRICE_CHANGE,
    CALC_ECONOMIC_PROFIT,
    CALC_ECONOMIC_PROFIT_COMPARE,
    EconomicProfitAnalysis,
    EconomicProfitResult,
    EconomicProfitScenarioResult,
    EconomicProfitScenarioSpec,
)
from domain.entities.facts import SupplierFacts
from domain.entities.scenario import ScenarioCalculation, ScenarioRequest
from domain.services.economic_profit import (
    break_even_price_change,
    calculate_economic_profit,
    solve_price_change_for_target_economic_profit,
)

DAYS_PER_YEAR = 365.0

_FORMULA = "unlock = spend_volume * (extension_days / 365)"

_NO_SPEND = "spend_volume is not available for this supplier, so no cash-flow figure can be calculated."
_NO_BASELINE = (
    "current_term_days is not available for this supplier, so the assistant "
    "cannot establish a baseline to calculate an extension from. Ask the "
    "negotiator for the supplier's current payment term, or rephrase the "
    "question as a comparison between two terms (e.g. 'difference between "
    "60 and 75 days')."
)


def _missing_baseline(current_term_days: float | None) -> bool:
    """True when ``current_term_days`` can't be used as a negotiation baseline.

    0 is the upstream sentinel for "no contractual term recorded yet", never a
    genuine current term — treating it as a real baseline would silently run
    (and report) a scenario off a term that was never agreed. Same guard as a
    missing ``None``.
    """
    return current_term_days is None or current_term_days == 0


def _unlock(spend_volume: float, extension_days: float) -> float:
    """Working-capital unlock for delaying payment by ``extension_days``.

    Standard DPO-based working-capital model: extending payment terms by N
    days frees up N/365 of annual spend as cash. This is the placeholder
    formula used until the upstream Adabot/Calculum scenario formula is
    available to replace it — see ``calc_formula_explain`` for how it
    compares against the upstream ``target_cash_flow`` figure.
    """
    return spend_volume * extension_days / DAYS_PER_YEAR


def calc_extension(facts: SupplierFacts, extension_days: float) -> ScenarioCalculation:
    """Cash unlock from a stated extension length, e.g. "a 16-day extension"."""
    if facts.spend_volume is None:
        return ScenarioCalculation("extension", None, {}, _FORMULA, [_NO_SPEND])

    value = _unlock(facts.spend_volume, extension_days)
    return ScenarioCalculation(
        calc_type="extension",
        value=value,
        inputs={"spend_volume": facts.spend_volume, "extension_days": extension_days},
        formula=_FORMULA,
    )


def calc_term_impact(facts: SupplierFacts, target_term_days: float) -> ScenarioCalculation:
    """Cash unlock from moving to ``target_term_days`` from the current term."""
    if facts.spend_volume is None:
        return ScenarioCalculation("term_impact", None, {}, _FORMULA, [_NO_SPEND])
    if _missing_baseline(facts.current_term_days):
        return ScenarioCalculation("term_impact", None, {}, _FORMULA, [_NO_BASELINE])

    extension_days = target_term_days - facts.current_term_days
    value = _unlock(facts.spend_volume, extension_days)
    return ScenarioCalculation(
        calc_type="term_impact",
        value=value,
        inputs={
            "spend_volume": facts.spend_volume,
            "current_term_days": facts.current_term_days,
            "target_term_days": target_term_days,
            "extension_days": extension_days,
        },
        formula="unlock = spend_volume * ((target_term_days - current_term_days) / 365)",
    )


def calc_delta(facts: SupplierFacts, term_a: float, term_b: float) -> ScenarioCalculation:
    """Difference in cash unlock between two terms — baseline-independent.

    The current/baseline term cancels out of the subtraction, so this works
    even when ``current_term_days`` is missing. Covers comparison queries
    ("75 vs 62"), counter-offer gaps ("they offered 45 vs our 62 ask"), and
    BATNA checks ("is 45 still above our floor?" → term_b = fallback).
    """
    if facts.spend_volume is None:
        return ScenarioCalculation("delta", None, {}, _FORMULA, [_NO_SPEND])

    extension_days = term_a - term_b
    value = _unlock(facts.spend_volume, extension_days)
    return ScenarioCalculation(
        calc_type="delta",
        value=value,
        inputs={
            "spend_volume": facts.spend_volume,
            "term_a": term_a,
            "term_b": term_b,
            "extension_days": extension_days,
        },
        formula="unlock_delta = spend_volume * ((term_a - term_b) / 365)",
    )


def calc_threshold(facts: SupplierFacts, target_amount: float) -> ScenarioCalculation:
    """Minimum term (days) needed to unlock at least ``target_amount`` of cash."""
    if facts.spend_volume is None:
        return ScenarioCalculation("threshold", None, {}, _FORMULA, [_NO_SPEND])
    if _missing_baseline(facts.current_term_days):
        return ScenarioCalculation("threshold", None, {}, _FORMULA, [_NO_BASELINE])

    extension_days = target_amount * DAYS_PER_YEAR / facts.spend_volume
    target_term_days = facts.current_term_days + extension_days
    return ScenarioCalculation(
        calc_type="threshold",
        value=target_term_days,
        inputs={
            "spend_volume": facts.spend_volume,
            "current_term_days": facts.current_term_days,
            "target_amount": target_amount,
            "extension_days": extension_days,
        },
        formula="target_term_days = current_term_days + (target_amount * 365 / spend_volume)",
    )


def calc_ramp(facts: SupplierFacts, target_term_days: float, ramp_months: float) -> ScenarioCalculation:
    """Cash given up by phasing in ``target_term_days`` over ``ramp_months``
    instead of switching immediately.

    Assumes a linear ramp: the extension grows from 0 to the full
    ``target_term_days - current_term_days`` over the ramp period, so the
    average extension realised during the ramp is half of the full
    extension. The "cost" is the unlock foregone during that period versus
    switching immediately.
    """
    if facts.spend_volume is None:
        return ScenarioCalculation("ramp", None, {}, _FORMULA, [_NO_SPEND])
    if _missing_baseline(facts.current_term_days):
        return ScenarioCalculation("ramp", None, {}, _FORMULA, [_NO_BASELINE])

    full_extension = target_term_days - facts.current_term_days
    ramp_fraction = ramp_months / 12
    cost = _unlock(facts.spend_volume, full_extension) * ramp_fraction / 2
    return ScenarioCalculation(
        calc_type="ramp",
        value=cost,
        inputs={
            "spend_volume": facts.spend_volume,
            "current_term_days": facts.current_term_days,
            "target_term_days": target_term_days,
            "ramp_months": ramp_months,
            "full_extension_days": full_extension,
        },
        formula=(
            "ramp_cost = spend_volume * (full_extension_days / 365) "
            "* (ramp_months / 12) / 2  [linear ramp from 0 to full extension]"
        ),
        notes=["Assumes a linear ramp from 0 days to the full extension over ramp_months."],
    )


def calc_formula_explain(facts: SupplierFacts) -> ScenarioCalculation:
    """Explain the cash-flow figures the assistant can account for.

    Surfaces the upstream ``target_cash_flow`` (computed by Adabot/Calculum,
    formula not visible to this system) alongside this assistant's own
    DPO-based estimate for the same term gap, so the negotiator can see both
    and how the assistant's model was derived.
    """
    notes: list[str] = [
        "target_cash_flow is computed upstream by Adabot/Calculum; its exact "
        "formula isn't available to this assistant, so it's quoted as given."
    ]
    inputs: dict[str, object] = {"target_cash_flow": facts.target_cash_flow}

    modeled = None
    if (
        facts.spend_volume is not None
        and not _missing_baseline(facts.current_term_days)
        and facts.target_term_days is not None
    ):
        extension_days = facts.target_term_days - facts.current_term_days
        modeled = _unlock(facts.spend_volume, extension_days)
        inputs.update({
            "spend_volume": facts.spend_volume,
            "current_term_days": facts.current_term_days,
            "target_term_days": facts.target_term_days,
            "extension_days": extension_days,
            "modeled_unlock": modeled,
        })
        notes.append(
            "modeled_unlock is this assistant's own DPO-based estimate for the "
            "same current-to-target term gap, using "
            f"'{_FORMULA}'. It may not match target_cash_flow exactly — that "
            "figure reflects Adabot's own calculation."
        )
    else:
        notes.append(_NO_BASELINE if _missing_baseline(facts.current_term_days) else _NO_SPEND)

    return ScenarioCalculation(
        calc_type="formula_explain",
        value=facts.target_cash_flow,
        inputs=inputs,
        formula=_FORMULA,
        notes=notes,
    )


_DISPATCH = {
    "extension": lambda facts, req: calc_extension(facts, req.extension_days),
    "term_impact": lambda facts, req: calc_term_impact(facts, req.target_term_days),
    "delta": lambda facts, req: calc_delta(facts, req.term_a, req.term_b),
    "threshold": lambda facts, req: calc_threshold(facts, req.target_amount),
    "ramp": lambda facts, req: calc_ramp(facts, req.target_term_days, req.ramp_months),
    "formula_explain": lambda facts, req: calc_formula_explain(facts),
    # "multi_term_impact" is intentionally absent: the scenario node expands it
    # into multiple term_impact calls before reaching this dispatcher, so it
    # never arrives here.  If run_scenario_calculation is called directly with
    # calc_type="multi_term_impact" it will return calc_type="unsupported".
}


def _with_assumption(calculation: ScenarioCalculation, assumptions: str | None) -> ScenarioCalculation:
    """Append the extraction step's stated assumptions (e.g. a defaulted
    ramp length or a resolved named term) to ``calculation.notes`` so the
    response step can surface them to the negotiator."""
    if not assumptions:
        return calculation
    return replace(calculation, notes=[*calculation.notes, f"Assumption: {assumptions}"])


def run_scenario_calculation(facts: SupplierFacts, request: ScenarioRequest) -> ScenarioCalculation:
    """Dispatch an extracted :class:`ScenarioRequest` to its calculator.

    Returns a ``calc_type="unsupported"`` result (value=None) if the request
    is unsupported or missing the parameters its calc_type requires.
    """
    handler = _DISPATCH.get(request.calc_type)
    if handler is None:
        return _with_assumption(
            ScenarioCalculation(
                calc_type="unsupported",
                value=None,
                notes=[request.reasoning or "This scenario question isn't supported yet."],
            ),
            request.assumptions,
        )

    required = {
        "extension": (request.extension_days is not None,),
        "term_impact": (request.target_term_days is not None,),
        "delta": (request.term_a is not None, request.term_b is not None),
        "threshold": (request.target_amount is not None,),
        "ramp": (request.target_term_days is not None, request.ramp_months is not None),
        "formula_explain": (True,),
    }[request.calc_type]

    if not all(required):
        return _with_assumption(
            ScenarioCalculation(
                calc_type="unsupported",
                value=None,
                notes=[
                    request.reasoning
                    or "The assistant couldn't extract the numbers needed to run this calculation from the message."
                ],
            ),
            request.assumptions,
        )

    return _with_assumption(handler(facts, request), request.assumptions)


# ── Economic profit: binding the pure calculator to a supplier ────────────
#
# The arithmetic lives in `domain.services.economic_profit` and knows nothing
# about suppliers. This is the layer that resolves an extracted request
# against `SupplierFacts`: where annual spend comes from, which term is the
# baseline, and what a scenario with half its parameters missing should mean.
# It is kept here, beside the working-capital calculators, so there is ONE
# place that turns a `ScenarioRequest` into a deterministic result.


_EP_NO_SPEND = (
    "The supplier's annual spend volume is not available, so an economic-profit "
    "scenario cannot be calculated for them."
)
_EP_NO_CONTRACT_TERM = (
    "The supplier's contractual payment term is not available, so there is no "
    "baseline to measure the term change from. Give the current contractual "
    "term in days and this can be run."
)
_EP_NO_LEVER = (
    "That scenario moves neither the payment term nor the price, so there is "
    "nothing to value. Name a new payment term, a price change, or both."
)
_EP_NO_TERM_CHANGE_FOR_BREAK_EVEN = (
    "A break-even price change is the price a TERM MOVE can absorb, so it needs "
    "a new payment term to measure against. Name the term being proposed."
)
_EP_UNSOLVABLE = (
    "No price change produces that economic profit under the current "
    "assumptions, so there is no figure to report."
)

# Stated whenever a price-for-terms question arrives with no price attached:
# the break-even answers the underlying question ("how much can I give away?")
# without a clarifying round-trip. See §13 of the feature spec.
_EP_PRICE_DEFAULTED_TO_BREAK_EVEN = (
    "No price change was named, so the break-even price change is given "
    "instead of a point estimate."
)


def _ep_resolve_target_terms(spec: EconomicProfitScenarioSpec, contract_terms: int) -> int:
    """The scenario's proposed term, from whichever way it was described.

    "move TO 90 days" arrives as ``target_term_days``; "extend BY 30 days"
    arrives as ``extension_days`` and is a delta off the RESOLVED contract term
    (the negotiator's own baseline where they stated one — see
    :func:`_ep_resolve_baseline` — otherwise the supplier's). A scenario that
    names neither is a price-only move at today's term — not an error, and not
    a reason to guess a number.
    """
    if spec.target_term_days is not None:
        return int(round(spec.target_term_days))
    if spec.extension_days is not None:
        return contract_terms + int(round(spec.extension_days))
    return contract_terms


def _ep_resolve_baseline(
    specs: list[EconomicProfitScenarioSpec], facts: SupplierFacts
) -> tuple[Decimal | float | None, int | None]:
    """Annual spend and the contract term this request is measured against.

    Precedence: what the negotiator STATED, then the supplier facts, then
    nothing (which the caller reports as a missing input rather than filling
    in). "Assume annual spend is $12M and move from 60 to 90" is a
    hypothetical about $12M and 60 days; running it against the supplier's own
    $88M and 30-day term answers a question nobody asked, and the substitution
    is invisible in a net figure that is two large legs nearly cancelling.

    Resolved ONCE for the whole request, not per scenario: a comparison or a
    compensating-discount solve weighs its scenarios against each other, and
    two scenarios on two different baselines are not comparable. The first
    scenario that names a figure sets it — extraction puts a stated baseline on
    every entry, so this is the same figure either way.
    """
    spend: Decimal | float | None = next(
        (spec.annual_spend for spec in specs if spec.annual_spend is not None),
        facts.spend_volume,
    )
    contract: int | None = next(
        (
            int(round(spec.current_term_days))
            for spec in specs
            if spec.current_term_days is not None
        ),
        facts.current_term_days,
    )
    return spend, contract


def _ep_label(result: EconomicProfitResult) -> str:
    """A short, unambiguous name for one scenario: ``90 days at +1% price``.

    Deterministic so a comparison refers to the same two scenarios in the
    prompt, in the sources panel and in the answer.
    """
    price = result.price_change_pct
    if price == 0:
        price_part = "no price change"
    else:
        magnitude = f"{abs(price) * 100:.2f}".rstrip("0").rstrip(".")
        price_part = f"+{magnitude}% price" if price > 0 else f"{magnitude}% discount"
    return f"{result.target_terms} days at {price_part}"


def _ep_error(calc_type: str, message: str) -> EconomicProfitAnalysis:
    return EconomicProfitAnalysis(calc_type=calc_type, error=message)


def _ep_scenario(
    annual_spend: Decimal | float,
    contract_terms: int,
    target_terms: int,
    price_change: Decimal,
    label: str | None,
) -> EconomicProfitScenarioResult:
    result = calculate_economic_profit(
        annual_spend=annual_spend,
        contract_terms=contract_terms,
        target_terms=target_terms,
        price_change=price_change,
    )
    return EconomicProfitScenarioResult(label=label or _ep_label(result), result=result)


def run_economic_profit_scenarios(
    facts: SupplierFacts, request: ScenarioRequest
) -> EconomicProfitAnalysis:
    """Run the economic-profit calculation(s) an extracted request describes.

    Handles all four economic-profit calc types. Every one of them goes
    through the same `calculate_economic_profit`, including the reverse
    questions — the break-even and the compensating discount are solves
    against that one model, never a second formula that could drift from it.

    Returns an analysis carrying ``error`` (and no scenarios) when a required
    input is genuinely unavailable. Nothing is estimated to fill a gap.
    """
    calc_type = request.calc_type
    specs = list(request.scenarios) or [EconomicProfitScenarioSpec()]
    # A baseline the negotiator stated wins over the supplier's; the supplier's
    # CONTRACTUAL term is the fallback the client's workbook uses. Never
    # `actual_payment_terms_days` — that is how we behave, not what we agreed.
    spend, contract = _ep_resolve_baseline(specs, facts)
    if spend is None:
        return _ep_error(calc_type, _EP_NO_SPEND)
    if contract is None:
        return _ep_error(calc_type, _EP_NO_CONTRACT_TERM)
    notes: list[str] = []
    if request.assumptions:
        notes.append(f"Assumption: {request.assumptions}")

    # ── Break-even price for a term move ─────────────────────────────────
    if calc_type == CALC_BREAK_EVEN_PRICE:
        target = _ep_resolve_target_terms(specs[0], contract)
        if target == contract:
            return _ep_error(calc_type, _EP_NO_TERM_CHANGE_FOR_BREAK_EVEN)
        break_even = break_even_price_change(contract, target)
        if break_even is None:
            return _ep_error(calc_type, _EP_UNSOLVABLE)
        # The scenario AT the break-even price, so the answer can show the two
        # legs that cancel rather than asserting a bare percentage.
        scenario = _ep_scenario(spend, contract, target, break_even, "at the break-even price")
        return EconomicProfitAnalysis(
            calc_type=calc_type,
            scenarios=[scenario],
            break_even_price_change=break_even,
            notes=notes,
        )

    # ── Comparison / sensitivity sweep ───────────────────────────────────
    if calc_type == CALC_ECONOMIC_PROFIT_COMPARE and len(specs) >= 2:
        results = [
            # In a comparison an unstated price IS the current price: "75 days
            # at the current price versus 90 at +1%" names the zero explicitly.
            _ep_scenario(
                spend,
                contract,
                _ep_resolve_target_terms(spec, contract),
                spec.price_change if spec.price_change is not None else Decimal(0),
                spec.label,
            )
            for spec in specs
        ]
        difference = (
            results[0].result.economic_profit - results[1].result.economic_profit
            if len(results) == 2
            else None
        )
        headline_target = results[0].result.target_terms
        return EconomicProfitAnalysis(
            calc_type=calc_type,
            scenarios=results,
            break_even_price_change=(
                break_even_price_change(contract, headline_target)
                if headline_target != contract
                else None
            ),
            difference=difference,
            notes=notes,
        )

    # ── The discount that compensates for terms we cannot get ────────────
    if calc_type == CALC_COMPENSATING_PRICE_CHANGE and len(specs) >= 2:
        reference_target = _ep_resolve_target_terms(specs[0], contract)
        alternative_target = _ep_resolve_target_terms(specs[1], contract)
        reference = _ep_scenario(
            spend,
            contract,
            reference_target,
            specs[0].price_change if specs[0].price_change is not None else Decimal(0),
            specs[0].label,
        )
        solved = solve_price_change_for_target_economic_profit(
            annual_spend=spend,
            contract_terms=contract,
            target_terms=alternative_target,
            desired_economic_profit=reference.result.economic_profit,
        )
        if solved is None:
            return _ep_error(calc_type, _EP_UNSOLVABLE)
        # When the supplier has ALREADY named their discount, that figure is
        # the alternative — evaluate it and report the gap, with the solved
        # price alongside as "what it would have to be". Solving over the top
        # of a stated number would answer a question nobody asked and silently
        # drop the one concrete figure in the message.
        offered = specs[1].price_change
        alternative = _ep_scenario(
            spend, contract, alternative_target, offered if offered is not None else solved,
            specs[1].label,
        )
        return EconomicProfitAnalysis(
            calc_type=calc_type,
            scenarios=[reference, alternative],
            solved_price_change=solved,
            difference=(
                reference.result.economic_profit - alternative.result.economic_profit
                if offered is not None
                else None
            ),
            break_even_price_change=(
                break_even_price_change(contract, reference_target)
                if reference_target != contract
                else None
            ),
            notes=notes,
        )

    # ── One scenario ─────────────────────────────────────────────────────
    spec = specs[0]
    target = _ep_resolve_target_terms(spec, contract)
    if spec.price_change is None:
        # A price-for-terms question with no price in it. Answering the
        # break-even is strictly more useful than asking them for a number
        # (§13) — it IS the answer to "how much could I give them?".
        if target == contract:
            return _ep_error(calc_type, _EP_NO_LEVER)
        break_even = break_even_price_change(contract, target)
        if break_even is None:
            return _ep_error(calc_type, _EP_UNSOLVABLE)
        scenario = _ep_scenario(spend, contract, target, break_even, "at the break-even price")
        return EconomicProfitAnalysis(
            calc_type=CALC_BREAK_EVEN_PRICE,
            scenarios=[scenario],
            break_even_price_change=break_even,
            notes=[*notes, _EP_PRICE_DEFAULTED_TO_BREAK_EVEN],
        )

    if target == contract and spec.price_change == 0:
        return _ep_error(calc_type, _EP_NO_LEVER)

    scenario = _ep_scenario(spend, contract, target, spec.price_change, spec.label)
    return EconomicProfitAnalysis(
        calc_type=CALC_ECONOMIC_PROFIT,
        scenarios=[scenario],
        # Always alongside a term move: it is what says whether a "+1% is
        # positive" verdict has room in it or is sitting on the edge.
        break_even_price_change=(
            break_even_price_change(contract, target) if target != contract else None
        ),
        notes=notes,
    )
