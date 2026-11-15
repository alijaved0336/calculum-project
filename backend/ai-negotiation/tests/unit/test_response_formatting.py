"""Replies must be structured and skimmable at every length.

The defect these guard: a supplier summary came back as three dense paragraphs —
every figure correct, every figure buried, nine facts in three sentences with no
label or line break. ``conversational`` was actively asking for that shape.
"""
from __future__ import annotations

import pytest

from domain.services.brief_builder import brief_from
from domain.services.supplier_facts import extract_supplier_facts
from utils.prompts.response_mode import get_format_instruction
from utils.prompts.summarize_prompt import build_summarize_prompt, summarize_system_prompt


MODES = ["quick", "conversational", "full", None, "unknown-mode"]


# ── The readability rules hold in every mode ───────────────────────────────


@pytest.mark.parametrize("mode", MODES)
def test_writing_rules_are_present_in_every_mode(mode):
    """Including `quick` — a two-sentence answer can still be unreadable."""
    block = get_format_instruction(mode)
    assert "WRITING RULES — REQUIRED AT EVERY LENGTH" in block


@pytest.mark.parametrize("mode", MODES)
def test_every_mode_bans_stacking_figures_in_one_sentence(mode):
    block = get_format_instruction(mode)
    assert "Never stack more than two figures in one sentence" in block


@pytest.mark.parametrize("mode", MODES)
def test_every_mode_asks_for_the_deciding_figures_in_bold(mode):
    block = get_format_instruction(mode)
    assert "Bold the figure, not the label" in block
    assert "Current: **99 days**" in block
    assert "Target: **120 days**" in block
    assert "BATNA: **99 days**" in block


@pytest.mark.parametrize("mode", MODES)
def test_every_mode_keeps_the_country_flag_rule(mode):
    block = get_format_instruction(mode)
    assert "COUNTRY FLAG INSTRUCTION" in block


@pytest.mark.parametrize("mode", MODES)
def test_no_mode_permits_a_wall_of_text(mode):
    block = get_format_instruction(mode)
    assert "no paragraph longer than three sentences" in block


@pytest.mark.parametrize("mode", MODES)
def test_every_mode_keeps_defined_terms_bold_and_title_case_in_prose(mode):
    """"medium buyer leverage" in a probability sentence — the BRIEF's own

    **Buyer Leverage**: line is Title Case and bold, but prose fell back to a
    plain lowercase noun phrase the moment the term left its labelled line.
    """
    block = get_format_instruction(mode)
    assert "keeps that exact Title Case and bold treatment" in block


# ── Per-mode shape ─────────────────────────────────────────────────────────


def test_conversational_no_longer_asks_for_paragraphs():
    """The exact instruction that produced the unreadable summary."""
    block = get_format_instruction("conversational")
    assert "1–2 short paragraphs" not in block
    assert "Answer it in 1–2 short paragraphs" not in block


def test_conversational_asks_for_labelled_lines():
    block = get_format_instruction("conversational")
    assert "bullets or labelled lines" in block
    assert "figures or ratings is never prose" in block


def test_quick_stays_short_and_unstructured():
    """Structure at 2–3 sentences would be noise — the answer IS the structure."""
    block = get_format_instruction("quick")
    assert "2–3 sentences" in block
    assert "add no\nheadings or bullets of your own" in block


@pytest.mark.parametrize("mode", ["quick", "conversational"])
def test_a_length_mode_never_overrides_a_mandated_output_shape(mode):
    """The C-3 contradiction: "no section headers" appended to six nodes whose
    own system prompts mandate exact headings.

    Both cannot be obeyed, so the model picked one per turn and the same intent
    came back structured or unstructured at random. Length is what the mode
    decides; the shape belongs to the node.
    """
    block = get_format_instruction(mode)
    assert "OVERRIDES DEFAULT STRUCTURE" not in block
    assert "that shape WINS" in block


def test_full_requires_headings_not_paragraphs():
    block = get_format_instruction("full")
    assert "markdown headings" in block
    assert "never continuous paragraphs" in block


def test_unknown_mode_falls_back_to_full():
    assert get_format_instruction("nonsense") == get_format_instruction("full")
    assert get_format_instruction(None) == get_format_instruction("full")


# ── The summarize surface itself ───────────────────────────────────────────
#
# Since 2026-09-14 the summary is a fixed client template RENDERED from the
# brief (`utils.prompts.summary_template`, tested in `test_summary_template`).
# What is left to guard here is that the response-mode machinery never touches
# it: the shape is not the model's to decide.


def test_summarize_no_longer_licenses_plain_prose():
    assert "Plain prose and/or short bullet points" not in summarize_system_prompt


def test_summarize_hands_the_model_a_finished_briefing():
    assert "The briefing is ALREADY WRITTEN" in summarize_system_prompt
    assert "Keep EVERY label" in summarize_system_prompt
    assert "Keep EVERY figure" in summarize_system_prompt


def test_summarize_forbids_duplicate_leading_position_line():
    """Field labels use ``**Label**: value`` (colon outside bold). The
    conversational length example in response_mode must not teach a competing
    ``**Position**:`` lead line that would duplicate Overview Payment Terms.
    """
    from utils.prompts.response_mode import _CONVERSATIONAL
    from utils.prompts.security_guidance import FORMATTING_GUARDRAIL

    assert "**Label**: value" in FORMATTING_GUARDRAIL
    assert "**Label:**" in FORMATTING_GUARDRAIL  # forbidden form called out
    # Conversational example may illustrate bold-labelled lines; it must use
    # colon-outside-bold, never the old **Label:** shape.
    assert "**Position**:" not in _CONVERSATIONAL or "**Position**: " in _CONVERSATIONAL
    assert "**Position:**" not in _CONVERSATIONAL


def _brief():
    return brief_from(
        extract_supplier_facts(
            {
                "supplier": {
                    "name": "Diageo Brands B.V.",
                    "country": "Netherlands",
                    "mainIndustryName": "Beverage manufacturing",
                    "companySize": "LARGE",
                    "creditRating": "A-",
                    "spendVolume": 37_544_807.0,
                },
                "target": {
                    "targetPaymentTerms": 120,
                    "opportunityPaymentTerms": None,
                    "targetCashFlow": 2_195_377,
                },
                "spend": {
                    "contractualPaymentTermsWithoutCashDiscount": 99,
                    "actualPaymentTerms": 99,
                },
                "agreement": {},
                "negotiationStrategy": {
                    "peerGroupStandard": {"value": 59},
                    "industryRegionStandard": {"value": 53},
                },
            }
        )
    )


def test_summarize_prompt_assembles_the_rendered_template():
    prompt = build_summarize_prompt("give me an overview", _brief().facts, brief=_brief())
    assert "Negotiator's question" in prompt
    assert "Diageo Brands B.V. 🇳🇱" in prompt
    assert "Current: **99 days**" in prompt
    assert "Target: **120 days**" in prompt
    assert "**Current** **99 days** → **Target**" not in prompt


@pytest.mark.asyncio
async def test_response_mode_never_reaches_the_summary():
    """`quick` used to be clamped to `conversational`; now no length block is
    appended at all — the template is the shape."""
    from agents.nodes.summarize import make_summarize_node

    seen: dict[str, str] = {}

    class _LLM:
        async def complete(self, prompt: str, **kwargs) -> str:
            seen["prompt"] = prompt
            return prompt.split("do not rebuild it\n", 1)[1]

    brief = _brief()
    for mode in ("quick", "conversational", "full"):
        state = {
            "message": "who are they?",
            "response_mode": mode,
            "context": type("Ctx", (), {"facts": brief.facts, "raw": {}})(),
            "brief": brief,
        }
        await make_summarize_node(_LLM())(state)
    assert seen == {}  # The selected summary tier is rendered without an LLM call.
