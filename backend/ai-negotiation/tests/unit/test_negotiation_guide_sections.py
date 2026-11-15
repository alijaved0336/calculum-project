"""The playbook four-section rule — deterministic enforcement.

Production bug: playbooks sometimes rendered with missing sections. Causes:
(a) max_tokens truncation cutting later sections mid-draft, (b) quick/
conversational format instructions overriding the fixed template. The node
now forces the full-format instruction and retries once when any of the four
headings is missing.
"""
from __future__ import annotations

import asyncio
import re
from typing import Any, AsyncIterator

from agents.nodes.negotiation_guide import make_negotiation_guide_node
from domain.entities.context import SupplierContext
from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.ports.llm_port import LLMPort
from domain.services.negotiation_arguments import build_argument_analysis
from tests.unit.prompt_fixtures import rich_facts
from domain.services.brief_builder import brief_from
from domain.services.supplier_facts import extract_supplier_facts
from utils.prompts.negotiation_guide_prompt import (
    NO_RATIONALE_LINE,
    OPENING_LINE_LABEL,
    PITCH_LABEL,
    REQUIRED_PLAYBOOK_SECTIONS,
    _key_arguments_block,
    _rationale_block,
    _target_and_batna_block,
    argument_pitches,
    key_argument_bullets,
    missing_playbook_sections,
    normalize_playbook_structure,
)

_FULL_PLAYBOOK_DRAFT = "Negotiation Playbook\n\n" + "\n\n".join(
    f"{i}. {name} — content" for i, name in enumerate(REQUIRED_PLAYBOOK_SECTIONS, 1)
)
_TRUNCATED_PLAYBOOK_DRAFT = "Negotiation Playbook\n\n" + "\n\n".join(
    f"{i}. {name} — content" for i, name in enumerate(REQUIRED_PLAYBOOK_SECTIONS[:2], 1)
)
# Node runs normalize_playbook_structure; section 2 drops heading trailers.
_FULL_PLAYBOOK = normalize_playbook_structure(_FULL_PLAYBOOK_DRAFT)
_TRUNCATED_PLAYBOOK = normalize_playbook_structure(_TRUNCATED_PLAYBOOK_DRAFT)


class _FakeLLM(LLMPort):
    def __init__(self, outputs: list[str]) -> None:
        self.outputs = list(outputs)
        self.calls: list[dict[str, Any]] = []

    async def complete(self, prompt: str, *, stream_to_client: bool = False, **kwargs) -> str:
        self.calls.append({"prompt": prompt, "stream_to_client": stream_to_client, **kwargs})
        return self.outputs.pop(0)

    async def stream(self, prompt: str, **kwargs) -> AsyncIterator[str]:  # pragma: no cover
        raise NotImplementedError


def _state(**kw) -> dict[str, Any]:
    facts = SupplierFacts(
        supplier_name="Acme", country="DE", industry="Mfg", company_size="large",
        target_term_days=90, current_term_days=51, batna_term_days=60,
        benchmark_term_days=48, regulatory_max_term_days=None,
        # The benchmark values the playbook fixtures below quote. Without them
        # the output verifier reports them as invented — correctly, since a
        # figure with no field behind it is exactly what P1 forbids.
        strategy_benchmarks=[
            StrategyBenchmark(name="parentOrSupplierMax", label="parent max", value=95),
            StrategyBenchmark(name="industryRegionStandard", label="industry", value=35),
            StrategyBenchmark(name="peerGroupStandard", label="peer", value=85),
        ],
    )
    context = SupplierContext(
        supplier_id="s1", raw={}, facts=facts,
        argument_analysis=build_argument_analysis(facts),
    )
    return {"context": context, "message": "playbook please", **kw}


# ── validator ────────────────────────────────────────────────────────────────

def test_missing_sections_empty_for_complete_playbook():
    assert missing_playbook_sections(_FULL_PLAYBOOK) == []


def test_missing_sections_lists_absent_headings_in_spec_order():
    assert missing_playbook_sections(_TRUNCATED_PLAYBOOK) == ["Objections and Concessions", "Rationale"]


def test_missing_sections_on_empty_draft_is_all_four():
    assert missing_playbook_sections(None) == list(REQUIRED_PLAYBOOK_SECTIONS)


# ── node enforcement ─────────────────────────────────────────────────────────

def test_complete_draft_needs_no_retry():
    llm = _FakeLLM([_FULL_PLAYBOOK])
    result = asyncio.run(make_negotiation_guide_node(llm)(_state()))
    assert len(llm.calls) == 1
    assert "* **Success probability**:" not in result["response"]
    assert "4. Rationale" in result["response"]
    assert "errors" not in result


def test_length_cap_instructions_filtered_for_playbook():
    # A tenant rule "Keep responses under 180 words" made the model stop the
    # playbook mid-section-2. Document nodes drop length caps; policy rules stay.
    from utils.prompts.prompt_instructions import drop_response_length_instructions

    kept = drop_response_length_instructions([
        "Keep responses under 180 words and use bullet points.",
        "Answers must be 3 sentences or less.",
        "Respond within 500 characters.",
        "Never commit to extensions longer than 90 days without flagging for human review.",
        "Always offer SCF first when the supplier is an SME.",
    ])
    assert kept == [
        "Never commit to extensions longer than 90 days without flagging for human review.",
        "Always offer SCF first when the supplier is an SME.",
    ]


def test_node_drops_length_cap_from_operator_instructions():
    llm = _FakeLLM([_FULL_PLAYBOOK])
    state = _state(prompt_instructions=[
        "Keep responses under 180 words.",
        "Never commit to extensions longer than 90 days without flagging for human review.",
    ])
    asyncio.run(make_negotiation_guide_node(llm)(state))
    prompt = llm.calls[0]["prompt"]
    assert "under 180 words" not in prompt
    assert "flagging for human review" in prompt  # policy rules survive


def test_playbook_is_never_streamed_raw():
    # The client renders the raw token stream; normalization and the
    # six-section retry happen AFTER generation, so streaming raw tokens
    # would show the user the broken draft. The WS route fake-streams the
    # final response when a node streams nothing.
    llm = _FakeLLM([_FULL_PLAYBOOK])
    asyncio.run(make_negotiation_guide_node(llm)(_state()))
    assert llm.calls[0]["stream_to_client"] is False


def test_incomplete_draft_retries_once_with_corrective_instruction():
    llm = _FakeLLM([_TRUNCATED_PLAYBOOK, _FULL_PLAYBOOK])
    result = asyncio.run(make_negotiation_guide_node(llm)(_state()))
    assert len(llm.calls) == 2
    retry = llm.calls[1]
    assert "REGENERATE" in retry["prompt"]
    assert "Target and BATNA" in retry["prompt"] and "Do not write 4. Rationale" in retry["prompt"]
    assert retry["stream_to_client"] is False  # replaces the streamed draft
    assert "* **Success probability**:" not in result["response"]
    assert "4. Rationale" in result["response"]
    assert "errors" not in result


def test_still_incomplete_after_retry_reports_error():
    llm = _FakeLLM([_TRUNCATED_PLAYBOOK, _TRUNCATED_PLAYBOOK])
    result = asyncio.run(make_negotiation_guide_node(llm)(_state()))
    assert len(llm.calls) == 2
    assert any("missing sections" in e for e in result["errors"])

    # Best effort, and flagged ON THE PAGE. `errors` alone was not enough: the
    # route only reads those when `response is None`, so an incomplete playbook
    # shipped looking finished — and a negotiator walks into a room with it.
    assert result["response"].startswith("Negotiation Playbook")
    assert "[Incomplete" in result["response"]
    assert "Concessions" in result["response"]


def test_format_instruction_forced_to_full_even_in_quick_mode():
    llm = _FakeLLM([_FULL_PLAYBOOK])
    asyncio.run(make_negotiation_guide_node(llm)(_state(response_mode="quick")))
    prompt = llm.calls[0]["prompt"]
    assert "comprehensive response" in prompt          # the "full" instruction
    assert "2–3 sentences maximum" not in prompt       # never the quick one


def test_raised_token_cap():
    llm = _FakeLLM([_FULL_PLAYBOOK])
    asyncio.run(make_negotiation_guide_node(llm)(_state()))
    assert llm.calls[0]["max_tokens"] == 4096


# ── structure normalizer (run-together playbook → section-per-line) ─────────

# Reproduction of the production blob: all six sections in ONE paragraph,
# headings and bullets inline — the frontend rendered it as a single card.
_RUN_ON_PLAYBOOK = (
    "Negotiation Playbook\n\n"
    "1. Target and BATNA Current 45. Target 90. BATNA 60. "
    "2. Opening Position and Argumentation Treasury line then arguments. "
    "3. Objections and Concessions Expect cash-flow pushback. "
    "4. Rationale Success high."
)


def test_normalizer_puts_inline_bullets_on_own_lines():
    """Checked in a section with an open bullet list.

    The fixture's inline bullets sit in Opening Position, which is a closed set
    now — they are dropped there on purpose (see the Opening Position tests), so
    a run-on Objections section is what actually exercises this rule.
    """
    run_on = (
        "5. Potential Objections Expect pushback. "
        "* Ask: 90 days * Justification: parent max is 95 days. * Tone: Collaborative."
    )
    text = normalize_playbook_structure(run_on)
    assert "\n* Ask: 90 days" in text
    assert "\n* Justification:" in text
    assert "\n* Tone: Collaborative." in text


def test_normalizer_is_idempotent_on_well_formed_output():
    once = normalize_playbook_structure(_RUN_ON_PLAYBOOK)
    assert normalize_playbook_structure(once) == once


def test_normalizer_leaves_emphasis_untouched():
    text = "1. Opening Position\nThis is a *really* strong ask."
    assert "*really*" in normalize_playbook_structure(text)


# ── Key Arguments sub-heading (one group, two-level shape) ─────────────────
# Section 4 asks for a single "**Supporting arguments …**" group with a child
# "*How to pitch:*" bullet under each argument. The model sometimes runs the
# whole thing together, so the normalizer restores that shape too.
#
# The fixture still carries a stray "* Not used — …" bullet: the group was
# removed from the spec and the brief no longer feeds it, but a draft that
# invents one anyway must not have it promoted into a heading.

_RUN_ON_KEY_ARGUMENTS = (
    "4. Key Arguments Extending from 34 to 76 days. "
    "**Supporting arguments — cite these to justify the ask** "
    "* **parentOrSupplierMax — 80 days** "
    '* *How to pitch:* "Comparable arrangements already operate on extended terms." '
    "* **spendLineTarget — 85 days** — internal only, do not say this to the supplier "
    "* *Why it matters:* raises our confidence to hold at 76. "
    "* Not used — industryRegionStandard (35 days): at the walkaway floor. "
    "5. Potential Objections Expect pushback."
)


def test_normalizer_drops_key_argument_subheading():
    text = normalize_playbook_structure(_RUN_ON_KEY_ARGUMENTS)
    assert "Supporting arguments" not in text
    assert "* **parentOrSupplierMax — 80 days**" in text


def test_normalizer_drops_unbolded_subheading():
    text = normalize_playbook_structure(
        "4. Key Arguments\n"
        "We are moving from 34 to 76 days. Supporting arguments — cite these to "
        "justify the ask * **parentOrSupplierMax — 80 days**"
    )
    assert "Supporting arguments" not in text
    assert "* **parentOrSupplierMax — 80 days**" in text


def test_not_used_bullets_stay_bullets():
    # "Not used" is not a sub-heading — the group is gone from the spec, so a
    # stray one stays an ordinary bullet rather than being dressed up as a
    # heading (which would also strand the bullet marker behind it).
    text = normalize_playbook_structure(_RUN_ON_KEY_ARGUMENTS)
    assert "\n* Not used — industryRegionStandard (35 days): at the walkaway floor." in text
    assert not any(l.strip() == "*" for l in text.splitlines())


def test_normalizer_idempotent_on_key_argument_shape():
    once = normalize_playbook_structure(_RUN_ON_KEY_ARGUMENTS)
    assert normalize_playbook_structure(once) == once


def test_normalizer_drops_supporting_arguments_even_when_well_formed():
    good = (
        "4. Key Arguments\n"
        "Extending from 34 to 76 days.\n\n"
        "**Supporting arguments — cite these to justify the ask**\n\n"
        "* **parentOrSupplierMax — 80 days**\n"
        '  * **How to pitch**: "Comparable arrangements already operate on extended terms."\n'
        "* Not used — industryRegionStandard (35 days): at the walkaway floor.\n"
        "* Not used — peerGroupStandard: no data for this supplier."
    )
    out = normalize_playbook_structure(good)
    assert "Supporting arguments" not in out
    assert "* **parentOrSupplierMax — 80 days**" in out


def test_normalizer_leaves_ordinary_bold_emphasis_alone():
    # Bold inside a bullet must not be split onto its own line.
    text = "4. Key Arguments\n* **80 days** is above the ask."
    assert normalize_playbook_structure(text) == text


# ── stray numbered lines → phantom section cards ───────────────────────────
# Reproduction of a real break: the Concessions ladder emitted as a NUMBERED
# list with italic cost notes. "1. Offer … — *costs us margin*" is grammatically
# identical to a section heading ("N. Name — *subtitle*"), so the frontend card
# parser rendered the ladder items as extra numbered sections.

_NUMBERED_CONCESSIONS = (
    "6. Concessions — *Ranked list with trade-offs*\n"
    "This ladder gives visible off-ramps.\n\n"
    "1. Offer a slight increase in purchase volume on specific lines — "
    "*costs us margin but signals long-term commitment.*\n"
    "2. Agree to a slightly higher unit price on non-core items — "
    "*minimal cost to protect relationship goodwill.*\n"
    "3. Hold firm at 35 days (floor) — *highest cost to cash-flow unlock.*"
)


def test_every_real_heading_survives_demotion_pass():
    # Section-title italic subtitles are stripped globally (prompt forbids them).
    # Headings themselves must still survive; section 1 body may be restructured.
    draft = "\n\n".join(
        f"{i}. {name} — *sub*\nBody line." for i, name in enumerate(REQUIRED_PLAYBOOK_SECTIONS, 1)
    )
    text = normalize_playbook_structure(draft)
    lines = text.splitlines()
    for i, name in enumerate(REQUIRED_PLAYBOOK_SECTIONS, 1):
        assert f"{i}. {name}" in lines, f"{i}. {name} was demoted"
        assert f"{i}. {name} — *sub*" not in lines
    assert text.count("Body line.") == len(REQUIRED_PLAYBOOK_SECTIONS)


def test_normalizer_idempotent_on_demoted_concessions():
    once = normalize_playbook_structure(_NUMBERED_CONCESSIONS)
    assert normalize_playbook_structure(once) == once


def test_normalizer_ignores_long_numbers_at_line_start():
    # Only 1-2 digit ordinals are list markers; a year must not become a bullet.
    text = "5. Potential Objections\n2026. was a strong year for them."
    assert normalize_playbook_structure(text) == text


# ── decorated headings (### / **bold**) ────────────────────────────────────
# The card parser keys off a line STARTING with "N. ". A heading dressed up as
# `## 1. Opening Position …` or `**1. Opening Position …**` doesn't match, and
# splitting in front of the digit would strand the marker on its own line.


def test_normalizer_unwraps_bold_headings():
    text = normalize_playbook_structure(
        "**3. BATNA — *Best alternative if no deal***\nModerate BATNA."
    )
    assert text.startswith("3. BATNA\n")
    assert "Best alternative if no deal" not in text
    assert "**" not in text.splitlines()[0]


def test_decorated_headings_leave_no_orphan_marker_lines():
    draft = "\n\n".join(
        f"## {i}. {name} — *sub*\nBody." for i, name in enumerate(REQUIRED_PLAYBOOK_SECTIONS, 1)
    )
    text = normalize_playbook_structure(draft)
    assert [l for l in text.splitlines() if l.strip() in {"#", "##", "**"}] == []
    assert missing_playbook_sections(text) == []


# ── inline labelled bullets ────────────────────────────────────────────────


def test_normalizer_idempotent_on_target_outcome_bullets():
    once = normalize_playbook_structure(
        "2. Target — *x*\n**Primary goal**: 90 days. **Fallback**: 85 days."
    )
    assert normalize_playbook_structure(once) == once


# ── BATNA figure bullets (section 3) ───────────────────────────────────────
# Section 3 is the fallback figure plus the arguments supporting it (client,
# 2026-08-25). Same failure mode as Target Outcome: the two labelled figures run
# together on one line instead of one bullet each.

def test_normalizer_bullets_inline_batna_labels():
    text = normalize_playbook_structure(
        "3. BATNA — *Fallback position + the evidence behind it*\n"
        "**Target Payment Term**: 90 days **BATNA / Fallback Position**: 75 days"
    )
    bullets = [l for l in text.splitlines() if l.startswith("* ")]
    assert len(bullets) == 2, f"expected 2 bullets, got:\n{text}"
    assert bullets[0].startswith("* **Target Payment Term**:")
    assert bullets[1].startswith("* **BATNA / Fallback Position**:")


def test_normalizer_drops_batna_supporting_arguments_subheading():
    text = normalize_playbook_structure(
        "3. BATNA\n"
        "* **BATNA / Fallback Position**: 75 days **Supporting Arguments** "
        '* **Supplier Standard — 76 days** — "Aligned with demonstrated acceptance."'
    )
    assert "Supporting Arguments" not in text
    assert any(
        l.startswith("* **Supplier Standard") for l in text.splitlines() if l.strip()
    )


def test_key_arguments_supporting_subheading_is_dropped():
    text = (
        "4. Key Arguments\n\n"
        "**Supporting arguments — cite these to justify the ask**\n\n"
        "* **Parent / Supplier Max — 80 days**\n"
    )
    out = normalize_playbook_structure(text)
    assert "Supporting arguments" not in out
    assert "* **Parent / Supplier Max — 80 days**" in out


def test_batna_label_rule_leaves_child_pitch_and_other_bold_alone():
    # BATNA labels use `**bold**:`; the Key Arguments child bullet "*Why it
    # matters:*" is single-asterisk italic and must NOT be treated as a BATNA
    # label. Ordinary bold and already-bulleted BATNA lines are untouched too.
    # Section-title italic subtitles are stripped.
    text = (
        "3. BATNA — *Fallback position + the evidence behind it*\n"
        "* **Target Payment Term**: 90 days\n"
        "We expect **strong** resistance.\n"
        "  * *Why it matters:* raises our confidence."
    )
    out = normalize_playbook_structure(text)
    assert out.startswith("3. BATNA\n")
    assert "* **Target Payment Term**: 90 days" in out
    assert "We expect **strong** resistance." in out
    assert "  * *Why it matters:* raises our confidence." in out
    assert "Fallback position" not in out


def test_normalizer_idempotent_on_batna_bullets():
    once = normalize_playbook_structure(
        "3. BATNA\n**Target Payment Term**: 90 days "
        "**BATNA / Fallback Position**: 75 days\n\n**Supporting Arguments**"
    )
    assert normalize_playbook_structure(once) == once


# ── Objection / Counter bullets (section 5) ────────────────────────────────
# Client shape, 2026-08-25: "**Objection N**:" then the supplier's line, with
# "**Counter**:" as a child bullet under it.


def test_normalizer_nests_counter_under_its_objection():
    text = normalize_playbook_structure(
        "3. Objections and Concessions\n"
        "* **Objections**\n"
        '* This will hurt our cash flow.\n'
        '* **Counter**: The cost impact is only 0.61% of invoice value.\n'
        "* Your ask is not compliant.\n"
        "* **Counter**: No statutory regulation caps payment terms."
    )
    lines = [l for l in text.splitlines() if l.strip()]
    children = [l for l in lines if l.startswith("  * **Counter**:")]
    assert len(children) == 2, f"expected 2 nested counters, got:\n{text}"
    assert not any(
        l.startswith("* **Counter:") for l in lines
    ), f"flush-left Counter left unindented:\n{text}"


def test_every_counter_is_in_double_quotes_exactly_once():
    text = normalize_playbook_structure(
        "3. Objections and Concessions\n"
        "* **Objections**\n"
        "* This will hurt our cash flow.\n"
        "  * **Counter**: The cost impact is only 0.61% of invoice value.\n"
        "* Your ask is not compliant.\n"
        '  * **Counter**: \u201cNo statutory regulation caps payment terms.\u201d\n'
        "* Others accept shorter terms.\n"
        '  * **Counter**: "Similar suppliers accept 60 days."'
    )
    counters = [l for l in text.splitlines() if "**Counter**:" in l]
    assert counters == [
        '  * **Counter**: "The cost impact is only 0.61% of invoice value."',
        '  * **Counter**: "No statutory regulation caps payment terms."',
        '  * **Counter**: "Similar suppliers accept 60 days."',
    ]
    assert normalize_playbook_structure(text) == text


def test_the_objection_label_needs_its_number():
    """Anchored on `**Objection <n>**:`, so ordinary prose about an objection is
    left alone rather than promoted to a bullet."""
    text = "5. Potential Objections\nWe expect **Objection handling** to be brisk."
    assert normalize_playbook_structure(text) == text


def test_normalizer_idempotent_on_objection_bullets():
    once = normalize_playbook_structure(
        '5. Potential Objections\n**Objection 1**: "Cash flow." **Counter**: "0.61%."'
    )
    assert normalize_playbook_structure(once) == once


def test_a_well_formed_objections_section_is_untouched():
    text = (
        "5. Potential Objections\n\nFraming.\n\n"
        '* **Objection 1**: "This will hurt our cash flow."\n'
        '  * **Counter**: "Only 0.61% of invoice value."'
    )
    assert normalize_playbook_structure(text) == text


def test_normalizer_keeps_batna_parenthetical_on_the_heading_line():
    """Definition stays beside BATNA — not dropped onto the next line as body."""
    text = normalize_playbook_structure(
        "3. BATNA (Best Alternative to a Negotiated Agreement)\n"
        "* **Target**: 90 days\n"
        "* **BATNA**: 75 days"
    )
    assert "3. BATNA (Best Alternative to a Negotiated Agreement)" in text.splitlines()
    assert "(Best Alternative to a Negotiated Agreement)" not in [
        l for l in text.splitlines() if not l.startswith("3. BATNA")
    ]

# ── Concession rungs (section 6) ───────────────────────────────────────────
# Client 2026-09-10: one lettered Offer bullet per rung
# (`* **A. Equivalent Discount Request — Offer**: "…"`). A standalone
# `**A. Title**` heading plus a separate Offer line is the duplicate they
# struck. When to use / Cost to us stay out.


def test_a_bulleted_rung_becomes_a_lettered_offer():
    """`* **A. Title** — "offer"` folds onto the Offer line, no extra heading."""
    text = normalize_playbook_structure(
        "6. Concessions — *Ranked list with trade-offs*\nUse these only if...\n"
        '* **A. Phased Implementation Roadmap** — "If moving to Net 90..."\n'
        "* **When to use**: The move is 40 days.\n"
        "* **Cost to us**: Costs us the timing only.\n"
        '* **B. Equivalent Discount Request** — "Where alignment cannot..."\n'
        "* **When to use**: They want compensation.\n"
    )
    lines = text.splitlines()
    assert (
        '* **A. Phased Implementation Roadmap - Offer**: "If moving to Net 90..."'
        in lines
    )
    assert (
        '* **B. Equivalent Discount Request - Offer**: "Where alignment cannot..."'
        in lines
    )
    assert "**A. Phased Implementation Roadmap**" not in lines
    assert "**B. Equivalent Discount Request**" not in lines
    assert not any(l.lstrip().startswith("—") for l in lines)


def test_a_duplicate_rung_heading_above_the_offer_is_dropped():
    text = normalize_playbook_structure(
        "6. Concessions\n\n**A. Equivalent Discount Request**\n\n"
        '* **A. Equivalent Discount Request — Offer**: "Where alignment..."\n'
    )
    lines = [l for l in text.splitlines() if l.strip()]
    assert lines.count("**A. Equivalent Discount Request**") == 0
    assert (
        '* **A. Equivalent Discount Request — Offer**: "Where alignment..."'
        in lines
    )


def test_a_bare_title_bullet_merges_with_the_following_offer():
    text = normalize_playbook_structure(
        "6. Concessions — *x*\n* **A. SCF Program Access**\n"
        '* **Offer**: "Day 5."\n'
    )
    assert '* **A. SCF Program Access - Offer**: "Day 5."' in text.splitlines()
    assert "* **A. SCF Program Access**" not in text.splitlines()


def test_a_rung_labelled_offer_bullet_is_not_mistaken_for_a_heading():
    """The label ends in a colon, the heading never does — without that guard the
    normalizer split the Offer bullet in two."""
    text = normalize_playbook_structure(
        "6. Concessions — *x*\n\n**A. SCF Program Access**\n"
        '* **A. SCF Program Access — Offer**: "Settlement as early as day 5."\n'
        "* **When to use**: SCF enabled.\n"
    )
    assert (
        '* **A. SCF Program Access — Offer**: "Settlement as early as day 5."'
        in text.splitlines()
    )


def test_normalizer_idempotent_on_decorated_headings():
    once = normalize_playbook_structure("## 1. Opening Position\nBody.")
    assert normalize_playbook_structure(once) == once


# ── Client-reported playbook fixes (2026-08-18) ────────────────────────────


def test_an_unbolded_key_argument_name_is_bolded_back():
    """Client-reported: "Client-Supplier Relationship" arrived unbolded beside
    bolded neighbours. The normalizer preserved bold but never restored it."""
    out = normalize_playbook_structure(
        "4. Key Arguments\n\n* Client-Supplier Relationship — High strength\n"
    )
    assert "* **Client-Supplier Relationship — High strength**" in out


def test_internal_only_is_stripped_from_catalogue_key_arguments():
    """Client markup: the tag is not part of the Key Arguments wording."""
    unbolded = normalize_playbook_structure(
        "4. Key Arguments\n\n"
        "* Client-Supplier Relationship — High strength — internal only, "
        "do not say this to the supplier\n"
    )
    assert "* **Client-Supplier Relationship — High strength**" in unbolded
    assert "internal only" not in unbolded

    overbolded = normalize_playbook_structure(
        "4. Key Arguments\n\n"
        "* **Cost Impact — 0.77% of spend — internal only, "
        "do not say this to the supplier**\n"
    )
    assert "* **Cost Impact — 0.77% of spend**" in overbolded
    assert "internal only" not in overbolded


def test_supplier_standard_keeps_the_day_label_and_drops_internal_tag():
    out = normalize_playbook_structure(
        "4. Key Arguments\n\n"
        "* **Supplier Standard — 67 days.** —internal only, do not say this "
        "to the supplier There is market evidence that the supplier is "
        "accepting longer terms of on average 67 days.\n"
    )
    assert "internal only" not in out
    assert "* **Supplier Standard — 67 days.** There is market evidence" in out


def test_a_cost_impact_bullet_is_removed_from_argumentation_not_tidied():
    """Client, 2026-09-18: Cost Impact is a section-4 assessment.

    It used to be a section-2 argument whose label was repaired in place; the
    repair is gone with it, because a bullet that does not belong in the
    section is not improved by being well formatted.
    """
    brief = _all_arguments_brief()
    draft = (
        "2. Opening Position and Argumentation\n"
        "* **Opening Line**:\n* Our treasury has mandated Net 60.\n"
        "* **Argumentation**:\n"
        + "\n".join(key_argument_bullets(brief))
        + "\n* **Cost Impact - 0.52% of invoice value over 60 days.** "
        "The cost impact is only 0.52% of the invoice value.\n"
        "\n3. Objections and Concessions\n* **Objections**\n* x\n"
    )
    section = _section_2(normalize_playbook_structure(draft, brief=brief))
    assert "Cost Impact" not in section
    assert "over 60 days" not in section


def test_the_bold_repair_touches_nothing_else():
    """Anchored on catalogue names, so strays and other sections are untouched."""
    stray = "4. Key Arguments\n\n* Not used — industryRegionStandard (35 days).\n"
    assert "* Not used — industryRegionStandard (35 days)." in normalize_playbook_structure(stray)

    steps = "6. Concessions — *x*\n\n* Step 1 — offer 90 days\n"
    assert "* Step 1 — offer 90 days" in normalize_playbook_structure(steps)

    batna = (
        '3. BATNA\n\n* **Supplier Standard — 76 days** — "Aligned."\n'
    )
    assert '* **Supplier Standard — 76 days** — "Aligned."' in normalize_playbook_structure(batna)


def test_the_bold_repair_is_idempotent():
    text = "4. Key Arguments\n\n* Client-Supplier Relationship — High strength\n"
    once = normalize_playbook_structure(text)
    assert normalize_playbook_structure(once) == once
    assert "****" not in once


# ── Section 1 (Opening Position) — every line labelled, one fixed order ─────
#
# Client, 2026-08-28: "sometimes we mention the treasury policy unformatted,
# sometimes when scf is on we mention scf but we misplace treasury policy below
# scf sometimes above it." Section 1 was the only section with no shape — prose
# in the spec, and the two SCF labels the only part of it supplied by code. It
# is a labelled bullet list in ONE order now, and the normalizer guarantees it
# rather than asking for it.

from domain.entities.playbook_plays import play_by_key  # noqa: E402

_TREASURY = play_by_key("mandatoryTreasuryPolicy")
_ANCHOR_SENTENCE = (
    "Open at 80 days, supported by an established precedent within our own "
    "history with this supplier, with the objective of settling at 75 days. "
    "The target sits just inside that precedent, so conceding from the anchor "
    "to the target is planned, defensible movement — not an arbitrary number."
)
_SCF_NOTE = (
    "The ask is enabled by the availability of Supply Chain Finance to address "
    "potential liquidity concerns."
)


def _wrap(body: str) -> str:
    return (
        "1. Opening Position\n"
        f"{body}\n\n2. Target — *Intended landing zone*\nbody"
    )


def test_section_one_normalization_is_idempotent():
    draft = _wrap(
        f"{_ANCHOR_SENTENCE}\n"
        f"**Supply Chain Finance**: {_SCF_NOTE}\n"
        f'"{_TREASURY.spoken_line(75)}"'
    )
    once = normalize_playbook_structure(draft)
    assert normalize_playbook_structure(once) == once


def test_a_playbook_without_section_one_is_untouched_by_the_rule():
    other = "4. Key Arguments\n\n* **Cost Impact — 0.77% of spend**\n"
    assert normalize_playbook_structure(other) == other.strip()


# ── Key Arguments parent bullets — one spelling, always bold ────────────────
#
# Client, 2026-08-28: "Client-Supplier Relationship doesn't get bolded, sometimes
# it does but mostly not". It is the ONLY argument title containing a hyphen, and
# the repair matched the catalogue's literal spelling — so every run where the
# model typeset the compound with an en or em dash slipped past it.


def _key_arguments(body: str) -> list[str]:
    draft = f"2. Opening Position and Argumentation\n\n{body}\n\n3. Objections and Concessions\ny"
    text = normalize_playbook_structure(draft)
    section = text[text.index("2. Opening Position and Argumentation") : text.index("3. Objections and Concessions")]
    return [line for line in section.splitlines() if line.startswith("* ")]


def test_the_dash_tolerance_does_not_promote_strays():
    """Still anchored on real names, not on shape — the reason a shape-based
    rule was rejected in the first place."""
    assert _key_arguments("* Not used — industryRegionStandard (35 days).") == [
        "* Not used — industryRegionStandard (35 days)."
    ]
    assert _key_arguments("* Relationship — $5M spend") == ["* Relationship — $5M spend"]


def test_key_argument_bolding_is_idempotent_across_spellings():
    body = "* Client–Supplier Relationship — $5M spend\n* Cost Impact — 0.77% of spend"
    once = "\n".join(_key_arguments(body))
    assert _key_arguments(once) == once.splitlines()
    assert "****" not in once


# ── Key Arguments wording (section 4, decided in code) ──────────────────────


def _adp_facts(**strategy):
    return extract_supplier_facts({
        "supplier": {
            "name": "Adp, Inc",
            "country": "United States",
            "spendVolume": 12_400_000,
            "waccAfterTax": 0.071,
            "supplierFinancingRate": 0.08,
        },
        "target": {"targetPaymentTerms": 60, "targetCashFlow": 1_430_000},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": 45,
            "actualPaymentTerms": 45,
        },
        "negotiationStrategy": strategy or {
            "supplierStandard": {
                "value": 67, "occurrences": 16, "avg": 67, "q3": 79,
            },
        },
    })


def test_an_argument_bullet_is_its_name_and_value_and_stops_there():
    """Client, 2026-09-18: name, value, then the pitch underneath. Nothing else.

    The market-evidence sentence that used to follow the label is the WHY, and
    the why is section 4's job - stating it here made Argumentation read as
    evidence, definition and assessment at once.
    """
    bullets = key_argument_bullets(brief_from(_adp_facts()))
    supplier = next(b for b in bullets if "Supplier Standard" in b)
    assert supplier == "* **Supplier Standard - 67 days.**"
    assert "market evidence" not in supplier
    assert "internal only" not in supplier


def test_a_missing_quartile_is_omitted_not_placeholder():
    facts = _adp_facts(supplierStandard={
        "value": 67, "occurrences": 16, "avg": 67,
    })
    supplier = next(
        b for b in key_argument_bullets(brief_from(facts)) if "Supplier Standard" in b
    )
    assert "top 3rd quartile" not in supplier
    assert "XX" not in supplier


def test_cost_impact_left_argumentation_for_the_rationale():
    """Client, 2026-09-18. It is an assessment, not a benchmark: it argues no
    day figure, so it has no place in a section that is names and day figures.
    Its wording was already in section 4, so nothing was lost in the move."""
    brief = brief_from(_adp_facts())
    assert not any("Cost Impact" in b for b in key_argument_bullets(brief))
    assert not any(title == "Cost Impact" for title, _ in argument_pitches(brief))
    assert "* **Cost Impact**:" in _rationale_block(brief)


def test_the_key_arguments_block_is_copy_dont_decide():
    block = _key_arguments_block(brief_from(_adp_facts()))
    assert "already decided" in block
    assert "internal only, do not say this to the supplier" in block  # the instruction
    assert "* **Supplier Standard - 67 days.**" in block
    assert "* **Argumentation**:" in block
    # The bullets are complete as given - the model adds nothing after them.
    assert "COMPLETE as written" in block
    assert "do not add an argument that is not listed here" in block


def _playbook_with_arguments(brief):
    draft = (
        "1. Target and BATNA\n* **BATNA**: 45 days\n\n"
        "2. Opening Position and Argumentation\n* **Opening Line**\n"
        "* Our treasury has mandated Net 60.\n* **Argumentation**\n"
        + "\n".join(key_argument_bullets(brief))
        + "\n\n3. Objections and Concessions\n* **Objections**\n* x\n"
        "  * **Counter**: y\n"
    )
    return normalize_playbook_structure(draft, brief=brief)


def _all_arguments_brief():
    return brief_from(_adp_facts(
        supplierStandard={"value": 67, "occurrences": 16, "avg": 67, "q3": 79},
        parentOrSupplierMax={"value": 75},
        peerGroupStandard={"value": 60, "occurrences": 12},
        industryRegionStandard={"value": 61},
    ))


def _section_2(text):
    return text[
        text.index("2. Opening Position and Argumentation"):
        text.index("3. Objections and Concessions")
    ]


def test_each_sayable_argument_is_followed_by_its_quoted_pitch():
    from domain.entities.argument_catalog import ARGUMENT_CATALOG
    lines = _section_2(_playbook_with_arguments(_all_arguments_brief())).splitlines()

    def pitch_after(title):
        i = next(i for i, l in enumerate(lines) if l.startswith(f"* **{title}"))
        return lines[i + 1]

    for key in ("parentOrSupplierMax", "peerGroupStandard", "industryRegionStandard"):
        definition = ARGUMENT_CATALOG[key]
        assert pitch_after(definition.title) == (
            f'  * **{PITCH_LABEL}**: "{definition.supplier_pitch}"'
        )
    # Cost Impact is not in this section, so it has no bullet to be pitched
    # under. Section 4, where it lives now, carries no supplier wording.
    assert "Cost Impact" not in "\n".join(lines)


def test_argumentation_carries_only_the_decided_bullets_and_their_pitches():
    """Client, 2026-09-18: "always contain ONLY the benchmark arguments".

    Every line in the section after the Opening Line is either an approved
    argument bullet or its pitch child. Driven from a draft carrying one of
    each kind of pollution a real playbook has come back with: a definition
    sentence, a market-evidence sentence, an "internal only" tail, a Cost
    Impact bullet, an assessment that is not a benchmark, and loose prose.
    """
    brief = _all_arguments_brief()
    draft = (
        "2. Opening Position and Argumentation\n"
        "* **Opening Line**:\n* Our treasury has mandated Net 60.\n"
        "* **Argumentation**:\n"
        "* **Supplier Standard - 67 days.** There is market evidence that Adp, Inc "
        "is already accepting 67 days - internal only, do not say this to the supplier.\n"
        "* **Peer Group Standard.** Represents the terms comparable suppliers accept.\n"
        "* **Cost Impact - 0.82% of invoice value.** The cost impact is only 0.82%.\n"
        "* **DSO Alignment.** Their DSO is 72 days, which gives us leverage.\n"
        "* Overall the market clearly supports this ask.\n"
        "\n3. Objections and Concessions\n* **Objections**:\n* x\n  * **Counter**: y\n"
    )
    section = _section_2(normalize_playbook_structure(draft, brief=brief))
    body = [
        line for line in section.splitlines()
        if line.strip() and not line.startswith("2. ")
    ]
    opening = body.index("* **Argumentation**:")
    for line in body[opening + 1:]:
        assert line.startswith("* **") or line.strip().startswith(f"* **{PITCH_LABEL}"), line

    # Every approved argument, name and value, nothing after the closing **.
    assert "* **Supplier Standard - 67 days.**" in body
    assert "* **Peer Group Standard - 60 days.**" in body
    # ...and none of the pollution.
    for absent in (
        "market evidence", "Represents the terms", "internal only",
        "Cost Impact", "DSO Alignment", "Overall the market",
    ):
        assert absent not in section, absent


def test_benchmarks_are_named_as_the_rest_of_the_product_names_them():
    """Client, 2026-09-18: "name them what their actual names are".

    The negotiator reads the playbook beside the summary card and the source
    panel, and those call these sources Buyer Standard, Parent / Supplier Max
    and Industry Region Standard. The catalogue described them instead
    ("Standard Payment Terms", "Existing Relationship Precedent", "Industry
    Alignment"), so one source wore two names and read as two.
    """
    from domain.entities.argument_catalog import ARGUMENT_CATALOG
    from utils.prompts.supplier_summary import _STANDARD_LABELS

    assert ARGUMENT_CATALOG["buyerStandard"].title == "Buyer Standard"
    assert ARGUMENT_CATALOG["parentOrSupplierMax"].title == "Parent / Supplier Max"
    assert ARGUMENT_CATALOG["industryRegionStandard"].title == "Industry Region Standard"
    # The summary card's labels are shortened so the UI cannot truncate them;
    # each must still be a prefix of the catalogue name, never a different word.
    for key, short in _STANDARD_LABELS.items():
        definition = ARGUMENT_CATALOG.get(key)
        if definition is not None:
            assert definition.title.startswith(short), (key, short, definition.title)


def test_a_draft_written_before_the_rename_is_respelled():
    """Stored playbooks and threads being reshaped still carry the old names."""
    stale = (
        "2. Opening Position and Argumentation\n* **Argumentation**:\n"
        "* **Existing Relationship Precedent - 76 days.**\n"
        "* **Industry Alignment - 40 days.**\n"
        "* **Standard Payment Terms - 80 days.**\n"
        "\n3. Objections and Concessions\n* x\n"
    )
    out = normalize_playbook_structure(stale)
    assert "* **Parent / Supplier Max - 76 days.**" in out
    assert "* **Industry Region Standard - 40 days.**" in out
    assert "* **Buyer Standard - 80 days.**" in out
    for gone in ("Existing Relationship Precedent", "Industry Alignment", "Standard Payment Terms"):
        assert gone not in out


def test_every_argument_bullet_states_its_day_figure():
    """A scrub used to strip `- 60 days` off the two market benchmarks, so
    section 2 argued for a number it never stated. The client asked for the
    name AND the value on every one."""
    for bullet in key_argument_bullets(_all_arguments_brief()):
        assert re.search(r"^\* \*\*.+ - \d+ days\.\*\*$", bullet), bullet


def test_an_unlabelled_opening_line_is_not_eaten_by_the_argument_stamp():
    """The first real playbook after the stamp landed came back with no
    Opening Line at all.

    The model had written it as a bare bullet with no `**Opening Line**:`
    label; section 2 then filed it under Argumentation, where the stamp
    replaced it along with everything else in that run. Pre-argument prose is
    the opening line whether or not it is labelled.
    """
    brief = _all_arguments_brief()
    draft = (
        "2. Opening Position and Argumentation\n"
        "* We are standardising payment terms to Net 60 across this category.\n"
        "* **Argumentation**:\n"
        + "\n".join(key_argument_bullets(brief))
        + "\n\n3. Objections and Concessions\n* **Objections**:\n* x\n"
    )
    section = _section_2(normalize_playbook_structure(draft, brief=brief))
    assert f"* **{OPENING_LINE_LABEL}**:" in section
    assert "standardising payment terms to Net 60" in section
    # ...and it is the opening line, not an argument bullet.
    lines = [l for l in section.splitlines() if l.strip()]
    assert lines.index("* **Argumentation**:") > next(
        i for i, l in enumerate(lines) if "standardising" in l
    )


def test_with_no_benchmark_argument_the_argumentation_heading_is_removed():
    """No benchmark to argue from - the Argumentation heading and whatever
    the model put under it go, rather than a relationship line standing in
    for an argument (client, 2026-09-21). The opening line stays."""
    facts = _adp_facts(peerGroupStandard={"value": 20})
    brief = brief_from(facts)
    assert not key_argument_bullets(brief)
    draft = (
        "2. Opening Position and Argumentation\n"
        "* **Opening Line**:\n* Our treasury has mandated Net 60.\n"
        "* **Argumentation**:\n"
        "* No benchmark reaches the ask; the case rests on the relationship.\n"
        "\n3. Objections and Concessions\n* **Objections**:\n"
    )
    section = _section_2(normalize_playbook_structure(draft, brief=brief))
    assert "relationship" not in section
    assert "**Argumentation**" not in section
    assert "treasury has mandated Net 60" in section


def test_argumentation_is_only_the_four_benchmarks():
    """Client, 2026-09-21: supplierStandard, peerGroupStandard,
    parentOrSupplierMax and industryRegionStandard - never anything else."""
    from domain.services.negotiation_arguments import _ARGUMENT_BENCHMARK_NAMES
    from utils.prompts.negotiation_guide_prompt import ARGUMENTATION_SOURCES

    assert ARGUMENTATION_SOURCES == _ARGUMENT_BENCHMARK_NAMES
    brief = brief_from(_adp_facts(
        buyerStandard={"value": 80},
        peerGroupStandard={"value": 60, "occurrences": 12},
    ))
    # Buyer Standard reaches the evidence, so it would have been argued.
    assert any(a["key"] == "buyerStandard" for a in brief.evidence)
    assert key_argument_bullets(brief) == ["* **Peer Group Standard - 60 days.**"]


def test_the_stamp_removes_arguments_the_model_added():
    brief = _all_arguments_brief()
    draft = (
        "2. Opening Position and Argumentation\n"
        "* **Opening Line**:\n* Our treasury has mandated Net 60.\n"
        "* **Argumentation**:\n"
        "* **Buyer Standard - 80 days.**\n"
        "* **Supplier Financing Cost - 6.00% short-term borrowing rate**\n"
        "* **Regulatory Compliance - 30 days.**\n"
        + "\n".join(key_argument_bullets(brief))
        + "\n\n3. Objections and Concessions\n* **Objections**:\n"
    )
    section = _section_2(normalize_playbook_structure(draft, brief=brief))
    for gone in ("Buyer Standard", "Supplier Financing Cost", "Regulatory Compliance"):
        assert gone not in section, gone
    for bullet in key_argument_bullets(brief):
        assert bullet in section


def test_supplier_standard_is_pitched_in_the_playbook_with_its_figures():
    # Internal-only elsewhere, but every benchmark in the playbook gets a pitch
    # (client, 2026-09-21) - the client's wording, filled with avg / q3 / ask.
    brief = _all_arguments_brief()
    lines = _section_2(_playbook_with_arguments(brief)).splitlines()
    i = next(i for i, l in enumerate(lines) if l.startswith("* **Supplier Standard"))
    pitch = lines[i + 1]
    assert pitch.startswith(f'  * **{PITCH_LABEL}**: "As you know, we\'re reviewing')
    bench = next(b for b in brief.facts.strategy_benchmarks if b.name == "supplierStandard")
    average = bench.avg if bench.avg is not None else bench.value
    assert f"on average, these payment terms are {int(average)} days." in pitch
    assert f"we're introducing payment terms of {brief.ask} days.\"" in pitch


def test_supplier_standard_pitch_fills_and_drops_figures():
    from domain.entities.argument_catalog import render_supplier_standard_pitch
    full = render_supplier_standard_pitch(
        value_days=67, average_days=67, upper_quartile_days=79, ask_days=60
    )
    assert "on average, these payment terms are 67 days." in full
    assert "the third quartile of accepted terms is even higher at 79 days." in full
    assert full.endswith("Therefore, we're introducing payment terms of 60 days.")
    # No quartile, or one not above the average: "even higher" would be false.
    for q3 in (None, 60):
        pitch = render_supplier_standard_pitch(
            value_days=67, average_days=67, upper_quartile_days=q3, ask_days=60
        )
        assert "third quartile" not in pitch
    # The average falls back to the value; no figure at all -> no pitch.
    assert "are 70 days." in render_supplier_standard_pitch(value_days=70, ask_days=60)
    assert render_supplier_standard_pitch(value_days=None) is None


def test_pitches_are_not_doubled_or_merged_on_renormalisation():
    brief = _all_arguments_brief()
    once = _playbook_with_arguments(brief)
    twice = normalize_playbook_structure(once, brief=brief)
    assert _section_2(twice) == _section_2(once)
    # Four benchmark arguments, each pitched - Supplier Standard included
    # (client, 2026-09-21). Cost Impact is no longer in the section at all.
    assert _section_2(twice).count(PITCH_LABEL) == 4
    assert "Rationale" not in _section_2(twice)
    assert PITCH_LABEL not in twice[twice.index("4. Rationale"):]


def test_rationale_holds_only_argument_rationale():
    from domain.services.brief_builder import brief_from
    from tests.unit.prompt_fixtures import rich_facts
    block = _rationale_block(brief_from(rich_facts()))
    assert "* **Parent / Supplier Max**: This supplier has already accepted" in block
    for absent in (
        "Success probability", "**Buyer leverage", "DSO Alignment", "Pitch",
        "Why the target", "There is market evidence", "BATNA",
        "Financial sensitivity", "Mandatory Treasury", "Relationship Alignment",
        "WACC", "0.09",
    ):
        assert absent not in block, absent
    assert all(line.startswith("* **") for line in block.splitlines())


def test_rationale_says_so_when_no_argument_is_cited():
    facts = extract_supplier_facts({
        "supplier": {"name": "Adp, Inc", "country": "United States"},
        "target": {"targetPaymentTerms": 60},
        "spend": {"contractualPaymentTermsWithoutCashDiscount": 45},
        "negotiationStrategy": {"peerGroupStandard": {"value": 40}},
    })
    brief = brief_from(facts)
    assert key_argument_bullets(brief) == []
    assert _rationale_block(brief) == NO_RATIONALE_LINE


def test_rationale_translates_benchmark_statistics_not_the_evidence_sentence():
    block = _rationale_block(brief_from(_adp_facts()))
    assert "Why the target" not in block
    assert "There is market evidence" not in block
    # Client wording (2026-09-21): average and 3rd quartile, then the
    # definition - no sample size.
    assert (
        "* **Supplier Standard**: The supplier is accepting on average 67 days "
        "and 79 days (3rd quartile). The Supplier Standard shows what identical "
        "suppliers (companies sharing over 95% of the same characteristics and "
        "attributes) on the Platform are accepting."
    ) in block
    assert "16 observed" not in block
    assert "Financial sensitivity" not in block


def test_rationale_single_statistic_uses_its_own_sentence():
    block = _rationale_block(brief_from(_adp_facts(
        peerGroupStandard={"value": 90, "occurrences": 12},
    )))
    assert (
        "* **Peer Group Standard**: This benchmark is supported by 12 comparable "
        "observations, providing evidence that this payment-term behavior is "
        "seen across multiple comparable cases."
    ) in block


def test_rationale_single_average_and_single_quartile_sentences():
    block = _rationale_block(brief_from(_adp_facts(
        peerGroupStandard={"value": 90, "avg": 72},
        industryRegionStandard={"value": 91, "q3": 95},
    )))
    assert (
        "* **Peer Group Standard**: Comparable suppliers have an average payment "
        "term of 72 days, showing the payment terms peers already work with."
    ) in block
    assert (
        "* **Industry Region Standard**: The upper quartile reaches 95 days, showing that "
        "longer payment terms are already observed among our suppliers in this "
        "industry and region."
    ) in block
    assert "n=" not in block


def test_rationale_without_sample_size_leads_with_the_average():
    block = _rationale_block(brief_from(_adp_facts(
        peerGroupStandard={"value": 90, "avg": 72.5, "q3": 88},
    )))
    assert (
        "* **Peer Group Standard**: Comparable suppliers have an average payment "
        "term of 72.5 days, with an upper quartile of 88 days."
    ) in block


def test_rationale_value_only_benchmark_explains_the_day_figure():
    block = _rationale_block(brief_from(_adp_facts(
        peerGroupStandard={"value": 90},
    )))
    assert (
        "* **Peer Group Standard**: Comparable suppliers serving similar customers "
        "are at 90 days"
    ) in block


def test_rationale_relationship_precedent_stays_inside_our_relationship():
    block = _rationale_block(brief_from(_adp_facts(
        parentOrSupplierMax={"value": 75},
    )))
    line = next(
        l for l in block.splitlines() if "Parent / Supplier Max" in l
    )
    assert "within our relationship" in line
    assert "other buyers" not in line


def _argument_titles(lines):
    return [
        re.match(r"\* \*\*(.+?)(?: - [^*]+)?(?:\.\*\*|\*\*:)", line).group(1)
        for line in lines
    ]


def test_rationale_gives_the_why_for_every_argumentation_argument():
    """The one-way rule: no argument may be made in section 2 without its why
    in section 4. The reverse does not hold - Cost Impact is section 4 only
    (client, 2026-09-18), so the rationale is a superset, not a mirror."""
    facts = _adp_facts(
        buyerStandard={"value": 80},
        supplierStandard={"value": 67, "occurrences": 16, "avg": 67, "q3": 79},
        parentOrSupplierMax={"value": 75},
        peerGroupStandard={"value": 60, "occurrences": 12, "avg": 58},
        industryRegionStandard={"value": 61},
    )
    brief = brief_from(facts)
    argumentation = _argument_titles(key_argument_bullets(brief))
    rationale = _argument_titles(_rationale_block(brief).splitlines())
    # Buyer Standard (80) supports the ask but is not one of the four.
    assert argumentation == [
        "Supplier Standard", "Parent / Supplier Max",
        "Peer Group Standard", "Industry Region Standard",
    ]
    missing = [title for title in argumentation if title not in rationale]
    assert not missing, missing
    # ...and the order the two sections share is the same order.
    assert [t for t in rationale if t in argumentation] == argumentation
    # Cost Impact is the one that is here and NOT in Argumentation.
    assert "Cost Impact" in rationale
    assert "Cost Impact" not in argumentation


def test_every_argument_benchmark_has_rationale_wording():
    from domain.entities.argument_catalog import (
        ARGUMENT_CATALOG,
        BenchmarkRationaleWording,
        CostImpactRationaleWording,
    )
    from domain.services.negotiation_arguments import _ARGUMENT_BENCHMARK_NAMES
    for name in _ARGUMENT_BENCHMARK_NAMES:
        assert isinstance(ARGUMENT_CATALOG[name].rationale, BenchmarkRationaleWording)
    assert isinstance(ARGUMENT_CATALOG["costImpact"].rationale, CostImpactRationaleWording)


def _regulatory_facts(**kw):
    from dataclasses import replace
    return replace(
        _adp_facts(),
        regulatory_max_term_days=30,
        regulatory_enforced=False,
        regulatory_applied=False,
        regulatory_limit_type="NONE",
        **kw,
    )


def test_regulatory_compliance_is_never_an_argumentation_argument():
    """Client, 2026-09-21: section 2 argues the four benchmarks and nothing
    else. Regulatory Compliance used to join them below the ask - and its why
    left section 4 with it."""
    brief = brief_from(_regulatory_facts())
    assert not any("Regulatory Compliance" in b for b in key_argument_bullets(brief))
    playbook = _playbook_with_arguments(brief)
    assert "Regulatory Compliance" not in playbook
    assert "Regulatory Compliance" not in _rationale_block(brief)


def test_regulatory_compliance_never_argued_for_a_statutory_or_applied_cap():
    for kw in ({"regulatory_enforced": True}, {"regulatory_applied": True}):
        from dataclasses import replace
        facts = replace(_regulatory_facts(), **kw)
        assert not any(
            "Regulatory Compliance" in b for b in key_argument_bullets(brief_from(facts))
        )


def test_regulatory_compliance_not_argued_when_the_ask_is_within_it():
    from dataclasses import replace
    facts = replace(_regulatory_facts(), regulatory_max_term_days=90)
    brief = brief_from(facts)
    assert not any("Regulatory Compliance" in b for b in key_argument_bullets(brief))
    assert "Regulatory Compliance" not in _rationale_block(brief)


def test_rationale_industry_alignment_is_not_called_market_practice():
    block = _rationale_block(brief_from(_adp_facts(
        industryRegionStandard={"value": 90, "occurrences": 119, "avg": 61},
    )))
    line = next(l for l in block.splitlines() if "Industry Region Standard" in l)
    assert "our own spend for this industry and region" in line
    assert "market" not in line


def _rationale_line(block, title):
    return next(l for l in block.splitlines() if l.startswith(f"* **{title}**:"))


def test_rationale_benchmark_well_short_of_target_supports_direction_only():
    block = _rationale_block(brief_from(_adp_facts(
        peerGroupStandard={"value": 50, "occurrences": 12},
    )))
    line = _rationale_line(block, "Peer Group Standard")
    assert line.endswith(
        "At 50 days, this benchmark supports moving above the current 45-day "
        "term and strengthens the case for an extension, but it does not by "
        "itself fully support the 60-day target, because the benchmark itself "
        "remains below that level."
    )
    # Five days off the current term is not a "material" move.
    assert "materially" not in line


def test_rationale_benchmark_a_rounding_step_short_supports_the_target():
    """Checkpoint Systems (2026-09-25): 59 against a 60-day target is the target,
    and a 67-day upper quartile clears it - "rather than the full target" was
    nonsense beside a pitch that asks for 60 on this very benchmark."""
    facts = extract_supplier_facts({
        "supplier": {"name": "Checkpoint Systems, Inc", "country": "United States"},
        "target": {"targetPaymentTerms": 60},
        "spend": {"contractualPaymentTermsWithoutCashDiscount": 30},
        "negotiationStrategy": {
            "supplierStandard": {"value": 59, "occurrences": 13, "avg": 59, "q3": 67},
            "peerGroupStandard": {"value": 60, "occurrences": 103, "avg": 60, "q3": 90},
        },
    })
    block = _rationale_block(brief_from(facts))
    supplier = _rationale_line(block, "Supplier Standard")
    assert supplier.endswith(
        "At 59 days, this benchmark is effectively at the 60-day target, and its "
        "upper quartile of 67 days already goes beyond it, so it supports the "
        "target."
    )
    assert "rather than the full target" not in block
    assert "does not by itself fully support" not in block
    assert _rationale_line(block, "Peer Group Standard").endswith(
        "At 60 days, this benchmark matches the 60-day target, so it supports "
        "the full target on its own."
    )


def test_rationale_benchmark_whose_upper_quartile_reaches_the_target():
    facts = extract_supplier_facts({
        "supplier": {"name": "Adp, Inc", "country": "United States"},
        "target": {"targetPaymentTerms": 75},
        "spend": {"contractualPaymentTermsWithoutCashDiscount": 30},
        "negotiationStrategy": {
            "supplierStandard": {"value": 59, "avg": 59, "q3": 80},
            "peerGroupStandard": {"value": 55, "occurrences": 40, "avg": 55, "q3": 70},
        },
    })
    block = _rationale_block(brief_from(facts))
    assert _rationale_line(block, "Supplier Standard").endswith(
        "At 59 days, this benchmark sits below the 75-day target, but its upper "
        "quartile of 80 days goes beyond it, so the target is already within the "
        "range being accepted. It supports the target as an upper-range term "
        "rather than a typical one."
    )
    # 70 is within a rounding step of 75.
    assert "upper quartile of 70 days is effectively at it" in _rationale_line(
        block, "Peer Group Standard"
    )


def test_rationale_benchmark_whose_upper_quartile_also_falls_short():
    """The client's reference wording: an average of 59 and a 67-day upper
    quartile against a 75-day target strengthen the case, not the number."""
    facts = extract_supplier_facts({
        "supplier": {"name": "Adp, Inc", "country": "United States"},
        "target": {"targetPaymentTerms": 75},
        "spend": {"contractualPaymentTermsWithoutCashDiscount": 30},
        "negotiationStrategy": {
            "supplierStandard": {"value": 59, "occurrences": 13, "avg": 59, "q3": 67},
        },
    })
    line = _rationale_line(
        _rationale_block(brief_from(facts)), "Supplier Standard"
    )
    assert line.endswith(
        "At 59 days, this benchmark supports moving materially above the current "
        "30-day term and strengthens the case for an extension, but it does not "
        "by itself fully support the 75-day target, because even its upper "
        "quartile of 67 days remains below that level."
    )


def test_rationale_benchmark_above_target_supports_it_on_its_own():
    line = _rationale_line(
        _rationale_block(brief_from(_adp_facts())), "Supplier Standard"
    )
    assert line.endswith(
        "At 67 days, this benchmark is above the 60-day target, so it supports "
        "the full target on its own."
    )


def test_rationale_verdict_quotes_no_computed_figure():
    """A gap ("1 day short") is not a payload figure; P1 would flag it."""
    from domain.services.output_verifier import known_day_figures
    for strategy, target in (
        ({"supplierStandard": {"value": 59, "avg": 59, "q3": 67}}, 60),
        ({"supplierStandard": {"value": 59, "avg": 59, "q3": 80}}, 75),
        ({"parentOrSupplierMax": {"value": 50}}, 75),
    ):
        brief = brief_from(extract_supplier_facts({
            "supplier": {"name": "Adp, Inc", "country": "United States"},
            "target": {"targetPaymentTerms": target},
            "spend": {"contractualPaymentTermsWithoutCashDiscount": 30},
            "negotiationStrategy": strategy,
        }))
        known = known_day_figures(brief)
        figures = {
            int(m) for m in re.findall(r"\b(\d{1,3})[- ]days?\b", _rationale_block(brief))
        }
        assert figures <= known, figures - known


def test_rationale_cost_impact_explains_loss_and_share_of_spend():
    block = _rationale_block(brief_from(_adp_facts()))
    line = next(l for l in block.splitlines() if l.startswith("* **Cost Impact**:"))
    # 1,430,000 cash-flow opportunity x 7.1% WACC = 101,530; / 12.4m spend = 0.82%.
    assert "economic loss from this change is 101,530" in line
    assert "represents 0.82% of the spend volume" in line
    assert "helping quantify" in line or "helps quantify" in line
    assert "WACC" not in line
    assert "0.071" not in line


def test_normalizer_stamps_rationale_from_the_brief():
    text = normalize_playbook_structure(
        "1. Target and BATNA\n* **BATNA**: 45 days **(No BATNA)**\n"
        "2. Opening Position and Argumentation\nx\n"
        "3. Objections and Concessions\ny\n"
        "4. Rationale\n"
        "* **Financial sensitivity to delay**: low - skip this.\n"
        "* **Success probability**: high\n"
        "* **Supplier Standard - 67 days.** There is market evidence.\n",
        brief=brief_from(_adp_facts()),
    )
    rationale = text[text.index("4. Rationale"):]
    assert "Why the target" not in rationale
    assert "There is market evidence" not in rationale
    assert "* **Supplier Standard**: The supplier is accepting on average 67" in rationale
    assert "Financial sensitivity" not in rationale
    assert "Success probability" not in rationale
    assert "Buyer leverage" not in rationale


def test_normalizer_appends_rationale_when_model_omits_it():
    text = normalize_playbook_structure(
        "1. Target and BATNA\n* **No BATNA.**\n"
        "2. Opening Position and Argumentation\nx\n"
        "3. Objections and Concessions\ny\n",
        brief=brief_from(_adp_facts()),
    )
    assert "4. Rationale" in text
    assert "* **Supplier Standard**: The supplier is accepting on average 67" in text
    assert "Success probability" not in text


def test_target_and_batna_block_has_no_relationship_alignment():
    from tests.unit.prompt_fixtures import rich_facts
    block = _target_and_batna_block(rich_facts())
    assert "TARGET AND BATNA" in block
    assert "Contractual Terms" in block
    assert "* **Relationship Alignment**:" not in block
    assert "Relationship Alignment\n" not in block
    targets = [line for line in block.splitlines() if line.startswith("* **Target**:")]
    assert len(targets) == 1
    assert "payment term increase" in targets[0]


def test_no_batna_is_just_no_batna():
    block = _target_and_batna_block(_adp_facts())
    batna = next(
        line
        for line in block.splitlines()
        if line.startswith("* **BATNA**:") or line.startswith("* **No BATNA.")
    )
    assert batna == "* **No BATNA.**"
    assert "There is no BATNA" not in block
    assert "no concession room" not in block
    assert "**BATNA**: 45 days" not in block


def test_normalizer_folds_the_long_no_batna_note_to_no_batna():
    text = normalize_playbook_structure(
        "1. Target and BATNA\n"
        "* **BATNA**: 45 days\n"
        "* There is no BATNA — a 25% reduction off the 60-day target "
        "lands at the current 45-day terms, so there is no concession "
        "room below what we already pay.\n"
        "2. Opening Position and Argumentation\nx\n"
        "3. Objections and Concessions\ny\n"
        "4. Rationale\nz"
    )
    assert "* **No BATNA.**" in text
    assert "**BATNA**: 45 days" not in text
    assert "no concession room" not in text


def test_normalizer_drops_batna_days_when_followed_by_no_batna():
    text = normalize_playbook_structure(
        "1. Target and BATNA\n"
        "* **BATNA**: 90 days\n"
        "* **No BATNA.**\n"
        "2. Opening Position and Argumentation\nx\n"
        "3. Objections and Concessions\ny\n"
        "4. Rationale\nz"
    )
    assert "* **No BATNA.**" in text
    assert "**BATNA**: 90 days" not in text


def test_section_1_bolds_only_labels_even_when_the_model_bolds_the_line():
    brief = brief_from(_adp_facts(peerGroupStandard={"value": 90}))
    text = normalize_playbook_structure(
        "1. Target and BATNA\n"
        "* **Contractual Terms: 45 days**\n"
        "* **Target: 60 days (payment term increase of 15 days)**\n"
        "* **BATNA: 45 days**\n\n"
        "2. Opening Position and Argumentation\nx\n"
        "3. Objections and Concessions\ny\n",
        brief=brief,
    )
    section = text[text.index("1. Target and BATNA"):text.index("2. Opening")]
    bullets = [l for l in section.splitlines() if l.startswith("* ")]
    assert bullets[:2] == [
        "* **Contractual Terms**: 45 days",
        "* **Target**: 60 days (payment term increase of 15 days)",
    ]
    for line in bullets:
        # Exactly one bold span per bullet, and it is the label.
        assert line.count("**") == 2, line
        assert re.match(r"^\* \*\*[^*]+(?:[:.]\*\*|\*\*:)", line), line


def test_opening_line_is_in_double_quotes_once():
    brief = brief_from(_adp_facts())
    draft = (
        "1. Target and BATNA\nx\n"
        "2. Opening Position and Argumentation\n* **Opening Line**\n"
        "* “Our global treasury board has mandated Net 60.”\n"
        "* **Argumentation**\n" + "\n".join(key_argument_bullets(brief)) + "\n"
        "3. Objections and Concessions\ny\n"
    )
    once = normalize_playbook_structure(draft, brief=brief)
    twice = normalize_playbook_structure(once, brief=brief)
    for text in (once, twice):
        assert '* "Our global treasury board has mandated Net 60."' in text
        assert "“" not in text and '""' not in text


def test_target_and_batna_block_value_is_not_bold():
    block = _target_and_batna_block(_adp_facts())
    assert "* **Target**: 60 days (payment term increase of 15 days)" in block


def test_normalizer_drops_the_bare_target_above_batna():
    text = normalize_playbook_structure(
        "1. Target and BATNA\n"
        "* **Contractual Terms**: 45 days\n"
        "* **Target**: 60 days **(payment term increase of 15 days)**\n"
        "* **Target**: 60 days\n"
        "* **BATNA**: 45 days\n"
        "2. Opening Position and Argumentation\nx\n"
        "3. Objections and Concessions\ny\n"
        "4. Rationale\nz"
    )
    targets = [line for line in text.splitlines() if "**Target**:" in line]
    assert targets == ["* **Target**: 60 days **(payment term increase of 15 days)**"]


def test_unbulleted_opening_arguments_become_bullets():
    bullets = _key_arguments(
        "**Supplier Standard - 67 days.** There is market evidence.\n"
        "**Cost Impact - 0.52% of invoice value.** The cost impact is 0.52%.\n"
        '* **Opening Line**: "Net 60 across all vendor categories."'
    )
    assert any(b.startswith("* **Supplier Standard") for b in bullets)
    assert any(b.startswith("* **Cost Impact") for b in bullets)
    assert "* **Opening Line**:" in bullets
    assert any("Net 60 across all vendor categories." in b for b in bullets)
    assert "* **Argumentation**:" in bullets
    assert bullets.index("* **Opening Line**:") < bullets.index("* **Argumentation**:")
    assert len(bullets) == 5


def test_section_three_categorizes_objections_and_concessions():
    text = normalize_playbook_structure(
        "1. Target and BATNA\n* **BATNA**: 75 days\n"
        "2. Opening Position and Argumentation\n"
        '* **Opening Line**: "Net 60."\n'
        "* **Supplier Standard - 67 days.** Evidence.\n"
        "3. Objections and Concessions\n"
        '* "This will hurt our cash flow."\n'
        "  * **Counter**: The cost is 0.5%.\n"
        "* **A. Multi-Phase Transition - Offer**: Phase the rollout.\n"
        "4. Rationale\nz"
    )
    section = text[text.index("3. Objections and Concessions") : text.index("4. Rationale")]
    assert "* **Objections**:" in section
    assert "* **Concessions**:" in section
    assert section.index("* **Objections**") < section.index("cash flow")
    assert section.index("* **Concessions**") < section.index("Offer**:")


def test_colon_style_opening_line_heading_is_kept_and_idempotent():
    # `* **Opening Line**:` (the colon style the prompt asks for) was parsed as a
    # label with an empty body and dropped - the treasury line then sat under
    # Argumentation.
    draft = (
        "2. Opening Position and Argumentation\n* **Opening Line**:\n"
        "* Our treasury has mandated Net 60.\n* **Argumentation**:\n"
        "* **Peer Group Standard.** x\n\n"
        "3. Objections and Concessions\n* **Objections**:\n* y\n"
    )
    once = normalize_playbook_structure(draft)
    section = _section_2(once).splitlines()
    assert section[2:5] == [
        "* **Opening Line**:",
        '* "Our treasury has mandated Net 60."',
        "* **Argumentation**:",
    ]
    assert normalize_playbook_structure(once) == once


def _leverage_brief(level):
    from dataclasses import replace
    return brief_from(replace(
        _adp_facts(peerGroupStandard={"value": 60, "occurrences": 12}),
        buyer_leverage_level=level,
    ))


def test_relationship_is_argued_only_at_high_buyer_leverage():
    """Client, 2026-09-21: the one argument besides the four benchmarks."""
    assert "* **Client-Supplier Relationship.**" in key_argument_bullets(
        _leverage_brief("HIGH")
    )
    for level in ("medium", "low", None):
        bullets = key_argument_bullets(_leverage_brief(level))
        assert not any("Relationship" in b for b in bullets), level


def test_relationship_is_pitched_and_explained_through_high_leverage():
    from domain.entities.argument_catalog import ARGUMENT_CATALOG, RELATIONSHIP_RATIONALE
    brief = _leverage_brief("high")
    playbook = _playbook_with_arguments(brief)
    lines = _section_2(playbook).splitlines()
    i = lines.index("* **Client-Supplier Relationship.**")
    assert lines[i + 1] == (
        f'  * **{PITCH_LABEL}**: "{ARGUMENT_CATALOG["relationship"].supplier_pitch}"'
    )
    assert "Buyer leverage over this supplier is high" in RELATIONSHIP_RATIONALE
    assert f"* **Client-Supplier Relationship**: {RELATIONSHIP_RATIONALE}" in playbook
    # Not explained when not argued.
    assert "Client-Supplier Relationship" not in _rationale_block(_leverage_brief("medium"))
