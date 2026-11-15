"""A relayed supplier objection goes to the pushback node, even when it asks for "arguments".

"Our supplier says they dominate the market and we need them more than they
need us. What counter-arguments can I use?" was classified explain_recommendation:
"what arguments can I use" matched its recommending-arguments rule. That surface
argued the case for the target instead of answering the objection, and told the
negotiator to "remind them" of our annual spend — an internal figure.
"""
from __future__ import annotations

import asyncio

import pytest

from agents.nodes.intent_classifier import (
    make_intent_classifier_node,
    relays_supplier_objection,
)
from domain.entities.intent import Intent, IntentClassification
from utils.prompts.intent_classifier_prompt import intent_prompt


class FakeClassifier:
    def __init__(self, result: IntentClassification) -> None:
        self.result = result

    async def classify(self, *_: object, **__: object) -> IntentClassification:
        return self.result


def _classify(message: str, intent: Intent) -> dict:
    node = make_intent_classifier_node(
        FakeClassifier(IntentClassification(intent=intent, confidence=0.92))
    )
    return asyncio.run(node({"message": message, "conversation_history": []}))


@pytest.mark.parametrize("message", [
    "Our supplier says they dominate the market and we need them more than they "
    "need us. What counter-arguments can I use?",
    "They claim their standard terms are 30 days, which arguments should I use?",
    "the supplier keeps saying 75 days is impossible for them, what do I say back?",
    "their CFO told us the DSO hit is too big, what arguments work here?",
    "vendor pushed back on the 75 days because of their bank covenant — best arguments?",
    "What arguments should I use if they say they can't afford it?",
])
def test_a_relayed_objection_misfiled_as_explain_recommendation_goes_to_pushback(message):
    out = _classify(message, Intent.EXPLAIN_RECOMMENDATION)
    assert out["intent"] is Intent.HANDLE_SUPPLIER_PUSHBACK
    assert out["pushback_anticipate"] is False


@pytest.mark.parametrize("message", [
    # Argument selection with nothing relayed.
    "which arguments should I use?",
    "recommend negotiation arguments",
    "should I use the industry benchmark or the supplier standard?",
    # The subject is a benchmark, or the assistant — not the supplier.
    "what does the supplier standard say about this?",
    "why do you say 75 days and not 60?",
    # Disclosure permission: what the NEGOTIATOR may say.
    "can I tell them they accept longer terms elsewhere?",
    "is it safe to say they already accept 60 days with their other customers?",
    "they said they want proof — can I mention the peer group figure?",
])
def test_argument_selection_and_disclosure_questions_stay_explain_recommendation(message):
    out = _classify(message, Intent.EXPLAIN_RECOMMENDATION)
    assert out["intent"] is Intent.EXPLAIN_RECOMMENDATION


@pytest.mark.parametrize("intent", [
    Intent.ANSWER_DATA_QUESTION,
    Intent.EVALUATE_COUNTER_OFFER,
    Intent.RUN_SCENARIO,
])
def test_only_explain_recommendation_is_rerouted(intent):
    out = _classify("they said they'd accept 60 days, is that worth it?", intent)
    assert out["intent"] is intent


def test_the_detector():
    assert relays_supplier_objection("Our supplier says they dominate the market")
    assert not relays_supplier_objection("which benchmark should I cite first?")


def test_the_classifier_prompt_states_the_precedence():
    assert "they say they dominate the market, what counter-arguments can I use?" in intent_prompt
    assert len(intent_prompt) <= 50_000
