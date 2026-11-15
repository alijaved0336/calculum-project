"""The opening strategy: three sections, and a shape the negotiator can change.

Two properties, and they pull against each other on purpose.

The DEFAULT document is fixed — Target, Tone, Sequencing — and its
section layout is repaired after generation so the chat renderer always gets
``**N. Title**`` alone, then body. The client struck the other two sections
(Sequencing, If They Push Back Immediately) out of a reviewed output along with
everything in them, so a draft that brings one back is a draft that ignored the
template.

The REPAIR, though, only ever fires on a title that is actually there. That is
what lets "just give me the line to open with" come back as one line: nothing in
this module imposes headings on a reply that has none.
"""
from __future__ import annotations

import pytest

from utils.prompts.opening_strategy_prompt import (
    _OPENING_STRATEGY_SECTION_TITLES,
    normalize_opening_strategy_structure,
)


def test_splits_em_dash_glued_title_and_body():
    raw = (
        "Opening Strategy — Acme (NL)\n"
        "1. Target — Target: 90 days; lead with Parent / Supplier Max.\n"
        "2. Tone — Position this as a mutual investment in the partnership.\n"
    )
    out = normalize_opening_strategy_structure(raw)
    assert "**1. Target**\nTarget: 90 days" in out
    assert "**2. Tone**\nPosition this as a mutual investment" in out


def test_splits_space_glued_title_without_separator():
    raw = "1. Target Open at 90 days against the current 52 days."
    out = normalize_opening_strategy_structure(raw)
    assert out.startswith("**1. Target**\nOpen at 90 days")


def test_bolds_solo_title_line():
    raw = "3. Sequencing\nSay: we are aligning terms to 90 days."
    out = normalize_opening_strategy_structure(raw)
    assert out.startswith("**3. Sequencing**\nSay:")


def test_idempotent_on_already_good_draft():
    good = (
        "**1. Target**\n"
        "Target: **90 days**. Lead with Peer Group Standard at 90 days.\n"
        "**2. Tone**\n"
        "Collaborative and clear.\n"
        "**3. Sequencing**\n"
        "We are aligning our payment terms to the market standard.\n"
    )
    assert normalize_opening_strategy_structure(good) == good


def test_leaves_unrelated_numbered_lines_alone():
    raw = "Step 1. Offer 90 days then hold."
    assert normalize_opening_strategy_structure(raw) == raw


# ── Three sections, not five ───────────────────────────────────────────────


def test_the_document_is_the_clients_three_sections():
    """Struck out of a reviewed output by the client, with all their content:
    a fallback ladder, a stretch ceiling held back, a line saying there was no
    SCF to discuss, and a pushback pivot. None of it is the opening move."""
    assert _OPENING_STRATEGY_SECTION_TITLES == (
        "Target",
        "Tone",
        "Sequencing",
    )


@pytest.mark.parametrize("gone", ["Suggested Opening", "If They Push Back Immediately"])
def test_a_deleted_section_is_no_longer_repaired_into_the_document(gone):
    """The repair is what makes a heading render. A section the template does
    not have must not be tidied into looking like one that does."""
    raw = f"4. {gone} — hold the stretch ceiling back until they counter."
    assert normalize_opening_strategy_structure(raw) == raw


# ── A reply the negotiator asked to be shaped differently ──────────────────


@pytest.mark.parametrize(
    "reply",
    [
        # "just give me the line to open with"
        "\"We are aligning our payment terms to the standard industry benchmarks "
        "in the data processing sector, which typically range around 60 days.\"",
        # "one paragraph"
        "Open at 60 days, led by Peer Group Standard at 60 days, and frame it as "
        "a mutual investment in the partnership.",
        # "what number do I open at?"
        "Target: **60 days**.",
    ],
)
def test_a_free_form_answer_passes_through_untouched(reply):
    """Nothing here imposes the template on a reply that was asked to be a
    sentence. The repair only ever fires on a numbered title that is present."""
    assert normalize_opening_strategy_structure(reply) == reply
