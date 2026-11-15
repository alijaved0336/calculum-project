"""The ask is always a whole multiple of 15 days.

The client negotiates in 15-day steps, so 71 or 83 days is not a term they would
put to a supplier. Every target that enters the system moves to the CLOSEST
multiple — at the payload boundary and on the negotiator's own session override —
so nothing downstream has to round its own.
"""
from __future__ import annotations

import pytest

from domain.entities.facts import (
    TERM_HARMONISATION_STEP_DAYS,
    harmonise_term_days,
    negotiation_ask_term,
    rescale_cash_flow_for_term,
)
from domain.entities.overrides import NegotiationOverrides
from domain.services.negotiation_overrides import resolve_overridden_context
from domain.services.context_builder import build_supplier_context
from domain.services.supplier_facts import extract_supplier_facts


# ── The rule itself ────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "raw,expected",
    [
        # The three the client specified.
        (71, 75),
        (83, 90),
        (113, 120),
        # Nearest, so these go DOWN — the cases that separate this rule from
        # "always round up" (which would give 75, 90, 105, 120).
        (61, 60),
        (76, 75),
        (91, 90),
        (106, 105),
        # Boundaries either side of the half-step.
        (67, 60),
        (68, 75),
        (89, 90),
        (1, 0),
        (8, 15),
    ],
)
def test_moves_to_the_closest_multiple_of_15(raw, expected):
    assert harmonise_term_days(raw) == expected


@pytest.mark.parametrize("value", [61, 76, 91, 106])
def test_rounds_down_when_that_is_closer(value):
    """The rule is NEAREST, not "always up": a 76-day modelled target becomes a
    75-day ask, not a 90-day one nothing evidenced."""
    assert harmonise_term_days(value) < value


@pytest.mark.parametrize("exact", [15, 30, 45, 60, 75, 90, 120])
def test_leaves_a_term_already_on_a_multiple_alone(exact):
    assert harmonise_term_days(exact) == exact


def test_none_stays_none():
    """A missing target must not become 15."""
    assert harmonise_term_days(None) is None


def test_is_idempotent():
    """Applied at more than one boundary, so a second pass must be a no-op."""
    once = harmonise_term_days(83)
    assert harmonise_term_days(once) == once


def test_step_is_fifteen():
    assert TERM_HARMONISATION_STEP_DAYS == 15


# ── The regulatory ceiling ─────────────────────────────────────────────────


def test_rounding_up_may_reach_an_applied_cap():
    """58 under a 60-day applied cap harmonises to exactly the cap."""
    assert harmonise_term_days(58, cap=60) == 60


def test_rounding_up_never_crosses_an_applied_cap():
    """68 is closest to 75, which breaches a 60-day statutory limit.

    The cap binds first (68 → 60), and 60 is already on the ladder, so the ask
    is 60. Rounding is a presentation rule; it must never be the thing that
    puts an illegal term on the table.
    """
    assert harmonise_term_days(68, cap=60) == 60


def test_rounding_down_is_unaffected_by_a_cap():
    """61 is closest to 60 — under the cap, so the cap never comes into it."""
    assert harmonise_term_days(61, cap=60) == 60


def test_a_term_above_the_cap_is_pulled_down_to_it():
    """The `min()` rule: an applied ceiling outranks the target we were given."""
    assert harmonise_term_days(83, cap=60) == 60


def test_a_capped_term_still_lands_on_the_15_day_ladder():
    """A cap off the ladder rounds DOWN to the step beneath it, never up past it.

    A 50-day limit gives a 45-day ask: the target stays a multiple of 15 (the
    one invariant every surface relies on) and stays legal. 50 would be legal
    but off-ladder; 60 would be on-ladder but illegal.
    """
    assert harmonise_term_days(90, cap=50) == 45
    assert harmonise_term_days(52, cap=50) == 45


def test_a_cap_below_one_step_is_quoted_verbatim():
    """No multiple of 15 fits under a 10-day cap — better the cap than a 0-day term."""
    assert harmonise_term_days(90, cap=10) == 10


# ── Cash flow follows the harmonised term ──────────────────────────────────


def test_cash_flow_scales_on_the_extension_not_the_term():
    """30-day current, 71 → 75 target scales by 45/41, not 75/71."""
    scaled = rescale_cash_flow_for_term(
        41_000, base_term=71, new_term=75, current_term=30
    )
    assert scaled == round(41_000 * 45 / 41)


def test_cash_flow_untouched_when_the_term_did_not_move():
    assert rescale_cash_flow_for_term(
        41_000, base_term=75, new_term=75, current_term=30
    ) == 41_000


def test_cash_flow_untouched_without_a_baseline_to_scale_from():
    assert rescale_cash_flow_for_term(
        41_000, base_term=None, new_term=75, current_term=30
    ) == 41_000
    assert rescale_cash_flow_for_term(
        41_000, base_term=30, new_term=75, current_term=30
    ) == 41_000


# ── The payload boundary ───────────────────────────────────────────────────


def _payload(**target_overrides) -> dict:
    target = {
        "targetPaymentTerms": 71,
        "opportunityPaymentTerms": 83,
        "targetCashFlow": 41_000,
    }
    target.update(target_overrides)
    return {
        "supplier": {"name": "Acme GmbH"},
        "target": target,
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": 30,
            "actualPaymentTerms": 30,
        },
        "agreement": {},
        "negotiationStrategy": {},
    }


def test_payload_target_and_opportunity_are_both_harmonised():
    facts = extract_supplier_facts(_payload())
    assert facts.target_term_days == 75
    assert facts.opportunity_term_days == 90


def test_the_ask_every_surface_reads_is_harmonised():
    """`negotiation_ask_term` is what the buckets, floor and anchor compare
    against — it must never see a raw 83."""
    facts = extract_supplier_facts(_payload())
    assert negotiation_ask_term(facts) == 90


def test_payload_cash_flow_follows_the_harmonised_target():
    facts = extract_supplier_facts(_payload())
    assert facts.target_cash_flow == round(41_000 * 45 / 41)


def test_modeled_opportunity_is_harmonised_when_no_user_target_is_set():
    """A null targetPaymentTerms falls back to the opportunity term — which must
    be harmonised on that path too."""
    facts = extract_supplier_facts(_payload(targetPaymentTerms=None))
    assert facts.target_is_user_set is False
    assert facts.target_term_days == 90


def test_an_applied_regulatory_cap_bounds_the_payload_target():
    """ONLY_EXCEPTIONS + applied: the 68-day target is capped to the 60-day limit."""
    payload = _payload(targetPaymentTerms=68, opportunityPaymentTerms=None)
    payload["negotiationStrategy"] = {
        "regulatoryTerm": {
            "applied": True,
            "value": 60,
            "group": {"value": 60, "enforced": True, "limitType": "ONLY_EXCEPTIONS"},
        }
    }
    facts = extract_supplier_facts(payload)
    assert facts.regulatory_applied is True
    assert facts.target_term_days == 60


def test_an_enforced_but_unapplied_regulation_does_not_bound_the_target():
    """limitType NONE: enforced, but `applied` is false — reference material only.

    The doc's first scenario. Nothing about the negotiation changes, and the
    figure is still carried for the facts block.
    """
    payload = _payload(targetPaymentTerms=90, opportunityPaymentTerms=None)
    payload["negotiationStrategy"] = {
        "regulatoryTerm": {
            "applied": False,
            "value": 60,
            "group": {"value": 60, "enforced": True, "limitType": "NONE"},
        }
    }
    facts = extract_supplier_facts(payload)
    assert facts.regulatory_applied is False
    assert facts.regulatory_enforced is True
    assert facts.regulatory_max_term_days == 60
    assert facts.target_term_days == 90


def test_an_unenforced_recommendation_bounds_the_target_when_applied():
    """limitType ALL: a recommendation the client has chosen to treat as a cap.

    `enforced` is false and the cap still binds — which is exactly why
    `applied` is the flag we read and `enforced` is not.
    """
    payload = _payload(targetPaymentTerms=90, opportunityPaymentTerms=None)
    payload["negotiationStrategy"] = {
        "regulatoryTerm": {
            "applied": True,
            "value": 60,
            "group": {"value": 60, "enforced": False, "limitType": "ALL"},
        }
    }
    facts = extract_supplier_facts(payload)
    assert facts.target_term_days == 60


def test_a_flattened_regulatory_entry_is_read_the_same_way():
    """value/enforced/limitType alongside `applied`, with no `group` at all."""
    payload = _payload(targetPaymentTerms=90, opportunityPaymentTerms=None)
    payload["negotiationStrategy"] = {
        "regulatoryTerm": {
            "value": 60, "enforced": True, "limitType": "ONLY_EXCEPTIONS",
            "applied": True,
        }
    }
    facts = extract_supplier_facts(payload)
    assert facts.regulatory_max_term_days == 60
    assert facts.regulatory_limit_type == "ONLY_EXCEPTIONS"
    assert facts.target_term_days == 60


def test_the_cash_flow_unlock_follows_a_capped_target():
    """The unlock upstream computed is keyed to the uncapped ask — rescale it."""
    payload = _payload(targetPaymentTerms=90, opportunityPaymentTerms=None)
    payload["negotiationStrategy"] = {
        "regulatoryTerm": {"applied": True, "value": 60, "group": {"value": 60}}
    }
    facts = extract_supplier_facts(payload)
    # current 30, base target 90 (extension 60) → capped 60 (extension 30).
    assert facts.target_term_days == 60
    assert facts.target_cash_flow == round(41_000 * 30 / 60)


def test_missing_target_stays_missing():
    payload = _payload(targetPaymentTerms=None, opportunityPaymentTerms=None)
    facts = extract_supplier_facts(payload)
    assert facts.target_term_days is None
    assert facts.opportunity_term_days is None


# ── The negotiator's session override ──────────────────────────────────────


def test_a_negotiator_override_is_harmonised_too():
    """The override is the one path that could otherwise put a non-multiple on
    the table."""
    context = build_supplier_context(_payload())
    resolved = resolve_overridden_context(
        context, NegotiationOverrides(target_term_days=83)
    )
    assert resolved.facts.target_term_days == 90
    assert resolved.facts.opportunity_term_days == 90
    assert resolved.facts.target_is_user_set is True


def test_an_override_already_on_a_multiple_is_untouched():
    context = build_supplier_context(_payload())
    resolved = resolve_overridden_context(
        context, NegotiationOverrides(target_term_days=90)
    )
    assert resolved.facts.target_term_days == 90
