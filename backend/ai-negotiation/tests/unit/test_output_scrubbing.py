"""Two things that reached a negotiator and should not have.

1. Rank tags. `[STRONGEST]` / `[3rd STRONGEST]` / `[WEAKEST OF THE SUPPORTING
   SET]` are prompt annotations telling the model which argument to lead with.
   `RELATIVE_STRENGTH_RULE` said "never print the tags" and the model printed
   them anyway, straight into a supplier summary.
2. Nine-digit money. "$37,544,807" next to "$2,195,377" — correct, unreadable,
   and impossible to compare at a glance.
"""
from __future__ import annotations

import pytest

from utils.prompts.brief.facts import format_money
from utils.prompts.brief.rules import (
    RELATIVE_STRENGTH_RULE,
    TAG_STRONGEST,
    TAG_WEAKEST,
    normalize_chat_formatting,
    rank_tag,
    strip_rank_tags,
)


# ── Rank tags never survive into output ────────────────────────────────────


@pytest.mark.parametrize(
    "line,expected",
    [
        (
            "120 days (Parent / Supplier Max, parentOrSupplierMax) — [STRONGEST]",
            "120 days (Parent / Supplier Max, parentOrSupplierMax)",
        ),
        (
            "120 days (Max Spend Opportunity, spend line Spend 01) — [2nd STRONGEST]",
            "120 days (Max Spend Opportunity, spend line Spend 01)",
        ),
        (
            "0.26% of invoice value over 21 days (Cost Impact) — [3rd STRONGEST]",
            "0.26% of invoice value over 21 days (Cost Impact)",
        ),
        (
            "Significant commercial relationship — [WEAKEST OF THE SUPPORTING SET]",
            "Significant commercial relationship",
        ),
    ],
)
def test_the_exact_lines_from_the_leaked_summary_are_cleaned(line, expected):
    assert strip_rank_tags(line) == expected


def test_every_tag_rank_tag_can_emit_is_stripped():
    """Whatever `rank_tag` produces, the scrubber removes — the two cannot drift."""
    for total in range(2, 11):
        for position in range(total):
            tag = rank_tag(position, total)
            assert tag, (position, total)
            assert strip_rank_tags(f"An argument{tag}") == "An argument"


def test_a_tag_mid_sentence_is_removed_without_damaging_the_text():
    assert (
        strip_rank_tags("Lead with the precedent [STRONGEST] when they push back.")
        == "Lead with the precedent when they push back."
    )


def test_ordinary_brackets_are_left_alone():
    text = "See the [docs](http://example.com) and the note [1] below."
    assert strip_rank_tags(text) == text


def test_empty_text_is_safe():
    assert strip_rank_tags("") == ""


def test_the_rule_now_forbids_every_shape_of_printed_rank():
    assert "MACHINE ANNOTATIONS FOR YOU, not text" in RELATIVE_STRENGTH_RULE
    assert "a reply that prints one is broken output" in RELATIVE_STRENGTH_RULE
    assert "not \"(strongest)\"" in RELATIVE_STRENGTH_RULE
    assert "Carry the ranking in the SENTENCE instead" in RELATIVE_STRENGTH_RULE


def test_the_tags_are_still_produced_for_the_prompt():
    """The ranking still has to reach the model — it is computed in code because
    the model otherwise ranks by day-count."""
    assert rank_tag(0, 3).strip() == TAG_STRONGEST
    assert rank_tag(2, 3).strip() == TAG_WEAKEST
    assert rank_tag(0, 1) == ""  # nothing to rank a single argument against


# ── The live stream is scrubbed too ────────────────────────────────────────


def test_a_tag_split_across_tokens_never_flashes_live():
    """The negotiator watches tokens arrive; a tag must not appear even briefly."""
    from infrastructure.llm.llm_client import _drain_markers

    emitted, buf = "", ""
    for token in ["Lead with the ", "precedent ", "[STRO", "NGEST]", " when they push."]:
        buf += token
        out, buf = _drain_markers(buf, flush=False)
        emitted += out
    out, buf = _drain_markers(buf, flush=True)
    emitted += out

    assert "[STRO" not in emitted
    assert "STRONGEST" not in emitted
    # The words either side are intact. Spacing can double where the emitted
    # chunk ended before the tag arrived — invisible once rendered, and not
    # worth holding back a whole word to avoid.
    assert " ".join(emitted.split()) == "Lead with the precedent when they push."


def test_an_unclosed_bracket_is_flushed_rather_than_swallowed():
    from infrastructure.llm.llm_client import _drain_markers

    emitted, buf = "", ""
    for token in ["a note [see below"]:
        buf += token
        out, buf = _drain_markers(buf, flush=False)
        emitted += out
    out, buf = _drain_markers(buf, flush=True)
    emitted += out
    assert emitted == "a note [see below"


# ── Money reads at a glance ────────────────────────────────────────────────


@pytest.mark.parametrize(
    "raw,expected",
    [
        (37_544_807, "$37.54M"),   # the spend volume from the summary
        (2_195_377, "$2.20M"),     # the cash-flow unlock from the same summary
        (1_200_000_000, "$1.20B"),
        (850_000, "$850K"),
        (1_000, "$1K"),
        (412, "$412"),
        (0, "$0"),
    ],
)
def test_money_is_scaled_to_a_readable_unit(raw, expected):
    assert format_money(raw) == expected


def test_missing_money_is_not_a_zero():
    assert format_money(None) == "N/A"


def test_negatives_keep_their_sign():
    assert format_money(-2_195_377) == "-$2.20M"


def test_the_two_summary_figures_are_now_comparable_at_a_glance():
    """The point of the change: 37.54 against 2.20, not nine digits against seven."""
    assert format_money(37_544_807) == "$37.54M"
    assert format_money(2_195_377) == "$2.20M"


def test_the_brief_renders_money_compactly():
    from domain.services.brief_builder import brief_from
    from domain.services.supplier_facts import extract_supplier_facts
    from utils.prompts.brief.facts import LEVEL_FULL, render_facts

    brief = brief_from(
        extract_supplier_facts(
            {
                "supplier": {"name": "Diageo Brands B.V.", "spendVolume": 37_544_807.0},
                "target": {"targetPaymentTerms": 120, "targetCashFlow": 2_195_377},
                "spend": {
            "contractualPaymentTermsWithoutCashDiscount": 99,
            "actualPaymentTerms": 99,
        },
                "agreement": {},
                "negotiationStrategy": {},
            }
        )
    )
    block = render_facts(brief, level=LEVEL_FULL)
    assert "$37.54M" in block
    assert "37544807" not in block
    assert "37,544,807" not in block


# ── Chat label / dash formatting ───────────────────────────────────────────


def test_normalize_moves_colon_outside_bold_labels():
    assert (
        normalize_chat_formatting("**Target Ask:** **60 days**")
        == "**Target Ask**: **60 days**"
    )
    assert (
        normalize_chat_formatting("**Supplier Company Size:** Emerging")
        == "**Supplier Company Size**: Emerging"
    )


def test_normalize_replaces_em_and_en_dashes():
    assert normalize_chat_formatting("Net 60 — Effective today") == "Net 60 - Effective today"
    assert normalize_chat_formatting("Net 60 – Effective today") == "Net 60 - Effective today"


def test_strip_rank_tags_also_normalizes_labels():
    assert (
        strip_rank_tags("**Read:** they push back — [STRONGEST]")
        == "**Read**: they push back"
    )


def test_normalize_leaves_unclosed_bold_alone():
    # Mid-stream fragment: one opening ** and no closer yet.
    assert normalize_chat_formatting("Lead with **Target Ask:") == "Lead with **Target Ask:"


def test_normalize_inserts_space_when_prose_glues_to_bold():
    assert (
        normalize_chat_formatting("strongest argument**Existing** Relationship")
        == "strongest argument **Existing** Relationship"
    )


def test_compound_word_hyphen_survives_stream_chunk_boundary():
    """A chunk ending on ``limited-`` must not eat the hyphen before ``impact``.

    Regression: the stream scrubber treated end-of-buffer ``-`` like an orphan
    separator after a rank tag, so ``limited-`` + ``impact`` became ``limitedimpact``.
    """
    from infrastructure.llm.llm_client import _drain_markers

    emitted, buf = "", ""
    for token in [
        "Cost impact is 0.77% — inside the 2% bar ",
        "for a limited-",
        "impact answer, so the figure may be quoted.",
    ]:
        buf += token
        out, buf = _drain_markers(buf, flush=False)
        emitted += out
    out, buf = _drain_markers(buf, flush=True)
    emitted += out

    assert "limited-impact" in emitted
    assert "limitedimpact" not in emitted


def test_strip_rank_tags_keeps_ascii_hyphen_in_compound_words():
    assert (
        strip_rank_tags("for a limited-impact answer")
        == "for a limited-impact answer"
    )
    # Em-dash orphans after a tag still go; ASCII hyphen in the word does not.
    assert (
        strip_rank_tags("limited-impact — [STRONGEST]")
        == "limited-impact"
    )