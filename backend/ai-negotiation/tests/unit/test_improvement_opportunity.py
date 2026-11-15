"""§2 — no improvement opportunity, no strategy.

    Target Term <= Current Term  →  refuse to generate, say why, and offer a
    higher target only when a benchmark evidences one that clears a full
    15-day step.
    0 < Target - Current < 15    →  generate, with a thin-opportunity warning.

The verdict is computed in code and enforced at the router, so a strategy
intent with nothing to argue for never reaches an LLM (P5).
"""
from __future__ import annotations

import pytest

from agents.graph import _has_improvement_opportunity, _route_after_intent, _route_after_rag
from domain.entities.facts import StrategyBenchmark, SupplierFacts
from agents.state import NegotiationState
from domain.entities.intent import Intent
from domain.services.improvement_opportunity import (
    BLOCKED_BY_NO_EXTENSION,
    BLOCKED_BY_REGULATORY_CAP,
    MIN_IMPROVEMENT_DAYS,
    assess_improvement_opportunity,
    thin_opportunity_warning,
)


def _b(name: str, value: int) -> StrategyBenchmark:
    return StrategyBenchmark(name=name, label=f"the {name}", value=value)


def _facts(**kw) -> SupplierFacts:
    base = dict(
        supplier_name="Acme", country="DE", industry="Manufacturing", company_size="large",
        target_term_days=90, current_term_days=60, batna_term_days=None,
        benchmark_term_days=None, regulatory_max_term_days=None,
    )
    base.update(kw)
    return SupplierFacts(**base)


# ── the verdict ────────────────────────────────────────────────────────────


def test_an_ask_above_the_current_term_is_an_opportunity():
    assert assess_improvement_opportunity(_facts()).has_opportunity is True


def test_the_same_number_on_both_sides_is_not_a_negotiation():
    """90 -> 90 is the case the client called out by name."""
    v = assess_improvement_opportunity(_facts(target_term_days=90, current_term_days=90))
    assert v.has_opportunity is False
    assert "both 90 days" in v.message
    assert "nothing to negotiate" in v.message


def test_an_extension_smaller_than_one_15_day_step_is_allowed_with_a_warning():
    """Client, 2026-09-24: 70 against 60 is a real (if small) extension — the
    gate stays open and the negotiator is warned instead of refused."""
    v = assess_improvement_opportunity(_facts(target_term_days=70, current_term_days=60))
    assert v.has_opportunity is True
    assert v.blocked_by is None
    assert v.message == ""
    assert "only 10 days above the current 60-day terms" in v.warning
    assert "15-day step" in v.warning


def test_a_one_day_extension_is_warned_in_the_singular():
    v = assess_improvement_opportunity(_facts(target_term_days=61, current_term_days=60))
    assert v.has_opportunity is True
    assert "only 1 day above" in v.warning


def test_with_no_benchmark_the_block_still_says_how_to_unlock_the_features():
    """The next 15-day step, not current+1: a 95 against 91-day terms would be
    stored as 90 and blocked again."""
    v = assess_improvement_opportunity(_facts(target_term_days=90, current_term_days=91))
    assert v.suggested_target_days is None
    assert "set the target to 105 days or more" in v.message
    v = assess_improvement_opportunity(_facts(target_term_days=90, current_term_days=90))
    assert "set the target to 105 days or more" in v.message


def test_no_warning_on_a_full_step_or_a_blocked_verdict():
    assert assess_improvement_opportunity(_facts(target_term_days=75, current_term_days=60)).warning is None
    assert assess_improvement_opportunity(_facts(target_term_days=60, current_term_days=60)).warning is None
    assert assess_improvement_opportunity(_facts(target_term_days=45, current_term_days=60)).warning is None
    assert thin_opportunity_warning(None) is None


def test_exactly_one_step_is_an_opportunity():
    """A full step clears the thin-opportunity bar — the boundary the whole
    15-day ladder is built on."""
    v = assess_improvement_opportunity(_facts(target_term_days=75, current_term_days=60))
    assert v.has_opportunity is True
    assert v.blocked_by is None


def test_the_bar_is_the_harmonisation_step_itself():
    """Not a second 15 written down somewhere else — one constant, one rule."""
    from domain.entities.facts import TERM_HARMONISATION_STEP_DAYS
    assert MIN_IMPROVEMENT_DAYS == TERM_HARMONISATION_STEP_DAYS


def test_an_ask_below_the_current_term_moves_us_backwards():
    v = assess_improvement_opportunity(_facts(target_term_days=45, current_term_days=60))
    assert v.has_opportunity is False
    assert "below the 60-day payment terms we already have" in v.message
    assert "backwards" in v.message


def test_the_ask_is_the_opportunity_term_when_there_is_one():
    f = _facts(target_term_days=90, opportunity_term_days=60, current_term_days=60)
    assert assess_improvement_opportunity(f).has_opportunity is False


@pytest.mark.parametrize("kw", [
    {"current_term_days": None},
    {"target_term_days": None, "opportunity_term_days": None},
])
def test_a_missing_figure_is_not_evidence_that_there_is_nothing_to_gain(kw):
    """We cannot SHOW there is no opportunity, so the normal path runs."""
    assert assess_improvement_opportunity(_facts(**kw)).has_opportunity is True


# ── the suggested target ───────────────────────────────────────────────────


def test_a_benchmark_above_the_current_term_becomes_a_suggested_target():
    f = _facts(
        target_term_days=60, current_term_days=60,
        strategy_benchmarks=[_b("peerGroupStandard", 83), _b("industryRegionStandard", 40)],
    )
    v = assess_improvement_opportunity(f)
    # Harmonised to the 15-day ladder (§2): 83 -> 90.
    assert v.suggested_target_days == 90
    assert v.suggested_target_source == "the peerGroupStandard"
    assert "supports a target of 90 days" in v.message


def test_no_benchmark_above_the_current_term_means_no_suggestion():
    """§2 allows a higher target ONLY when a benchmark evidences one."""
    f = _facts(
        target_term_days=60, current_term_days=60,
        strategy_benchmarks=[_b("industryRegionStandard", 40)],
    )
    v = assess_improvement_opportunity(f)
    assert v.suggested_target_days is None
    assert "no evidence to support a higher target" in v.message


def test_a_suggestion_that_harmonises_back_to_the_current_term_is_dropped():
    """A 34-day benchmark against 30-day terms harmonises to 30 — not a suggestion."""
    f = _facts(
        target_term_days=30, opportunity_term_days=None, current_term_days=30,
        strategy_benchmarks=[_b("peerGroupStandard", 34)],
    )
    assert assess_improvement_opportunity(f).suggested_target_days is None


def test_a_suggestion_inside_the_15_day_step_is_dropped():
    """A 70-day benchmark against 60-day terms harmonises to 75 — but a 65-day
    one harmonises to 60. Offering a target this gate would block the moment it
    was taken is worse than offering none."""
    f = _facts(
        target_term_days=60, current_term_days=60,
        strategy_benchmarks=[_b("peerGroupStandard", 65)],
    )
    v = assess_improvement_opportunity(f)
    assert v.suggested_target_days is None
    assert "no evidence to support a higher target" in v.message


def test_a_cap_leaving_less_than_a_step_is_reported_as_the_regulatory_block():
    """A 70-day cap over 60-day terms leaves 10 days — real room, but not a
    step. Raising the target cannot fix it, so it must not be suggested."""
    f = _facts(
        target_term_days=60, current_term_days=60,
        regulatory_max_term_days=70, regulatory_applied=True,
        strategy_benchmarks=[_b("peerGroupStandard", 90)],
    )
    v = assess_improvement_opportunity(f)
    assert v.has_opportunity is False
    assert v.blocked_by == BLOCKED_BY_REGULATORY_CAP
    assert "only 10 days above our current 60-day terms" in v.message
    assert "15-day steps" in v.message
    assert v.suggested_target_days is None
    assert "set a higher target" not in v.message.lower()


def test_an_applied_regulatory_cap_bounds_the_suggestion():
    f = _facts(
        target_term_days=60, current_term_days=60,
        regulatory_max_term_days=80, regulatory_enforced=True,
        regulatory_applied=True,
        strategy_benchmarks=[_b("peerGroupStandard", 76)],
    )
    # 76 would harmonise to 75 — under the cap, so it stands.
    assert assess_improvement_opportunity(f).suggested_target_days == 75


# ── the regulatory block ───────────────────────────────────────────────────


def test_a_blocked_verdict_names_which_of_the_two_reasons_closed_the_door():
    v = assess_improvement_opportunity(_facts(target_term_days=90, current_term_days=90))
    assert v.blocked_by == BLOCKED_BY_NO_EXTENSION
    v = assess_improvement_opportunity(_facts())
    assert v.blocked_by is None


def test_an_applied_cap_at_the_current_term_blocks_the_negotiation():
    """The regulation allows exactly what we already have — no room to extend."""
    f = _facts(
        # The ask arrives already capped: `extract_supplier_facts` pulled it
        # down to the limit when the facts were built.
        target_term_days=60, current_term_days=60,
        regulatory_max_term_days=60, regulatory_enforced=True,
        regulatory_applied=True,
        strategy_benchmarks=[_b("peerGroupStandard", 90)],
    )
    v = assess_improvement_opportunity(f)
    assert v.has_opportunity is False
    assert v.blocked_by == BLOCKED_BY_REGULATORY_CAP
    assert v.regulatory_cap_days == 60
    assert "regulatory limit" in v.message
    assert "60 days" in v.message


def test_the_regulatory_block_never_offers_a_higher_target():
    """The one case where "set a higher target" is wrong advice.

    A 90-day peer benchmark sits well above the current term, so the ordinary
    no-extension message would send the negotiator off to set a 90-day target —
    which the cap would pull straight back down to 60.
    """
    f = _facts(
        target_term_days=60, current_term_days=60,
        regulatory_max_term_days=60, regulatory_applied=True,
        strategy_benchmarks=[_b("peerGroupStandard", 90)],
    )
    v = assess_improvement_opportunity(f)
    assert v.suggested_target_days is None
    assert v.suggested_target_source is None
    assert "set a higher target" not in v.message.lower()
    assert "won't change this" in v.message


def test_current_terms_already_longer_than_the_cap_read_as_compliance():
    """Not a negotiation — our terms already exceed what the regulation allows."""
    f = _facts(
        target_term_days=45, current_term_days=75,
        regulatory_max_term_days=45, regulatory_applied=True,
    )
    v = assess_improvement_opportunity(f)
    assert v.has_opportunity is False
    assert v.blocked_by == BLOCKED_BY_REGULATORY_CAP
    assert "already longer" in v.message
    assert "compliance" in v.message


def test_an_unapplied_cap_blocks_nothing():
    """`enforced` without `applied` is reference material — the ask stands."""
    f = _facts(
        target_term_days=90, current_term_days=60,
        regulatory_max_term_days=60, regulatory_enforced=True,
        regulatory_applied=False,
    )
    v = assess_improvement_opportunity(f)
    assert v.has_opportunity is True
    assert v.regulatory_cap_days is None


def test_a_cap_above_the_current_term_leaves_the_negotiation_open():
    """A binding cap that still leaves room is a smaller negotiation, not none."""
    f = _facts(
        target_term_days=60, current_term_days=45,
        regulatory_max_term_days=60, regulatory_applied=True,
    )
    v = assess_improvement_opportunity(f)
    assert v.has_opportunity is True
    assert v.blocked_by is None
    assert v.regulatory_cap_days == 60


# ── the router gate ────────────────────────────────────────────────────────


class _Ctx:
    def __init__(self, facts):
        self.facts = facts


_STRATEGY = [
    Intent.GENERATE_NEGOTIATION_PLAYBOOK,
    Intent.RECOMMEND_OPENING_STRATEGY,
    Intent.HANDLE_SUPPLIER_PUSHBACK,
]


@pytest.mark.parametrize("intent", _STRATEGY)
def test_a_strategy_intent_with_no_opportunity_never_reaches_an_llm(intent):
    state = {
        "intent": intent,
        "context": _Ctx(_facts(target_term_days=90, current_term_days=90)),
        "scf_enabled": True,
    }
    assert _route_after_intent(state) == "no_opportunity"
    assert _route_after_rag(state) == "no_opportunity"


@pytest.mark.parametrize("intent", _STRATEGY)
def test_a_strategy_intent_blocked_by_the_regulatory_cap_never_reaches_an_llm(intent):
    state = {
        "intent": intent,
        "context": _Ctx(_facts(
            target_term_days=60, current_term_days=60,
            regulatory_max_term_days=60, regulatory_applied=True,
        )),
        "scf_enabled": True,
    }
    assert _route_after_intent(state) == "no_opportunity"
    assert _route_after_rag(state) == "no_opportunity"


@pytest.mark.parametrize("intent", _STRATEGY)
def test_the_same_intent_routes_normally_when_there_is_room(intent):
    state = {
        "intent": intent,
        "context": _Ctx(_facts(target_term_days=90, current_term_days=60)),
        "scf_enabled": True,
    }
    assert _route_after_intent(state) != "no_opportunity"


@pytest.mark.parametrize("intent", _STRATEGY)
def test_a_thin_opportunity_routes_normally(intent):
    """Less than a step above current is warned about, never blocked."""
    state = {
        "intent": intent,
        "context": _Ctx(_facts(target_term_days=70, current_term_days=60)),
        "scf_enabled": True,
    }
    assert _route_after_intent(state) != "no_opportunity"
    assert _route_after_rag(state) != "no_opportunity"


@pytest.mark.parametrize("intent", [
    Intent.ANSWER_DATA_QUESTION,
    Intent.SUMMARIZE_SUPPLIER_POSITION,
    Intent.EXPLAIN_RECOMMENDATION,
    Intent.APPLY_OVERRIDE,
    Intent.RUN_SCENARIO,
])
def test_non_strategy_intents_are_not_blocked(intent):
    """Answering a data question is still legitimate with nothing to negotiate.

    Blocking these would withhold data the negotiator is entitled to instead of
    telling them the truth about the ask.
    """
    state = {
        "intent": intent,
        "context": _Ctx(_facts(target_term_days=90, current_term_days=90)),
        "scf_enabled": True,
    }
    assert _route_after_intent(state) != "no_opportunity"


def test_a_missing_context_does_not_trigger_the_gate():
    assert _has_improvement_opportunity({"context": None}) is True
    assert _has_improvement_opportunity({}) is True


def test_the_gate_reads_the_state_key_the_graph_actually_carries():
    """`context`, not `supplier_context`.

    Fails open by design — so reading the wrong key would silently disable the
    whole gate and every routing test above would still pass, because they
    would be setting the same wrong key. Pinned against the state definition
    rather than against a fixture.
    """
    assert "context" in NegotiationState.__annotations__
    assert "supplier_context" not in NegotiationState.__annotations__


# ── the thin-opportunity warning on the response ──────────────────────────


def test_the_warning_rides_beside_a_strategy_turn_only():
    """It is a UI notice on the response, never text in the playbook/email —
    and only on strategy turns that actually produced their output."""
    from api.routes.negotiation import _turn_opportunity_warning

    thin = _Ctx(_facts(target_term_days=70, current_term_days=60))
    warning = _turn_opportunity_warning(thin, Intent.GENERATE_NEGOTIATION_PLAYBOOK, None)
    assert warning and "only 10 days above" in warning
    assert _turn_opportunity_warning(thin, Intent.DRAFT_EMAIL, None) == warning
    assert _turn_opportunity_warning(thin, Intent.ANSWER_DATA_QUESTION, None) is None
    assert _turn_opportunity_warning(thin, Intent.DRAFT_EMAIL, "scf_blocked") is None
    roomy = _Ctx(_facts(target_term_days=90, current_term_days=60))
    assert _turn_opportunity_warning(roomy, Intent.GENERATE_NEGOTIATION_PLAYBOOK, None) is None
    assert _turn_opportunity_warning(None, Intent.GENERATE_NEGOTIATION_PLAYBOOK, None) is None
