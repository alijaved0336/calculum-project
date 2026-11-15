"""Two benchmark buckets, not three (client, 2026-08-18).

    value >  current contractual term  ->  SUPPORTING
    value <= current contractual term  ->  NON-SUPPORTING, never printed in the
                                           negotiation playbook

The middle tier — "partial support" / HOLD IN RESERVE — is gone. Carlos,
Aug 11: *"we should just focus on the ones that are contributing in some way
that are larger than the contractual. And the other ones, we don't need to
mention unless they ask about it."* Joel: *"we don't base our proposal on
that... try to keep it simple."*

What survives the collapse is the WORDING rule, not a bucket: a benchmark that
clears the current term but falls short of the ask may not claim to justify the
full ask (P4 — *"A 48 day benchmark does not justify a 90 extension"*).
"""
from __future__ import annotations

from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.services.brief_builder import brief_from
from domain.services.negotiation_arguments import build_negotiation_arguments
from utils.prompts.brief import VOICE_PITCH, VOICE_PLAYBOOK, render_arguments


def _facts(**kw) -> SupplierFacts:
    base = dict(
        supplier_name="Acme", country="DE", industry="Manufacturing",
        company_size="large", target_term_days=90, current_term_days=51,
        batna_term_days=None, benchmark_term_days=None,
        regulatory_max_term_days=None,
        strategy_benchmarks=[
            StrategyBenchmark(name="parentOrSupplierMax", label="parent", value=95),
            StrategyBenchmark(name="peerGroupStandard", label="peer", value=80),
            StrategyBenchmark(name="industryRegionStandard", label="industry", value=47),
        ],
    )
    base.update(kw)
    return SupplierFacts(**base)


def test_everything_above_the_current_term_is_supporting():
    args = build_negotiation_arguments(_facts())
    assert [a.source for a in args.full_support] == [
        "parentOrSupplierMax", "peerGroupStandard",
    ]


def test_the_middle_bucket_no_longer_exists():
    """80 sits between the 51-day current term and the 90-day ask — the exact
    case that used to be `partial_support` / HOLD IN RESERVE. The field is gone,
    not merely empty, so the tier cannot come back by accident."""
    args = build_negotiation_arguments(_facts())
    assert not hasattr(args, "partial_support")
    assert "peerGroupStandard" in [a.source for a in args.full_support]


def test_at_or_below_the_current_term_is_non_supporting():
    assert [a.source for a in build_negotiation_arguments(_facts()).non_support] == [
        "industryRegionStandard",
    ]
    # Exactly AT the current term is non-supporting: it evidences only the
    # status quo.
    at_current = build_negotiation_arguments(_facts(strategy_benchmarks=[
        StrategyBenchmark(name="peerGroupStandard", label="peer", value=51),
    ]))
    assert [a.source for a in at_current.non_support] == ["peerGroupStandard"]


def test_a_non_supporting_benchmark_never_reaches_the_playbook():
    """The client's rule, stated as an absolute: never mentioned."""
    block = render_arguments(brief_from(_facts()), voice=VOICE_PLAYBOOK)
    assert "47" not in block
    assert "Industry Region Standard" not in block


def test_no_surface_renders_a_reserve_group():
    """The bucket is gone everywhere, not merely hidden from the playbook."""
    for voice in (VOICE_PLAYBOOK, VOICE_PITCH):
        assert "HOLD IN RESERVE" not in render_arguments(
            brief_from(_facts()), voice=voice
        )
    brief = brief_from(_facts())
    assert "reserve" not in brief.arguments
    assert not hasattr(brief, "reserve")


def test_a_supporting_benchmark_short_of_the_ask_says_so():
    """P4 survives as WORDING even though the bucket is gone."""
    peer = next(
        a for a in build_negotiation_arguments(_facts()).full_support
        if a.source == "peerGroupStandard"
    )
    assert "short of the 90-day ask" in peer.rationale
    assert "do NOT present it as justifying the full ask" in peer.rationale


def test_a_benchmark_that_reaches_the_ask_may_justify_it_outright():
    parent = next(
        a for a in build_negotiation_arguments(_facts()).full_support
        if a.source == "parentOrSupplierMax"
    )
    assert "Cite it to justify the ask" in parent.rationale


def test_the_brief_the_playbook_renders_uses_the_same_bar():
    """`collect_supporting_arguments` used `>= ask` while the buckets used
    `> current`, so a benchmark could be supporting in one and absent in the
    other — one benchmark, two answers."""
    brief = brief_from(_facts())
    assert [a["key"] for a in brief.evidence] == [
        "parentOrSupplierMax", "peerGroupStandard",
    ]


def test_a_supplier_with_supporting_benchmarks_can_still_be_a_stretch_target():
    """Nothing reaches the ask, so the market does not back the number.

    Testing merely for the presence of a benchmark would call this supported —
    the bug the two-bucket change would otherwise have introduced.
    """
    brief = brief_from(_facts(
        target_term_days=120,
        strategy_benchmarks=[
            StrategyBenchmark(name="peerGroupStandard", label="peer", value=80),
        ],
    ))
    assert brief.evidence                    # 80 > 51, so it IS supporting
    assert brief.is_stretch_target is True   # ...but nothing reaches 120
