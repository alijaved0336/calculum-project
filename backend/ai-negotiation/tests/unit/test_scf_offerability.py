"""The SECOND SCF gate, on the chat surfaces: can it be offered to THIS supplier?

The playbook, the concession ladder and the pushback scripts already asked both
questions — the session must have the programme AND the programme must be
offerable on rate (:func:`domain.services.scf_analysis.resolve_scf_viability`).
Every other conversational surface asked only the first, so a session with SCF
switched on suggested it in opening strategies, scenarios and follow-ups for
suppliers with no programme rate on file at all, or a rate so far above their own
borrowing that the offer could not be made (client, 2026-08-28).

What is pinned here: the brief resolves offerability, the prompt policy says the
right thing for each of the three states, and no SCF lever reaches a prompt for a
supplier it cannot be pulled for.
"""
from __future__ import annotations

import pytest

from domain.entities.counter_offer import CounterOfferExtraction
from domain.services.brief_builder import brief_from
from domain.services.counter_offer_calculator import analyze_counter_offer
from domain.services.opening_strategy_analysis import analyze_opening_strategy
from domain.services.scf_policy import (
    apply_scf_prompt_policy,
    mentions_scf,
    strip_scf_offer_claims,
)
from utils.prompts.evaluate_counter_offer_prompt import (
    build_counter_offer_response_prompt,
)
from utils.prompts.explain_recommendation_prompt import (
    build_explain_recommendation_prompt,
)
from utils.prompts.opening_strategy_prompt import build_opening_strategy_prompt
from tests.unit.prompt_fixtures import rich_facts

_OFFERABLE = dict(scf_rate=0.03, supplier_financing_rate=0.06)
# The three ways the programme falls out of reach for one supplier.
_NO_SCF_RATE = dict(scf_rate=None, supplier_financing_rate=0.06)
_NO_SUPPLIER_RATE = dict(scf_rate=0.03, supplier_financing_rate=None)
_TOO_DEAR = dict(scf_rate=0.08, supplier_financing_rate=0.029)

_UNOFFERABLE = [_NO_SCF_RATE, _NO_SUPPLIER_RATE, _TOO_DEAR]


def _brief(rates: dict, scf_enabled: bool = True):
    return brief_from(rich_facts(**rates), scf_enabled=scf_enabled)


# ── the brief resolves both gates ─────────────────────────────────────────────

def test_offerable_when_enabled_and_within_the_rate_band():
    brief = _brief(_OFFERABLE)
    assert brief.scf_offerable is True
    assert brief.scf_inviable_reason is None


@pytest.mark.parametrize(
    "rates,reason",
    [
        (_NO_SCF_RATE, "no_scf_rate"),
        (_NO_SUPPLIER_RATE, "no_supplier_rate"),
        (_TOO_DEAR, "not_competitive"),
    ],
)
def test_not_offerable_carries_the_reason(rates, reason):
    brief = _brief(rates)
    assert brief.scf_enabled is True
    assert brief.scf_offerable is False
    assert brief.scf_inviable_reason == reason


def test_session_gate_still_decides_first():
    """Rates that would be offerable never re-open a session without SCF, and
    the reason stays None there — a disabled session never names the programme,
    not even to say why it is unavailable."""
    brief = _brief(_OFFERABLE, scf_enabled=False)
    assert brief.scf_offerable is False
    assert brief.scf_inviable_reason is None


# ── the prompt policy: three states, three directives ────────────────────────

def test_offerable_leaves_the_system_prompt_alone():
    assert apply_scf_prompt_policy("SYS", _brief(_OFFERABLE), True) == "SYS"


def test_session_off_gets_the_suppression_directive():
    out = apply_scf_prompt_policy("SYS", _brief(_OFFERABLE, scf_enabled=False), False)
    assert "Supply Chain Finance is NOT part" in out


@pytest.mark.parametrize("rates,phrase", [
    (_NO_SCF_RATE, "no SCF programme rate is on file"),
    (_NO_SUPPLIER_RATE, "supplier's own financing rate is unknown"),
    (_TOO_DEAR, "runs more than 1 percentage point above"),
])
def test_unofferable_forbids_the_offer_and_says_why(rates, phrase):
    out = apply_scf_prompt_policy("SYS", _brief(rates), True)
    assert out.startswith("SYS")
    assert "CANNOT be offered to this supplier" in out
    assert phrase in out
    # Not the session refusal: the programme exists, it just can't be put on
    # the table here, and a direct question still gets a straight answer.
    assert "Supply Chain Finance is NOT part" not in out


def test_missing_brief_fails_closed():
    """No supplier resolved is no supplier to pitch to."""
    assert "CANNOT be offered" in apply_scf_prompt_policy("SYS", None, True)


# ── no SCF lever reaches a prompt it cannot be pulled in ─────────────────────

def _opening_prompt(rates: dict) -> str:
    facts = rich_facts(**rates)
    brief = brief_from(facts, scf_enabled=True)
    return build_opening_strategy_prompt(
        message="What should I lead with?",
        facts=facts,
        opening_strategy=analyze_opening_strategy(facts, brief.arguments),
        tone=None,
        brief=brief,
    )


def test_opening_strategy_keeps_the_lever_when_it_can_be_pulled():
    assert "SCF RESERVE LEVER [available]" in _opening_prompt(_OFFERABLE)


@pytest.mark.parametrize("rates", _UNOFFERABLE)
def test_opening_strategy_drops_the_unavailable_lever(rates):
    """It used to print "[not available]: <both rates>" — the model was handed
    the programme and its numbers and duly sequenced it as the BATNA."""
    assert "SCF RESERVE LEVER" not in _opening_prompt(rates)


@pytest.mark.parametrize("rates", _UNOFFERABLE)
def test_explain_recommendation_drops_the_unavailable_lever(rates):
    facts = rich_facts(**rates)
    brief = brief_from(facts, scf_enabled=True)
    prompt = build_explain_recommendation_prompt(
        "Why this opening?",
        facts,
        analyze_opening_strategy(facts, brief.arguments),
        brief=brief,
    )
    assert "SCF reserve lever" not in prompt


def _counter_offer_prompt(rates: dict) -> str:
    facts = rich_facts(**rates)
    brief = brief_from(facts, scf_enabled=True)
    extraction = CounterOfferExtraction(counter_type="days_only", counter_term_days=55)
    return build_counter_offer_response_prompt(
        "They came back with 55 days",
        extraction,
        analyze_counter_offer(extraction, facts, brief.arguments),
        facts,
        brief=brief,
    )


def test_counter_offer_shows_the_scf_signals_when_offerable():
    assert "SCF viable" in _counter_offer_prompt(_OFFERABLE)


@pytest.mark.parametrize("rates", _UNOFFERABLE)
def test_counter_offer_hides_the_scf_signals_when_not(rates):
    prompt = _counter_offer_prompt(rates)
    assert "SCF viable" not in prompt
    assert "SCF rate advantage" not in prompt
    assert "SCF undercuts" not in prompt


# ── the do-not-say about an offer that is not on the table ───────────────────

def test_scf_avoid_claim_is_stripped_when_the_offer_is_off():
    """`classify_financial_sensitivity` adds "do not claim supply-chain
    financing is cheaper …" whenever the SCF rate is missing — a disclaimer the
    model writes out in a turn that should not mention SCF at all."""
    from domain.entities.context import SupplierContext

    facts = rich_facts(**_NO_SCF_RATE)
    brief = brief_from(facts, scf_enabled=True)
    assert any(mentions_scf(c) for c in brief.avoid_claims)

    context = SupplierContext(
        supplier_id="s-1", raw={}, facts=facts, argument_analysis=brief.arguments
    )
    stripped = strip_scf_offer_claims(context)
    claims = (
        stripped.argument_analysis["posture"]["financial_sensitivity"]["avoid_claims"]
    )
    assert not any(mentions_scf(c) for c in claims)
    # The rates themselves stay: the negotiator may still ask about them, and
    # the SCF pitch surface needs them to explain why it is declining.
    assert stripped.facts.supplier_financing_rate == 0.06
