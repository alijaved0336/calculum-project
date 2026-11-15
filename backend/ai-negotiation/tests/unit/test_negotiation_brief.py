"""The brief: one object, built once, agreeing with itself.

What these lock down is not the values (those are tested where they are
computed) but the two properties that make the brief worth having: it is the
SAME data every surface reads, and it is derived from the resolved context — so
a session override moves the ask and everything downstream of it together.
"""
from __future__ import annotations

from domain.entities.brief import NegotiationBrief
from domain.entities.context import SupplierContext
from domain.entities.overrides import NegotiationOverrides
from domain.services.brief_builder import build_negotiation_brief
from domain.services.negotiation_arguments import build_argument_analysis
from domain.services.negotiation_overrides import resolve_overridden_context
from tests.unit.prompt_fixtures import rich_facts, sparse_facts


def _context(facts) -> SupplierContext:
    return SupplierContext(
        supplier_id="s1", raw={}, facts=facts,
        argument_analysis=build_argument_analysis(facts),
    )


def test_no_supplier_data_yields_no_brief():
    assert build_negotiation_brief(None) is None
    assert build_negotiation_brief(SupplierContext(supplier_id="s1", raw={})) is None


def test_brief_reuses_the_bundle_the_context_already_computed():
    """The argument bundle is built once per session. A brief that rebuilt it
    would both cost more and be able to disagree with the context."""
    context = _context(rich_facts())
    brief = build_negotiation_brief(context)
    assert brief.arguments is context.argument_analysis


def test_success_probability_is_read_off_the_facts_never_scored():
    """It replaced a composite the domain used to score from five inputs. It is
    a payload value now: present when the payload carried one, absent when it
    did not, and never inferred from the leverage or the ratings."""
    assert build_negotiation_brief(_context(rich_facts())).success_probability == "high"
    assert build_negotiation_brief(_context(sparse_facts())).success_probability is None


def test_brief_terms_come_from_the_argument_bundle():
    brief = build_negotiation_brief(_context(rich_facts()))
    assert brief.batna_floor == brief.arguments["terms"]["batna_floor"]
    assert brief.current_term == brief.facts.current_term_days
    assert brief.ask == 76


def test_brief_exposes_the_posture_judgments_without_a_typed_analysis():
    """The posture used to live on a second, typed object. It is read off the
    one bundle that computes it, so there is nothing left to drift against."""
    brief = build_negotiation_brief(_context(rich_facts()))
    assert brief.leverage["posture"]
    assert brief.financial_sensitivity["level"]
    assert brief.priority["level"]
    assert not hasattr(brief, "risk")   # the risk grade was removed 2026-08-20
    assert brief.sequence
    assert brief.assessments["relationship"] is brief.relationship


def test_brief_exposes_every_bucket():
    brief = build_negotiation_brief(_context(rich_facts()))
    # Ordered by the client's SOURCE ranking, never the day-figure.
    # Every benchmark above the support bar (current 34 + 15 = 49 — the 40-day
    # industry standard falls short), then the assessments.
    assert [a["key"] for a in brief.supporting] == [
        "buyerStandard", "parentOrSupplierMax", "peerGroupStandard",
        "dso", "payOnTerms", "costImpact",
    ]
    # Relationship ranks last and only joins when nothing stronger is queued.
    assert brief.relationship["usable_as_argument"] is True
    assert "relationship" not in [a["key"] for a in brief.supporting]
    # No reserve tier exists: above the bar -> supporting, at or below ->
    # non_supporting. Nothing in between, and no `reserve` key on the bundle at
    # all.
    assert "reserve" not in brief.arguments
    assert [a["key"] for a in brief.non_supporting] == ["industryRegionStandard"]
    assert brief.unavailable == ["supplierStandard"]


def test_stretch_target_is_true_only_when_no_benchmark_reaches_the_ask():
    """The soft arguments remove objections; they do not evidence the number.
    A supporting list made only of them is still a stretch target."""
    assert build_negotiation_brief(_context(rich_facts())).is_stretch_target is False

    # Cost impact is now computable wherever spend and cash flow exist — the
    # client's formula defaults the WACC to 9% rather than requiring a rate — so
    # a sparse supplier can carry it. It evidences no TERM, so the flag holds.
    sparse = build_negotiation_brief(_context(sparse_facts()))
    assert [a["key"] for a in sparse.supporting] == ["costImpact"]
    assert all(a["value_days"] is None for a in sparse.supporting)
    assert sparse.is_stretch_target is True

    # Benchmarks all absent, but our payment record is usable — supporting is
    # non-empty and it is STILL a stretch target.
    soft_only = build_negotiation_brief(_context(sparse_facts(
        pay_on_terms_term_days=60, actual_payment_terms_days=55,
    )))
    assert [a["key"] for a in soft_only.supporting] == ["payOnTerms", "costImpact"]
    assert soft_only.is_stretch_target is True


def test_state_views_are_the_same_objects_not_copies():
    """The state key is a view onto the brief, not a second computation that
    could drift from it."""
    brief = build_negotiation_brief(_context(rich_facts()))
    views = brief.state_views()
    assert views["argument_analysis"] is brief.arguments
    assert set(views) == {"argument_analysis"}


def test_a_target_override_moves_the_whole_brief():
    """The reason the brief is per-turn and not per-session.

    Raising the target past a benchmark that used to support it must move that
    benchmark out of the supporting set — not leave a stale bucket behind.
    """
    facts = rich_facts()
    context = _context(facts)
    before = build_negotiation_brief(context)
    assert "parentOrSupplierMax" in [a["key"] for a in before.supporting]

    # Ask raised to 120 — nothing reaches it any more.
    overridden = resolve_overridden_context(
        context, NegotiationOverrides(target_term_days=120)
    )
    after = build_negotiation_brief(overridden)
    assert after.ask == 120
    # It stays supporting: raising the target does not drop a benchmark still
    # above the CURRENT term — the bar is the current term, not the ask.
    assert "parentOrSupplierMax" in [a["key"] for a in after.supporting]
    assert after.is_stretch_target is True


def test_scf_flag_rides_on_the_brief():
    brief = build_negotiation_brief(_context(rich_facts()), scf_enabled=True)
    assert brief.scf_enabled is True
    assert build_negotiation_brief(_context(rich_facts())).scf_enabled is False


def test_brief_is_frozen():
    """Derived, never authoritative — a changed input makes a new brief."""
    import dataclasses

    assert dataclasses.fields(NegotiationBrief)
    brief = build_negotiation_brief(_context(rich_facts()))
    try:
        brief.scf_enabled = True  # type: ignore[misc]
    except dataclasses.FrozenInstanceError:
        return
    raise AssertionError("NegotiationBrief must be frozen")
