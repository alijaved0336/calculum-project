"""Unit tests for the SCF restriction policy (domain.services.scf_policy).

Covers the layered enablement resolution, raw-payload and context
sanitisation, the text detector, the output backstop, the system-prompt
suppression directive, and the follow-up filter. All pure/deterministic.
"""
from __future__ import annotations

from domain.services.context_builder import build_supplier_context
from domain.services.scf_policy import (
    SCF_LINKED_BENCHMARKS,
    enforce_scf_output_policy,
    filter_scf_from_instructions,
    maybe_suppress_scf,
    mentions_scf,
    resolve_scf_enabled,
    resolve_turn_scf_enabled,
    sanitize_context_for_mode,
    scf_refusal_message,
    strip_scf_from_raw,
    tenant_allows_scf,
)
from utils.prompts.follow_up_suggestions_prompt import strip_scf_follow_ups


def _raw(scf_rate=0.04, financing=0.09) -> dict:
    """A minimal but realistic supplier payload with SCF data present."""
    return {
        "supplier": {
            "uuid": "u-1",
            "name": "Acme",
            "country": "DE",
            "mainIndustryName": "Manufacturing",
            "companySize": "large",
            "scfRate": scf_rate,
            "supplierFinancingRate": financing,
            "waccAfterTax": 0.07,
        },
        "target": {"targetPaymentTerms": 90, "opportunityPaymentTerms": 90},
        "agreement": {"agreedTermsWithoutCashDiscounts": 60},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": 60,
            "actualPaymentTerms": 60,
        },
        "negotiationStrategy": {
            "scfPeerStandard": {"value": 85, "applied": False},
            "peerGroupStandard": {"value": 75, "applied": True},
            "cashDiscountConversion": {"value": 80, "applied": False},
        },
    }


# ── resolve_scf_enabled (tenant-setting driven) ──────────────────────────────

def test_tenant_allows_scf():
    assert tenant_allows_scf(["term_extension_scf"]) is True
    assert tenant_allows_scf(["term_extension"]) is False
    assert tenant_allows_scf([]) is False
    assert tenant_allows_scf(None) is False


def test_resolve_scf_enabled_driven_by_tenant_setting():
    # Mode is driven purely by the tenant strategy setting; supplier data (e.g.
    # a missing scfRate) must NOT influence it.
    assert resolve_scf_enabled(["term_extension_scf"]) is True
    assert resolve_scf_enabled(["term_extension", "term_extension_scf"]) is True
    assert resolve_scf_enabled(["term_extension"]) is False
    assert resolve_scf_enabled([]) is False
    assert resolve_scf_enabled(None) is False  # missing settings fail closed


def test_resolve_turn_scf_enabled_active_goal_narrows_session():
    # Tenant allows SCF; Active Goal decides the turn.
    assert resolve_turn_scf_enabled("term_extension_scf", session_scf_enabled=True) is True
    assert resolve_turn_scf_enabled("term_extension", session_scf_enabled=True) is False
    # Missing strategy (old client) keeps session default.
    assert resolve_turn_scf_enabled(None, session_scf_enabled=True) is True
    assert resolve_turn_scf_enabled(None, session_scf_enabled=False) is False
    # Active Goal cannot widen past the tenant ceiling.
    assert resolve_turn_scf_enabled("term_extension_scf", session_scf_enabled=False) is False


# ── mentions_scf ─────────────────────────────────────────────────────────────

def test_mentions_scf_positive():
    for t in [
        "We can offer SCF here.",
        "our supply chain finance programme",
        "reverse factoring is available",
        "invoice financing at a lower rate",
        "dynamic discounting option",
        "an early payment discount scheme",
    ]:
        assert mentions_scf(t), t


def test_mentions_scf_negative():
    for t in [
        "The supplier financing rate is 9%.",  # supplier's own rate is legitimate
        "After factoring in the DSO, propose 60 days.",  # 'factoring in' idiom
        "Propose 75 days citing the peer benchmark.",
        "",
        None,
    ]:
        assert not mentions_scf(t), t


def test_bare_cash_discount_is_not_scf():
    """An agreed cash discount is contractual, not Supply Chain Finance.

    Treating it as SCF made the output backstop replace whole correct
    opening-strategy answers with the SCF refusal — the negotiator asked for an
    opening position and was told SCF is unavailable.
    """
    for t in [
        "An agreed cash discount is in place (14 days at 2.00%).",
        "Decide whether the extension trades away the early-payment discount.",
        "Their early payment discount of 2/10 net 30 is already in the contract.",
        "We can preserve the 2% early payment discount.",
    ]:
        assert not mentions_scf(t), t


def test_early_payment_programme_is_still_scf():
    """Narrowing the cash-discount case must not un-gate the programme itself."""
    for t in [
        "an early payment discount scheme",
        "our early-payment programme",
        "we could set up an early payment program",
        "early payment financing is available",
        "make them an early payment offer",
    ]:
        assert mentions_scf(t), t


def test_cash_discount_note_is_omitted_when_nothing_on_file():
    """No arrangement on file → no note at all.

    It used to return a "no arrangement on file" sentence, so EVERY
    opening-strategy prompt carried a cash-discount line (and, in its old
    wording, an SCF-tripping phrase) about a discount that does not exist.
    """
    from domain.services.opening_strategy_analysis import _build_cash_discount_note

    def _facts(days, pct):
        raw = _raw()
        raw["agreement"] = {
            **raw["agreement"],
            "agreedTermsWithCashDiscounts": days,
            "agreedCashDiscountPercentage": pct,
        }
        return build_supplier_context(raw).facts

    assert _build_cash_discount_note(_facts(None, None)) is None

    note = _build_cash_discount_note(_facts(14, 0.02))
    assert note is not None
    assert "14 days" in note and "2.00%" in note
    assert not mentions_scf(note)


def test_opening_strategy_answer_survives_the_backstop():
    """End-to-end regression for the reported bug.

    A term-extension-only opening strategy that reconciles an existing cash
    discount must reach the negotiator intact, not be swapped for the refusal.
    """
    draft = (
        "**2. Framing**\n"
        "Lead with the 90-day anchor, hold the phased ramp back, and be ready to "
        "address the existing early-payment discount — decide whether the "
        "extension preserves it or trades it away."
    )
    safe, tripped = enforce_scf_output_policy(draft, scf_enabled=False)
    assert not tripped
    assert safe == draft
    assert safe != scf_refusal_message()


# ── strip_scf_from_raw ───────────────────────────────────────────────────────

def test_strip_scf_from_raw():
    cleaned = strip_scf_from_raw(_raw())
    assert "scfRate" not in cleaned["supplier"]
    # supplier's own financing rate is kept (not SCF)
    assert cleaned["supplier"]["supplierFinancingRate"] == 0.09
    assert "scfPeerStandard" not in cleaned["negotiationStrategy"]
    assert "cashDiscountConversion" not in cleaned["negotiationStrategy"]
    assert "peerGroupStandard" in cleaned["negotiationStrategy"]
    # original is not mutated
    assert "scfRate" in _raw()["supplier"]


def test_strip_scf_from_raw_empty():
    assert strip_scf_from_raw(None) == {}
    assert strip_scf_from_raw({}) == {}


# ── sanitize_context_for_mode (end-to-end over a built context) ──────────────

def test_sanitize_context_removes_all_scf():
    ctx = build_supplier_context(_raw())
    # sanity: SCF present before sanitisation
    assert ctx.facts.scf_rate == 0.04
    assert any(b.name in SCF_LINKED_BENCHMARKS for b in ctx.facts.strategy_benchmarks)
    assert ctx.opening_strategy.scf_reserve_lever is not None

    clean = sanitize_context_for_mode(ctx)
    assert clean.facts.scf_rate is None
    assert not any(b.name in SCF_LINKED_BENCHMARKS for b in clean.facts.strategy_benchmarks)
    assert clean.opening_strategy.scf_reserve_lever is None
    assert "scf_rate" not in clean.facts.source_paths
    assert "scfRate" not in clean.raw["supplier"]
    # supplier's own financing rate survives (legitimate term-extension signal)
    assert clean.facts.supplier_financing_rate == 0.09
    # no SCF-linked benchmark leaks into the opening-strategy ladders
    for b in clean.opening_strategy.benchmark_ladder + clean.opening_strategy.counter_evidence:
        assert b.source not in SCF_LINKED_BENCHMARKS


# ── enforce_scf_output_policy ────────────────────────────────────────────────

def test_enforce_replaces_leak_when_disabled():
    text, tripped = enforce_scf_output_policy("Let's use our SCF programme.", False)
    assert tripped is True
    assert text == scf_refusal_message()


def test_enforce_passes_refusal_through():
    text, tripped = enforce_scf_output_policy(scf_refusal_message(), False)
    assert tripped is False
    assert text == scf_refusal_message()


def test_enforce_noop_when_enabled():
    assert enforce_scf_output_policy("offer SCF", True) == ("offer SCF", False)


def test_enforce_leaves_clean_text():
    clean = "Propose 75 days, anchored on the peer benchmark."
    assert enforce_scf_output_policy(clean, False) == (clean, False)


# ── maybe_suppress_scf ───────────────────────────────────────────────────────

def test_maybe_suppress_scf():
    assert maybe_suppress_scf("SYS", True) == "SYS"
    out = maybe_suppress_scf("SYS", False)
    assert out.startswith("SYS")
    assert "Supply Chain Finance is NOT part" in out


# ── strip_scf_follow_ups ─────────────────────────────────────────────────────

def test_strip_scf_follow_ups_not_offerable():
    items = ["Offer SCF as compromise", "Hold firm on 60 days", "Run SCF scenario", "Draft opening email"]
    out = strip_scf_follow_ups(items, scf_offerable=False, intent_value="handle_supplier_pushback")
    assert len(out) == 3
    assert not any(mentions_scf(s) for s in out)
    assert "Hold firm on 60 days" in out


def test_strip_scf_follow_ups_offerable_noop():
    items = ["Offer SCF as compromise", "Hold firm on 60 days"]
    assert strip_scf_follow_ups(items, scf_offerable=True, intent_value="x") == items


def test_every_scf_intent_follow_up_is_strippable():
    """The SCF intent's own defaults must all be recognisable as SCF.

    `strip_scf_follow_ups` matches on wording alone, so a suggestion that reads
    like ordinary term-extension advice survives the filter and hands the
    negotiator a dead end.
    """
    from utils.prompts.follow_up_suggestions_prompt import _FALLBACK_BY_INTENT

    for suggestion in _FALLBACK_BY_INTENT["reframe_with_financing"]:
        assert mentions_scf(suggestion), suggestion


# ── prompt builders default to fail-closed (SCF hidden) ──────────────────────

def test_prompt_builders_default_scf_enabled_is_fail_closed():
    # If a caller forgets to pass scf_enabled, SCF must be hidden (fail-closed),
    # matching the module's restrict-by-default intent — not shown (fail-open).
    from utils.prompts.data_question_prompt import build_data_question_prompt

    ctx = build_supplier_context(_raw())
    # note: no scf_enabled passed → must default to hiding the SCF rate line
    prompt = build_data_question_prompt(
        "what figures do you have?",
        ctx.facts,
        None,
        None,
        effective_batna=60,
        batna_note=None,
    )
    assert "SCF rate" not in prompt


# ── filter_scf_from_instructions ─────────────────────────────────────────────

# Mirrors the seeded pg_settings_adapter.DEFAULT_PROMPT that leaked SCF into
# the negotiation guide via injected operator instructions.
_DEFAULT_PROMPT = (
    "When the supplier pushes back on a payment-terms extension:\n"
    "  1. Acknowledge the cash-flow impact explicitly.\n"
    "  2. Offer SCF as a mitigation before considering a smaller extension.\n"
    "  3. Never commit to extensions longer than 90 days without flagging for human review."
)


def test_filter_scf_from_instructions_removes_scf_line_keeps_rest():
    out = filter_scf_from_instructions([_DEFAULT_PROMPT], scf_enabled=False)
    assert len(out) == 1
    assert not mentions_scf(out[0])
    assert "Acknowledge the cash-flow impact" in out[0]
    assert "Never commit to extensions longer than 90 days" in out[0]
    assert "Offer SCF" not in out[0]


def test_filter_scf_from_instructions_drops_wholly_scf_instruction():
    out = filter_scf_from_instructions(
        ["Always offer SCF first", "Cite peer benchmarks"], scf_enabled=False
    )
    assert out == ["Cite peer benchmarks"]


def test_filter_scf_from_instructions_noop_when_enabled():
    assert filter_scf_from_instructions([_DEFAULT_PROMPT], scf_enabled=True) == [_DEFAULT_PROMPT]
    assert filter_scf_from_instructions(None, scf_enabled=False) == []
