"""Unit tests for opening-anchor selection (still used by opening strategy)
and the playbook's Mandatory Treasury opening line.

Client 2026-09-10: playbook section 2 no longer has an Opening Anchor bullet —
it leads with Mandatory Treasury Policy. Anchor selection stays for other
surfaces; guide sources still attribute an anchor when one exists.
"""
from __future__ import annotations

from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.services.negotiation_arguments import opening_anchor_benchmark
from utils.prompts.negotiation_guide_prompt import (
    _opening_line_block,
    collect_guide_sources,
)


def _facts(**kw) -> SupplierFacts:
    base = dict(
        supplier_name="Acme",
        country="DE",
        industry="Manufacturing",
        company_size="large",
        target_term_days=76,
        current_term_days=45,
        batna_term_days=60,
        benchmark_term_days=48,
        regulatory_max_term_days=None,
    )
    base.update(kw)
    return SupplierFacts(**base)


def _bench(name: str, value) -> StrategyBenchmark:
    return StrategyBenchmark(name=name, label="lbl", value=value)


def test_anchor_is_citable_precedent_above_the_ask():
    f = _facts(strategy_benchmarks=[
        _bench("parentOrSupplierMax", 80),
        _bench("industryRegionStandard", 35),
        _bench("supplierStandard", 22),
    ])
    anchor = opening_anchor_benchmark(f)
    assert anchor is not None and anchor.name == "parentOrSupplierMax"
    assert anchor.value == 80


def test_no_anchor_when_best_benchmark_equals_the_ask():
    f = _facts(strategy_benchmarks=[_bench("parentOrSupplierMax", 76)])
    assert opening_anchor_benchmark(f) is None


def test_no_anchor_when_nothing_supports_the_ask():
    f = _facts(strategy_benchmarks=[_bench("industryRegionStandard", 35)])
    assert opening_anchor_benchmark(f) is None


def test_anchor_skips_equal_precedence_leader_for_higher_next():
    f = _facts(strategy_benchmarks=[
        _bench("buyerStandard", 76),
        _bench("parentOrSupplierMax", 80),
    ])
    anchor = opening_anchor_benchmark(f)
    assert anchor is not None and anchor.name == "parentOrSupplierMax"


def test_internal_only_sources_never_anchor():
    f = _facts(
        strategy_benchmarks=[_bench("supplierStandard", 90)],
    )
    assert opening_anchor_benchmark(f) is None


def test_anchor_above_applied_regulatory_cap_is_skipped():
    f = _facts(
        regulatory_applied=True,
        regulatory_enforced=True,
        regulatory_max_term_days=78,
        strategy_benchmarks=[_bench("parentOrSupplierMax", 80)],
    )
    assert opening_anchor_benchmark(f) is None


def test_unapplied_regulatory_figure_does_not_block_the_anchor():
    f = _facts(
        regulatory_max_term_days=78,
        strategy_benchmarks=[_bench("parentOrSupplierMax", 80)],
    )
    assert opening_anchor_benchmark(f) is not None


def test_an_enforced_but_unapplied_cap_does_not_block_the_anchor():
    f = _facts(
        regulatory_enforced=True,
        regulatory_applied=False,
        regulatory_max_term_days=78,
        strategy_benchmarks=[_bench("parentOrSupplierMax", 80)],
    )
    assert opening_anchor_benchmark(f) is not None


def test_anchor_compares_against_opportunity_first_ask():
    f = _facts(opportunity_term_days=82,
               strategy_benchmarks=[_bench("parentOrSupplierMax", 80)])
    assert opening_anchor_benchmark(f) is None


def test_no_anchor_without_an_ask():
    f = _facts(target_term_days=None, opportunity_term_days=None,
               strategy_benchmarks=[_bench("parentOrSupplierMax", 80)])
    assert opening_anchor_benchmark(f) is None


def test_guide_opening_line_is_mandatory_treasury_policy():
    block = _opening_line_block(_facts())
    assert "Opening Line" in block
    assert "maintain company compliance." in block
    assert "maintain ERP system compliance." not in block


def test_guide_facts_block_marks_user_set_target():
    from domain.services.brief_builder import brief_from
    from utils.prompts.brief import LEVEL_STANDARD, render_facts

    def guide_facts_block(facts):
        return render_facts(brief_from(facts), level=LEVEL_STANDARD,
                            ask_label="Target term to propose")

    block = guide_facts_block(_facts(target_is_user_set=True))
    assert "(the negotiator's approved target)" in block
    assert "approved target" not in guide_facts_block(_facts())


def test_guide_sources_attribute_the_anchor_benchmark():
    from domain.services.brief_builder import brief_from

    f = _facts(strategy_benchmarks=[_bench("parentOrSupplierMax", 80)])
    sources = collect_guide_sources(brief_from(f))
    assert sources["Opening Anchor Term (days)"] == {
        "path": "negotiationStrategy.parentOrSupplierMax.value",
        "value": 80,
    }


def test_guide_sources_omit_anchor_when_none():
    from domain.services.brief_builder import brief_from

    f = _facts()
    assert "Opening Anchor Term (days)" not in collect_guide_sources(brief_from(f))
