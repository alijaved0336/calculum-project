"""Objection-answers are not evidence (Phase 1, §3.3).

The assessments — DSO alignment, pay-on-terms, cost impact (and the relationship,
when it is used at all, see below) — carry no term and argue for no number. The catalogue says so in its own notes:
"a long DSO is never a reason they should grant longer terms", "it is a trust
argument… never justifies the ask". They were nonetheless filed under
`USE TO JUSTIFY THE ASK` and introduced with "cite every one of these", so the
model had to present four objection-answers as though they evidenced the ask.

That is the "this is not an argument" complaint, manufactured by the pipeline
rather than chosen by the model.
"""
from __future__ import annotations

from domain.services.brief_builder import brief_from
from tests.unit.prompt_fixtures import explain_block, pitch_block, rich_facts

# The relationship is not an unconditional fourth answer: since the four-section
# playbook (PR 14613) it is used only at medium/high buyer leverage and only when
# nothing stronger supports the ask. `rich_facts` has stronger support (benchmarks),
# so it is absent here by design.
_ASSESSMENT_KEYS = {"dso", "payOnTerms", "costImpact"}


def _brief():
    return brief_from(rich_facts())


# ── the split on the brief ─────────────────────────────────────────────────


def test_evidence_is_only_what_argues_for_a_number():
    evidence = _brief().evidence
    assert evidence
    assert all(a["value_days"] is not None for a in evidence)
    assert not ({a["key"] for a in evidence} & _ASSESSMENT_KEYS)


def test_the_assessments_are_the_objection_answers():
    answers = _brief().objection_answers
    assert {a["key"] for a in answers} == _ASSESSMENT_KEYS
    assert "relationship" not in {a["key"] for a in answers}
    # None of them carries a term, because none of them argues for one.
    assert all(a["value_days"] is None for a in answers)


def test_the_two_partition_the_supporting_set():
    """Nothing is lost in the split, and nothing appears twice."""
    brief = _brief()
    keys = [a["key"] for a in brief.evidence] + [a["key"] for a in brief.objection_answers]
    assert sorted(keys) == sorted(a["key"] for a in brief.supporting)
    assert len(keys) == len(set(keys))


# ── the rendering ──────────────────────────────────────────────────────────


def _section(block: str, heading: str) -> str:
    """The lines under one heading, up to the next all-caps group heading."""
    after = block.split(heading, 1)[1]
    for nxt in ("USE TO JUSTIFY THE ASK", "ANSWER THEIR OBJECTIONS",
                "HOLD IN RESERVE", "RULED OUT", "NOT ARGUMENTS", "NOT AVAILABLE"):
        if nxt != heading and nxt in after:
            after = after.split(nxt, 1)[0]
    return after


def test_the_justify_list_holds_only_benchmarks():
    section = _section(pitch_block(rich_facts()), "USE TO JUSTIFY THE ASK")
    assert "Buyer Standard" in section
    for name in ("DSO Alignment", "Payment Reliability", "Cost Impact",
                 "Client-Supplier Relationship"):
        assert name not in section, f"{name} is an objection-answer, not evidence"


def test_the_assessments_render_under_their_own_heading():
    section = _section(pitch_block(rich_facts()), "ANSWER THEIR OBJECTIONS")
    for name in ("DSO Alignment", "Payment Reliability", "Cost Impact"):
        assert name in section
    assert "Client-Supplier Relationship" not in section  # see _ASSESSMENT_KEYS


def test_the_heading_says_they_do_not_justify_the_term():
    """P4 — the instruction has to be on the line, not implied by placement."""
    block = pitch_block(rich_facts())
    assert "ANSWER THEIR OBJECTIONS — these do NOT justify the term" in block


def test_the_assessments_are_deployed_on_the_objection_not_volunteered():
    block = pitch_block(rich_facts())
    section = _section(block, "ANSWER THEIR OBJECTIONS")
    assert "WHEN they raise it" in section
    assert "do not bring it up" in section


def test_cite_every_one_of_these_now_covers_benchmarks_only():
    """The instruction that forced four non-arguments into the pitch."""
    block = pitch_block(rich_facts())
    justify = _section(block, "USE TO JUSTIFY THE ASK")
    assert "Cite every one of these" in justify


def test_the_disclosure_note_still_travels_with_each_assessment():
    """What an argument is NOT has to survive the move to its own section."""
    section = _section(pitch_block(rich_facts()), "ANSWER THEIR OBJECTIONS")
    assert "NOT a payment-term benchmark" in section
    assert "Pay-on-Terms is NOT a benchmark" in section


def test_the_explaining_voice_splits_them_too():
    """A surface that explains needs the distinction as much as one that pitches."""
    block = explain_block(rich_facts())
    assert "ANSWER THEIR OBJECTIONS" in block
    assert "DSO Alignment" not in _section(block, "USE TO JUSTIFY THE ASK")
