"""The buyer TELLS the supplier the terms are changing. It never asks.

From a real Opening Strategy. Sections 1 and 2 were right; section 3 came back
"Could we move from the current 45 days to 60 days effective [MM, DD, YYYY]?" —
a question, handing the supplier a veto over a decision the buyer had already
taken, because the tone had been read as collaborative.

The opening strategy had no register check at all.
"""
from __future__ import annotations

import pytest

from domain.services.declarative_ask import (
    declarative_ask_sentence,
    enforce_declarative_ask,
    find_requesting_sentences,
    is_requesting_the_ask,
)
from utils.prompts.opening_strategy_prompt import (
    enforce_declarative_opening,
    opening_strategy_system_prompt,
)


# ── What counts as asking ──────────────────────────────────────────────────


@pytest.mark.parametrize("sentence", [
    "Could we move from the current 45 days to 60 days effective [MM, DD, YYYY]?",
    "Would you be able to move to 60 days?",
    "Can we agree 60-day terms?",
    "We would like to request 60 day payment terms.",
    "We propose moving to 60 days.",
    "Is 60 days acceptable to you?",
    "Shall we align on 60 days?",
    "Do you agree to the new payment terms?",
])
def test_a_request_for_the_change_is_caught(sentence):
    assert is_requesting_the_ask(sentence)


@pytest.mark.parametrize("sentence", [
    "We are changing our current payment terms of 45 days to 60 days.",
    "We are aligning our payment terms with the supplier standard of 67 days.",
    # Scoped to the ASK. A question about something else is a fine sentence.
    "Could you confirm receipt?",
    "Should you have any questions, please do not hesitate to reach out.",
    "Who should we contact about this?",
])
def test_a_statement_or_an_unrelated_question_is_not(sentence):
    assert not is_requesting_the_ask(sentence)


# ── The replacement ────────────────────────────────────────────────────────


def test_the_question_is_swapped_for_the_clients_own_sentence():
    text = (
        '"We are aligning our payment terms with the supplier standard of 67 '
        'days to ensure our partnership remains strong. Could we move from the '
        'current 45 days to 60 days effective [MM, DD, YYYY]?"'
    )
    out, replaced = enforce_declarative_ask(text, 45, 60)
    assert len(replaced) == 1
    assert "?" not in out
    assert "We are changing our current payment terms of 45 days to 60 days" in out
    # The sentence they got right is untouched, and the quotation still closes.
    assert "partnership remains strong" in out
    assert out.rstrip().endswith('"')


def test_the_substitution_is_built_from_resolved_figures_never_invented():
    assert declarative_ask_sentence(45, 60) == (
        "We are changing our current payment terms of 45 days to 60 days "
        "effective [MM, DD, YYYY]."
    )
    # No target: there is no sentence to build, and a half-built one is worse
    # than the model's.
    assert declarative_ask_sentence(45, None) is None


def test_with_no_target_the_wording_is_reported_but_not_mangled():
    text = "Could we move to longer payment terms?"
    out, replaced = enforce_declarative_ask(text, None, None)
    assert replaced, "the caller still has to be told"
    assert out == text


def test_a_clean_opening_is_left_exactly_as_it_is():
    text = "We are changing our current payment terms of 45 days to 60 days."
    assert enforce_declarative_ask(text, 45, 60) == (text, [])


# ── Scoped to section 3 of the opening strategy ────────────────────────────


_STRATEGY = """**1. Target**
Target: **60 days**.

**2. Framing**
Could we hold a firmer line on the 60 day target given their reliance on us?

**3. Suggested Opening**
"We are aligning our payment terms with the supplier standard of 67 days. Could we move from the current 45 days to 60 days effective [MM, DD, YYYY]?"
"""


def test_only_the_suggested_opening_is_rewritten():
    """Sections 1 and 2 are written TO THE NEGOTIATOR. "Could we hold a firmer
    line?" is a perfectly good sentence addressed to the person reading it, and
    rewriting it would be the repair misunderstanding who is being spoken to."""
    out, replaced = enforce_declarative_opening(_STRATEGY, 45, 60)
    assert len(replaced) == 1
    assert "Could we hold a firmer line" in out, "section 2 must be untouched"
    assert "Could we move from the current" not in out
    assert "We are changing our current payment terms of 45 days to 60 days" in out


def test_a_draft_with_no_recognisable_section_three_is_untouched():
    """A reply the negotiator asked to be shaped differently, or a one-liner.
    Guessing at the boundary is how a repair edits the wrong half."""
    draft = "Just open at 60 days. Could we push to 75?"
    assert enforce_declarative_opening(draft, 45, 60) == (draft, [])


def test_the_prompt_states_the_rule_too():
    """The repair is the backstop, not the plan."""
    assert "IT TELLS THE SUPPLIER. IT NEVER ASKS THEM." in opening_strategy_system_prompt
