"""Session target/BATNA overrides: the store, the context application, and
the target-resolution rule they build on.

Product rules exercised here:
  * targetPaymentTerms (user-set) wins over opportunityPaymentTerms; a null
    target falls back to the opportunity and flags `target_is_user_set=False`.
  * An override applies to the whole context: the target override moves the ask
    too, the BATNA override replaces the floor, and a target override does
    NOT recalculate the BATNA (it keeps the calculated default).
  * The store is session-scoped and independent per field.
"""
from __future__ import annotations

from typing import Any

import application.services.override_store as store
from domain.entities.facts import negotiation_ask_term, resolve_effective_batna
from domain.entities.overrides import NegotiationOverrides
from domain.services.context_builder import build_supplier_context
from domain.services.negotiation_overrides import resolve_overridden_context
from domain.services.supplier_facts import extract_supplier_facts


def _payload(target=None, opportunity=76, current=34, **strategy) -> dict[str, Any]:
    strat = {
        "industryRegionStandard": {"value": 40},
        "peerGroupStandard": {"value": 58},
        "supplierStandard": {"value": 70},
        "parentOrSupplierMax": {"value": 80},
    }
    strat.update(strategy)
    return {
        "supplier": {
            "name": "U.S. Foodservice", "uuid": "u1", "country": "US",
            "mainIndustryName": "Foodservice", "companySize": "LARGE",
            "spendVolume": 12852649.0,
        },
        "target": {
            "targetPaymentTerms": target,
            "opportunityPaymentTerms": opportunity,
            "targetCashFlow": 1_000_000,
        },
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": current,
            "actualPaymentTerms": current,
        },
        "agreement": {},
        "negotiationStrategy": strat,
    }


# ── target resolution + user-set flag ──────────────────────────────────────

def test_null_target_falls_back_to_opportunity_and_flags_not_user_set():
    # Harmonised on the way in: 76 → 75, the closest 15-day step
    # (see tests/unit/test_term_harmonisation.py).
    facts = extract_supplier_facts(_payload(target=None, opportunity=76))
    assert facts.target_term_days == 75
    assert facts.target_is_user_set is False


def test_user_target_wins_over_opportunity_and_sets_flag():
    # The user's 70 wins over the modeled 76, then harmonises to 75.
    facts = extract_supplier_facts(_payload(target=70, opportunity=76))
    assert facts.target_term_days == 75
    assert facts.target_is_user_set is True


# ── override store ─────────────────────────────────────────────────────────

def test_store_sets_and_clears_fields_independently():
    sid = "sess-store-1"
    store.clear_session(sid)
    assert store.get_overrides(sid) == NegotiationOverrides()

    store.set_target(sid, 85)
    store.set_batna(sid, 50)
    assert store.get_overrides(sid) == NegotiationOverrides(target_term_days=85, batna_term_days=50)

    # Clearing only the target leaves the BATNA in place.
    store.clear(sid, target=True, batna=False)
    assert store.get_overrides(sid) == NegotiationOverrides(target_term_days=None, batna_term_days=50)

    store.clear_session(sid)
    assert store.get_overrides(sid) == NegotiationOverrides()


# ── resolve_overridden_context ──────────────────────────────────────────────

def test_no_override_returns_same_context():
    ctx = build_supplier_context(_payload())
    assert resolve_overridden_context(ctx, NegotiationOverrides()) is ctx


def test_target_override_moves_target_ask_walkaway_and_cashflow():
    # benchmarks 40/58/70/80, current 34. The modeled 76 harmonises to 75.
    ctx = build_supplier_context(_payload(target=None, opportunity=76))
    base_batna = ctx.argument_analysis["terms"]["batna_floor"]
    assert base_batna == 60                              # 75 − 15 = 60 (§5)

    # 65 harmonises to 60 (its closest step) — the override is not the one path
    # that escapes the 15-day rule.
    out = resolve_overridden_context(ctx, NegotiationOverrides(target_term_days=65))

    assert out.facts.target_term_days == 60
    assert out.facts.opportunity_term_days == 60           # ask follows the target
    assert negotiation_ask_term(out.facts) == 60
    assert out.facts.target_is_user_set is True
    # BATNA RECOMPUTES off the new ask: 60 − 15 = 45 (§5).
    assert out.argument_analysis["terms"]["batna_floor"] == 45
    assert out.argument_analysis["terms"]["batna_floor"] != base_batna
    # Arguments bucket against, and every facts-recomputation agrees on, the new floor.
    assert resolve_effective_batna(out.facts)[0] == 45
    # Cash-flow unlock re-derives for the new extension, not lagging at the old.
    # Scaled off the context's own figure, which is itself already keyed to the
    # harmonised 75-day target.
    assert out.facts.target_cash_flow == round(
        ctx.facts.target_cash_flow * (60 - 34) / (75 - 34)
    )
    assert out.facts.target_cash_flow != ctx.facts.target_cash_flow


def test_walkaway_override_replaces_floor_and_leaves_target():
    ctx = build_supplier_context(_payload(target=None, opportunity=76))
    out = resolve_overridden_context(ctx, NegotiationOverrides(batna_term_days=50))

    assert out.argument_analysis["terms"]["batna_floor"] == 50
    assert "fixed at 50 days" in out.argument_analysis["terms"]["batna_note"]
    assert out.facts.target_term_days == 75               # target untouched (76 harmonised on the way in)
    # The core consistency fix: a BATNA override is baked into facts, so every
    # surface that recomputes the floor from facts (guide, counter-offer,
    # scenario, arguments) returns the override — not the calculated 60.
    assert resolve_effective_batna(out.facts)[0] == 50
    assert out.argument_analysis["terms"]["batna_floor"] == 50


def test_both_overrides_apply_together():
    ctx = build_supplier_context(_payload())
    out = resolve_overridden_context(
        ctx, NegotiationOverrides(target_term_days=90, batna_term_days=55)
    )
    assert out.facts.target_term_days == 90
    assert out.argument_analysis["terms"]["batna_floor"] == 55
    assert resolve_effective_batna(out.facts)[0] == 55
