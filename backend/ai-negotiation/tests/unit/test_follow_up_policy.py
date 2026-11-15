"""Unit tests for domain.services.follow_up_policy — the fixed, curated
follow-up chip sets for the core negotiation journeys. Pure/deterministic."""
from __future__ import annotations

import pytest

import utils.prompts.follow_up_suggestions_prompt as follow_up_prompts
from application.services.starter_questions import _FIXED_STARTER_QUESTIONS
from domain.entities.follow_up import FollowUpTopic
from domain.services.follow_up_policy import (
    FIXED_FOLLOW_UPS,
    normalise_message,
    render_fixed_follow_ups,
    resolve_follow_up_topic,
)

T = FollowUpTopic


def _texts(topic: FollowUpTopic) -> list[str]:
    return [c.text for c in FIXED_FOLLOW_UPS[topic]]


# ── Spec: the fixed lists are exactly what product asked for ────────────────


def test_fixed_sets_match_product_spec() -> None:
    assert _texts(T.OPENING_OFFER) == [
        "Generate negotiation playbook",
        "Draft email for payment term optimization.",
        "Show additional arguments to optimize payment terms.",
        "Show key facts about the supplier.",
    ]
    assert _texts(T.PLAYBOOK) == [
        "Recommend negotiation arguments.",
        "Provide summary of payment terms opportunity.",
        "Prepare potential push backs.",
        "Show key facts about the supplier.",
    ]
    assert _texts(T.OPPORTUNITY_SUMMARY) == [
        "Draft email for payment term optimization.",
        "Recommend negotiation arguments.",
        "Prepare potential push backs.",
        "Show key facts about the supplier.",
    ]
    assert _texts(T.OPENING_STRATEGY) == [
        "Why to be careful with the Supplier Standard as Argumentation?",
        "Draft email for payment term optimization.",
        "Prepare potential push backs.",
        "Show key facts about the supplier.",
    ]
    assert _texts(T.SUPPLIER_STANDARD_CAUTION) == [
        "Draft email for payment term optimization.",
        "Prepare potential push backs.",
        "Show key facts about the supplier.",
        "Generate negotiation playbook",
    ]
    assert _texts(T.SUPPLIER_PUSHBACK) == [
        "Generate negotiation playbook",
        "Draft opening email",
        "Reframe with financing options",
    ]
    assert _texts(T.TERM_IMPACT) == [
        "Draft opening email",
        "Handle supplier pushback",
        "Generate negotiation playbook",
    ]
    assert _texts(T.EMAIL) == [
        "Write longer email.",
        "Write another email version with a more negotiable, collaborative tone.",
        "Write another email version with Supply Chain Finance.",
        "Suggest formal message from senior management about term initiative.",
        "Generate negotiation playbook",
    ]


def test_every_topic_has_a_fixed_set() -> None:
    assert set(FIXED_FOLLOW_UPS) == set(FollowUpTopic)


# ── Tier 1: canonical catalogue ─────────────────────────────────────────────


@pytest.mark.parametrize(
    "starter, topic",
    [
        ("Generate negotiation playbook.", T.PLAYBOOK),
        ("Provide summary of payment terms opportunity.", T.OPPORTUNITY_SUMMARY),
        ("Draft email for payment term optimization.", T.EMAIL),
        ("Show key facts about the supplier.", None),
    ],
)
def test_starter_questions_resolve_as_specified(starter: str, topic: FollowUpTopic | None) -> None:
    """Drift guard: the starter tuple lives in application/, the catalogue in
    domain/ — this pins each starter's resolution so a rewording of either
    side shows up here."""
    assert starter in _FIXED_STARTER_QUESTIONS
    # Intent deliberately something that would NOT resolve on its own.
    assert resolve_follow_up_topic(starter, "answer_data_question") is topic


@pytest.mark.parametrize(
    "chip, topic",
    [
        ("Generate negotiation playbook", T.PLAYBOOK),
        ("Generate Playbook", T.PLAYBOOK),
        ("Draft opening email", T.EMAIL),
        ("Write longer email.", T.EMAIL),
        ("Write another email version with a more negotiable, collaborative tone.", T.EMAIL),
        ("Write another email version with Supply Chain Finance.", T.EMAIL),
        ("Suggest formal message from senior management about term initiative.", T.EMAIL),
        ("Why to be careful with the Supplier Standard as Argumentation?", T.SUPPLIER_STANDARD_CAUTION),
        ("Prepare potential push backs.", T.SUPPLIER_PUSHBACK),
        ("Handle supplier pushback", T.SUPPLIER_PUSHBACK),
    ],
)
def test_clicked_chips_resolve_regardless_of_intent(chip: str, topic: FollowUpTopic) -> None:
    """Chips are sent back verbatim when clicked; they must resolve by exact
    match even if the classifier labels them something unexpected."""
    assert resolve_follow_up_topic(chip, "unknown") is topic
    assert resolve_follow_up_topic(chip, None) is topic


@pytest.mark.parametrize(
    "chip",
    [
        "Show key facts about the supplier.",
        "Recommend negotiation arguments.",
        "Show additional arguments to optimize payment terms.",
        "Reframe with financing options",
        "Run financial impact scenario",
        "Run scenario: extend by 20 days",
    ],
)
def test_chips_outside_the_spec_keep_the_llm_flow(chip: str) -> None:
    assert resolve_follow_up_topic(chip, "answer_data_question") is None


def test_catalogue_match_is_case_whitespace_and_punctuation_insensitive() -> None:
    assert resolve_follow_up_topic("  GENERATE   negotiation Playbook!! ", None) is T.PLAYBOOK
    assert resolve_follow_up_topic("suggest a strong opening offer", None) is T.OPENING_OFFER
    assert resolve_follow_up_topic("Suggest a strong opening offer.", None) is T.OPENING_OFFER


def test_normalise_message() -> None:
    assert normalise_message("  Hello,   World?! ") == "hello, world"
    assert normalise_message("") == ""


# ── Tier 2: intent defaults (broad by intent) ───────────────────────────────


@pytest.mark.parametrize(
    "intent, topic",
    [
        ("generate_negotiation_playbook", T.PLAYBOOK),
        ("draft_email", T.EMAIL),
        ("handle_supplier_pushback", T.SUPPLIER_PUSHBACK),
        ("run_scenario", T.TERM_IMPACT),
    ],
)
def test_one_to_one_intents_resolve_by_intent(intent: str, topic: FollowUpTopic) -> None:
    assert resolve_follow_up_topic("some free-typed question about the supplier", intent) is topic


def test_walk_away_threat_is_pushback() -> None:
    msg = "what would you suggest if the supplier says that he will stop the business with us if we increase our terms"
    assert resolve_follow_up_topic(msg, "handle_supplier_pushback") is T.SUPPLIER_PUSHBACK


def test_term_increase_impact_is_term_impact() -> None:
    msg = "what is the impact on supplier if i increase my payment terms by 20 days"
    assert resolve_follow_up_topic(msg, "run_scenario") is T.TERM_IMPACT


# ── Tier 3: keyword sub-topic rules ─────────────────────────────────────────


@pytest.mark.parametrize(
    "msg, topic",
    [
        ("Suggest a strong opening offer for this supplier", T.OPENING_OFFER),
        ("What opening anchor should I use?", T.OPENING_OFFER),
        ("What is the best opening strategy here?", T.OPENING_STRATEGY),
        ("How should I open the negotiation?", T.OPENING_STRATEGY),
    ],
)
def test_opening_strategy_intent_splits_offer_vs_strategy(msg: str, topic: FollowUpTopic) -> None:
    assert resolve_follow_up_topic(msg, "recommend_opening_strategy") is topic


def test_explain_recommendation_only_fixed_for_supplier_standard() -> None:
    assert (
        resolve_follow_up_topic("Why should I be careful using the supplier standard?", "explain_recommendation")
        is T.SUPPLIER_STANDARD_CAUTION
    )
    assert (
        resolve_follow_up_topic("Is the supplier's standard a safe argument?", "explain_recommendation")
        is T.SUPPLIER_STANDARD_CAUTION
    )
    assert resolve_follow_up_topic("Why 62 days and not 75?", "explain_recommendation") is None


def test_summary_intent_only_fixed_for_opportunity() -> None:
    assert (
        resolve_follow_up_topic("Give me a summary of the payment terms opportunity", "summarize_supplier_position")
        is T.OPPORTUNITY_SUMMARY
    )
    assert resolve_follow_up_topic("Show key facts about the supplier.", "summarize_supplier_position") is None
    assert resolve_follow_up_topic("Brief me on this supplier", "summarize_supplier_position") is None


def test_meta_operation_after_email_keeps_email_set() -> None:
    assert (
        resolve_follow_up_topic("make the email shorter", "meta_operation", previous_intent="draft_email")
        is T.EMAIL
    )
    # Same rewrite after a playbook is not an email journey.
    assert (
        resolve_follow_up_topic("make the email shorter", "meta_operation", previous_intent="generate_negotiation_playbook")
        is None
    )
    # Non-email rewrite after an email is not either.
    assert (
        resolve_follow_up_topic("summarize everything so far", "meta_operation", previous_intent="draft_email")
        is None
    )


@pytest.mark.parametrize("intent", ["answer_data_question", "answer_spends_question", "apply_override",
                                    "evaluate_counter_offer", "reframe_with_financing", "greeting",
                                    "unclear", "out_of_scope", "unknown", None])
def test_other_intents_keep_the_llm_flow(intent: str | None) -> None:
    assert resolve_follow_up_topic("tell me something about this supplier", intent) is None


def test_empty_message_never_resolves() -> None:
    assert resolve_follow_up_topic("", "generate_negotiation_playbook") is None
    assert resolve_follow_up_topic("   ", "generate_negotiation_playbook") is None


# ── Rendering ───────────────────────────────────────────────────────────────


def test_render_term_impact_is_verbatim() -> None:
    out = render_fixed_follow_ups(T.TERM_IMPACT, "what is the impact if I increase my terms by 20 days")
    assert out == ["Draft opening email", "Handle supplier pushback", "Generate negotiation playbook"]


def test_render_never_re_suggests_the_message_just_sent() -> None:
    out = render_fixed_follow_ups(T.TERM_IMPACT, "Draft opening email")
    assert out == ["Handle supplier pushback", "Generate negotiation playbook"]


def test_render_drops_scf_chips_without_backfill_when_not_offerable() -> None:
    email = render_fixed_follow_ups(T.EMAIL, "draft an email", scf_offerable=False)
    assert email == [
        "Write longer email.",
        "Write another email version with a more negotiable, collaborative tone.",
        "Suggest formal message from senior management about term initiative.",
        "Generate negotiation playbook",
    ]
    pushback = render_fixed_follow_ups(T.SUPPLIER_PUSHBACK, "they say they will stop supplying", scf_offerable=False)
    assert pushback == ["Generate negotiation playbook", "Draft opening email"]


def test_render_keeps_scf_chips_when_offerable() -> None:
    assert "Write another email version with Supply Chain Finance." in render_fixed_follow_ups(T.EMAIL, "draft an email")
    assert "Reframe with financing options" in render_fixed_follow_ups(T.SUPPLIER_PUSHBACK, "they object")


def test_render_returns_verbatim_lists_for_static_topics() -> None:
    for topic in (T.OPENING_OFFER, T.PLAYBOOK, T.OPPORTUNITY_SUMMARY, T.OPENING_STRATEGY, T.SUPPLIER_STANDARD_CAUTION):
        assert render_fixed_follow_ups(topic, "a free-typed question") == _texts(topic)


def test_render_drops_chips_shown_last_turn() -> None:
    previous = ["Show key facts about the supplier.", "Prepare potential push backs."]
    out = render_fixed_follow_ups(T.OPPORTUNITY_SUMMARY, "a free-typed question", previous_follow_ups=previous)
    assert out == ["Draft email for payment term optimization.", "Recommend negotiation arguments."]


def test_render_repeat_drop_is_case_and_whitespace_insensitive() -> None:
    previous = ["  show KEY facts about the supplier ", "prepare potential push backs!"]
    out = render_fixed_follow_ups(T.OPPORTUNITY_SUMMARY, "a free-typed question", previous_follow_ups=previous)
    assert out == ["Draft email for payment term optimization.", "Recommend negotiation arguments."]


def test_render_keeps_full_set_when_repeat_drop_would_empty_it() -> None:
    """No backfill source for fixed sets, so if every chip was shown last
    turn (e.g. the exact same fixed question asked twice with nothing else to
    offer), the full set is kept rather than showing nothing."""
    out = render_fixed_follow_ups(T.OPPORTUNITY_SUMMARY, "a free-typed question", previous_follow_ups=_texts(T.OPPORTUNITY_SUMMARY))
    assert out == list(_texts(T.OPPORTUNITY_SUMMARY))


def test_render_no_previous_follow_ups_is_a_noop() -> None:
    assert render_fixed_follow_ups(T.OPPORTUNITY_SUMMARY, "a free-typed question", previous_follow_ups=None) == list(
        _texts(T.OPPORTUNITY_SUMMARY)
    )


# ── Compatibility with the LLM-path backstops ───────────────────────────────


def test_fixed_chips_are_never_unbacked() -> None:
    """The fixed path bypasses the LLM-path backstops, but every curated chip
    must still be something the assistant can act on — same guard as
    test_no_fallback_list_contains_an_unbacked_suggestion."""
    offenders = [
        c.text for chips in FIXED_FOLLOW_UPS.values() for c in chips
        if follow_up_prompts._UNBACKED_RE.search(c.text) or follow_up_prompts._META_CLARIFY_RE.search(c.text)
    ]
    assert offenders == []


def test_fixed_chips_never_contain_playbook_with_number() -> None:
    offenders = [
        c.text for chips in FIXED_FOLLOW_UPS.values() for c in chips
        if follow_up_prompts._playbook_mentions_number(c.text)
    ]
    assert offenders == []


def test_strip_scf_follow_ups_is_a_noop_on_fixed_sets() -> None:
    """The routes still call strip_scf_follow_ups after the generator. On a
    fixed set with the SCF chip already removed it must not backfill from the
    generic defaults (which would break predictability)."""
    email = render_fixed_follow_ups(T.EMAIL, "draft an email", scf_offerable=False)
    assert follow_up_prompts.strip_scf_follow_ups(email, False, "draft_email") == email
    pushback = render_fixed_follow_ups(T.SUPPLIER_PUSHBACK, "they object", scf_offerable=False)
    assert follow_up_prompts.strip_scf_follow_ups(pushback, False, "handle_supplier_pushback") == pushback


def test_every_fixed_playbook_chip_uses_the_canonical_spelling() -> None:
    """Three spellings of the same ask ("Generate negotiation playbook.",
    "Generate Playbook") shipped side by side across the sets — identical in
    behaviour, but a negotiator moving between journeys saw the same action
    renamed. One spelling, matching
    `AGENT_CAPABILITIES[GENERATE_NEGOTIATION_PLAYBOOK].canonical_follow_up`,
    so the curated sets and the LLM path offer a single wording."""
    from domain.entities.intent import Intent
    from domain.services.agent_capabilities import AGENT_CAPABILITIES

    canonical = AGENT_CAPABILITIES[Intent.GENERATE_NEGOTIATION_PLAYBOOK].canonical_follow_up
    for topic, chips in FIXED_FOLLOW_UPS.items():
        for chip in chips:
            if "playbook" in chip.text.lower():
                assert chip.text == canonical, (topic, chip.text)
