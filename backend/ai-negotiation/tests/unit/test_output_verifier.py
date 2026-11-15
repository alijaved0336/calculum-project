"""The single output verifier (Phase 2, §3.4).

Four principles, expressed as checks a machine can settle:
  P1  every day-figure stated appears in the brief
  P2  every negotiating POSITION sits on the 15-day ladder
  P4  a benchmark short of the ask is never said to justify the ask
  P6  no raw payload identifier reaches prose
"""
from __future__ import annotations

import pytest

from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.services.brief_builder import brief_from
from domain.services.output_verifier import (
    format_verification_feedback,
    known_day_figures,
    verify_output,
)


def _b(name: str, value: int) -> StrategyBenchmark:
    return StrategyBenchmark(name=name, label=f"the {name}", value=value)


def _facts(**kw) -> SupplierFacts:
    base = dict(
        supplier_name="Acme", country="DE", industry="Manufacturing", company_size="large",
        target_term_days=90, current_term_days=60, batna_term_days=None,
        benchmark_term_days=None, regulatory_max_term_days=None,
        strategy_benchmarks=[_b("peerGroupStandard", 95), _b("industryRegionStandard", 75)],
    )
    base.update(kw)
    return SupplierFacts(**base)


def _brief(**kw):
    return brief_from(_facts(**kw))


# ── P1: no invented figures ────────────────────────────────────────────────


def test_a_figure_from_the_brief_passes():
    assert verify_output("We are asking for 90 days.", _brief())


def test_an_invented_figure_is_caught():
    result = verify_output("The peer group standard is 78 days.", _brief())
    assert not result
    assert result.codes == ["P1_UNSOURCED_FIGURE"]
    assert "78 days" in result.violations[0].detail


def test_every_figure_the_brief_carries_is_allowed():
    known = known_day_figures(_brief())
    # ask, current, floor, and both benchmark values.
    assert {90, 60, 95, 75} <= known


# ── The client playbook that failed on three false positives (2026-08-25) ──
#
# "We request a 40-day extension from the current 50-day term to 90 days,
# justified by internal precedent and limited financial impact." — the sentence
# section 4 is INSTRUCTED to open with. It was reported to the client as three
# violations: 40 unsourced, and 40 and 50 each "cannot justify the ask".


def test_the_extension_between_the_terms_is_a_sourced_figure():
    """Ask minus current term. Not a field anywhere — which is why it was
    flagged — but the playbook spec asks for it by name, and the cost-impact
    argument is rendered with it ("0.61% of invoice value over 40 days")."""
    assert 30 in known_day_figures(_brief())          # 90 - 60
    assert verify_output("A 30-day extension from 60 days to 90 days.", _brief())


def test_figures_printed_inside_an_argument_line_are_sourced():
    """The model is told to copy those lines verbatim; a figure it copied is
    sourced by definition."""
    brief = _brief(dso=72)
    printed = {
        f
        for argument in brief.supporting
        for f in _figures_in_argument(argument)
    }
    assert printed <= known_day_figures(brief)


def _figures_in_argument(argument) -> set[int]:
    import re
    found: set[int] = set()
    for field_name in ("detail", "supplier_pitch", "meaning", "rationale"):
        value = argument.get(field_name)
        if isinstance(value, str):
            found.update(int(m) for m in re.findall(r"\b(\d{1,3})\s*[- ]?days?\b", value))
    return found


def test_the_current_term_beside_a_justification_verb_is_not_a_p4_failure():
    """P4 is about a BENCHMARK offered as evidence. The current term is what we
    pay today; naming it in a sentence that also says "justified" is the normal
    way to describe an ask, not a claim that 60 days justifies 90."""
    result = verify_output(
        "We request a 30-day extension from the current 60-day term to 90 days, "
        "justified by internal precedent.",
        _brief(),
    )
    assert result, [str(v) for v in result.violations]


def test_a_real_benchmark_below_the_ask_still_fails_p4():
    """The check the false positives were burying."""
    result = verify_output(
        "The industryRegion figure of 75 days justifies our 90-day ask.", _brief()
    )
    assert "P4_INSUFFICIENT_EVIDENCE" in result.codes


def test_bare_numbers_are_not_read_as_term_claims():
    """A playbook is full of ordinary numbers; only '<n> days' is a term claim."""
    assert verify_output("Section 3. Open with 2 concessions in reserve.", _brief())


def test_bracketed_scaffolding_is_not_read_as_content():
    """Placeholders and our own failure labels must not fail their own re-check."""
    assert verify_output("Ask for 90 days. [insert 47 days here]", _brief())


@pytest.mark.parametrize("phrasing", [
    "90 days", "90-day", "90 calendar days", "90days",
])
def test_the_figure_is_found_however_it_is_written(phrasing):
    assert verify_output(f"We propose {phrasing} terms.", _brief())


# ── P2: positions sit on the ladder ────────────────────────────────────────


def test_an_unharmonised_ask_is_caught():
    result = verify_output("Ask for 83 days.", _brief(target_term_days=83))
    assert "P2_UNHARMONISED_POSITION" in result.codes


def test_no_batna_when_floor_is_too_close_to_an_off_ladder_current_term():
    """Target 90 → 75; 75 < 77 + 5 → No BATNA (null), not a clamp to 77."""
    brief = _brief(target_term_days=90, current_term_days=77)
    assert brief.batna_floor is None
    result = verify_output("Hold the 90-day target; there is no BATNA.", brief)
    assert "P2_UNHARMONISED_POSITION" not in result.codes


def test_an_off_ladder_batna_that_is_not_the_current_term_is_still_caught():
    """An off-ladder BATNA in the brief is still a P2 failure."""
    brief = _brief(target_term_days=90, current_term_days=60)
    object.__setattr__(brief, "arguments", {
        **brief.arguments,
        "terms": {**brief.arguments["terms"], "batna_floor": 53},
    })
    assert brief.batna_floor == 53 and brief.current_term == 60
    result = verify_output("Hold at 53 days.", brief)
    assert "P2_UNHARMONISED_POSITION" in result.codes


def test_a_benchmark_off_the_ladder_is_fine():
    """P2's whole point: evidence is quoted exactly, never rounded.

    "We can say the supplier standard is 83" — Carlos.
    """
    result = verify_output(
        "Their own standard sits at 83 days.",
        _brief(strategy_benchmarks=[_b("supplierStandard", 83)]),
    )
    assert "P2_UNHARMONISED_POSITION" not in result.codes


# ── P4: sufficiency ────────────────────────────────────────────────────────


def test_a_short_benchmark_said_to_justify_the_ask_is_caught():
    result = verify_output(
        "The industry standard of 75 days justifies our request.", _brief()
    )
    assert "P4_INSUFFICIENT_EVIDENCE" in result.codes


def test_the_same_benchmark_merely_stated_is_fine():
    assert verify_output("The industry standard sits at 75 days.", _brief())


def test_a_benchmark_that_reaches_the_ask_may_justify_it():
    assert verify_output(
        "The peer group standard of 95 days supports the ask.", _brief()
    )


def test_a_benchmark_a_rounding_step_short_may_support_the_ask():
    """84 against a 90-day ask rounds to the ask on the 15-day ladder - the
    playbook Rationale says it supports the target, and P4 must agree."""
    result = verify_output(
        "At 84 days, the peer group standard supports the target.",
        _brief(strategy_benchmarks=[_b("peerGroupStandard", 84)]),
    )
    assert "P4_INSUFFICIENT_EVIDENCE" not in result.codes


def test_a_benchmark_whose_upper_quartile_reaches_the_ask_may_support_it():
    bench = StrategyBenchmark(
        name="peerGroupStandard", label="the peer group", value=70, q3=95
    )
    result = verify_output(
        "At 70 days, the peer group standard supports the target.",
        _brief(strategy_benchmarks=[bench]),
    )
    assert "P4_INSUFFICIENT_EVIDENCE" not in result.codes


def test_a_benchmark_short_even_at_its_upper_quartile_still_fails_p4():
    bench = StrategyBenchmark(
        name="peerGroupStandard", label="the peer group", value=70, q3=80
    )
    result = verify_output(
        "At 70 days, the peer group standard supports the target.",
        _brief(strategy_benchmarks=[bench]),
    )
    assert "P4_INSUFFICIENT_EVIDENCE" in result.codes


def test_the_check_is_sentence_scoped_not_document_scoped():
    """A justification claim elsewhere must not taint an unrelated statement."""
    text = (
        "The peer group standard of 95 days justifies the ask. "
        "Separately, the industry figure is 75 days."
    )
    assert "P4_INSUFFICIENT_EVIDENCE" not in verify_output(text, _brief()).codes


# ── P6: shared vocabulary ──────────────────────────────────────────────────


def test_a_raw_payload_identifier_is_caught():
    result = verify_output("Lead with parentOrSupplierMax.", _brief())
    assert "P6_RAW_IDENTIFIER" in result.codes
    assert "Parent / Supplier Max" in result.violations[0].detail


def test_the_proper_name_passes():
    assert verify_output("Lead with the Parent / Supplier Max.", _brief())


def test_an_ordinary_word_that_is_also_a_catalogue_key_is_not_flagged():
    """`relationship` and `dso` are keys AND ordinary words.

    Flagging them made every draft that mentioned the relationship fail. Only
    the camelCase keys are recognisable as leaked identifiers.
    """
    text = "The relationship justifies raising the subject, and their dso is short."
    assert "P6_RAW_IDENTIFIER" not in verify_output(text, _brief()).codes


# ── the result object and its feedback ─────────────────────────────────────


def test_a_clean_output_is_truthy_and_a_failing_one_is_not():
    assert verify_output("We are asking for 90 days.", _brief())
    assert not verify_output("We are asking for 47 days.", _brief())


def test_nothing_to_verify_against_is_a_pass():
    assert verify_output("anything at all", None)
    assert verify_output("", _brief())


def test_the_feedback_quotes_the_failure_back():
    violations = verify_output("The standard is 78 days.", _brief()).violations
    feedback = format_verification_feedback(violations)
    assert "REGENERATE" in feedback
    assert "78 days" in feedback


def test_the_verdict_never_becomes_user_visible_text():
    """Client, 2026-08-25: no failure banner on the document, ever.

    The module used to export `failure_label`, which stapled the violations to
    the end of a draft that failed twice. It reached a client playbook on three
    false positives. The verdict is internal now — logs and `errors` — so the
    builder is gone, and this pins that it stays gone.
    """
    import domain.services.output_verifier as verifier

    assert not hasattr(verifier, "failure_label")
