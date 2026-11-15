"""Unit tests for the consolidated argument engine and its shared ANALYSIS block.

Two contracts are pinned here:

  * Pay-on-Terms is assessed ONCE, in the domain, as a TRUST argument — the
    "may we say this to the supplier?" call travels with it, and the figures
    behind it never reach supplier-facing text;
  * every intent that reasons over a supplier renders the SAME analysis block —
    which is the point of `utils.prompts.brief.posture`. Before it existed each
    prompt carried its own copy and they had drifted apart.
"""
from __future__ import annotations

import inspect

import pytest

from domain.entities.analysis import (
    PAY_ON_TERMS_SUPPLIER_FACING_WORDING,
)
from domain.entities.counter_offer import CounterOfferExtraction
from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.services.counter_offer_calculator import analyze_counter_offer
from domain.entities.argument_catalog import ARGUMENT_CATALOG
from domain.services.brief_builder import brief_from
from domain.services.negotiation_arguments import (
    analyze_supplier,
    assess_client_supplier_relationship,
    assess_cost_impact,
    assess_dso_alignment,
    assess_payment_reliability,
    build_argument_analysis,
    collect_supporting_arguments,
    rank_business_priority,
)
from domain.services.opening_strategy_analysis import analyze_opening_strategy
from tests.unit.prompt_fixtures import explain_block, pitch_block
from utils.prompts.brief.posture import (
    FLOOR_INTERNAL,
    FLOOR_NONE,
    render_posture,
)


def _facts(**kw) -> SupplierFacts:
    base = dict(
        supplier_name="Acme",
        country="DE",
        industry="Manufacturing",
        company_size="large",
        target_term_days=90,
        current_term_days=60,
        batna_term_days=70,
        benchmark_term_days=48,
        regulatory_max_term_days=None,
        supplier_financing_rate=0.11,
        spend_volume=4_000_000,
        target_cash_flow=250_000,
        buyer_leverage_level="high",

        strategy_benchmarks=[
            StrategyBenchmark(
                name="parentOrSupplierMax", label="parent/supplier max", value=95, applied=True
            ),
            StrategyBenchmark(
                name="peerGroupStandard", label="peer group", value=90, occurrences=12
            ),
        ],
    )
    base.update(kw)
    return SupplierFacts(**base)


# ── payment behaviour: Pay-on-Terms as a trust argument ────────────────────
#
# variance = actual payment days − Pay-on-Terms; <=0 strong, <=tolerance usable,
# beyond that never volunteered (client rule).


def test_paying_before_terms_is_a_strong_argument():
    pr = assess_payment_reliability(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=54))
    assert pr.status == "on_or_before_terms"
    assert pr.usable_as_argument is True
    assert pr.variance_days == -6


def test_paying_exactly_on_terms_is_usable():
    pr = assess_payment_reliability(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=60))
    assert pr.status == "on_or_before_terms"
    assert pr.usable_as_argument is True
    assert pr.variance_days == 0


@pytest.mark.parametrize("actual, variance", [(61, 1), (62, 2)])
def test_a_slip_inside_the_tolerance_is_still_usable(actual, variance):
    pr = assess_payment_reliability(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=actual))
    assert pr.status == "minor_variance"
    assert pr.usable_as_argument is True
    assert pr.variance_days == variance


def test_paying_beyond_the_tolerance_is_never_usable():
    pr = assess_payment_reliability(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=63))
    assert pr.status == "behind_terms"
    assert pr.usable_as_argument is False
    assert pr.variance_days == 3


def test_tolerance_is_configurable():
    facts = _facts(pay_on_terms_term_days=60, actual_payment_terms_days=63)
    assert assess_payment_reliability(facts, tolerance_days=5).status == "minor_variance"
    assert assess_payment_reliability(facts, tolerance_days=0).status == "behind_terms"


@pytest.mark.parametrize(
    "kw",
    [
        {"pay_on_terms_term_days": None, "actual_payment_terms_days": 55},
        {"pay_on_terms_term_days": 60, "actual_payment_terms_days": None},
        {"pay_on_terms_term_days": None, "actual_payment_terms_days": None},
    ],
)
def test_missing_either_input_is_unavailable(kw):
    pr = assess_payment_reliability(_facts(**kw))
    assert pr.status == "unavailable"
    assert pr.usable_as_argument is False
    assert pr.variance_days is None


def test_the_baseline_is_never_compared_against_itself():
    """`current_term_days` falls back to payOnTerms when there is no spend data.

    Reading the actual-payment side off that field would compare the baseline
    with itself, yield a variance of 0 and claim reliability we have no evidence
    for — so the assessment reads `actual_payment_terms_days`, which stays None.
    """
    facts = _facts(
        pay_on_terms_term_days=60,
        current_term_days=60,          # fell back to payOnTerms upstream
        actual_payment_terms_days=None,  # no spend-weighted actual figure
    )
    pr = assess_payment_reliability(facts)
    assert pr.status == "unavailable"
    assert pr.usable_as_argument is False


def test_dso_has_no_bearing_on_the_assessment():
    """DSO is a different measure with its own treatment coming — Pay-on-Terms
    only. A wildly bad DSO cannot touch the verdict, and the assessment carries
    no DSO field at all."""
    pr = assess_payment_reliability(
        _facts(pay_on_terms_term_days=60, actual_payment_terms_days=55, dso=95)
    )
    assert pr.usable_as_argument is True
    assert pr.status == "on_or_before_terms"
    assert not hasattr(pr, "dso")


def test_argument_sequence_uses_our_payment_record_only_when_it_helps():
    on_terms = _facts(pay_on_terms_term_days=60, actual_payment_terms_days=55)
    late = _facts(pay_on_terms_term_days=60, actual_payment_terms_days=70)
    assert "payment_reliability" in [s.label for s in analyze_supplier(on_terms).argument_sequence]
    assert "payment_reliability" not in [s.label for s in analyze_supplier(late).argument_sequence]


def test_the_payment_reliability_step_proposes_no_term():
    """It removes an objection to the ask; it never argues for a longer term."""
    facts = _facts(pay_on_terms_term_days=60, actual_payment_terms_days=55)
    step = next(
        s for s in analyze_supplier(facts).argument_sequence
        if s.label == "payment_reliability"
    )
    assert step.term_days is None


# ── DSO: contractual current vs DSO vs the ask ─────────────────────────────
#
# dso > current → usable leverage (stepping_stone if still below ask,
# at_or_above_ask when DSO already reaches it). Otherwise no claim.


def test_dso_above_contract_below_ask_is_stepping_stone_leverage():
    """current 60, DSO 75, ask 90 — the user's worked example."""
    da = assess_dso_alignment(
        _facts(current_term_days=60, dso=75, target_term_days=90)
    )
    assert da.status == "stepping_stone"
    assert da.usable_as_argument is True
    assert da.current_term_days == 60
    assert da.dso == 75
    assert da.proposed_term_days == 90
    assert "leverage" in (da.supplier_facing_wording or "").lower()
    assert "60" in (da.supplier_facing_wording or "")
    assert "75" in (da.supplier_facing_wording or "")
    assert "90" in (da.supplier_facing_wording or "")


def test_dso_already_at_or_above_the_ask_is_still_usable():
    da = assess_dso_alignment(
        _facts(current_term_days=60, dso=95, target_term_days=90)
    )
    assert da.status == "at_or_above_ask"
    assert da.usable_as_argument is True


def test_dso_at_or_below_contract_cannot_claim_leverage():
    da = assess_dso_alignment(
        _facts(current_term_days=60, dso=40, target_term_days=90)
    )
    assert da.status == "at_or_below_contract"
    assert da.usable_as_argument is False
    assert da.supplier_facing_wording is None


def test_dso_alignment_uses_the_opportunity_term_when_one_is_modelled():
    """The ask on the table is what the pitch names."""
    da = assess_dso_alignment(
        _facts(
            current_term_days=60,
            target_term_days=60,
            opportunity_term_days=90,
            dso=75,
        )
    )
    assert da.proposed_term_days == 90
    assert da.status == "stepping_stone"
    assert da.usable_as_argument is True


@pytest.mark.parametrize(
    "kw",
    [
        {"dso": None},
        {"dso": 75, "current_term_days": None},
        {"dso": 75, "target_term_days": None, "opportunity_term_days": None},
    ],
)
def test_dso_alignment_unavailable_without_all_three_figures(kw):
    da = assess_dso_alignment(_facts(**kw))
    assert da.status == "unavailable"
    assert da.usable_as_argument is False
    assert da.gap_days is None


def test_dso_and_pay_on_terms_are_independent_assessments():
    """Different figures, different arguments: one cannot mask the other."""
    facts = _facts(
        current_term_days=60, target_term_days=90, dso=75,  # leverage usable
        pay_on_terms_term_days=30, actual_payment_terms_days=45,  # we pay late
    )
    analysis = analyze_supplier(facts)
    assert analysis.dso_alignment.usable_as_argument is True
    assert analysis.payment_reliability.usable_as_argument is False


def test_dso_step_proposes_no_term_and_names_leverage():
    facts = _facts(current_term_days=60, dso=75, target_term_days=90)
    step = next(
        s for s in analyze_supplier(facts).argument_sequence if s.label == "dso_alignment"
    )
    assert step.term_days is None
    assert "leverage" in step.argument.lower()


def test_no_dso_step_when_dso_is_not_above_contract():
    labels = [
        s.label
        for s in analyze_supplier(
            _facts(current_term_days=60, target_term_days=90, dso=40)
        ).argument_sequence
    ]
    assert "dso_alignment" not in labels


def test_argument_block_offers_the_filled_dso_wording_when_usable():
    from domain.entities.analysis import dso_supplier_facing_wording

    block = pitch_block(_facts(current_term_days=60, dso=75, target_term_days=90))
    assert "- DSO Alignment" in block
    assert dso_supplier_facing_wording(60, 75, 90) in block


def test_argument_block_blocks_the_leverage_claim_when_dso_is_not_above_contract():
    """An assessment that fails its gate vanishes from the supporting set, and
    "absent" is not an instruction — so it is named under RULED OUT with the
    claim not to make."""
    block = pitch_block(_facts(current_term_days=60, target_term_days=90, dso=40))
    assert "RULED OUT" in block
    assert "Although contractual terms are" not in block
    assert "DO NOT claim payment already runs past the contract" in block


@pytest.mark.parametrize("dso", [75, 40, None])
def test_argument_block_always_states_dso_is_not_a_benchmark(dso):
    """Usable, ruled out or absent — what DSO is NOT travels with it."""
    block = pitch_block(_facts(target_term_days=90, dso=dso))
    assert "NOT a payment-term benchmark" in block


# ── cost impact: the client's own formula ─────────────────────────────────
#
# Carlos, 2026-08-18:
#   Supplier Economic Profit = cash_flow_opportunity x supplier_WACC
#                            + price_change% x volume_change x (1 - tax_rate)
#   Cost Impact %            = Supplier Economic Profit / spend_volume
#
# Defaults where the payload has nothing: WACC 9%, tax rate 35%. Usable only
# while the result is small enough to argue with.
#
# Fixture: cash flow 250,000 · spend 4,000,000.


def test_cost_impact_uses_the_clients_formula():
    ci = assess_cost_impact(_facts(wacc_after_tax=0.08))
    # 250,000 x 0.08 / 4,000,000 = 0.005
    assert ci.supplier_economic_profit == pytest.approx(250_000 * 0.08)
    assert ci.cost_impact_ratio == pytest.approx(0.005)
    assert ci.cost_impact_percent == 0.5
    assert ci.status == "limited"
    assert ci.usable_as_argument is True


def test_the_wacc_defaults_to_nine_percent_and_says_so():
    """A figure resting on an assumed rate has to declare the assumption."""
    ci = assess_cost_impact(_facts(wacc_after_tax=None))
    assert ci.supplier_wacc == 0.09
    assert ci.cost_impact_percent == pytest.approx(0.56, abs=0.01)
    assert any("9%" in a for a in ci.assumptions)
    assert "9% default is used" in ci.rationale


def test_the_calculation_is_shown():
    """Carlos's actual ask on the deck was "Good argument how did you
    calculate?" — the arithmetic travels with the figure."""
    ci = assess_cost_impact(_facts(wacc_after_tax=0.08))
    assert "cash-flow opportunity" in ci.calculation
    assert "WACC" in ci.calculation
    assert "spend" in ci.calculation
    assert ci.calculation in ci.rationale


def test_a_price_and_volume_change_enters_the_second_term():
    """Scenario inputs; zero for a plain term extension, so the term drops out."""
    plain = assess_cost_impact(_facts(wacc_after_tax=0.08))
    scenario = assess_cost_impact(
        _facts(wacc_after_tax=0.08), price_change_pct=0.02, volume_change=500_000,
    )
    assert scenario.cost_impact_ratio > plain.cost_impact_ratio
    # 250,000*0.08 + 0.02*500,000*(1-0.35) = 20,000 + 6,500
    assert scenario.supplier_economic_profit == pytest.approx(20_000 + 6_500)
    # ...and only then is the tax-rate assumption declared.
    assert any("tax rate" in a for a in scenario.assumptions)
    assert plain.assumptions == () or all("tax" not in a for a in plain.assumptions)


def test_a_material_cost_is_never_offered_as_a_small_one():
    ci = assess_cost_impact(_facts(wacc_after_tax=0.50))   # 250k*0.5/4m = 3.13%
    assert ci.status == "material"
    assert ci.usable_as_argument is False
    assert ci.supplier_facing_wording is None
    assert ci.cost_impact_percent > 2.0


def test_cost_impact_ceiling_is_configurable():
    facts = _facts(wacc_after_tax=0.50)
    assert assess_cost_impact(facts, limited_ceiling_percent=5.0).status == "limited"
    assert assess_cost_impact(facts, limited_ceiling_percent=0.5).status == "material"


@pytest.mark.parametrize("proposed", [60, 45])
def test_no_cost_impact_when_the_proposal_is_not_an_extension(proposed):
    ci = assess_cost_impact(_facts(target_term_days=proposed, current_term_days=60))
    assert ci.status == "no_extension"
    assert ci.usable_as_argument is False


def test_cost_impact_unavailable_without_the_inputs_it_divides_by():
    """Never estimate, and never divide by nothing."""
    for kw in ({"spend_volume": None}, {"spend_volume": 0}, {"target_cash_flow": None}):
        ci = assess_cost_impact(_facts(**kw))
        assert ci.status == "unavailable"
        assert ci.usable_as_argument is False
        assert ci.cost_impact_percent is None


def test_cost_impact_wording_carries_the_percentage_but_not_the_rate():
    ci = assess_cost_impact(_facts(wacc_after_tax=0.08))
    assert "0.5%" in ci.supplier_facing_wording
    # "of spend", not "of invoice value" — Joel flagged the invoice basis, and
    # the formula divides by spend volume.
    assert "spend" in ci.supplier_facing_wording
    assert "invoice value" not in ci.supplier_facing_wording
    # the WACC itself is internal, in every rendering
    for rate_form in ("8%", "0.08", "8.00%"):
        assert rate_form not in ci.supplier_facing_wording


def test_cost_impact_step_is_reserve_context_and_proposes_no_term():
    """The step says WHEN to deploy the argument, not what it says — the figure
    and the wording live in the argument block, once."""
    facts = _facts(wacc_after_tax=0.08)
    step = next(
        s for s in analyze_supplier(facts).argument_sequence if s.label == "cost_impact"
    )
    assert step.term_days is None
    assert "Cost Impact" in step.argument
    assert "0.5%" not in step.argument


def test_no_cost_impact_step_when_the_cost_is_material():
    facts = _facts(wacc_after_tax=0.50)
    labels = [s.label for s in analyze_supplier(facts).argument_sequence]
    assert "cost_impact" not in labels


def test_argument_block_offers_the_priced_sentence_when_the_cost_is_small():
    block = pitch_block(_facts(wacc_after_tax=0.08))
    assert "- Cost Impact" in block
    assert "0.5%" in block


def test_argument_block_withholds_the_figure_when_the_cost_is_material():
    block = pitch_block(_facts(wacc_after_tax=0.50))
    assert "RULED OUT" in block
    assert "DO NOT quantify the cost to the supplier" in block


# ── relationship: the partnership as an argument ───────────────────────────
#
# Scored from spend, supplier size and the two leverage ratings. High/Medium is
# usable; Low is not — an overstated relationship claim is one the supplier can
# price.


def test_strategic_spend_with_buyer_leverage_scores_high():
    r = assess_client_supplier_relationship(
        _facts(spend_volume=120_000_000, company_size="large",
               buyer_leverage_level="high")
    )
    assert r.strength == "High"          # 3 + 1 + 1 + 0.5
    assert r.usable_as_argument is True
    assert r.negotiation_tone == "assertive"
    assert "high strategic spend relationship" in r.rationale


def test_significant_spend_scores_medium():
    r = assess_client_supplier_relationship(
        _facts(spend_volume=30_000_000, company_size="large",
               buyer_leverage_level="medium")
    )
    assert r.strength == "Medium"        # 2 + 1
    assert r.usable_as_argument is True
    assert r.negotiation_tone == "collaborative"


def test_small_spend_against_a_strong_supplier_is_not_usable():
    r = assess_client_supplier_relationship(
        _facts(spend_volume=5_000_000, company_size="medium",
               buyer_leverage_level="low")
    )
    assert r.strength == "Low"           # 1 + 0.5 − 1 − 1
    assert r.usable_as_argument is False
    assert r.negotiation_tone == "empathetic"


def test_ratings_are_matched_case_insensitively():
    """The payload sends "LARGE" and "large", "High" and "high" — comparing the
    raw strings would silently skip the scoring and flatten every supplier."""
    upper = assess_client_supplier_relationship(
        _facts(spend_volume=120_000_000, company_size="LARGE",
               buyer_leverage_level="HIGH")
    )
    lower = assess_client_supplier_relationship(
        _facts(spend_volume=120_000_000, company_size="large",
               buyer_leverage_level="high")
    )
    assert upper.strength == lower.strength == "High"
    assert upper.negotiation_tone == lower.negotiation_tone == "assertive"


def test_posture_follows_our_own_leverage_only():
    """Client, 2026-08-03: the supplier's rating no longer moves the posture.

    It used to force "empathetic" on its own, so a strong buyer position with a
    strong supplier opposite it came out sounding apologetic.
    """
    def tone(level):
        return assess_client_supplier_relationship(
            _facts(spend_volume=120_000_000, company_size="large",
                   buyer_leverage_level=level)
        ).negotiation_tone

    assert tone("high") == "assertive"
    assert tone("medium") == "collaborative"
    assert tone("low") == "empathetic"


def test_missing_signals_degrade_to_low_and_unusable():
    r = assess_client_supplier_relationship(
        _facts(spend_volume=None, company_size=None,
               buyer_leverage_level=None)
    )
    assert r.strength == "Low"
    assert r.usable_as_argument is False
    assert r.rationale == []


def test_the_pitch_carries_no_figures():
    """Spend and leverage are internal; the pitch is the only sayable part."""
    for kw in (
        dict(spend_volume=120_000_000, buyer_leverage_level="high"),
        dict(spend_volume=30_000_000, buyer_leverage_level="medium"),
    ):
        r = assess_client_supplier_relationship(_facts(company_size="large", **kw))
        assert r.pitch
        assert not any(ch.isdigit() for ch in r.pitch)


def test_relationship_step_appears_only_when_usable():
    strong = _facts(spend_volume=120_000_000, company_size="large",
                    buyer_leverage_level="high")
    weak = _facts(spend_volume=5_000_000, company_size="medium",
                  buyer_leverage_level="low")
    assert "relationship" in [s.label for s in analyze_supplier(strong).argument_sequence]
    assert "relationship" not in [s.label for s in analyze_supplier(weak).argument_sequence]


def test_relationship_step_proposes_no_term():
    facts = _facts(spend_volume=120_000_000, company_size="large",
                   buyer_leverage_level="high")
    step = next(
        s for s in analyze_supplier(facts).argument_sequence if s.label == "relationship"
    )
    assert step.term_days is None


def test_posture_block_marks_the_posture_as_not_the_wording_style():
    """A computed posture must not read as licence to override the tone the
    negotiator picked in the UI.

    The posture stays in the ANALYSIS block — it is a stance for the whole
    conversation, not an argument. The relationship AS an argument moved to the
    argument block with the rest of them.
    """
    block = render_posture(
        brief_from(
            _facts(spend_volume=120_000_000, company_size="large",
                   buyer_leverage_level="high")
        )
    )
    assert "Recommended Posture: assertive" in block
    assert "from a High relationship" in block
    assert "selected TONE still governs the words" in block


def test_argument_block_withholds_a_weak_relationship_claim():
    block = pitch_block(
        _facts(spend_volume=5_000_000, company_size="medium",
               buyer_leverage_level="low")
    )
    assert "RULED OUT" in block
    assert "DO NOT lean on the relationship" in block


# ── the presented argument set ────────────────────────────────────────────
#
# Client ranking when everything supports: buyerStandard, supplierStandard,
# parentOrSupplierMax, peerGroupStandard, industryRegionStandard,
# dso, payOnTerms, costImpact (relationship last).


def _everything_supports() -> SupplierFacts:
    return _facts(
        target_term_days=90, current_term_days=60,
        spend_volume=120_000_000, company_size="large",
        buyer_leverage_level="high",
        supplier_financing_rate=0.11,
        pay_on_terms_term_days=60, actual_payment_terms_days=55,
        dso=95,
        strategy_benchmarks=[
            StrategyBenchmark(name="industryRegionStandard", label="industry", value=99),
            StrategyBenchmark(name="peerGroupStandard", label="peer", value=98, occurrences=12),
            StrategyBenchmark(name="parentOrSupplierMax", label="parent max", value=97),
            StrategyBenchmark(name="supplierStandard", label="own segment", value=96),
            StrategyBenchmark(name="buyerStandard", label="buyer standard", value=95),
        ],
    )


def test_all_supporting_arguments_come_back_in_the_client_ranking():
    """Source order, NOT day-count order — here the ranking is the exact
    inverse of the figures, so a day-count sort would fail this.

    Relationship is omitted when stronger arguments are already present
    (client 2026-09-10).
    """
    keys = [a.key for a in collect_supporting_arguments(_everything_supports())]
    assert keys == [
        "buyerStandard",
        "supplierStandard",
        "parentOrSupplierMax",
        "peerGroupStandard",
        "industryRegionStandard",
        "dso",
        "payOnTerms",
        "costImpact",
    ]
    assert "relationship" not in keys


def test_every_argument_carries_both_wordings():
    for a in collect_supporting_arguments(_everything_supports()):
        assert a.meaning, a.key
        assert a.title, a.key
        if a.definition.internal_only:
            # Withheld at the catalogue rather than gated at each reader — an
            # internal-only argument has no sayable wording to leak.
            assert a.supplier_pitch is None, a.key
            assert a.sayable is False, a.key
        else:
            assert a.supplier_pitch, a.key


def test_a_benchmark_below_the_ask_is_not_an_argument_at_all():
    f = _facts(
        target_term_days=90, current_term_days=60,
        strategy_benchmarks=[
            StrategyBenchmark(name="buyerStandard", label="buyer standard", value=95),
            StrategyBenchmark(name="industryRegionStandard", label="industry", value=55),
        ],
    )
    keys = [a.key for a in collect_supporting_arguments(f)]
    assert "buyerStandard" in keys
    assert "industryRegionStandard" not in keys


def test_unusable_assessments_are_left_out():
    """Late payment, a term past their cycle, a material cost, a weak
    relationship — none of them are arguments."""
    f = _facts(
        target_term_days=90, current_term_days=60,
        spend_volume=1_000_000, company_size="small",
        buyer_leverage_level="low",
        supplier_financing_rate=0.30,          # 30/365 × 0.30 = 2.5% → material
        pay_on_terms_term_days=60, actual_payment_terms_days=75,  # we pay late
        dso=40,                                # ask runs past their cycle
        strategy_benchmarks=[],
    )
    assert collect_supporting_arguments(f) == []


def test_supplier_standard_is_carried_but_not_sayable():
    f = _facts(
        target_term_days=90, current_term_days=60,
        strategy_benchmarks=[
            StrategyBenchmark(name="supplierStandard", label="own segment", value=95),
        ],
    )
    arg = collect_supporting_arguments(f)[0]
    assert arg.key == "supplierStandard"
    assert arg.sayable is False
    assert arg.definition.disclosure_note


def test_computed_wordings_override_the_catalogue_sentence():
    """Cost impact quotes its percentage — must beat the static catalogue text."""
    args = {a.key: a for a in collect_supporting_arguments(_everything_supports())}
    assert "% of our spend with you" in args["costImpact"].supplier_pitch
    assert args["costImpact"].supplier_pitch != ARGUMENT_CATALOG["costImpact"].supplier_pitch


def test_relationship_pitch_varies_when_it_is_the_only_support():
    """Relationship only lands when nothing stronger supports (client 2026-09-10)."""
    stretch = collect_supporting_arguments(
        _facts(
            target_term_days=90,
            current_term_days=60,
            spend_volume=120_000_000,
            company_size="large",
            buyer_leverage_level="high",
            strategy_benchmarks=[],
            # Material cost impact so it drops out of the supporting set.
            supplier_financing_rate=0.5,
            target_cash_flow=50_000_000,
        )
    )
    relationship = next(a for a in stretch if a.key == "relationship")
    assert relationship.supplier_pitch != ARGUMENT_CATALOG["relationship"].supplier_pitch


def test_meaning_block_explains_without_pitching():
    block = explain_block(_everything_supports())
    assert "What it is:" in block
    assert "How to pitch it:" not in block
    assert "[STRONGEST]" in block and "[2nd STRONGEST]" in block


def test_pitch_block_carries_the_approved_wording_and_the_notes():
    block = pitch_block(_everything_supports())
    assert "How to pitch it:" in block
    assert ARGUMENT_CATALOG["buyerStandard"].supplier_pitch in block
    # internal-only argument: no pitch offered, note explains why
    assert "NOT SAYABLE" in block
    assert "Note:" in block


def test_both_blocks_call_out_a_stretch_target():
    bare = _facts(target_term_days=90, current_term_days=60, strategy_benchmarks=[])
    for block in (explain_block(bare), pitch_block(bare)):
        assert "STRETCH TARGET" in block


def test_summarize_and_playbook_agree_on_which_arguments_support():
    """The whole point of one collector: the surface that explains and the
    surface that pitches can never list different arguments."""
    from utils.prompts.negotiation_guide_prompt import build_negotiation_guide_prompt
    from utils.prompts.summarize_prompt import build_summarize_prompt

    facts = _everything_supports()
    summary = build_summarize_prompt("overview", facts)
    playbook = build_negotiation_guide_prompt("playbook", facts, None)
    for a in collect_supporting_arguments(facts):
        assert a.title in playbook, a.key
        # The summary's "Arguments Supporting Term Extension" lists the
        # BENCHMARKS — the arguments that evidence a term. The four assessments
        # answer objections and argue no number, so the client's template
        # leaves them out of that section (see `utils.prompts.summary_template`).
        if a.value_days is not None:
            assert a.title in summary, a.key


def test_every_benchmark_above_the_ask_reaches_the_supplier_facing_surfaces():
    """No cap: a fourth supporting benchmark is evidence too. This used to stop
    at two, silently discarding support the negotiator had earned."""
    from domain.services.negotiation_arguments import supplier_facing_benchmarks

    f = _facts(
        target_term_days=90, opportunity_term_days=90, current_term_days=60,
        strategy_benchmarks=[
            StrategyBenchmark(name="buyerStandard", label="buyer standard", value=95),
            StrategyBenchmark(name="parentOrSupplierMax", label="parent max", value=94),
            StrategyBenchmark(name="industryRegionStandard", label="industry", value=93),
            StrategyBenchmark(name="peerGroupStandard", label="peer", value=92),
        ],
    )
    assert len(supplier_facing_benchmarks(f)) == 4

    negotiation = pitch_block(f)
    for value in ("95", "94", "93", "92"):
        assert value in negotiation, value
    assert "AT MOST" not in negotiation


# ── the state key ─────────────────────────────────────────────────────────


def test_state_declares_the_turn_argument_set():
    """`argument_analysis` is the one place the turn's argument picture lives."""
    from agents.state import NegotiationState

    assert "argument_analysis" in NegotiationState.__annotations__


def test_the_route_builds_the_argument_set_from_the_resolved_context():
    """Built from the SAME context the nodes see, so a session override moves
    the ask and the supporting set together."""
    from api.routes.negotiation import _turn_brief_state
    from domain.entities.context import SupplierContext

    facts = _everything_supports()
    context = SupplierContext(
        supplier_id="s1", raw={}, facts=facts,
        argument_analysis=build_argument_analysis(facts),
    )
    state = _turn_brief_state(context, scf_enabled=False)
    assert [a["key"] for a in state["argument_analysis"]["supporting"]] == [
        a.key for a in collect_supporting_arguments(facts)
    ]
    # The brief and the bundle key are the same data, not two computations.
    assert state["brief"].arguments is state["argument_analysis"]

    # No supplier data loaded yet — empty bundles, no brief, and no crash.
    for empty in (None, SupplierContext(supplier_id="s1", raw={})):
        state = _turn_brief_state(empty, scf_enabled=False)
        assert state["brief"] is None
        assert state["argument_analysis"] == {}


def test_nodes_use_the_state_set_instead_of_recomputing():
    """Passing an explicit set must WIN over anything derivable from facts —
    otherwise a node silently re-deriving its own list would still pass."""
    from utils.prompts.negotiation_guide_prompt import build_negotiation_guide_prompt
    from utils.prompts.summarize_prompt import build_summarize_prompt

    import dataclasses

    facts = _everything_supports()
    brief = brief_from(facts)
    trimmed = dataclasses.replace(brief, arguments={
        **brief.arguments,
        "supporting": [
            a for a in brief.arguments["supporting"] if a["key"] == "payOnTerms"
        ],
    })

    summary = build_summarize_prompt("overview", facts, brief=trimmed)
    playbook = build_negotiation_guide_prompt(
        "playbook", facts, None, brief=trimmed
    )
    assert "Payment Reliability" in playbook
    # the listed set reflects the passed brief, not a re-derivation
    listed = playbook.split("USE TO JUSTIFY THE ASK")[1]
    for boundary in ("HOLD IN RESERVE", "RULED OUT", "NOT ARGUMENTS", "## "):
        listed = listed.split(boundary)[0]
    assert "buyerStandard" not in listed
    # The summary renders the client template from the brief it was handed:
    # with every benchmark trimmed away it lists none, rather than re-deriving
    # them from the facts (see `utils.prompts.summary_template`).
    assert "Buyer Standard" not in summary
    assert "No benchmark in Calculum's database" in summary


def test_the_bundle_is_json_serialisable():
    """It rides on the graph state and may be logged or persisted — anything
    non-serialisable in it (a dataclass, a Decimal) breaks that quietly."""
    import json

    blob = json.dumps(build_argument_analysis(_everything_supports()))
    assert json.loads(blob)["terms"]["ask"] == 90


def test_the_bundle_keeps_the_arguments_that_do_not_support_the_ask():
    """The non-supporting half is the negotiator's position too: how firm the
    ask is, and what the supplier may cite back."""
    f = _facts(
        target_term_days=90, current_term_days=60,
        strategy_benchmarks=[
            StrategyBenchmark(name="buyerStandard", label="buyer standard", value=95),
            StrategyBenchmark(name="peerGroupStandard", label="peer", value=80),
            StrategyBenchmark(name="industryRegionStandard", label="industry", value=45),
        ],
    )
    bundle = build_argument_analysis(f)
    assert [a["key"] for a in bundle["supporting"]][0] == "buyerStandard"
    # TWO buckets: there is no `reserve` key on the bundle at all.
    assert "reserve" not in bundle
    below = {a["key"]: a for a in bundle["non_supporting"]}
    # peerGroupStandard now clears the current term, so it is SUPPORTING —
    # two buckets, not three. Only what sits at or below the current term is
    # held back.
    assert "peerGroupStandard" not in below
    assert "industryRegionStandard" in below
    # 45 is below the current 60-day term — the supplier's counter-evidence
    assert below["industryRegionStandard"]["undermines"] is True
    # sources with no value at all are named, not silently missing
    assert "supplierStandard" in bundle["unavailable"]


def test_the_bundle_keeps_unusable_assessments_with_their_reason():
    """A late payer and an out-of-cycle term are findings, not absences."""
    f = _facts(
        target_term_days=90, current_term_days=60,
        pay_on_terms_term_days=60, actual_payment_terms_days=75,
        dso=40,
    )
    assessments = build_argument_analysis(f)["assessments"]
    assert assessments["payment_reliability"]["status"] == "behind_terms"
    assert assessments["payment_reliability"]["usable_as_argument"] is False
    assert "beyond agreed payment terms" in assessments["payment_reliability"]["rationale"]
    assert assessments["dso_alignment"]["status"] == "at_or_below_contract"
    # ...and none of them reaches the supporting list
    keys = [a["key"] for a in build_argument_analysis(f)["supporting"]]
    assert "payOnTerms" not in keys and "dso" not in keys


def test_the_bundle_carries_the_posture_and_the_sequence():
    bundle = build_argument_analysis(_everything_supports())
    assert bundle["posture"]["leverage"]["posture"] == "buyer_favored"
    assert bundle["posture"]["priority"]["level"]
    # There is no risk grade any more: it rolled the regulatory cap, the SME
    # flag, the protected designation, a weak rating, the buyer-standard limit
    # type and the data's age into one level (client, 2026-08-20). Each of those
    # is a fact and each is rendered as one.
    assert "risk" not in bundle["posture"]
    assert [s["label"] for s in bundle["sequence"]][0] == "anchor"


@pytest.mark.parametrize(
    "box,level",
    [(1, "high"), (2, "high"), (4, "high"),
     (3, "medium"), (5, "medium"), (7, "medium"),
     (6, "low"), (8, "low"), (9, "low")],
)
def test_priority_follows_the_nine_box(box, level):
    """Carlos, 2026-09-15: Priority is the Calculum nine-box, not spend/cash-flow."""
    assert rank_business_priority(_facts(nine_box_term_extension=box)).level == level


def test_priority_is_low_when_nine_box_is_missing():
    assert rank_business_priority(_facts(nine_box_term_extension=None)).level == "low"


def test_the_meaning_block_shows_the_whole_position():
    """Summaries answer 'where do we stand?', so they get every bucket."""
    f = _facts(
        target_term_days=90, current_term_days=60,
        strategy_benchmarks=[
            StrategyBenchmark(name="buyerStandard", label="buyer standard", value=95),
            StrategyBenchmark(name="industryRegionStandard", label="industry", value=45),
        ],
    )
    block = explain_block(f)
    assert "USE TO JUSTIFY THE ASK" in block
    assert "NOT ARGUMENTS" in block and "45 days" in block
    assert "the supplier could cite this against us" in block
    assert "NOT AVAILABLE" in block


def test_the_pitch_block_names_the_weak_arguments_without_their_figures():
    """Handed the values, a drafter inverts them into false confidence — so the
    advice surface gets names and nothing else."""
    f = _facts(
        target_term_days=90, current_term_days=60,
        strategy_benchmarks=[
            StrategyBenchmark(name="buyerStandard", label="buyer standard", value=95),
            StrategyBenchmark(name="industryRegionStandard", label="industry", value=45),
        ],
    )
    block = pitch_block(f)
    assert "NOT ARGUMENTS" in block
    assert "Industry Region Standard" in block
    assert "45" not in block.split("NOT ARGUMENTS")[1]


# ── will the ask land? success probability, not a score ───────────────────
#
# A composite used to be scored here from five inputs — relationship scale
# (spend), buyer leverage, credit rating, cost impact, company size — and
# rendered as a "NEGOTIATING STRENGTH" block. The client dropped it (2026-08-20):
# the payload already carries its own read of whether the ask lands, and two
# answers to one question is one answer too many.
#
# What replaced it is `facts.success_probability`, carried verbatim. The five
# inputs are still put in front of the model — as the plain facts they are.


def test_nothing_scores_a_strength_composite_any_more():
    """Guards the removal itself. A re-introduced score would be a second,
    disagreeing answer to a question the payload already answers."""
    import domain.entities.analysis as analysis_entities
    import domain.services as domain_services

    assert not hasattr(analysis_entities, "NegotiationStrength")
    assert not hasattr(analysis_entities, "StrengthFactor")
    assert not hasattr(domain_services, "build_negotiation_strength")
    assert "strength" not in analyze_supplier(_facts()).__dataclass_fields__


def test_success_probability_reaches_every_advice_surface():
    """The five inputs the old composite scored used to reach the drafting
    surfaces ONLY as factors inside its block. They are facts, and they are
    rendered as facts — at every level, so nothing lost the signal with it."""
    from utils.prompts.brief import LEVEL_MINIMAL, render_facts

    block = render_facts(
        brief_from(_facts(spend_volume=120_000_000, credit_rating="CCC",
                          buyer_leverage_level="high", company_size="small",
                          success_probability="medium")),
        level=LEVEL_MINIMAL,
    )
    for expected in ("Success Probability", "Buyer Leverage: High",
                     "Credit Rating: CCC", "small", "Spend volume"):
        assert expected in block, expected
    # It is the buyer's own read on the supplier, so it sits with the internal
    # figures — never among the values a surface may quote to the supplier.
    assert block.index("INTERNAL FIGURES") < block.index("Success Probability")


def test_the_risk_grade_inputs_are_rendered_as_facts():
    """The grade rolled six signals into one level. Removing it must not remove
    the signals — each is now a line a negotiator can act on and trace."""
    from utils.prompts.brief import LEVEL_FULL, render_facts
    from dataclasses import replace as _replace

    facts = _replace(
        _facts(is_sme=True, credit_rating="CCC", buyer_standard_term_days=80,
               regulatory_max_term_days=60, regulatory_enforced=True,
               regulatory_applied=True),
        protected_flags={"woman_owned": True, "veteran_owned": False},
        buyer_standard_limit_type="HARD",
        updated_at="2020-01-01T00:00:00Z",
    )
    block = render_facts(brief_from(facts), level=LEVEL_FULL)
    assert "Regulatory cap APPLIED: 60 days" in block
    assert "SME: yes" in block
    assert "Credit Rating: CCC" in block
    # Only the designations that actually apply — never "veteran owned: False".
    assert "Protected-business designation: woman owned." in block
    assert "veteran" not in block
    # A HARD/MAX buyer standard is a guardrail, not a benchmark to argue past.
    assert "limit type: HARD — an internal GUARDRAIL" in block
    assert "days old — treat every figure above with reduced confidence" in block


def test_fresh_data_and_a_soft_limit_add_no_noise():
    """A line that always renders stops being read. Both of these are printed
    only when they change what the negotiator should do."""
    from datetime import datetime, timezone
    from utils.prompts.brief import LEVEL_FULL, render_facts
    from dataclasses import replace as _replace

    block = render_facts(
        brief_from(_replace(
            _facts(buyer_standard_term_days=80),
            buyer_standard_limit_type="SOFT",
            updated_at=datetime.now(timezone.utc).isoformat(),
        )),
        level=LEVEL_FULL,
    )
    assert "days old" not in block
    assert "limit type: SOFT" in block
    assert "GUARDRAIL" not in block


def test_the_phased_opening_reads_the_facts_not_a_risk_grade():
    """The ramp is offered because the supplier may not absorb the change in one
    step. The grade it used to read also went high on an enforced regulatory cap
    and on stale data — neither of which is a reason to ramp."""
    from dataclasses import replace as _replace

    def _phased(facts):
        return analyze_opening_strategy(facts, build_argument_analysis(facts))

    assert _phased(_facts(is_sme=True)).phased_approach_recommended is True
    assert _phased(_facts(credit_rating="CCC")).phased_approach_recommended is True
    assert _phased(_facts(credit_rating="A")).phased_approach_recommended is False
    # Stale data is a confidence caveat, not a reason to restructure the offer.
    stale = _replace(_facts(credit_rating="A"), updated_at="2020-01-01T00:00:00Z")
    assert _phased(stale).phased_approach_recommended is False


def test_the_narrow_surfaces_take_the_signal_without_a_facts_block():
    """`run_scenario` and `reframe_with_financing` render no facts at all. They
    still need to know whether the ask is expected to land — a scenario run
    against an ask nobody expects to land reads differently."""
    from utils.prompts.brief import render_success_probability

    block = render_success_probability(brief_from(_facts(success_probability="low")))
    assert "Success Probability" in block and "Low" in block
    assert "never state it" in block

    # No payload value: say so. Inferring one from the leverage or the ratings
    # is exactly the composite that was removed, rebuilt by the model.
    missing = render_success_probability(brief_from(_facts(success_probability=None)))
    assert "not provided" in missing
    assert "never infer one" in missing


# ── leverage posture: buyer side only ─────────────────────────────────────


def test_supplier_leverage_is_not_carried_at_all():
    """Client, 2026-08-01 then 2026-08-03: the posture is our leverage, not a
    difference — and the supplier's rating is no longer extracted.

    Differencing the two ratings meant a supplier rated the same as the buyer
    cancelled a real buyer position out — Medium/Medium read as "balanced" and
    said nothing. Left visible in FACTS afterwards, it produced exactly that
    sentence anyway ("both are Medium, creating a balanced but difficult
    environment"), so the field went with it.
    """
    from domain.services.negotiation_arguments import score_leverage

    assert not hasattr(_facts(), "supplier_leverage_level")

    high = score_leverage(_facts(buyer_leverage_level="high"))
    assert high.posture == "buyer_favored"
    assert high.strength == "high"
    assert "supplier leverage" not in high.rationale


def test_medium_buyer_leverage_is_balanced_and_refined_by_success_probability():
    from domain.services.negotiation_arguments import score_leverage

    l = score_leverage(
        _facts(buyer_leverage_level="Medium",
               success_probability="low")
    )
    assert (l.posture, l.strength) == ("balanced", "low")


def test_low_buyer_leverage_is_supplier_favoured():
    from domain.services.negotiation_arguments import score_leverage

    l = score_leverage(_facts(buyer_leverage_level="low"))
    assert l.posture == "supplier_favored"


def test_missing_buyer_leverage_defaults_to_balanced():
    from domain.services.negotiation_arguments import score_leverage

    l = score_leverage(
        _facts(buyer_leverage_level=None)
    )
    assert (l.posture, l.strength) == ("balanced", "medium")
    assert "not provided" in l.rationale


# ── the shared ANALYSIS block ──────────────────────────────────────────────


def test_posture_block_carries_every_posture_judgment():
    block = render_posture(
        brief_from(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=55))
    )
    for expected in (
        "- Leverage:",
        "- Financial Sensitivity:",
        "- Business Priority:",
        "- Recommended Posture:",
        "- BATNA:",
    ):
        assert expected in block, expected
    assert "Risk profile" not in block


def test_posture_block_no_longer_repeats_the_arguments():
    """The four assessments are arguments and render as arguments, once. They
    used to print here too, so a playbook prompt carried the cost-impact and
    relationship approved sentences verbatim TWICE."""
    facts = _facts(
        pay_on_terms_term_days=60, actual_payment_terms_days=55,
        dso=95, supplier_financing_rate=0.11,
    )
    block = render_posture(brief_from(facts))
    assert PAY_ON_TERMS_SUPPLIER_FACING_WORDING not in block
    assert ARGUMENT_CATALOG["dso"].supplier_pitch not in block
    assert "Approved wording" not in block
    # The cost-impact PERCENTAGE still appears — as a scored strength factor,
    # which is a different thing from the supplier-facing sentence.
    assert "Extending payment terms by" not in block


def test_posture_block_marks_the_floor_internal_on_supplier_facing_surfaces():
    brief = brief_from(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=55))
    internal = render_posture(brief, floor=FLOOR_INTERNAL)
    assert "[INTERNAL ONLY, do not state to the supplier]" in internal
    assert "BATNA" in internal
    # ...and can be dropped entirely where the prompt states it elsewhere.
    assert "- BATNA:" not in render_posture(brief, floor=FLOOR_NONE)


def test_argument_block_offers_the_approved_wording_when_the_record_is_usable():
    block = pitch_block(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=55))
    assert "- Payment Reliability" in block
    assert PAY_ON_TERMS_SUPPLIER_FACING_WORDING in block


def test_argument_block_relays_the_late_payment_disclosure_rule():
    block = pitch_block(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=70))
    assert "RULED OUT" in block
    assert "DO NOT use our payment record" in block
    assert PAY_ON_TERMS_SUPPLIER_FACING_WORDING not in block


@pytest.mark.parametrize("actual", [55, 70, None])
def test_argument_block_always_states_pay_on_terms_is_not_a_benchmark(actual):
    """The figure invites exactly this mistake, so the rule travels with it."""
    block = pitch_block(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=actual))
    assert "Pay-on-Terms is NOT a benchmark" in block
    assert "never justifies the ask" in block


def test_posture_block_sequence_is_opt_in_and_annotated():
    brief = brief_from(_facts(pay_on_terms_term_days=60, actual_payment_terms_days=55))
    assert "Argument sequence" not in render_posture(brief)
    with_sequence = render_posture(
        brief, include_sequence=True, sequence_note="(for the counter position)"
    )
    assert "- Argument sequence (for the counter position):" in with_sequence
    assert "• [Anchor]" in with_sequence


# ── the cross-intent contract ──────────────────────────────────────────────


def _prompt_builders():
    from utils.prompts.evaluate_counter_offer_prompt import build_counter_offer_response_prompt
    from utils.prompts.explain_recommendation_prompt import build_explain_recommendation_prompt
    from utils.prompts.negotiation_guide_prompt import build_negotiation_guide_prompt
    from utils.prompts.opening_strategy_prompt import build_opening_strategy_prompt
    from utils.prompts.pushback_prompt import build_pushback_prompt

    # `summarize` is absent: it renders a fixed client template from the brief
    # (see `utils.prompts.summary_template`) and no longer carries the shared
    # analysis block at all.
    return {
        "pushback": build_pushback_prompt,
        "opening_strategy": build_opening_strategy_prompt,
        "negotiation_guide": build_negotiation_guide_prompt,
        "explain_recommendation": build_explain_recommendation_prompt,
        "counter_offer_response": build_counter_offer_response_prompt,
    }


def _build(fn, facts: SupplierFacts) -> str:
    """Call a prompt builder with whatever this supplier's brief provides."""
    brief = brief_from(facts)
    extraction = CounterOfferExtraction(counter_type="days_only", counter_term_days=75)
    supplied = {
        "facts": facts,
        "brief": brief,
        "opening_strategy": analyze_opening_strategy(facts, brief.arguments),
        "message": "test question",
        "extraction": extraction,
        "ca": analyze_counter_offer(extraction, facts, brief.arguments),
    }
    kwargs = {}
    for name, param in inspect.signature(fn).parameters.items():
        if name in supplied:
            kwargs[name] = supplied[name]
        elif param.default is inspect.Parameter.empty:
            kwargs[name] = None
    return fn(**kwargs)


@pytest.mark.parametrize("intent", sorted(_prompt_builders()))
def test_every_intent_gets_the_same_analysis(intent):
    """The whole point of the shared block: no intent silently loses a judgment."""
    prompt = _build(
        _prompt_builders()[intent],
        _facts(pay_on_terms_term_days=60, actual_payment_terms_days=55,
               success_probability="high"),
    )
    for expected in (
        "## ANALYSIS",
        "- Leverage:",
        "- Financial Sensitivity:",
        "- Business Priority:",
        # the assessments now arrive as arguments, in the argument block...
        "## NEGOTIATION ARGUMENTS",
        "- Payment Reliability",
        # ...and how likely the ask is to be agreed rides on the facts, where
        # the five signals behind it already sit.
        "- Success Probability",
    ):
        assert expected in prompt, f"{intent} is missing {expected!r}"
