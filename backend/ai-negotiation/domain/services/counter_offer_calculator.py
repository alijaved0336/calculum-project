from __future__ import annotations

from decimal import Decimal

from domain.entities.counter_offer import CounterOfferAnalysis, CounterOfferExtraction
from domain.entities.economic_profit import (
    BREAK_EVEN,
    CALC_ECONOMIC_PROFIT,
    CALC_ECONOMIC_PROFIT_COMPARE,
    FINANCIALLY_NEGATIVE,
    EconomicProfitAnalysis,
    EconomicProfitScenarioSpec,
)
from domain.entities.facts import SupplierFacts, resolve_effective_batna
from domain.entities.scenario import ScenarioRequest
from domain.services.economic_profit import parse_price_change
from domain.services.scenario_calculator import (
    calc_delta,
    calc_ramp,
    calc_term_impact,
    run_economic_profit_scenarios,
)
from domain.services.scf_analysis import analyze_scf_viability

_DAYS_PER_YEAR = 365.0


def analyze_counter_offer(
    extraction: CounterOfferExtraction,
    facts: SupplierFacts,
    argument_analysis: dict,
) -> CounterOfferAnalysis:
    """Run all deterministic analyses for a supplier counter-offer.

    Handles days-only, price-premium, cash-discount, ramp, and non-financial
    counter-offer types. The result is passed verbatim to the drafting LLM
    call — the LLM never recomputes these figures.
    """
    notes: list[str] = []

    # ── Non-actionable short-circuits ─────────────────────────────────────
    if extraction.counter_type == "conditional_non_financial":
        return CounterOfferAnalysis(
            effective_counter_term_days=None,
            zone=None,
            zone_rationale=None,
            gap_vs_target_days=None,
            cash_gap_vs_target=None,
            gross_unlock=None,
            verdict="non_financial_flag",
            verdict_rationale=(
                f"Non-financial condition: {extraction.non_financial_condition}. "
                "Requires human/commercial judgment — cannot be evaluated quantitatively."
            ),
        )

    if extraction.counter_type == "unclear":
        return CounterOfferAnalysis(
            effective_counter_term_days=None,
            zone=None,
            zone_rationale=None,
            gap_vs_target_days=None,
            cash_gap_vs_target=None,
            gross_unlock=None,
            verdict="unclear",
            verdict_rationale="Could not parse a clear counter-offer from the message.",
        )

    # ── Resolve effective counter term ────────────────────────────────────
    if extraction.accepts_proposed_days:
        effective_counter_term = (
            float(facts.target_term_days) if facts.target_term_days is not None else None
        )
    else:
        effective_counter_term = extraction.counter_term_days

    if effective_counter_term is None:
        notes.append(
            "Counter-offer term could not be resolved — analysis is limited to any stated financial conditions."
        )

    # ── Zone determination ────────────────────────────────────────────────
    effective_fallback, batna_note = resolve_effective_batna(facts)
    if batna_note:
        notes.append(batna_note)

    zone, zone_rationale = _determine_zone(
        effective_counter_term,
        facts.target_term_days,
        effective_fallback,
        facts.current_term_days,
    )

    # ── Gap vs. our target term ───────────────────────────────────────────
    gap_vs_target_days: float | None = None
    cash_gap_vs_target: float | None = None

    if effective_counter_term is not None and facts.target_term_days is not None:
        gap_vs_target_days = effective_counter_term - facts.target_term_days
        delta = calc_delta(facts, effective_counter_term, facts.target_term_days)
        cash_gap_vs_target = delta.value  # negative = cost of conceding vs. our ask

    # ── Gross working-capital unlock ──────────────────────────────────────
    gross_unlock: float | None = None
    gross_unlock_formula = ""

    if effective_counter_term is not None:
        term_calc = calc_term_impact(facts, effective_counter_term)
        gross_unlock = term_calc.value
        gross_unlock_formula = term_calc.formula
        if term_calc.notes:
            notes.extend(term_calc.notes)

    # ── Price-for-terms value: the economic-profit model, and only it ─────
    # Both financial conditions are the same question the scenario surface
    # answers - what is a term move worth once a price change is netted off
    # it - so both go through the same calculator, with the same assumptions
    # and the same contractual baseline. See `CounterOfferAnalysis.economic_profit`
    # for what this replaced.
    economic_profit = _economic_profit_of_counter(extraction, facts, effective_counter_term)
    if economic_profit is not None and economic_profit.error:
        notes.append(economic_profit.error)

    supplier_implied_financing_rate_pct: float | None = None
    if extraction.price_premium_pct is not None:
        extension_days = (
            (effective_counter_term - facts.current_term_days)
            if effective_counter_term is not None and facts.current_term_days is not None
            else None
        )
        if extension_days is not None and extension_days > 0:
            supplier_implied_financing_rate_pct = (
                extraction.price_premium_pct / (extension_days / _DAYS_PER_YEAR)
            ) * 100

    # ── Ramp analysis ────────────────────────────────────────────────────
    ramp_foregone_unlock: float | None = None

    if extraction.ramp_months is not None and effective_counter_term is not None:
        ramp_calc = calc_ramp(facts, effective_counter_term, extraction.ramp_months)
        ramp_foregone_unlock = ramp_calc.value
        if ramp_calc.notes:
            notes.extend(ramp_calc.notes)
        if ramp_foregone_unlock is not None:
            notes.append(
                f"A {extraction.ramp_months:.0f}-month ramp costs approximately "
                f"{ramp_foregone_unlock:,.0f} in foregone working-capital unlock vs. switching immediately."
            )

    # ── SCF lever ────────────────────────────────────────────────────────
    scf_viability = analyze_scf_viability(facts, argument_analysis)
    scf_viable = scf_viability.viable
    scf_rate_spread_pts = scf_viability.rate_spread_pts

    # Would SCF give the supplier the same liquidity for less than the premium
    # they are charging for it? A premium only - a cash discount is the
    # buyer's option, not a charge on the extension.
    scf_undercuts_implied_rate = (
        scf_viable
        and facts.scf_rate is not None
        and supplier_implied_financing_rate_pct is not None
        and (facts.scf_rate * 100) < supplier_implied_financing_rate_pct
    )

    # ── Verdict ──────────────────────────────────────────────────────────
    verdict, verdict_rationale = _determine_verdict(
        zone=zone,
        extraction=extraction,
        economic_profit=economic_profit,
        scf_viable=scf_viable,
        scf_undercuts_implied_rate=scf_undercuts_implied_rate,
    )

    return CounterOfferAnalysis(
        effective_counter_term_days=effective_counter_term,
        zone=zone,
        zone_rationale=zone_rationale,
        gap_vs_target_days=gap_vs_target_days,
        cash_gap_vs_target=cash_gap_vs_target,
        gross_unlock=gross_unlock,
        gross_unlock_formula=gross_unlock_formula,
        economic_profit=economic_profit,
        supplier_implied_financing_rate_pct=supplier_implied_financing_rate_pct,
        ramp_foregone_unlock=ramp_foregone_unlock,
        scf_viable=scf_viable,
        scf_rate_spread_pts=scf_rate_spread_pts,
        scf_undercuts_implied_rate=scf_undercuts_implied_rate,
        verdict=verdict,
        verdict_rationale=verdict_rationale,
        notes=notes,
    )


def _determine_zone(
    effective_counter_term: float | None,
    target_term: int | None,
    effective_fallback: int | None,
    current_term: int | None,
) -> tuple[str | None, str | None]:
    if effective_counter_term is None:
        return None, None

    if target_term is not None and effective_counter_term >= target_term:
        return "accept", (
            f"Counter ({effective_counter_term:.0f}d) meets or exceeds our target ({target_term}d)."
        )

    if effective_fallback is not None and effective_counter_term >= effective_fallback:
        return "counter", (
            f"Counter ({effective_counter_term:.0f}d) is above the BATNA "
            f"({effective_fallback}d) but below our target ({target_term}d) — room to push further."
        )

    if current_term is not None and effective_counter_term > current_term:
        return "borderline", (
            f"Counter ({effective_counter_term:.0f}d) is above current terms ({current_term}d) "
            f"but below the BATNA ({effective_fallback}d) — below our stated floor."
        )

    return "reject", (
        f"Counter ({effective_counter_term:.0f}d) is at or below the current term "
        f"({current_term}d) — accepting would be equal to or worse than the status quo."
    )


def _economic_profit_of_counter(
    extraction: CounterOfferExtraction,
    facts: SupplierFacts,
    counter_term: float | None,
) -> EconomicProfitAnalysis | None:
    """The counter's price-for-terms value, or None when it carries no price.

    Built as a `ScenarioRequest` and run through `run_economic_profit_scenarios`
    - the scenario surface's own binding - rather than calling the pure
    calculator directly, so the missing-spend / missing-baseline handling is
    the one the scenario surface already has, not a second copy of it.
    """
    premium = parse_price_change(extraction.price_premium_pct)
    discount = parse_price_change(extraction.cash_discount_pct)
    if premium is None and discount is None:
        return None
    if counter_term is None:
        return EconomicProfitAnalysis(
            calc_type=CALC_ECONOMIC_PROFIT,
            error=(
                "The counter-offer's payment term could not be resolved, so the "
                "price condition attached to it cannot be valued."
            ),
        )

    if premium is not None:
        return run_economic_profit_scenarios(
            facts,
            ScenarioRequest(
                calc_type=CALC_ECONOMIC_PROFIT,
                scenarios=[
                    EconomicProfitScenarioSpec(
                        label=f"{int(counter_term)} days at the +{_percent(premium)} premium",
                        target_term_days=counter_term,
                        price_change=abs(premium),
                    )
                ],
            ),
        )

    # A cash discount is an OPTION the buyer may take: pay early, pay less.
    # Its value is the better of declining it (the counter term, full price)
    # and taking it (the early-payment day, discounted price).
    if extraction.early_payment_days is None:
        return EconomicProfitAnalysis(
            calc_type=CALC_ECONOMIC_PROFIT_COMPARE,
            error=(
                "The early-payment window for the cash discount was not stated, "
                "so taking the discount cannot be valued against the counter term."
            ),
        )
    return run_economic_profit_scenarios(
        facts,
        ScenarioRequest(
            calc_type=CALC_ECONOMIC_PROFIT_COMPARE,
            scenarios=[
                EconomicProfitScenarioSpec(
                    label=f"{int(counter_term)} days, discount declined",
                    target_term_days=counter_term,
                    price_change=Decimal(0),
                ),
                EconomicProfitScenarioSpec(
                    label=(
                        f"pay at {int(extraction.early_payment_days)} days and take "
                        f"the {_percent(discount)} discount"
                    ),
                    target_term_days=extraction.early_payment_days,
                    price_change=-abs(discount),
                ),
            ],
        ),
    )


def _percent(fraction: Decimal) -> str:
    text = f"{abs(fraction) * 100:.2f}".rstrip("0").rstrip(".")
    return f"{text}%"


def _determine_verdict(
    zone: str | None,
    extraction: CounterOfferExtraction,
    economic_profit: EconomicProfitAnalysis | None,
    scf_viable: bool,
    scf_undercuts_implied_rate: bool,
) -> tuple[str, str]:
    if extraction.price_premium_pct is not None:
        premium_outcome = (
            economic_profit.scenarios[0].result.financial_outcome
            if economic_profit is not None and not economic_profit.error
            and economic_profit.scenarios
            else None
        )
        # The premium cannot be valued (spend or baseline missing). Fail SAFE:
        # a premium nobody has priced is never waved through on the days alone,
        # which is what the old fall-through to the zone verdict did.
        if premium_outcome is None:
            return "borderline", (
                "The price premium could not be valued, so whether the extension "
                "is worth it is unknown - this needs judgment before accepting."
            )
        # The premium costs more than the extra days are worth.
        if premium_outcome == FINANCIALLY_NEGATIVE:
            # Said in code, not left to the model: staying where we are is
            # ALWAYS available and is worth exactly zero, so a deal worth less
            # than zero is worse than no deal - whatever the BATNA says. A real
            # answer argued the opposite ("there is no viable BATNA, so
            # accept"), treating the absence of an alternative NEGOTIATION as
            # the absence of an alternative OUTCOME.
            current = economic_profit.scenarios[0].result.contract_terms
            return "counter_reject_premium", (
                "The price premium costs more after tax than the extra payment days "
                "are worth at our cost of capital - the trade destroys value. Staying "
                f"on the current {current}-day terms (an economic profit of zero) is "
                "worth more than accepting, so having no BATNA is no reason to take "
                "it. Reject the premium and counter on days, or at a premium below "
                "the break-even."
            )
        if premium_outcome == BREAK_EVEN:
            return "borderline", (
                "The price premium almost exactly offsets the value of the extra "
                "payment days - financially neutral, so the decision rests on the "
                "negotiation position, not the arithmetic."
            )
        # Financially positive. SCF may still be a cheaper way to give the
        # supplier the liquidity they are charging the premium for.
        if scf_viable and scf_undercuts_implied_rate:
            return "counter_with_scf", (
                "The premium is financially positive for us, but our SCF programme "
                "gives the supplier the same liquidity for less than the premium "
                "charges - offer SCF in place of the premium."
            )
        if zone == "reject":
            return "reject", (
                "The days are at or below the current term, so there is no "
                "extension for the premium to buy - reject outright."
            )
        if zone == "borderline":
            return "borderline", (
                "The premium is financially positive, but the days sit below the "
                "BATNA - requires careful judgment before accepting."
            )
        if zone == "accept":
            return "accept", (
                "The days meet our target and the premium stays below its "
                "break-even - the trade is financially positive under our "
                "assumptions. Consider accepting."
            )
        # zone == "counter"
        return "counter_push_days", (
            "The premium is financially positive, but the days are below target - "
            "push for better terms before accepting."
        )

    # Ramp with accepted days — push for a shorter or immediate switch
    if extraction.ramp_months is not None and extraction.accepts_proposed_days:
        return "counter_push_days", (
            "Supplier accepted the term but wants a phased ramp — "
            "push for a shorter phase-in period or an immediate switch."
        )

    # Pure days — verdict follows the zone directly
    _ZONE_VERDICTS = {
        "accept": ("accept", "Counter meets or exceeds our target term."),
        "counter": ("counter_push_days", "Above the BATNA but below target — push further."),
        "borderline": ("borderline", "Above current term but below the BATNA — requires judgment."),
        "reject": ("reject", "At or below current term — accepting would worsen the status quo."),
    }
    if zone in _ZONE_VERDICTS:
        return _ZONE_VERDICTS[zone]

    return "unclear", "Could not determine a clear verdict from the available information."
