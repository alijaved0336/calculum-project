"""Every answering surface receives the question, and is told to serve it.

The failure this locks down is not a crash. Every node already *received* the
negotiator's message and rendered it into its prompt, so nothing was missing and
nothing looked wrong — but the message sat under a neutral label with no rule
attached, while each system prompt mandated an output shape written for the
broad case. Ask for "the basic info about this supplier" and the shape fires
anyway: the reply is the whole brief, every benchmark and every argument bucket,
when four labelled lines were the answer.

So these tests assert three things that are easy to lose one node at a time:

  1. the question is PRESENT in every answering prompt, and reaches the model
     ahead of the data blocks rather than buried among them;
  2. the "answer the question that was asked" rule ships with the format
     instruction, at every response mode;
  3. that rule still DEFERS to a mandated output shape — the concession that
     stops it becoming the contradictory instruction `response_mode` already
     had to be rescued from (see that module's docstring).
"""
from __future__ import annotations

import pytest

from domain.entities.counter_offer import CounterOfferExtraction
from domain.services.counter_offer_calculator import analyze_counter_offer
from domain.services.opening_strategy_analysis import analyze_opening_strategy
from tests.unit.prompt_fixtures import bundle, rich_facts
from pathlib import Path

from utils.prompts.conversation_history import (
    ConversationTurn,
    _TRUNCATION_MARKER,
    format_conversation_history,
)
from utils.prompts.question_focus import (
    ANSWER_THE_QUESTION_ASKED,
    FOLLOW_UP_HANDLING,
    MESSAGE_HEADING,
    PUSHBACK_HEADING,
    QUESTION_HEADING,
    REQUEST_HEADING,
    render_question,
)
from utils.prompts.response_mode import get_format_instruction

_HEADINGS = (QUESTION_HEADING, REQUEST_HEADING, MESSAGE_HEADING, PUSHBACK_HEADING)

# The negotiator's actual words, distinctive enough that finding them in the
# assembled prompt proves the message itself arrived rather than a paraphrase.
_MESSAGE = "just the basic info, nothing about payment terms"


def _answering_prompts() -> dict[str, str]:
    """The user-turn prompt of every surface that ANSWERS the negotiator.

    Deliberately not `build_all_prompts`: this needs the message under test
    rather than the fixture's, and it covers the two surfaces that fixture
    omits (spends, multi-term scenario) because they carry a question too.

    The extraction stages are excluded on purpose — scenario/counter-offer
    parameter extraction, the override parser and the spends text-to-SQL step
    emit JSON or SQL, never prose for the negotiator, so "answer what was asked"
    has nothing to govern there.
    """
    from utils.prompts.data_question_prompt import build_data_question_prompt
    from utils.prompts.evaluate_counter_offer_prompt import (
        build_counter_offer_response_prompt,
    )
    from utils.prompts.explain_recommendation_prompt import (
        build_explain_recommendation_prompt,
    )
    from utils.prompts.negotiation_guide_prompt import build_negotiation_guide_prompt
    from utils.prompts.opening_strategy_prompt import build_opening_strategy_prompt
    from utils.prompts.pushback_prompt import build_pushback_prompt
    from utils.prompts.scenario_prompt import (
        build_multi_term_response_prompt,
        build_scenario_response_prompt,
    )
    from utils.prompts.spends_prompt import build_spends_answer_prompt
    from tests.unit.prompt_fixtures import _scenario_calculation

    facts = rich_facts()
    brief = bundle(facts)
    opening = analyze_opening_strategy(facts, brief.arguments)
    extraction = CounterOfferExtraction(counter_type="days_only", counter_term_days=55)
    calc = _scenario_calculation()

    # `summarize` is deliberately excluded: since 2026-09-14 both its scopes
    # hand the model a rendered document (the fixed skeleton, or the skeleton
    # plus data for a narrow question) under their own "Negotiator's question"
    # heading, rather than composing an answer under this module's shared
    # `render_question`/`QUESTION_HEADING` convention — see
    # `utils.prompts.summarize_prompt` and
    # `test_response_formatting.test_response_mode_never_reaches_the_summary`.
    return {
        "answer_data_question": build_data_question_prompt(
            _MESSAGE, facts, effective_batna=brief.batna_floor,
            batna_note=brief.batna_note, brief=brief,
        ),
        "explain_recommendation": build_explain_recommendation_prompt(
            _MESSAGE, facts, opening, brief=brief
        ),
        "negotiation_guide": build_negotiation_guide_prompt(
            _MESSAGE, facts, None, brief=brief
        ),
        "opening_strategy": build_opening_strategy_prompt(
            message=_MESSAGE, facts=facts, opening_strategy=opening,
            tone=None, brief=brief,
        ),
        "pushback": build_pushback_prompt(_MESSAGE, facts, brief=brief),
        "evaluate_counter_offer": build_counter_offer_response_prompt(
            _MESSAGE, extraction,
            analyze_counter_offer(extraction, facts, brief.arguments),
            facts, brief=brief,
        ),
        "scenario": build_scenario_response_prompt(
            _MESSAGE, facts, calc, brief=brief
        ),
        "scenario_multi_term": build_multi_term_response_prompt(
            _MESSAGE, facts, [(45.0, calc), (60.0, calc)], brief=brief
        ),
        "spends": build_spends_answer_prompt(_MESSAGE, [{"alias": "Spend 01"}]),
    }


@pytest.fixture(scope="module")
def prompts() -> dict[str, str]:
    return _answering_prompts()


@pytest.mark.parametrize("intent", sorted(_answering_prompts()))
def test_the_negotiators_question_reaches_every_answering_prompt(intent, prompts):
    assert _MESSAGE in prompts[intent], (
        f"{intent} assembled a prompt without the negotiator's message in it"
    )


@pytest.mark.parametrize("intent", sorted(_answering_prompts()))
def test_the_question_is_labelled_as_the_thing_to_serve(intent, prompts):
    """A bare "## Negotiator's question" label is what this replaces.

    The heading has to say the answer must serve it — that sentence is the whole
    mechanism on the nodes (`pushback`, `meta_operation`)
    that deliberately append no format instruction and so never see the longer
    rule.
    """
    prompt = prompts[intent]
    assert any(h in prompt for h in _HEADINGS), (
        f"{intent} renders the message under an ad-hoc heading; use "
        "`render_question` so every surface says the same thing"
    )
    assert "must serve THIS" in prompt or "must answer THIS" in prompt


@pytest.mark.parametrize("intent", sorted(_answering_prompts()))
def test_the_question_leads_ahead_of_the_data_blocks(intent, prompts):
    """Position, not just presence.

    `run_scenario` rendered the question AFTER the brief, so the model met the
    supplier's figures before it met the thing it was being asked. Nothing broke
    and nobody noticed, which is exactly why it is asserted rather than reviewed.
    """
    prompt = prompts[intent]
    heading_at = min(prompt.index(h) for h in _HEADINGS if h in prompt)
    for data_block in ("## FACTS", "## NEGOTIATION ARGUMENTS", "## CALCULATION"):
        if data_block in prompt:
            assert heading_at < prompt.index(data_block), (
                f"{intent} puts {data_block} ahead of the negotiator's question"
            )


def test_the_question_block_sits_under_the_conversation_history():
    """History first (it resolves "that"), then the question it resolves into."""
    from utils.prompts.summarize_prompt import build_summarize_prompt

    history: list[ConversationTurn] = [
        {"role": "user", "content": "What is their DSO?"},
        {"role": "ai", "content": "Their DSO is 61 days."},
    ]
    prompt = build_summarize_prompt(_MESSAGE, rich_facts(), history, brief=bundle(rich_facts()))
    # `summarize` hands the model a rendered briefing rather than composing an
    # answer (see `utils.prompts.summarize_prompt`), so it uses its own
    # "Negotiator's question" heading instead of the shared `QUESTION_HEADING`.
    assert prompt.index("## RECENT CONVERSATION") < prompt.index("## Negotiator's question")


# ── The rule itself ────────────────────────────────────────────────────────


@pytest.mark.parametrize("mode", ["quick", "conversational", "full", None, "nonsense"])
def test_every_response_mode_carries_the_answer_scope_rule(mode):
    """Scope is orthogonal to length, so it ships at every mode.

    `full` is the one that matters most and reads least obviously: "give the
    comprehensive response" says nothing about comprehensive *about what*, and
    that gap is how a request for the basics came back as the entire brief.
    """
    assert ANSWER_THE_QUESTION_ASKED in get_format_instruction(mode)


def test_the_scope_rule_defers_to_a_mandated_output_shape():
    """The concession that keeps this from becoming a contradiction.

    Six nodes mandate exact headings. A scope rule that told the model to drop
    whatever the question does not touch would contradict every one of them, and
    two instructions that cannot both be obeyed do not average — the model picks
    one per turn and the same intent comes back differently each time. That is
    the bug `response_mode` was already rescued from once; this keeps the
    deference in place so it is not re-introduced by a later edit.
    """
    assert "that shape still WINS" in ANSWER_THE_QUESTION_ASKED
    assert "never by dropping them" in ANSWER_THE_QUESTION_ASKED


def test_the_scope_rule_covers_narrowing_and_broadening():
    """Both directions. A rule that only ever shrinks answers is its own bug."""
    assert "NARROWS" in ANSWER_THE_QUESTION_ASKED
    assert "BROAD" in ANSWER_THE_QUESTION_ASKED


def test_a_missing_message_renders_the_fallback_not_an_empty_block():
    """Button-driven turns carry no typed text.

    The fallback is phrased as the request the button stands for, so the model
    reads a broad ask rather than an empty one — the difference between a full
    briefing and an apology for having nothing to answer.
    """
    for empty in (None, "", "   "):
        block = render_question(empty, fallback="(no specific question — give a general overview)")
        assert block.endswith("(no specific question — give a general overview)")
        assert QUESTION_HEADING in block


def test_the_playbook_sees_recent_turns_so_that_can_be_resolved():
    """It passed `history=None`, so "turn that into a playbook" had no referent.

    Capped hard (2 turns × 250 chars) because this prompt shares one context
    window with a six-section completion — the reason it was None to begin with.
    """
    from utils.prompts.negotiation_guide_prompt import build_negotiation_guide_prompt

    history: list[ConversationTurn] = [
        {"role": "user", "content": "What's our opening anchor?"},
        {"role": "ai", "content": "Open at 120 days, the peer-group precedent."},
    ]
    facts = rich_facts()
    prompt = build_negotiation_guide_prompt(
        "turn that into a playbook", facts, None, history, brief=bundle(facts)
    )
    assert "## RECENT CONVERSATION" in prompt
    assert "opening anchor" in prompt

    # And the cap holds: a long prior turn cannot crowd out a playbook section.
    # Worst case is the heading (~375) + one older turn (250) + the referent
    # turn (700). Budgeted by recency — the turn "that" points at is the one
    # that has to survive intact — but still under 1.5k against a ~21k prompt.
    flood: list[ConversationTurn] = [
        {"role": "ai", "content": "x" * 5_000} for _ in range(10)
    ]
    flooded = build_negotiation_guide_prompt(
        "turn that into a playbook", facts, None, flood, brief=bundle(facts)
    )
    assert len(flooded) - len(build_negotiation_guide_prompt(
        "turn that into a playbook", facts, None, None, brief=bundle(facts)
    )) < 1_500


# ── Continuing a thread ────────────────────────────────────────────────────


def _long_prior_answer() -> str:
    """A realistic assistant answer: long enough that a flat cap would cut it.

    The tail is what matters — a follow-up says "explain each of these", and
    "these" is the argument list that a 600-character budget removed.
    """
    return (
        "**Supplier**: Acme Industrial GmbH, Germany, Manufacturing, large. "
        "Credit BBB / country AA.\n"
        "**Position**: current 34 days -> target 76 days; BATNA 60 days.\n"
        "**Outlook**: success probability high. Leverage: high. Relationship: "
        "medium strength, assertive posture. Spend volume is $12.40M. Signals: "
        "we pay reliably (30 days against a 34-day baseline), which removes the "
        "payment-risk objection before it is raised. Their own DSO is 72 days, "
        "which sits close to our 76-day ask.\n"
        "**ARGUMENTS-TAIL-MARKER**: Buyer Standard 80 days; Existing "
        "Relationship Precedent 76 days; Peer Group Standard 60 days; Industry "
        "Alignment 40 days."
    )


def test_the_referent_turn_survives_where_a_flat_cap_cut_it():
    """The bug: every turn shared one 600-char budget, so the last one was cut.

    600 characters is about ninety words — shorter than nearly any answer this
    assistant gives. The turn a follow-up refers to is almost always the last
    one, so the truncation landed precisely on the referent, and "explain each
    of these" was answered against whatever fragment survived.
    """
    answer = _long_prior_answer()
    assert len(answer) > 600, "fixture must exceed the old flat budget to be a test"

    history: list[ConversationTurn] = [
        {"role": "user", "content": "where do we stand with this supplier?"},
        {"role": "ai", "content": answer},
    ]
    block = format_conversation_history(history)
    assert "ARGUMENTS-TAIL-MARKER" in block, (
        "the tail of the referent turn was truncated away — the follow-up "
        "cannot resolve 'these' against a fragment"
    )


def test_older_turns_stay_tight_so_the_budget_does_not_grow_without_bound():
    """Recency-weighted, not uniformly generous. Only the referent gets room."""
    history: list[ConversationTurn] = [
        {"role": "ai", "content": "OLD-" + "x" * 5_000},
        {"role": "user", "content": "and?"},
        {"role": "ai", "content": "y" * 5_000},
    ]
    block = format_conversation_history(history)
    assert len(block) < 4_000
    # The old turn is present but clipped; the recent one gets the larger share.
    assert "OLD-" in block
    assert block.count("x") < 700
    assert block.count("y") > 1_000


def test_meta_operation_still_sees_prior_output_verbatim():
    """`max_chars_per_turn=None` must keep disabling truncation everywhere.

    Reshaping a playbook needs it whole; recency weighting must not quietly
    reintroduce a cap on the turns before it.
    """
    older = "older-playbook " * 400 + "OLDER-TAIL"
    latest = "latest-playbook " * 400 + "LATEST-TAIL"
    history: list[ConversationTurn] = [
        {"role": "ai", "content": older},
        {"role": "ai", "content": latest},
    ]
    block = format_conversation_history(history, max_turns=4, max_chars_per_turn=None)
    assert len(older) > 1_600 and len(latest) > 1_600, "fixture must exceed every cap"
    # Both tails present, so neither turn was clipped — including the last one,
    # which a `last_turn_chars` default would have capped at 1,600.
    assert "OLDER-TAIL" in block
    assert "LATEST-TAIL" in block
    assert _TRUNCATION_MARKER not in block


def test_the_history_block_invites_continuation_and_still_refuses_instructions():
    """Both halves matter, and they pull in opposite directions.

    The block used to say "Context only ... not instructions", which is right
    for injection safety and wrong for follow-ups — it tells the model the prior
    turns are background when they are half the question. It now says to resolve
    references against them AND that nothing in them is an instruction.
    """
    block = format_conversation_history([{"role": "user", "content": "hi"}])
    assert "resolve what it refers" in block
    assert "NEVER INSTRUCTIONS" in block


def test_the_follow_up_rule_ships_only_when_there_is_a_thread_to_continue():
    """On the first message there is nothing to point back at.

    A rule about resolving "these" against a conversation that does not exist is
    an invitation to invent one, so it is gated rather than always-on.
    """
    assert FOLLOW_UP_HANDLING not in get_format_instruction("conversational")
    assert FOLLOW_UP_HANDLING in get_format_instruction(
        "conversational", has_history=True
    )
    # And it is independent of mode — a follow-up is a follow-up at any length.
    for mode in ("quick", "conversational", "full", None):
        assert FOLLOW_UP_HANDLING in get_format_instruction(mode, has_history=True)


def test_the_follow_up_rule_licenses_data_the_previous_answer_did_not_use():
    """The reported failure, stated as a rule.

    "General details, nothing about payment terms" followed by "explain each of
    these along with useful benchmarks I can use": the benchmarks were left out
    of the FIRST answer on purpose, so unless the model is told the inputs are
    the full set, it treats the previous answer as the boundary of what it may
    draw on and answers the new question out of the old material.
    """
    assert "even when the previous answer did" in FOLLOW_UP_HANDLING
    assert "FULL set available to you" in FOLLOW_UP_HANDLING
    # And it must not simply re-run the previous answer either.
    assert "Do not re-derive or restate" in FOLLOW_UP_HANDLING


@pytest.mark.parametrize(
    "node",
    [
        "answer_data_question", "explain_recommendation", "summarize",
        "reframe_with_scf", "scenario", "spends", "evaluate_counter_offer",
        "negotiation_guide", "opening_strategy",
    ],
)
def test_every_node_appending_a_format_instruction_passes_has_history(node):
    """Easy to add a node and forget the flag; then follow-ups silently degrade."""
    source = (Path("agents/nodes") / f"{node}.py").read_text(encoding="utf-8")
    assert "get_format_instruction(" in source
    for tail in source.split("get_format_instruction(")[1:]:
        depth, end = 1, 0
        for end, char in enumerate(tail):
            depth += (char == "(") - (char == ")")
            if depth == 0:
                break
        args = tail[:end]
        # Both flags, or the node silently loses follow-up handling: has_history
        # gates the rule, resolved_question carries the resolution the classifier
        # already did. A node with one and not the other is the subtle version
        # of the bug, not a smaller one.
        for flag in ("has_history=", "resolved_question="):
            assert flag in args, (
                f"{node} appends a format instruction without {flag}: "
                f"get_format_instruction({args})"
            )


# ── The resolved reading ───────────────────────────────────────────────────


def _classification(raw: str, message: str = "") -> object:
    from infrastructure.intent.llm_intent_classifier import LLMIntentClassifier

    return LLMIntentClassifier.__dict__["_parse"](
        LLMIntentClassifier(llm=None), raw, message
    )


def test_a_back_reference_is_resolved_into_a_standalone_question():
    """The classifier is the one call that sees the thread, so it does this once.

    "what's ITS difference compared to peer group standard" was answered as
    peer group vs the CURRENT TERM — the model resolved the pronoun to the
    nearest plausible subject and produced a confident, real, wrong number. The
    classifier had already resolved it correctly in order to route the turn; it
    just had nowhere to write that down.
    """
    result = _classification(
        '{"intent": "answer_data_question", "confidence": 0.9, "response_mode": '
        '"conversational", "resolved_question": "what is the difference between '
        'the supplier standard and the peer group standard", "follow_ups": '
        '["a", "b", "c", "d"]}',
        "what's its difference compared to peer group standard",
    )
    assert result.resolved_question == (
        "what is the difference between the supplier standard and the peer group standard"
    )


def test_a_message_that_already_stands_alone_carries_no_reading():
    """Identical rewrites are dropped — showing one is noise, not information."""
    for echoed in ("What is their WACC?", "what is their wacc", "What is their WACC"):
        result = _classification(
            '{"intent": "answer_data_question", "confidence": 0.95, '
            f'"resolved_question": "{echoed}", "follow_ups": ["a","b","c","d"]}}',
            "What is their WACC?",
        )
        assert result.resolved_question is None, echoed


def test_a_runaway_rewrite_is_dropped_rather_than_put_in_the_users_mouth():
    """It rewrites ONE message; a long one is the model restating the thread.

    This text is rendered downstream as what the negotiator meant, so the
    failure mode of keeping it is worse than the failure mode of losing it.
    """
    result = _classification(
        '{"intent": "answer_data_question", "confidence": 0.9, '
        f'"resolved_question": "{"x" * 600}", "follow_ups": ["a","b","c","d"]}}',
        "why?",
    )
    assert result.resolved_question is None


def test_a_missing_or_malformed_reading_degrades_quietly():
    """Every other field must survive a classifier that omits or fumbles this one."""
    for raw in (
        '{"intent": "answer_data_question", "confidence": 0.9, "follow_ups": ["a","b","c","d"]}',
        '{"intent": "answer_data_question", "confidence": 0.9, "resolved_question": null, "follow_ups": ["a","b","c","d"]}',
        '{"intent": "answer_data_question", "confidence": 0.9, "resolved_question": 42, "follow_ups": ["a","b","c","d"]}',
        '{"intent": "answer_data_question", "confidence": 0.9, "resolved_question": "   ", "follow_ups": ["a","b","c","d"]}',
    ):
        result = _classification(raw, "why?")
        assert result.resolved_question is None
        assert result.intent.value == "answer_data_question"


def test_the_reading_is_offered_as_a_reading_not_as_the_question():
    """The negotiator's words stay authoritative.

    A rewrite is a second model output. Promoting one to "what the user asked"
    makes a mis-resolved pronoun unfalsifiable — the answering node would have
    nothing left to check it against — so both are rendered and the wording
    wins.
    """
    from utils.prompts.question_focus import render_resolved_reading

    block = render_resolved_reading("why is our buyer leverage high?")
    assert "why is our buyer leverage high?" in block
    assert "stay authoritative" in block
    assert render_resolved_reading(None) == ""
    assert render_resolved_reading("") == ""


def test_the_reading_travels_with_the_follow_up_rule_and_only_with_it():
    """No history means no back-reference to resolve, so nothing to render."""
    with_history = get_format_instruction(
        "conversational", has_history=True,
        resolved_question="why is our buyer leverage high?",
    )
    assert "why is our buyer leverage high?" in with_history

    without_history = get_format_instruction(
        "conversational", has_history=False,
        resolved_question="why is our buyer leverage high?",
    )
    assert "why is our buyer leverage high?" not in without_history


def test_answer_data_question_is_told_which_sources_have_no_data():
    """The facts block omits a null field; omission is not the same as absence.

    Its profile excludes the ranked arguments on purpose — handing them to a
    lookup surface turned "what is their DSO?" into a pitch. But the "no data at
    all" list rode along inside that same block, so excluding one excluded the
    other, and "what is the supplier standard?" met a facts block with simply no
    such line. The model went looking for the nearest figure and answered about
    a different benchmark.
    """
    from utils.prompts.data_question_prompt import build_data_question_prompt

    facts = rich_facts()
    brief = bundle(facts)
    assert brief.unavailable, "fixture must have at least one source with no data"

    prompt = build_data_question_prompt(
        "what is their supplier standard?", facts,
        effective_batna=brief.batna_floor,
        batna_note=brief.batna_note, brief=brief,
    )
    assert "NOT AVAILABLE" in prompt
    assert "never substitute a different source" in prompt
    # And still no ranked argument set — that was excluded for its own reason.
    assert "NEGOTIATION ARGUMENTS" not in prompt


def test_the_unavailable_list_is_not_printed_twice():
    """Surfaces with the arguments block already carry it; two copies read as two signals.

    `summarize`'s summary scope renders a fixed skeleton that omits unavailable
    sources entirely (see `utils.prompts.summary_template`), so this guard now
    applies to the narrow scope — the one surface that still assembles the raw
    data blocks (`render_brief`) alongside the reference briefing.
    """
    from utils.prompts.summarize_prompt import build_summarize_narrow_prompt

    facts = rich_facts()
    brief = bundle(facts)
    assert brief.unavailable, "fixture must have at least one source with no data"
    prompt = build_summarize_narrow_prompt("where do we stand?", facts, brief=brief)
    assert prompt.count("NOT AVAILABLE") == 1
