"""Prompt rules that decide whether a definition question can reach the KB.

These assert on the PROMPT TEXT, not on model output — the classifier is an LLM
call and cannot run in unit tests. They exist because each rule below was a
live bug, and a well-meaning prompt edit can silently undo any of them.
"""
from __future__ import annotations

from agents.graph import _NO_RAG_INTENTS
from domain.entities.intent import Intent
from utils.prompts.data_question_prompt import data_question_system_prompt
from utils.prompts.intent_classifier_prompt import intent_prompt


def test_only_answer_data_question_can_reach_the_knowledge_base():
    """The premise the leverage rule depends on: summarize never sees the KB, so
    routing a definition question there means it can never be answered."""
    assert Intent.SUMMARIZE_SUPPLIER_POSITION in _NO_RAG_INTENTS
    assert Intent.ANSWER_DATA_QUESTION not in _NO_RAG_INTENTS


def test_a_leverage_definition_question_is_routed_away_from_the_briefing():
    """"what is buyer leverage" used to go to summarize_supplier_position, which
    never searches the KB, so the concept could not be explained at all."""
    assert '"what is buyer leverage"' in intent_prompt
    leverage_rule = next(
        line for line in intent_prompt.splitlines() if line.startswith("- LEVERAGE")
    )
    concept, standing = leverage_rule.split("Where WE STAND", 1)
    assert "answer_data_question" in concept
    assert "summarize_supplier_position" in standing


def test_the_classifier_is_told_to_carry_the_aspect_of_a_follow_up_forward():
    """"what's the difference compared to X" after a DEFINITION turn is asking
    about definitions; resolving it as a value lookup answered "not available"
    to a question that never asked for a number."""
    assert "An ASPECT is a back-reference" in intent_prompt
    assert "difference between the definition of the supplier standard" in intent_prompt


def test_a_correction_keeps_the_subject_of_the_turn_it_corrects():
    """"no I mean in terms of definition" must stay a comparison of both terms,
    not collapse into a single-term definition question."""
    assert "A correction" in intent_prompt
    assert "still compares those two things" in intent_prompt


def test_the_answering_prompt_knows_how_to_compare_two_concepts():
    """It only had DEFINITION and VALUE branches; a comparison fell through to
    the value reading, and a definition comparison named only one of the two."""
    assert "A COMPARISON question" in data_question_system_prompt
    assert "Comparing DEFINITIONS" in data_question_system_prompt
    assert "Both halves, always" in data_question_system_prompt


def test_intent_prompt_fits_the_llm_context_window():
    # The classifier LLM serves a 12,800-token context. The prompt reached
    # 13,073 tokens on its own (2026-09-17) and every turn failed with
    # "400 Bad Request: exceed_context_size_error". At ~4.3 chars/token, 50k
    # chars is ~11.6k tokens: room for the capped history (~550 tokens) and the
    # 512-token answer. Trim before raising this.
    from utils.prompts.intent_classifier_prompt import intent_prompt

    assert len(intent_prompt) <= 50_000, len(intent_prompt)
