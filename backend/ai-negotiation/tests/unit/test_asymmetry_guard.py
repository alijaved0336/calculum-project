"""Section-scoped asymmetry-guard behaviour.

The mixed-surface advice nodes (pushback, opening_strategy, reframe_with_scf)
emit negotiator-facing analysis wrapped around a single supplier-facing script,
delimited by ``[[SUPPLIER_FACING]]`` / ``[[/SUPPLIER_FACING]]``. The guard must:

  * redact internal figures ONLY inside that span, leaving the negotiator's own
    analysis (which legitimately names WACC, financing rates, the BATNA
    floor, ...) intact — the bug this fixes was blanking those from the
    negotiator's view;
  * fail CLOSED when the markers are absent or malformed — redact the whole
    text, exactly as the fully supplier-facing opening email always does;
  * strip the markers from the returned text either way.
"""
from __future__ import annotations

from domain.entities.facts import SupplierFacts
from domain.services.asymmetry_guard import (
    SUPPLIER_FACING_CLOSE,
    SUPPLIER_FACING_OPEN,
    enforce_asymmetry_guard,
    strip_supplier_facing_markers,
)

_REDACTED = "[internal — withheld]"


def _facts(**overrides) -> SupplierFacts:
    base = dict(
        supplier_name="U.S. Foodservice, Inc",
        country="US",
        industry="Foodservice",
        company_size="LARGE",
        target_term_days=76,
        current_term_days=34,
        batna_term_days=46,
        benchmark_term_days=80,
        regulatory_max_term_days=None,
        wacc_after_tax=0.092,          # renders as "9.2"
        supplier_financing_rate=0.061,  # renders as "6.1"
        spend_volume=12852649.0,        # renders as "12,852,649"
        internal_only_fields=frozenset(
            {"wacc_after_tax", "supplier_financing_rate", "spend_volume", "batna_term_days"}
        ),
    )
    base.update(overrides)
    return SupplierFacts(**base)


def _wrap(script: str) -> str:
    return f"{SUPPLIER_FACING_OPEN}\n{script}\n{SUPPLIER_FACING_CLOSE}"


# ── Scoped redaction ───────────────────────────────────────────────────────

def test_scoped_redaction_keeps_internal_figures_in_the_analysis():
    text = (
        "Since financing (6.1%) sits below their WACC (9.2%), sensitivity is low.\n"
        + _wrap("We propose 76 days and can offer a phased ramp.")
        + "\nFallback: hold at 46 days, do not reveal it."
    )

    guarded, flagged = enforce_asymmetry_guard(text, _facts())

    # Negotiator-facing analysis (outside the markers) keeps its numbers.
    assert "6.1%" in guarded
    assert "9.2%" in guarded
    # The fallback line is negotiator-only guidance outside the markers — kept.
    assert "46 days" in guarded
    # Nothing leaked inside the script, so nothing was redacted.
    assert flagged == []
    # Markers themselves are gone.
    assert SUPPLIER_FACING_OPEN not in guarded
    assert SUPPLIER_FACING_CLOSE not in guarded


def test_scoped_redaction_strips_a_leak_inside_the_script_only():
    text = (
        "Financing (6.1%) is below WACC (9.2%).\n"
        + _wrap("We propose 76 days; frankly our financing cost is only 6.1% so this is easy for you.")
        + "\nFallback: 46 days."
    )

    guarded, flagged = enforce_asymmetry_guard(text, _facts())

    # The leak inside the script is redacted...
    assert _REDACTED in guarded
    # ...but the identical value in the negotiator analysis survives.
    analysis, _, rest = guarded.partition("\n")
    assert "6.1%" in analysis
    assert _REDACTED in rest
    assert "supplier_financing_rate" in flagged
    assert SUPPLIER_FACING_OPEN not in guarded and SUPPLIER_FACING_CLOSE not in guarded


def test_shareable_term_inside_script_is_not_redacted():
    # 76 is the target term — always sayable, even though it sits in the script.
    text = "Analysis.\n" + _wrap("Let's move to 76 days.") + "\nFallback."
    guarded, flagged = enforce_asymmetry_guard(text, _facts())
    assert "76 days" in guarded
    assert _REDACTED not in guarded
    assert flagged == []


# ── Fail-closed paths ──────────────────────────────────────────────────────

def test_no_markers_redacts_whole_text():
    # This is the fully-supplier-facing case (opening email) and the safe
    # default when a mixed surface forgets its markers.
    text = "We propose 76 days; our financing cost is 6.1% and WACC 9.2%."
    guarded, flagged = enforce_asymmetry_guard(text, _facts())
    assert "6.1%" not in guarded
    assert "9.2%" not in guarded
    assert guarded.count(_REDACTED) == 2
    assert set(flagged) == {"supplier_financing_rate", "wacc_after_tax"}


def test_lone_open_marker_fails_closed_and_is_stripped():
    text = f"Analysis 6.1%.\n{SUPPLIER_FACING_OPEN}\nWe propose 76 days at 6.1%."
    guarded, flagged = enforce_asymmetry_guard(text, _facts())
    # Malformed → whole-text redaction, both 6.1% occurrences gone.
    assert "6.1%" not in guarded
    assert SUPPLIER_FACING_OPEN not in guarded
    assert "supplier_financing_rate" in flagged


def test_reversed_markers_fail_closed():
    text = f"{SUPPLIER_FACING_CLOSE} 6.1% {SUPPLIER_FACING_OPEN}"
    guarded, _ = enforce_asymmetry_guard(text, _facts())
    assert "6.1%" not in guarded
    assert SUPPLIER_FACING_OPEN not in guarded and SUPPLIER_FACING_CLOSE not in guarded


def test_multiple_pairs_fail_closed():
    text = _wrap("say 6.1% here") + "\nmid 9.2%\n" + _wrap("and 6.1% there")
    guarded, _ = enforce_asymmetry_guard(text, _facts())
    # Ambiguous which span is sayable → redact everything.
    assert "6.1%" not in guarded
    assert "9.2%" not in guarded
    assert SUPPLIER_FACING_OPEN not in guarded and SUPPLIER_FACING_CLOSE not in guarded


# ── Marker stripping helper ────────────────────────────────────────────────

def test_strip_supplier_facing_markers_leaves_contents():
    text = f"a {SUPPLIER_FACING_OPEN}b{SUPPLIER_FACING_CLOSE} c"
    assert strip_supplier_facing_markers(text) == "a b c"
