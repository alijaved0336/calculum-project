"""Unit tests for agents.nodes.follow_up_generator.generate_follow_ups.

Covers: grounding in the current exchange, conversation history threading
(first message vs. mid-conversation, capped/truncated), simple-intent bypass,
fallback on timeout/parse failure, the meta-clarify backstop, and the
`blocked_by` backstop (no_opportunity/scf_blocked short-circuits, see
agents.state.blocked_by). All pure/deterministic — the LLM is faked.
"""
from __future__ import annotations

from typing import Any

import pytest

import utils.prompts.follow_up_suggestions_prompt as follow_up_prompts
from agents.nodes.follow_up_generator import generate_follow_ups
from utils.prompts.follow_up_suggestions_prompt import (
    build_follow_up_prompt,
    canonicalise_follow_ups,
    get_blocked_fallback_follow_ups,
    get_fallback_follow_ups,
    strip_meta_clarify_follow_ups,
    strip_out_of_scope_follow_ups,
    strip_repeated_follow_ups,
    strip_unavailable_follow_ups,
    strip_playbook_day_count_follow_ups,
    strip_unbacked_follow_ups,
)


def test_known_figures_survive_prose_truncation() -> None:
    """A playbook is thousands of characters; the prose gets cut to 600 chars
    before it reaches the model, but the exact figures used to build it must
    still show up in the prompt via the `source` dict, untruncated."""
    long_playbook = "Opening Position\n" + ("filler " * 300) + "\nTarget Outcome: see below"
    source = {
        "target_term_days": {"path": "target.targetPaymentTerms", "value": 90},
        "current_term_days": {"path": "supplier.currentPaymentTerms", "value": 75},
        "batna_term_days": {"path": "computed.batna", "value": 80},
    }
    prompt = build_follow_up_prompt("generate a playbook", long_playbook, "generate_negotiation_playbook", source=source)
    assert "target_term_days=90" in prompt
    assert "current_term_days=75" in prompt
    assert "batna_term_days=80" in prompt


def test_known_figures_omitted_when_source_absent() -> None:
    prompt = build_follow_up_prompt("hi", "some response", "summarize_supplier_position")
    assert "Known figures" not in prompt


def test_strip_meta_clarify_follow_ups_drops_and_backfills() -> None:
    items = [
        "Clarify if 75 days means extend or set",
        "Run scenario for 75 day extension",
        "Ask for clarification on term meaning",
    ]
    out = strip_meta_clarify_follow_ups(items, intent_value="run_scenario")
    assert len(out) == 3
    assert "Clarify if 75 days means extend or set" not in out
    assert "Ask for clarification on term meaning" not in out
    assert "Run scenario for 75 day extension" in out


def test_strip_meta_clarify_follow_ups_noop_when_clean() -> None:
    items = ["Extend the term by 75 days", "Set the term to 75 days", "Handle likely pushback"]
    assert strip_meta_clarify_follow_ups(items, intent_value="run_scenario") == items


class _FakeLLM:
    """Returns a preset completion and records the last prompt/system seen."""

    def __init__(self, response: str) -> None:
        self._response = response
        self.last_prompt: str | None = None
        self.last_system: str | None = None

    async def complete(self, prompt: str, **kwargs: Any) -> str:
        self.last_prompt = prompt
        self.last_system = kwargs.get("system")
        return self._response


_VALID_JSON = '["Handle if supplier rejects 60 days", "Add SCF option", "Draft email with these terms"]'


@pytest.mark.asyncio
async def test_first_message_has_no_history_block() -> None:
    """No prior history (first message in a thread) — prompt omits the block."""
    llm = _FakeLLM(_VALID_JSON)
    result = await generate_follow_ups(
        llm, "Hello, what's our position?", "Here is the position...", "summarize_supplier_position", None
    )
    assert result == [
        "Handle if supplier rejects 60 days",
        "Add SCF option",
        "Draft email with these terms",
    ]
    assert "RECENT CONVERSATION" not in (llm.last_prompt or "")


@pytest.mark.asyncio
async def test_mid_conversation_includes_capped_history() -> None:
    """History present — prompt includes a RECENT CONVERSATION block, capped."""
    llm = _FakeLLM(_VALID_JSON)
    history = [
        {"role": "user", "content": f"turn {i}"} for i in range(12)
    ]
    await generate_follow_ups(
        llm, "What about their counter?", "Their counter is 45 days.", "evaluate_counter_offer", history
    )
    assert "RECENT CONVERSATION" in (llm.last_prompt or "")
    # Only the last 10 entries (5 exchange-turns) should appear.
    assert "turn 0" not in llm.last_prompt
    assert "turn 11" in llm.last_prompt


@pytest.mark.asyncio
async def test_simple_intent_bypasses_llm() -> None:
    llm = _FakeLLM(_VALID_JSON)
    result = await generate_follow_ups(llm, "hi", "", "greeting", None)
    assert result == get_fallback_follow_ups("greeting")
    assert llm.last_prompt is None


@pytest.mark.asyncio
async def test_falls_back_on_unparseable_response() -> None:
    llm = _FakeLLM("not json at all")
    result = await generate_follow_ups(
        llm, "Should I accept their counter?", "Their counter is...", "evaluate_counter_offer", None
    )
    assert result == get_fallback_follow_ups("evaluate_counter_offer")


@pytest.mark.asyncio
async def test_meta_clarify_chips_are_stripped_and_backfilled() -> None:
    """Chips that restate the question (not answer it) never reach the client.

    Mirrors the exact screenshot regression: a clarifying-question response
    where the model leaked "Clarify if..."/"Ask for clarification..." chips
    alongside real answers.
    """
    leaked = (
        '["Clarify if 75 days means extend or set", '
        '"Extend the term to 75 days", '
        '"Set the term to 75 days"]'
    )
    llm = _FakeLLM(leaked)
    assistant_response = (
        'Quick check so I model the right thing: by "75 days" do you mean '
        "**extend the term by 75 days (90 → 165 days)**, or **set the term to 75 days "
        "(unchanged from today)**? Let me know which and I'll proceed."
    )
    result = await generate_follow_ups(
        llm, "Their 75-day counter", assistant_response, "evaluate_counter_offer", None
    )
    assert len(result) == 3
    for item in result:
        assert not item.lower().startswith("clarify"), item
        assert "ask for clarification" not in item.lower(), item
    # The genuine answers survive the backstop.
    assert "Extend the term to 75 days" in result
    assert "Set the term to 75 days" in result


@pytest.mark.asyncio
async def test_respects_custom_timeout_and_falls_back() -> None:
    class _SlowLLM:
        async def complete(self, prompt: str, **kwargs: Any) -> str:
            import asyncio

            await asyncio.sleep(0.05)
            return _VALID_JSON

    result = await generate_follow_ups(
        _SlowLLM(), "msg", "response", "evaluate_counter_offer", None, timeout=0.01
    )
    assert result == get_fallback_follow_ups("evaluate_counter_offer")


# ── blocked_by backstop (no_opportunity/scf_blocked short-circuits) ─────────


@pytest.mark.asyncio
async def test_blocked_turn_strips_gated_suggestions_and_backfills() -> None:
    """The LLM ignores the "negotiation is closed" instruction and re-suggests
    a playbook anyway — the deterministic backstop must still catch it."""
    raw = '["Generate negotiation playbook", "Draft email closing the topic", "Check other suppliers"]'
    llm = _FakeLLM(raw)
    result = await generate_follow_ups(
        llm, "generate a playbook", "There is nothing to negotiate...",
        "generate_negotiation_playbook", None, blocked_by="no_extension",
    )
    assert len(result) == 3
    assert not any("playbook" in s.lower() for s in result)


# ── opportunity backstop (never suggest a draft/strategy action the graph ──
# ── would refuse, even on an ungated turn like run_scenario) ────────────────


def test_no_opportunity_strips_unactionable_day_count_and_backfills() -> None:
    """The exact production regression: a scenario turn (never gated, so
    blocked_by=None) suggests drafting an email for a day-count that has no
    stored ask behind it — must be caught even without a literal capability
    label like "opening email" in the text."""
    items = [
        "Draft email to Flextronics requesting 120 days",
        "Run scenario: extend to 90 days",
        "Handle if supplier rejects 90 days",
    ]
    out = strip_unavailable_follow_ups(
        items, blocked_by=None, has_opportunity=False, current_term_days=90,
    )
    assert len(out) == 3
    assert not any("120 days" in s for s in out)
    # A scenario what-if (no drafting/strategy verb) survives untouched.
    assert "Run scenario: extend to 90 days" in out
    # A drafting/strategy verb paired with the CURRENT term (not a mismatch) survives.
    assert "Handle if supplier rejects 90 days" in out


def test_no_opportunity_still_strips_literal_capability_labels() -> None:
    """Capability-label matching (e.g. "playbook") still applies even without
    blocked_by, since has_opportunity=False alone is enough to gate it."""
    items = ["Generate negotiation playbook", "Run scenario: extend to 90 days", "Check other suppliers"]
    out = strip_unavailable_follow_ups(items, blocked_by=None, has_opportunity=False, current_term_days=90)
    assert len(out) == 3
    assert not any("playbook" in s.lower() for s in out)


def test_has_opportunity_true_is_a_noop() -> None:
    items = ["Draft email requesting 120 days", "Generate negotiation playbook", "Handle pushback"]
    assert strip_unavailable_follow_ups(items, blocked_by=None, has_opportunity=True) == items


def test_scf_disabled_blocked_by_skips_day_count_check() -> None:
    """scf_disabled is about SCF availability, not a term-day mismatch — the
    day-count heuristic must not fire there (would be irrelevant noise)."""
    items = ["Reframe with financing at 90 days", "Summarize supplier position instead", "Ask about non-SCF options"]
    out = strip_unavailable_follow_ups(items, blocked_by="scf_disabled", has_opportunity=True)
    assert len(out) == 3
    # Dropped for the capability-label match ("financing"), not the day-count check.
    assert not any("financing" in s.lower() for s in out)


@pytest.mark.asyncio
async def test_generate_follow_ups_drops_unactionable_draft_when_no_opportunity() -> None:
    """End-to-end: an ungated run_scenario turn with has_opportunity=False must
    not surface a drafting suggestion for the scenario's day-count."""
    raw = (
        '["Draft email to Flextronics requesting 120 days", '
        '"Run scenario: extend to 90 days", '
        '"Check benchmarks for other suppliers"]'
    )
    llm = _FakeLLM(raw)
    result = await generate_follow_ups(
        llm, "run scenario: extend to 120 days", "Extending to 120 days requires human review...",
        "run_scenario", None, has_opportunity=False, current_term_days=90,
    )
    assert len(result) == 3
    assert not any("120 days" in s for s in result)
    assert "no stored ask above the current payment terms" in (llm.last_prompt or "").lower()


@pytest.mark.asyncio
async def test_generate_follow_ups_fallback_respects_no_opportunity() -> None:
    """On LLM failure with has_opportunity=False, the fallback list itself
    must not be the intent-keyed one (which assumes a real strategy exists)."""
    class _FailingLLM:
        async def complete(self, prompt: str, **kwargs) -> str:
            raise RuntimeError("boom")

    result = await generate_follow_ups(
        _FailingLLM(), "run scenario: extend to 120 days", "...",
        "run_scenario", None, has_opportunity=False,
    )
    assert result == get_blocked_fallback_follow_ups("no_extension")


# ── unbacked follow-up backstop (no real capability behind the suggestion) ──


def test_strip_unbacked_follow_ups_drops_contract_levers() -> None:
    """Exact production regression: no node in this system handles non-
    payment-term contract levers — clicking it would hit out_of_scope/unclear."""
    items = ["Review non-term contract levers", "Draft email closing the topic", "Summarize supplier position"]
    out = strip_unbacked_follow_ups(items, intent_value="answer_data_question")
    assert len(out) == 3
    assert "Review non-term contract levers" not in out


def test_strip_unbacked_follow_ups_drops_cross_supplier() -> None:
    """Cross-supplier comparisons route to out_of_scope per the intent
    classifier's own rules — seen hallucinated by the model in production."""
    items = ["Check other suppliers for better terms", "Draft email with these terms", "Handle likely pushback"]
    out = strip_unbacked_follow_ups(items, intent_value="run_scenario")
    assert len(out) == 3
    assert not any("other supplier" in s.lower() for s in out)


def test_strip_unbacked_follow_ups_noop_when_clean() -> None:
    items = ["Draft opening email", "Run scenario: extend to 90 days", "Generate negotiation playbook"]
    assert strip_unbacked_follow_ups(items, intent_value="run_scenario") == items


def test_strip_playbook_day_count_follow_ups_drops_and_backfills() -> None:
    """Generating a playbook takes no day-count parameter — 'Generate playbook
    for 60 days' must never reach the negotiator, matching or not."""
    items = ["Generate playbook for 60 days", "Draft opening email", "Handle likely pushback"]
    out = strip_playbook_day_count_follow_ups(items, intent_value="generate_negotiation_playbook")
    assert len(out) == 3
    assert not any("playbook" in s.lower() and "day" in s.lower() for s in out)


def test_strip_playbook_day_count_follow_ups_noop_when_clean() -> None:
    items = ["Generate negotiation playbook", "Handle likely pushback", "Recommend opening strategy"]
    assert strip_playbook_day_count_follow_ups(items, intent_value="generate_negotiation_playbook") == items


def test_no_fallback_list_contains_an_unbacked_suggestion() -> None:
    """Regression guard: every STATIC fallback string (used whenever the LLM
    is unreachable/unparseable — no backstop chain runs on these) must itself
    already be backed by a real capability, so an editor adding a new static
    fallback string can't silently reintroduce this class of bug."""
    all_fallbacks = [
        *follow_up_prompts._DEFAULT_FALLBACK,
        *(s for lst in follow_up_prompts._FALLBACK_BY_INTENT.values() for s in lst),
        *(s for lst in follow_up_prompts._FALLBACK_WHEN_BLOCKED.values() for s in lst),
    ]
    offenders = [s for s in all_fallbacks if follow_up_prompts._UNBACKED_RE.search(s)]
    assert offenders == []


def test_no_fallback_list_contains_a_scenario_suggestion() -> None:
    """Same guard as above, for the scenario backstop: running a scenario is
    a product decision to never offer as a follow-up (see
    strip_scenario_follow_ups), so no static fallback can reintroduce it."""
    all_fallbacks = [
        *follow_up_prompts._DEFAULT_FALLBACK,
        *(s for lst in follow_up_prompts._FALLBACK_BY_INTENT.values() for s in lst),
        *(s for lst in follow_up_prompts._FALLBACK_WHEN_BLOCKED.values() for s in lst),
    ]
    offenders = [s for s in all_fallbacks if follow_up_prompts._SCENARIO_RE.search(s)]
    assert offenders == []


# ── scenario follow-up backstop (never offer "run a scenario" as a chip) ────


def test_strip_scenario_follow_ups_drops_and_backfills() -> None:
    items = ["Run scenario: extend to 90 days", "Generate negotiation playbook", "Handle likely pushback"]
    out = follow_up_prompts.strip_scenario_follow_ups(items, intent_value="run_scenario")
    assert len(out) == 3
    assert not any("scenario" in s.lower() for s in out)


def test_strip_scenario_follow_ups_noop_when_clean() -> None:
    items = ["Generate negotiation playbook", "Handle likely pushback", "Recommend opening strategy"]
    assert follow_up_prompts.strip_scenario_follow_ups(items, intent_value="run_scenario") == items


@pytest.mark.asyncio
async def test_generate_follow_ups_never_surfaces_a_scenario_chip() -> None:
    """End-to-end: a leaked scenario suggestion from the LLM never reaches the client."""
    raw = '["Run scenario: extend to 90 days", "Generate negotiation playbook", "Handle likely pushback"]'
    llm = _FakeLLM(raw)
    result = await generate_follow_ups(
        llm, "what if we extend to 90 days", "Extending to 90 days would...", "answer_data_question", None,
    )
    assert len(result) == 3
    assert not any("scenario" in s.lower() for s in result)


# ── repeated follow-up backstop (dedup against last turn) ───────────────────


def test_strip_repeated_follow_ups_drops_and_backfills() -> None:
    items = [
        "Draft email confirming 90 day terms",
        "Check other suppliers for better terms",
        "Review Flextronics Manufacturing Juarez profile",
    ]
    out = strip_repeated_follow_ups(
        items, previous_follow_ups=["Draft email confirming 90 day terms"], intent_value="answer_data_question"
    )
    assert len(out) == 3
    assert "Draft email confirming 90 day terms" not in out
    assert "Check other suppliers for better terms" in out
    assert "Review Flextronics Manufacturing Juarez profile" in out


def test_strip_repeated_follow_ups_backfill_does_not_reintroduce_previous() -> None:
    # handle_supplier_pushback's own fallback list starts with "Hold firm on
    # proposed terms" — if that's exactly what was just stripped for
    # repeating the previous turn, backfill must not silently put it back.
    items = [
        "Hold firm on proposed terms",
        "Draft email citing 83 day standard",
        "Refine email to highlight 83 day standard",
    ]
    out = strip_repeated_follow_ups(
        items,
        previous_follow_ups=[
            "Refine email to highlight 0.34% spend impact",
            "Draft email proposing 90 day payment terms",
            "Hold firm on proposed terms",
        ],
        intent_value="handle_supplier_pushback",
    )
    assert len(out) == 3
    assert "Hold firm on proposed terms" not in out


def test_strip_repeated_follow_ups_noop_when_no_previous() -> None:
    items = ["Extend the term by 75 days", "Set the term to 75 days", "Handle likely pushback"]
    assert strip_repeated_follow_ups(items, previous_follow_ups=None, intent_value="run_scenario") == items


def test_build_follow_up_prompt_includes_previous_follow_ups() -> None:
    prompt = build_follow_up_prompt(
        "hi", "some response", "summarize_supplier_position",
        previous_follow_ups=["Generate negotiation playbook"],
    )
    assert "do not repeat" in prompt.lower()
    assert "Generate negotiation playbook" in prompt


def test_build_follow_up_prompt_omits_previous_follow_ups_when_absent() -> None:
    prompt = build_follow_up_prompt("hi", "some response", "summarize_supplier_position")
    assert "do not repeat" not in prompt.lower()


@pytest.mark.asyncio
async def test_generate_follow_ups_drops_repeat_of_previous_turn() -> None:
    """The LLM leaks a repeat of last turn's chip; the backstop must catch it."""
    raw = (
        '["Draft email confirming 90 day terms", '
        '"Check other suppliers for better terms", '
        '"Review Flextronics Manufacturing Juarez profile"]'
    )
    llm = _FakeLLM(raw)
    result = await generate_follow_ups(
        llm, "draft email confirming 90 day terms", "There is no improvement opportunity here...",
        "answer_data_question", None,
        previous_follow_ups=["Draft email confirming 90 day terms"],
    )
    assert len(result) == 3
    assert "Draft email confirming 90 day terms" not in result
    assert "already suggested last turn" in (llm.last_prompt or "").lower()


@pytest.mark.asyncio
async def test_blocked_turn_falls_back_cleanly_on_llm_failure() -> None:
    class _FailingLLM:
        async def complete(self, prompt: str, **kwargs: Any) -> str:
            raise RuntimeError("boom")

    result = await generate_follow_ups(
        _FailingLLM(), "generate a playbook", "There is nothing to negotiate...",
        "generate_negotiation_playbook", None, blocked_by="no_extension",
    )
    assert len(result) == 3
    assert not any("playbook" in s.lower() for s in result)


# ── fixed curated chip sets (domain.services.follow_up_policy) ──────────────


class _MustNotCallLLM:
    async def complete(self, prompt: str, **kwargs: Any) -> str:
        raise AssertionError("fixed follow-up path must not call the LLM")


@pytest.mark.asyncio
async def test_fixed_topic_returns_curated_set_without_llm_call() -> None:
    result = await generate_follow_ups(
        _MustNotCallLLM(), "Generate negotiation playbook.", "# Negotiation Playbook ...",
        "generate_negotiation_playbook", None,
    )
    assert result == [
        "Recommend negotiation arguments.",
        "Provide summary of payment terms opportunity.",
        "Prepare potential push backs.",
        "Show key facts about the supplier.",
    ]


@pytest.mark.asyncio
async def test_fixed_set_ignores_previous_follow_ups_dedup() -> None:
    """Fixed sets intentionally repeat across turns — the LLM-path dedup
    against last turn's chips must not touch them."""
    playbook_set = [
        "Recommend negotiation arguments.",
        "Provide summary of payment terms opportunity.",
        "Prepare potential push backs.",
        "Show key facts about the supplier.",
    ]
    result = await generate_follow_ups(
        _MustNotCallLLM(), "generate a playbook please", "# Playbook", "generate_negotiation_playbook", None,
        previous_follow_ups=playbook_set,
    )
    assert result == playbook_set


@pytest.mark.asyncio
async def test_fixed_set_keeps_tone_chip() -> None:
    """The email set contains "...collaborative tone." — the LLM-path tone
    backstop would strip it, so the fixed path must bypass that backstop."""
    result = await generate_follow_ups(
        _MustNotCallLLM(), "Draft email for payment term optimization.", "Subject: ...",
        "draft_email", None,
    )
    assert "Write another email version with a more negotiable, collaborative tone." in result
    assert len(result) == 5


@pytest.mark.asyncio
async def test_fixed_set_drops_scf_chip_when_not_offerable() -> None:
    result = await generate_follow_ups(
        _MustNotCallLLM(), "draft an opening email", "Subject: ...", "draft_email", None,
        scf_offerable=False,
    )
    assert "Write another email version with Supply Chain Finance." not in result
    assert len(result) == 4


@pytest.mark.asyncio
async def test_fixed_set_used_for_term_impact() -> None:
    result = await generate_follow_ups(
        _MustNotCallLLM(), "what is the impact on supplier if i increase my payment terms by 20 days",
        "Extending by 20 days unlocks ...", "run_scenario", None,
    )
    assert result == ["Draft opening email", "Handle supplier pushback", "Generate negotiation playbook"]


@pytest.mark.asyncio
async def test_fixed_set_drops_chips_shown_last_turn() -> None:
    """Product regression: the same fixed question asked twice in a row must
    not repeat the exact chips just shown (see render_fixed_follow_ups)."""
    result = await generate_follow_ups(
        _MustNotCallLLM(), "Provide summary of payment terms opportunity.", "Overview: ...",
        "summarize_supplier_position", None,
        previous_follow_ups=["Show key facts about the supplier.", "Prepare potential push backs."],
    )
    assert result == ["Draft email for payment term optimization.", "Recommend negotiation arguments."]


@pytest.mark.asyncio
async def test_meta_operation_after_email_uses_email_set() -> None:
    result = await generate_follow_ups(
        _MustNotCallLLM(), "make the email a bit shorter", "Subject: ...", "meta_operation", None,
        previous_intent="draft_email",
    )
    assert result[0] == "Write longer email."


@pytest.mark.asyncio
async def test_blocked_turn_skips_fixed_set() -> None:
    """A refused turn (no_opportunity/scf_blocked) keeps the blocked flow —
    the fixed playbook set would re-suggest exactly what was refused."""
    llm = _FakeLLM(_VALID_JSON)
    result = await generate_follow_ups(
        llm, "Generate negotiation playbook.", "There is nothing to negotiate...",
        "generate_negotiation_playbook", None, blocked_by="no_extension",
    )
    assert llm.last_prompt is not None
    assert "Recommend negotiation arguments." not in result


@pytest.mark.asyncio
async def test_no_opportunity_turn_skips_fixed_set() -> None:
    llm = _FakeLLM(_VALID_JSON)
    result = await generate_follow_ups(
        llm, "impact of extending by 20 days", "Extending by 20 days ...", "run_scenario", None,
        has_opportunity=False, current_term_days=90,
    )
    assert llm.last_prompt is not None
    assert "Run scenario: extend by 20 days" not in result


@pytest.mark.asyncio
async def test_unmatched_question_keeps_llm_flow() -> None:
    llm = _FakeLLM(_VALID_JSON)
    result = await generate_follow_ups(
        llm, "Show key facts about the supplier.", "Key facts: ...", "summarize_supplier_position", None,
    )
    assert llm.last_prompt is not None
    assert result == [
        "Handle if supplier rejects 60 days",
        "Add SCF option",
        "Draft email with these terms",
    ]


# ── Capability allow-list (the general rule, not a per-phrase ban) ──────────

# Each of these is sound procurement advice and a dead end in THIS system: no
# node answers it, so clicking sends the negotiator into a refusal or an
# irrelevant answer. None of them matches a deny-list regex — that is the
# point: the allow-list drops them because they map onto no capability, so a
# newly invented out-of-scope suggestion is caught without a code change.
_OUT_OF_SCOPE_SUGGESTIONS = [
    "Review alternative suppliers for better terms",
    "Analyze total cost of ownership impact",
    "Document current supplier relationship status",
    "Negotiate unit price reduction instead",
    "Escalate to legal for review",
    "Research market rates for this category",
    "Consolidate volume across business units",
]


@pytest.mark.parametrize("suggestion", _OUT_OF_SCOPE_SUGGESTIONS)
def test_strip_out_of_scope_drops_suggestions_with_no_capability(suggestion: str) -> None:
    result = strip_out_of_scope_follow_ups([suggestion], "summarize_supplier_position")
    assert suggestion not in result
    assert len(result) == 3


def test_strip_out_of_scope_keeps_in_capability_suggestions() -> None:
    kept = [
        "Handle if supplier rejects 60 days",
        "Generate playbook for 60 days",
        "Recommend opening strategy",
    ]
    assert strip_out_of_scope_follow_ups(kept, "recommend_opening_strategy") == kept


def test_strip_out_of_scope_honours_the_opportunity_gate() -> None:
    """A gated capability is out of scope FOR THIS TURN by the same mechanism —
    no separate rule, the graph's own gate decides what is on the menu."""
    result = strip_out_of_scope_follow_ups(
        ["Generate negotiation playbook", "Recommend opening strategy", "Summarize supplier position"],
        "recommend_opening_strategy", "no_extension", False,
    )
    assert "Generate negotiation playbook" not in result
    assert "Recommend opening strategy" not in result


def test_strip_out_of_scope_honours_scf_availability() -> None:
    result = strip_out_of_scope_follow_ups(
        ["Add early payment financing", "Summarize supplier position", "Explain this recommendation further"],
        "summarize_supplier_position", None, True, False,
    )
    assert "Add early payment financing" not in result


def test_every_static_fallback_matches_a_capability() -> None:
    """Backfill sources must themselves be in scope, or the allow-list would
    drop what it just backfilled (and a blocked turn would come back empty)."""
    from domain.services.agent_capabilities import available_follow_up_capabilities

    capabilities = available_follow_up_capabilities()
    lists = [
        *follow_up_prompts._FALLBACK_BY_INTENT.values(),
        *follow_up_prompts._FALLBACK_WHEN_BLOCKED.values(),
        follow_up_prompts._DEFAULT_FALLBACK,
    ]
    for suggestions in lists:
        for suggestion in suggestions:
            assert follow_up_prompts._matches_available_capability(suggestion, capabilities), suggestion


@pytest.mark.asyncio
async def test_out_of_scope_llm_suggestions_never_reach_the_client() -> None:
    """End-to-end on the reported case: a closed negotiation whose generated
    chips were all out-of-scope procurement advice plus the very action that
    was just refused."""
    llm = _FakeLLM(
        '["Review alternative suppliers for better terms", '
        '"Analyze total cost of ownership impact", "Generate Playbook"]'
    )
    result = await generate_follow_ups(
        llm, "suggest me a strong opening offer",
        "There is no improvement opportunity here: target and current are both 75 days.",
        "recommend_opening_strategy", None, blocked_by="no_extension", has_opportunity=False,
        current_term_days=75,
    )
    assert result == get_blocked_fallback_follow_ups("no_extension")


def test_capability_menu_is_in_the_prompt() -> None:
    prompt = build_follow_up_prompt(
        "suggest me a strong opening offer", "No opportunity here.", "recommend_opening_strategy",
        blocked_by="no_extension", has_opportunity=False, current_term_days=75,
    )
    assert "This assistant can do ONLY the following" in prompt
    # Gated capabilities are absent from the menu on a blocked turn.
    assert "- playbook:" not in prompt
    assert "- summary:" in prompt


# ── Fixed-output capabilities: only the plain ask is offerable ──────────────

# The playbook node builds a fixed four-section document from the stored
# brief and ignores every qualifier in the request, so a chip that promises a
# variant promises something no node will deliver.
@pytest.mark.parametrize(
    "variant",
    [
        "Generate playbook for 60 days",
        "Generate playbook with SCF",
        "Generate full playbook",
        "Update the playbook with new terms",
        "Rewrite playbook using 45 days",
        "Generate playbook without financing",
    ],
)
def test_playbook_variants_canonicalise_to_the_plain_ask(variant: str) -> None:
    assert canonicalise_follow_ups([variant]) == ["Generate negotiation playbook"]


def test_canonicalise_collapses_two_playbook_variants_into_one() -> None:
    result = canonicalise_follow_ups(
        ["Generate playbook for 60 days", "Generate playbook with SCF", "Summarize supplier position"]
    )
    assert result == ["Generate negotiation playbook", "Summarize supplier position"]


def test_canonicalise_leaves_parameterisable_capabilities_alone() -> None:
    """Only capabilities whose output is fixed are canonicalised — specificity
    is what makes every other suggestion worth clicking."""
    specific = [
        "Handle if supplier rejects 60 days",
        "Set BATNA to 45 days",
        "Explain the target term basis",
    ]
    assert canonicalise_follow_ups(specific) == specific


@pytest.mark.asyncio
async def test_playbook_variant_from_the_llm_never_reaches_the_client() -> None:
    llm = _FakeLLM(
        '["Generate playbook for 60 days", "Handle if supplier rejects 60 days", '
        '"Summarize supplier position"]'
    )
    result = await generate_follow_ups(
        llm, "what are their current terms", "They are on 90 days.", "answer_data_question", None,
    )
    assert "Generate negotiation playbook" in result
    assert not any("for 60 days" in s and "playbook" in s.lower() for s in result)


@pytest.mark.asyncio
async def test_canonicalisation_feeds_the_repeat_dedup() -> None:
    """A variant wording must not smuggle a repeat past strip_repeated: the
    canonical form is what the negotiator saw last turn."""
    llm = _FakeLLM(
        '["Generate playbook for 60 days", "Handle if supplier rejects 60 days", '
        '"Summarize supplier position"]'
    )
    result = await generate_follow_ups(
        llm, "what are their current terms", "They are on 90 days.", "answer_data_question", None,
        previous_follow_ups=["Generate negotiation playbook"],
    )
    assert not any("playbook" in s.lower() for s in result)


def test_no_static_fallback_offers_a_playbook_variant() -> None:
    lists = [
        *follow_up_prompts._FALLBACK_BY_INTENT.values(),
        *follow_up_prompts._FALLBACK_WHEN_BLOCKED.values(),
        follow_up_prompts._DEFAULT_FALLBACK,
    ]
    for suggestions in lists:
        for suggestion in suggestions:
            if "playbook" in suggestion.lower():
                assert suggestion == "Generate negotiation playbook", suggestion


# ── Day-count must be the one actually in play (both sides of the gate) ─────

@pytest.mark.parametrize(
    "suggestion",
    [
        "Recommend opening strategy for Net 75",
        "Draft opening email at Net-75",
        "Generate playbook targeting 75 days",
        "Propose 75-day terms to supplier",
    ],
)
def test_chip_naming_current_terms_is_dropped_when_an_opportunity_exists(suggestion: str) -> None:
    """Seen live: a supplier already on 75 days offered "Recommend opening
    strategy for Net 75" — a negotiation for terms we already hold."""
    result = strip_unavailable_follow_ups(
        [suggestion, "Summarize supplier position", "Explain this recommendation further"],
        None, has_opportunity=True, current_term_days=75, intent_value="recommend_opening_strategy",
    )
    assert suggestion not in result
    assert len(result) == 3


def test_chip_naming_the_target_survives_when_an_opportunity_exists() -> None:
    kept = [
        "Recommend opening strategy for Net 90",
        "Handle if supplier rejects 90 days",
        "Generate negotiation playbook",
    ]
    assert strip_unavailable_follow_ups(
        kept, None, has_opportunity=True, current_term_days=75,
        intent_value="recommend_opening_strategy",
    ) == kept


def test_net_notation_is_read_on_the_no_opportunity_side_too() -> None:
    result = strip_unavailable_follow_ups(
        ["Draft email requesting Net 120", "Summarize supplier position",
         "Explain this recommendation further"],
        None, has_opportunity=False, current_term_days=90,
    )
    assert "Draft email requesting Net 120" not in result


def test_non_action_chip_may_name_any_day_count() -> None:
    """Only a commitment is gated — asking ABOUT a number is always fine."""
    kept = ["Show the 75 day benchmark", "Explain the 75 days basis", "Summarize supplier position"]
    assert strip_unavailable_follow_ups(
        kept, None, has_opportunity=True, current_term_days=75, intent_value="answer_data_question",
    ) == kept


@pytest.mark.asyncio
async def test_live_screenshot_two_chips_are_all_replaced() -> None:
    """The second reported screenshot, end to end: a pushback chip and a
    playbook variant and an opening strategy at current terms."""
    llm = _FakeLLM(
        '["Handle if supplier cites 0.77 percent cost", '
        '"Add regulatory compliance argument to playbook", '
        '"Recommend opening strategy for Net 75"]'
    )
    result = await generate_follow_ups(
        llm, "no i just asked for negotiation arguments",
        "Parent / Supplier Max: 80 days. Cost Impact: 0.77%.",
        "meta_operation", None, has_opportunity=True, current_term_days=75,
    )
    assert "Recommend opening strategy for Net 75" not in result
    assert "Add regulatory compliance argument to playbook" not in result
    assert "Generate negotiation playbook" in result


# ── Override chips must name a number that is actually a move ───────────────

@pytest.mark.parametrize(
    "suggestion",
    [
        "Set BATNA to 75 days",      # equal to current terms
        "Set BATNA to 60 days",      # below current terms
        "Set target to Net 75",
        "Adjust the target to 30 days",
    ],
)
def test_override_at_or_below_current_terms_is_dropped(suggestion: str) -> None:
    """Produced by the live model on a no-opportunity turn, where the override
    is otherwise the one useful next step — which is why the number matters:
    storing a target at or below current terms leaves nothing to negotiate
    (domain.services.improvement_opportunity)."""
    result = strip_unavailable_follow_ups(
        [suggestion, "Summarize supplier position", "Explain this recommendation further"],
        None, has_opportunity=False, current_term_days=75, intent_value="recommend_opening_strategy",
    )
    assert suggestion not in result


def test_override_above_current_terms_survives() -> None:
    kept = ["Set BATNA to 90 days", "Summarize supplier position", "Explain this recommendation further"]
    assert strip_unavailable_follow_ups(
        kept, None, has_opportunity=False, current_term_days=75,
        intent_value="recommend_opening_strategy",
    ) == kept


def test_override_without_a_number_is_left_alone() -> None:
    """"Set a target for this supplier" is the right prompt on a
    no-opportunity turn — only a named dead-end number is the problem."""
    kept = ["Set a target for this supplier", "Summarize supplier position",
            "Explain this recommendation further"]
    assert strip_unavailable_follow_ups(
        kept, None, has_opportunity=False, current_term_days=75,
        intent_value="recommend_opening_strategy",
    ) == kept


# ── One ask, offered twice in different words ──────────────────────────────

def test_backfill_does_not_repeat_an_ask_already_worded_differently() -> None:
    """Seen live: the model wrote "Summarize current supplier stance" and the
    backfill added the fallback's "Summarize the current supplier position"
    beside it — one click, two chips."""
    result = follow_up_prompts._backfill(
        ["Summarize current supplier stance"],
        ["Summarize the current supplier position", "Show key supplier facts",
         "Explain this recommendation further"],
    )
    assert "Summarize the current supplier position" not in result
    assert result == [
        "Summarize current supplier stance",
        "Show key supplier facts",
        "Explain this recommendation further",
    ]


def test_same_verb_different_action_is_not_a_duplicate() -> None:
    """The verb decides: two chips that open differently are different asks,
    however much of the rest they share."""
    assert canonicalise_follow_ups(
        ["Extend the term to 75 days", "Set the term to 75 days"]
    ) == ["Extend the term to 75 days", "Set the term to 75 days"]


def test_model_written_duplicates_collapse_before_the_backstops() -> None:
    assert canonicalise_follow_ups(
        ["Summarize supplier position", "Summarize the current supplier position",
         "Generate negotiation playbook"]
    ) == ["Summarize supplier position", "Generate negotiation playbook"]


def test_backfill_never_adds_a_second_chip_for_a_capability_already_offered() -> None:
    """Live run: the model wrote "Summarize supplier stance" and the backfill
    put "Summarize the current supplier position" beside it. Word overlap
    cannot catch that pair — "stance" and "position" are synonyms, so they
    share a single content word — but both ask for the summary capability."""
    result = follow_up_prompts._backfill(
        ["Summarize supplier stance", "Explain prior recommendation"],
        ["Summarize the current supplier position", "Show key supplier facts"],
    )
    assert "Summarize the current supplier position" not in result
    assert result == [
        "Summarize supplier stance",
        "Explain prior recommendation",
        "Show key supplier facts",
    ]


def test_backfill_still_fills_when_capabilities_differ() -> None:
    result = follow_up_prompts._backfill(
        ["Summarize supplier stance"],
        ["Show key supplier facts", "Explain this recommendation further"],
    )
    assert len(result) == 3
