"""The BATNA position engine — Target and BATNA section figures, decided in code.

Client spec: BATNA = harmonise(Target − 15). When that figure sits below
Contractual + 5, there is No BATNA (null).
"""
from __future__ import annotations

from domain.entities.facts import StrategyBenchmark
from domain.services.batna import build_batna_position
from tests.unit.prompt_fixtures import rich_facts


def _facts(**kw):
    """Ask 90, current 60 — so the derived floor is 75, the client's example.

    The 30-day gap puts the benchmark support bar at current + 15 = 75: only a
    benchmark STRICTLY above 75 is evidence at all.
    """
    base = dict(
        target_term_days=90,
        opportunity_term_days=90,
        current_term_days=60,
        strategy_benchmarks=[],
    )
    base.update(kw)
    return rich_facts(**base)


def _benchmark(name: str, value: int) -> StrategyBenchmark:
    return StrategyBenchmark(name=name, label=name, value=value)


def test_the_clients_worked_example():
    position = build_batna_position(
        _facts(
            strategy_benchmarks=[
                _benchmark("supplierStandard", 76),
                _benchmark("peerGroupStandard", 70),
            ]
        )
    )
    assert position.target_term_days == 90
    assert position.batna_term_days == 75
    # Peer 70 no longer supports: the 30-day gap puts the support bar at
    # current + 15 = 75 (client, 2026-09-17).
    assert [s.name for s in position.supports] == ["Supplier Standard"]
    assert position.supports[0].statement == (
        "The supplier already accepts longer payment terms from other customers, "
        "with an average accepted term of 76 days. A BATNA of 75 days "
        "is therefore aligned with demonstrated supplier acceptance."
    )
    assert position.note is None


def test_the_worked_example_peer_supports_as_realistic_on_a_wider_gap():
    # Current 45, ask 90: bar 60, floor 75 — peer 70 clears the bar.
    position = build_batna_position(
        _facts(
            current_term_days=45,
            strategy_benchmarks=[
                _benchmark("supplierStandard", 76),
                _benchmark("peerGroupStandard", 70),
            ],
        )
    )
    assert [s.name for s in position.supports] == [
        "Supplier Standard",
        "Peer Group Standard",
    ]
    assert position.supports[1].statement == (
        "Similar suppliers in the same industry and region accept payment terms "
        "around 70 days, supporting 75 days as a realistic alternative."
    )


def test_a_benchmark_at_or_below_current_plus_15_is_not_support():
    position = build_batna_position(
        _facts(strategy_benchmarks=[_benchmark("peerGroupStandard", 75)])
    )
    assert position.supports == []


def test_a_benchmark_at_or_below_the_current_term_is_not_support():
    position = build_batna_position(
        _facts(
            strategy_benchmarks=[
                _benchmark("industryRegionStandard", 45),
                _benchmark("peerGroupStandard", 60),
            ]
        )
    )
    assert position.supports == []
    assert position.note is None


def test_a_benchmark_between_the_current_term_and_the_floor_supports_it_as_realistic():
    # Current 45, ask 90: bar 60, floor 75.
    position = build_batna_position(
        _facts(current_term_days=45,
               strategy_benchmarks=[_benchmark("peerGroupStandard", 65)])
    )
    peer = position.supports[0]
    assert peer.value_days == 65
    assert "supporting 75 days as a realistic alternative" in peer.statement
    assert "within established peer practice" not in peer.statement


def test_the_buyers_own_standard_is_not_evidence_for_the_floor():
    position = build_batna_position(
        _facts(strategy_benchmarks=[_benchmark("buyerStandard", 90)])
    )
    assert position.supports == []
    assert position.note is None


def test_order_is_the_source_hierarchy_not_the_day_count():
    position = build_batna_position(
        _facts(
            current_term_days=45,
            strategy_benchmarks=[
                _benchmark("industryRegionStandard", 88),
                _benchmark("peerGroupStandard", 70),
                _benchmark("supplierStandard", 76),
                _benchmark("parentOrSupplierMax", 80),
            ]
        )
    )
    assert [s.key for s in position.supports] == [
        "supplierStandard",
        "parentOrSupplierMax",
        "peerGroupStandard",
        "industryRegionStandard",
    ]


def test_supplier_standard_stays_marked_internal_only():
    position = build_batna_position(
        _facts(strategy_benchmarks=[_benchmark("supplierStandard", 76)])
    )
    assert position.supports[0].internal_only is True
    assert len(position.supports) == 1


def test_no_benchmark_support_invents_nothing():
    position = build_batna_position(_facts(strategy_benchmarks=[]))
    assert position.supports == []
    assert position.note is None


def test_a_floor_too_close_to_contractual_is_no_batna():
    position = build_batna_position(
        _facts(
            target_term_days=75,
            opportunity_term_days=75,
            current_term_days=60,
            strategy_benchmarks=[_benchmark("peerGroupStandard", 70)],
        )
    )
    # 75 − 15 = 60; 60 < 60 + 5 → No BATNA
    assert position.batna_term_days is None
    assert position.supports == []
    assert position.note is not None
    assert "No BATNA" in position.note


def test_a_sub_contractual_override_is_no_batna():
    position = build_batna_position(
        _facts(
            target_term_days=90,
            opportunity_term_days=90,
            current_term_days=60,
            batna_override_days=45,
            strategy_benchmarks=[_benchmark("peerGroupStandard", 70)],
        )
    )
    assert position.batna_term_days is None
    assert position.supports == []
    assert "No BATNA" in position.note


def test_a_short_ask_near_contractual_is_no_batna():
    position = build_batna_position(
        _facts(
            target_term_days=30,
            opportunity_term_days=30,
            current_term_days=15,
            strategy_benchmarks=[_benchmark("peerGroupStandard", 32)],
        )
    )
    # 30 − 15 = 15; 15 < 15 + 5 → No BATNA
    assert position.batna_term_days is None
    assert position.supports == []
    assert "No BATNA" in position.note


def test_no_target_at_all_names_no_fallback():
    position = build_batna_position(
        _facts(target_term_days=None, opportunity_term_days=None, current_term_days=60)
    )
    assert position.batna_term_days is None
    assert position.supports == []
    assert position.note is None
