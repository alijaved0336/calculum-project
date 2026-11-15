"""Unit tests for the benchmark-citability / BATNA-floor policy.

All functions under test are pure and deterministic — no mocks needed.
The rules (confirmed with product):

  ask = opportunity or target
  * mention:  cite a benchmark only when value > CURRENT TERM (§4). Above the
              current term it evidences that longer terms already exist, which
              argues for movement; at or below it, it argues for nothing or
              hands the supplier a counter-figure.
  * how far:  TWO buckets only. Everything above the current term is
              supporting; `key_argument_benchmarks` is the subset reaching the
              ask, which is a WORDING distinction (P4), not a third bucket.
  * fallback: harmonise(target − 15); None when below contractual + 5.
"""
from __future__ import annotations

import pytest

from domain.entities.facts import (
    StrategyBenchmark,
    SupplierFacts,
    batna_from_target,
    negotiation_ask_term,
    resolve_effective_batna,
)
from domain.services.brief_builder import brief_from
from domain.services.negotiation_arguments import (
    benchmark_support_bar,
    citable_support_benchmarks,
    is_benchmark_citable,
    key_argument_benchmarks,
    market_benchmarks,
    supplier_facing_benchmarks,
)
from domain.services.negotiation_arguments import build_argument_sequence


def _facts(**kw) -> SupplierFacts:
    base = dict(
        supplier_name="Acme",
        country="DE",
        industry="Manufacturing",
        company_size="large",
        target_term_days=90,
        current_term_days=51,
        batna_term_days=60,
        benchmark_term_days=48,
        regulatory_max_term_days=None,
    )
    base.update(kw)
    return SupplierFacts(**base)


def _bench(name: str, value, label: str = "lbl", applied: bool = False) -> StrategyBenchmark:
    return StrategyBenchmark(name=name, label=label, value=value, applied=applied)


# ── ask term ───────────────────────────────────────────────────────────────

def test_ask_term_uses_target_when_no_opportunity():
    assert negotiation_ask_term(_facts()) == 90


def test_opportunity_term_overrides_target_for_the_ask():
    assert negotiation_ask_term(_facts(opportunity_term_days=100)) == 100


def test_ask_term_none_without_target_or_opportunity():
    assert negotiation_ask_term(_facts(target_term_days=None, opportunity_term_days=None)) is None


# ── mention rule (client, 2026-09-17 — value > benchmark_support_bar) ──────

def test_is_benchmark_citable_above_current_plus_15_on_a_wide_gap():
    f = _facts()  # current 51, ask 90 — a 39-day gap, so the bar is 51 + 15 = 66
    assert is_benchmark_citable(91, f) is True
    assert is_benchmark_citable(90, f) is True
    # Below the ask but past current + 15 is an argument — for movement, not
    # for the full ask.
    assert is_benchmark_citable(89, f) is True
    assert is_benchmark_citable(67, f) is True
    # Exactly current + 15 is not "greater than" it.
    assert is_benchmark_citable(66, f) is False
    assert is_benchmark_citable(52, f) is False
    assert is_benchmark_citable(51, f) is False
    assert is_benchmark_citable(48, f) is False
    assert is_benchmark_citable(None, f) is False


def _gap_facts(current: int, target: int, *values: tuple[str, int]) -> SupplierFacts:
    return _facts(
        current_term_days=current, target_term_days=target,
        opportunity_term_days=None,
        strategy_benchmarks=[StrategyBenchmark(name=n, label=n, value=v) for n, v in values],
    )


def test_narrow_gap_uses_benchmarks_closer_to_the_target():
    # Current 30, ask 45: midpoint 37.5. 40 and 60 are closer to the ask; 35 is
    # closer to the current term; 30 is the status quo.
    f = _gap_facts(
        30, 45,
        ("supplierStandard", 30), ("peerGroupStandard", 35),
        ("industryRegionStandard", 40), ("parentOrSupplierMax", 60),
    )
    assert benchmark_support_bar(f) == 37.5
    assert [b.value for b in citable_support_benchmarks(f)] == [40, 60]


def test_narrow_gap_falls_back_to_everything_above_current_when_none_is_closer():
    # Current 30, ask 45, nothing above 37.5 → every benchmark above 30.
    f = _gap_facts(
        30, 45,
        ("industryRegionStandard", 25), ("peerGroupStandard", 32),
        ("parentOrSupplierMax", 35),
    )
    assert benchmark_support_bar(f) == 30
    assert [b.value for b in citable_support_benchmarks(f)] == [32, 35]


def test_narrow_gap_midpoint_itself_is_not_closer_to_the_target():
    # Current 30, ask 40: 35 is equidistant — not closer to the ask. 36 is.
    f = _gap_facts(30, 40, ("peerGroupStandard", 35), ("parentOrSupplierMax", 36))
    assert [b.value for b in citable_support_benchmarks(f)] == [36]


def test_narrow_gap_fallback_is_decided_over_the_whole_pool():
    # buyerStandard clears the midpoint, so the fallback does NOT fire — one bar
    # for every surface, even though buyerStandard is not a playbook argument.
    f = _gap_facts(30, 45, ("buyerStandard", 40), ("peerGroupStandard", 35))
    assert benchmark_support_bar(f) == 37.5
    assert [b.name for b in supplier_facing_benchmarks(f)] == ["buyerStandard"]


def test_wide_gap_uses_benchmarks_strictly_above_current_plus_15():
    # Current 30, ask 60: bar 45.
    f = _gap_facts(
        30, 60,
        ("industryRegionStandard", 40), ("peerGroupStandard", 45),
        ("supplierStandard", 50), ("parentOrSupplierMax", 75),
    )
    assert benchmark_support_bar(f) == 45
    assert [b.value for b in citable_support_benchmarks(f)] == [50, 75]


def test_wide_gap_has_no_fallback():
    # Current 30, ask 60, nothing above 45 → no benchmark is an argument.
    f = _gap_facts(30, 60, ("peerGroupStandard", 35), ("parentOrSupplierMax", 40))
    assert citable_support_benchmarks(f) == []


def test_a_gap_of_exactly_15_is_the_narrow_rule():
    # Current 30, ask 45 is <= 15: midpoint rule, so 40 counts (it would not
    # under current + 15).
    f = _gap_facts(30, 45, ("peerGroupStandard", 40))
    assert [b.value for b in citable_support_benchmarks(f)] == [40]


def test_the_bar_uses_the_opportunity_term_as_the_ask():
    # Target 45 but opportunity 75: the ask is 75, a 45-day gap → bar 45.
    f = _facts(current_term_days=30, target_term_days=45, opportunity_term_days=75,
               strategy_benchmarks=[StrategyBenchmark(name="peerGroupStandard",
                                                      label="p", value=40)])
    assert benchmark_support_bar(f) == 45
    assert citable_support_benchmarks(f) == []


def test_without_an_ask_the_bar_is_the_current_term():
    f = _facts(target_term_days=None, opportunity_term_days=None)
    assert benchmark_support_bar(f) == 51


def test_is_benchmark_citable_false_without_a_current_term():
    """No baseline, no bar — never guess whether a figure clears the status quo."""
    f = _facts(current_term_days=None)
    assert is_benchmark_citable(120, f) is False


def test_key_argument_benchmarks_are_at_or_above_the_target():
    # ask 90. Only benchmarks that reach 90 justify the ask itself.
    f = _facts(
        target_term_days=90, current_term_days=51,
        strategy_benchmarks=[
            _bench("parentOrSupplierMax", 95, "parent max"),
            _bench("peerGroupStandard", 80, "peer"),
            _bench("industryRegionStandard", 60, "industry"),
        ],
    )
    assert [b.value for b in key_argument_benchmarks(f)] == [95]


def test_benchmark_equal_to_the_ask_is_key_argument_evidence():
    # A benchmark landing exactly ON the ask supports it — the ask is a term
    # that source already operates at. `>` here (rather than `>=`) is what let a
    # 30-day parentOrSupplierMax be called "too low" for a 30-day ask.
    f = _facts(
        target_term_days=90, current_term_days=51,
        strategy_benchmarks=[_bench("parentOrSupplierMax", 90, "parent max")],
    )
    assert [b.value for b in key_argument_benchmarks(f)] == [90]


def test_the_batna_floor_is_derived_from_the_ask_not_from_benchmarks():
    """No benchmark band feeds the floor any more.

    The floor is a position we choose, not a finding we discover:
    harmonise(target − 15), regardless of which benchmarks happen to exist.
    """
    f = _facts(
        target_term_days=90, current_term_days=51,
        strategy_benchmarks=[
            _bench("parentOrSupplierMax", 95, "parent max"),
            _bench("peerGroupStandard", 80, "peer"),
            _bench("industryRegionStandard", 60, "industry"),
        ],
    )
    assert resolve_effective_batna(f)[0] == 75
    # The 80-day peer benchmark sits inside the old band and is now simply a
    # supporting benchmark like any other above the current term.
    assert 80 in [b.value for b in supplier_facing_benchmarks(f)]


def test_market_benchmarks_lists_all_pool_values_highest_first():
    f = _facts(strategy_benchmarks=[
        _bench("industryRegionStandard", 67, "industry/region"),
        _bench("parentOrSupplierMax", 90, "parent max"),
    ])
    assert [b.value for b in market_benchmarks(f)] == [90, 67]


# ── BATNA / fallback (BATNA) ────────────────────────────────────────────

# Floor model: harmonise(target − 15). None when floor < contractual + 5.
# Default _facts(): target 90, current 51 → 75 clears 56.

def test_the_floor_is_target_minus_fifteen_harmonised():
    """Client formula: BATNA = harmonise(Target − 15). 90 → 75."""
    assert batna_from_target(90) == 75


@pytest.mark.parametrize("target, expected", [
    (90, 75),    # 75 — already on the ladder
    (120, 105),  # 105 — already on the ladder
    (76, 60),    # 61 -> nearest step is 60
    (60, 45),    # 45 — already on the ladder
    (45, 30),    # 30 — already on the ladder
])
def test_the_floor_harmonises_target_minus_fifteen(target, expected):
    assert batna_from_target(target) == expected


def test_no_ask_no_floor():
    assert batna_from_target(None) is None


def test_the_floor_ignores_the_benchmarks_entirely():
    """Two suppliers with the same ask get the same concession room."""
    bare = _facts(target_term_days=90, current_term_days=51)
    crowded = _facts(
        target_term_days=90, current_term_days=51,
        strategy_benchmarks=[
            _bench("peerGroupStandard", 60), _bench("industryRegionStandard", 85),
            _bench("parentOrSupplierMax", 95), _bench("regulatoryTerm", 120),
        ],
    )
    assert resolve_effective_batna(bare)[0] == 75
    assert resolve_effective_batna(crowded)[0] == 75


def test_a_floor_below_contractual_plus_five_is_no_batna():
    """BATNA < Contractual + 5 → No BATNA (null).

    A 60-day ask yields 45, under the 50-day contractual term plus 5.
    """
    f = _facts(target_term_days=60, opportunity_term_days=None, current_term_days=50)
    assert batna_from_target(60) == 45
    floor, note = resolve_effective_batna(f)
    assert floor is None
    assert "No BATNA" in note
    assert "50" in note


def test_a_floor_landing_near_the_current_term_is_no_batna():
    """75 against a 75-day contractual term fails contractual + 5."""
    f = _facts(target_term_days=90, current_term_days=75)
    floor, note = resolve_effective_batna(f)
    assert floor is None
    assert "No BATNA" in note


def test_a_floor_that_clears_contractual_plus_five_stands():
    f = _facts(target_term_days=90, current_term_days=60)
    floor, note = resolve_effective_batna(f)
    assert floor == 75
    assert "75 days" in note


def test_the_floor_is_taken_off_the_opportunity_term_when_there_is_one():
    """The ask is the opportunity term first, else the target."""
    f = _facts(target_term_days=90, opportunity_term_days=120, current_term_days=51)
    assert resolve_effective_batna(f)[0] == 105  # off 120, not off 90


def test_no_floor_without_an_ask():
    f = _facts(target_term_days=None, opportunity_term_days=None, current_term_days=51)
    assert resolve_effective_batna(f) == (None, None)


def test_a_session_override_wins_outright():
    f = _facts(target_term_days=90, current_term_days=51, batna_override_days=80)
    floor, note = resolve_effective_batna(f)
    assert floor == 80
    assert "fixed at 80 days" in note


def test_a_session_override_below_contractual_plus_five_is_no_batna():
    f = _facts(target_term_days=90, current_term_days=60, batna_override_days=45)
    floor, note = resolve_effective_batna(f)
    assert floor is None
    assert "No BATNA" in note
    assert "45" in note and "60" in note


def test_a_session_override_at_the_current_term_is_no_batna():
    f = _facts(target_term_days=90, current_term_days=60, batna_override_days=60)
    floor, note = resolve_effective_batna(f)
    assert floor is None
    assert "No BATNA" in note



# ── citable support benchmarks (evidence FOR the ask) ──────────────────────

def test_support_benchmarks_exclude_anything_at_or_below_the_current_term():
    # current 77, ask 91. The 90-day parent max clears the current term, so §4
    # keeps it as movement evidence; the 67-day industry standard is below the
    # current term and is dropped entirely.
    f = _facts(
        target_term_days=None, opportunity_term_days=91, current_term_days=77,
        strategy_benchmarks=[
            _bench("peerGroupStandard", 95, "comparable peer group"),
            _bench("buyerStandard", 91, "buyer standard"),
            _bench("parentOrSupplierMax", 90, "parent/supplier max"),
            _bench("industryRegionStandard", 67, "industry/region standard"),
        ],
    )
    ordered = citable_support_benchmarks(f)
    assert [b.value for b in ordered] == [90, 91, 95]   # ascending
    # 90 is still SUPPORTING — it clears the 77-day current term. Only the two
    # that reach the ask may be said to justify it in full.
    assert [b.value for b in key_argument_benchmarks(f)] == [95, 91]


def test_support_benchmarks_empty_when_none_clear_the_current_term():
    # current 51: a 48-day benchmark is below it, so nothing is citable.
    f = _facts(strategy_benchmarks=[_bench("industryRegionStandard", 48)])
    assert citable_support_benchmarks(f) == []


def test_support_benchmark_above_ask_is_included():
    f = _facts(strategy_benchmarks=[_bench("industryRegionStandard", 95, "industry/region")])
    assert [b.value for b in citable_support_benchmarks(f)] == [95]  # 95 >= 90 ask


def test_every_citable_benchmark_is_supporting_and_nothing_else():
    """TWO buckets, not three (client, 2026-08-18)."""
    f = _facts(
        target_term_days=90, current_term_days=51,
        strategy_benchmarks=[
            _bench("parentOrSupplierMax", 95, "parent max"),
            _bench("buyerStandard", 90, "buyer standard"),
            _bench("peerGroupStandard", 80, "peer"),
            _bench("industryRegionStandard", 40, "industry"),
        ],
    )
    citable = {b.name for b in citable_support_benchmarks(f)}
    full = {b.name for b in key_argument_benchmarks(f)}

    # Everything above the 51-day current term is citable...
    assert citable == {"parentOrSupplierMax", "buyerStandard", "peerGroupStandard"}
    # ...and the subset reaching the 90-day ask is what may justify it outright.
    assert full == {"parentOrSupplierMax", "buyerStandard"}
    assert full <= citable
    assert "industryRegionStandard" not in citable   # below the current term


# ── argument sequence never quotes a non-citable benchmark ─────────────────

def test_argument_sequence_suppresses_low_benchmark_and_cites_qualifying_one():
    # ask 91: the 67-day industry standard must NOT appear; the 95-day parent
    # max is cited instead. The 90-day peer group is below the ask, so it is no
    # longer offered as justification either.
    f = _facts(
        target_term_days=91, opportunity_term_days=91, current_term_days=77,
        benchmark_term_days=67,
        strategy_benchmarks=[
            _bench("parentOrSupplierMax", 95, "parent/supplier max"),
            _bench("peerGroupStandard", 90, "comparable peer group"),
            _bench("industryRegionStandard", 67, "industry/region standard"),
        ],
    )
    # The sequence names its arguments by canonical key and says when to deploy
    # each; the figures live in the argument block, once (see
    # `build_argument_sequence`). So the contract is WHICH source leads.
    text = " ".join(s.argument for s in build_argument_sequence(f, 77))
    assert "industryRegionStandard" not in text
    assert "peerGroupStandard" not in text
    assert "Parent / Supplier Max" in text


def test_argument_sequence_cites_no_benchmark_when_none_citable():
    # only a too-low benchmark -> anchor cites no benchmark at all (not 67)
    f = _facts(
        target_term_days=91, opportunity_term_days=91, current_term_days=51,
        benchmark_term_days=67,
        strategy_benchmarks=[_bench("industryRegionStandard", 67, "industry/region")],
    )
    anchor = build_argument_sequence(f, 75)[0]
    assert anchor.label == "anchor"
    assert "67" not in anchor.argument
    assert "benchmark" not in anchor.argument.lower()


# ── opening-strategy benchmark classification ───────────────────────────────

def test_opening_ladder_classifies_benchmarks_against_the_ask():
    from domain.services.opening_strategy_analysis import _classify

    # At or above the ask -> "supports"; below the current term -> "undermines";
    # anything between -> "neutral" (held back, not volunteered).
    assert _classify(_bench("peerGroupStandard", 95), current_term_days=51, ask=90) == "supports"
    assert _classify(_bench("buyerStandard", 90), current_term_days=51, ask=90) == "supports"
    assert _classify(_bench("industryRegionStandard", 40), current_term_days=51, ask=90) == "undermines"
    assert _classify(_bench("peerGroupStandard", 89), current_term_days=51, ask=90) == "neutral"
