"""A counter-offer's price condition is valued by the buyer economic-profit model.

The regression this guards (2026-09-21, a real session): "the supplier offers
90 days with a 2% increase - should I accept?" came back ACCEPT, "net positive
unlock of $1.86M". The counter-offer calculator had subtracted the ANNUAL cost
of the premium ($1.77M) from the ONE-OFF working-capital swing ($3.63M) - two
figures in different units - and quoted an "implied annualized cost of the
premium" of 48.67% that the drafting model then read as the buyer's own return.

Valued properly the deal destroys ~$0.8M a year: a 2% premium against a
break-even of ~0.52% for 75 -> 90 days. The counter-offer surface now runs the
same model, through the same binding, as `run_scenario`, so the two cannot
give different answers to the same deal.
"""
from __future__ import annotations

from dataclasses import replace
from decimal import Decimal

import pytest

from domain.entities.counter_offer import CounterOfferExtraction
from domain.entities.economic_profit import (
    CALC_ECONOMIC_PROFIT,
    EconomicProfitScenarioSpec,
    FINANCIALLY_NEGATIVE,
    FINANCIALLY_POSITIVE,
)
from domain.entities.scenario import ScenarioRequest
from domain.services.brief_builder import brief_from
from domain.services.counter_offer_calculator import analyze_counter_offer
from domain.services.scenario_calculator import run_economic_profit_scenarios
from tests.unit.prompt_fixtures import rich_facts
from utils.prompts.evaluate_counter_offer_prompt import (
    _calculation_block,
    counter_offer_response_system_prompt,
)


def _facts(**kw):
    """The reported supplier, as far as the answer's own figures pin it down:
    $3.63M gross unlock and $1.77M for 2% put spend at ~$88.4M and the move at
    15 days, 75 -> 90."""
    base = dict(
        supplier_name="Cognizant Worldwide Limited",
        spend_volume=88_400_000.0,
        current_term_days=75,
        target_term_days=90,
        opportunity_term_days=90,
    )
    base.update(kw)
    return replace(rich_facts(), **base)


def _premium(pct, **kw) -> CounterOfferExtraction:
    return CounterOfferExtraction(
        counter_type="days_with_price_premium",
        accepts_proposed_days=True,
        price_premium_pct=pct,
        **kw,
    )


def _analyse(extraction, facts=None):
    facts = facts or _facts()
    return analyze_counter_offer(extraction, facts, brief_from(facts).arguments)


# ── the reported case ─────────────────────────────────────────────────────


def test_a_premium_past_its_break_even_is_rejected_not_accepted():
    ca = _analyse(_premium(0.02))
    result = ca.economic_profit.scenarios[0].result
    assert result.financial_outcome == FINANCIALLY_NEGATIVE
    assert result.economic_profit == Decimal("-823694.25")
    assert ca.economic_profit.break_even_price_change == pytest.approx(
        Decimal("0.00522"), abs=Decimal("0.00001")
    )
    # Days meet the target exactly - and it is STILL not an accept, because
    # the premium buys those days at a loss.
    assert ca.zone == "accept"
    assert ca.verdict == "counter_reject_premium"


def test_a_premium_under_its_break_even_is_not_rejected_for_the_premium():
    ca = _analyse(_premium(0.003))
    assert ca.economic_profit.scenarios[0].result.financial_outcome == FINANCIALLY_POSITIVE
    assert ca.verdict != "counter_reject_premium"


def test_the_counter_offer_and_the_scenario_surface_value_a_deal_identically():
    """One model, one binding. The same deal asked as a what-if and relayed as
    a counter-offer must come back with the same economic profit."""
    ca = _analyse(_premium(0.02))
    scenario = run_economic_profit_scenarios(
        _facts(),
        ScenarioRequest(
            calc_type=CALC_ECONOMIC_PROFIT,
            scenarios=[
                EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.02"))
            ],
        ),
    )
    assert (
        ca.economic_profit.scenarios[0].result.economic_profit
        == scenario.scenarios[0].result.economic_profit
    )
    assert ca.economic_profit.break_even_price_change == scenario.break_even_price_change


def test_a_premium_that_cannot_be_valued_is_never_waved_through():
    """No spend, no valuation. The old code fell through to the zone verdict
    and could ACCEPT an unpriced premium on the days alone."""
    ca = _analyse(_premium(0.02), facts=_facts(spend_volume=None))
    assert ca.economic_profit.error
    assert ca.verdict == "borderline"


def test_a_premium_extracted_as_percentage_points_is_normalised():
    """"2%" returned as 2 instead of 0.02 would otherwise price a 200% premium."""
    slipped = _analyse(_premium(2)).economic_profit.scenarios[0].result
    exact = _analyse(_premium(0.02)).economic_profit.scenarios[0].result
    assert slipped.economic_profit == exact.economic_profit


# ── a cash discount is the buyer's option, not a cost ──────────────────────


def test_a_cash_discount_is_valued_as_an_option_against_declining_it():
    ca = _analyse(
        CounterOfferExtraction(
            counter_type="days_with_cash_discount",
            counter_term_days=90,
            cash_discount_pct=0.02,
            early_payment_days=10,
        )
    )
    decline, take = (s.result for s in ca.economic_profit.scenarios)
    assert decline.target_terms == 90 and decline.price_change_pct == 0
    assert take.target_terms == 10 and take.price_change_pct == Decimal("-0.02")
    # The discount itself is a GAIN to the buyer - it used to be filed as an
    # "annual exposure" cost.
    assert take.after_tax_operating_profit_change > 0
    assert ca.economic_profit.difference == decline.economic_profit - take.economic_profit
    # And an option the buyer can decline never makes the counter a
    # premium rejection.
    assert ca.verdict != "counter_reject_premium"


def test_a_cash_discount_with_no_early_payment_window_says_what_is_missing():
    ca = _analyse(
        CounterOfferExtraction(
            counter_type="days_with_cash_discount",
            counter_term_days=90,
            cash_discount_pct=0.02,
        )
    )
    assert "early-payment window" in ca.economic_profit.error


# ── what the drafting model is shown ───────────────────────────────────────


def test_the_drafting_model_is_given_the_valuation_and_not_the_unit_error():
    block = _calculation_block(_analyse(_premium(0.02)))
    assert "Net economic profit: -$823.7K" in block
    assert "Break-even price change for the 90-day move: +0.52%" in block
    assert "NOT profit" in block
    # The two figures that produced the wrong ACCEPT are gone from the prompt.
    for gone in ("Net working-capital unlock", "Implied annualized cost", "48.67"):
        assert gone not in block, gone


def test_the_supplier_implied_rate_is_used_for_scf_but_never_shown():
    ca = _analyse(_premium(0.02))
    assert ca.supplier_implied_financing_rate_pct == pytest.approx(48.67, abs=0.01)
    assert f"{ca.supplier_implied_financing_rate_pct:.2f}" not in _calculation_block(
        ca, scf_offerable=True
    )


def test_the_system_prompt_forbids_netting_the_unlock_against_the_premium():
    assert "NEVER subtract one from the other" in counter_offer_response_system_prompt
    assert "net unlock" in counter_offer_response_system_prompt.lower()


# ── no BATNA is not a reason to accept ────────────────────────────────────


def test_the_users_exact_figures_reproduce_to_the_dollar():
    """Spend $88,327,756, 75 -> 90, +2%: the numbers the user worked by hand."""
    ca = _analyse(_premium(0.02), facts=_facts(spend_volume=88_327_756.0))
    r = ca.economic_profit.scenarios[0].result
    assert r.after_tax_operating_profit_change == Decimal("-1148260.83")
    assert r.cash_flow_impact == Decimal("4065496.72")
    assert r.value_of_invested_capital == Decimal("325239.74")
    assert r.economic_profit == Decimal("-823021.09")


def test_a_value_destroying_premium_says_staying_put_beats_it():
    """The wrong answer said "there is no viable BATNA, so accept". Staying on
    the current terms is always available and worth zero, so a negative deal
    loses to no deal - the rationale states it, deterministically."""
    ca = _analyse(_premium(0.02))
    assert ca.verdict == "counter_reject_premium"
    assert "current 75-day terms" in ca.verdict_rationale
    assert "no BATNA is no reason" in ca.verdict_rationale


def test_the_system_prompt_forbids_no_batna_therefore_accept():
    assert "NO BATNA NEVER MEANS ACCEPT" in counter_offer_response_system_prompt
