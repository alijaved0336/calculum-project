"""One intent, two scopes: the fixed client template, or one question inside it.

`summarize_supplier_position` covers both "summarize the position" and "what's
driving the outlook?". A template cannot answer the second; free prose cannot
guarantee the first. The classifier says which one the negotiator asked for
(`summary_scope`), and the node branches on it.
"""
from __future__ import annotations

import asyncio
import json
from typing import Any

import pytest

from agents.nodes.intent_classifier import make_intent_classifier_node
from agents.nodes.summarize import make_summarize_node
from domain.entities.intent import Intent, IntentClassification
from domain.services.brief_builder import brief_from
from infrastructure.intent.llm_intent_classifier import LLMIntentClassifier
from tests.unit.prompt_fixtures import client_sample_facts
from utils.prompts.intent_classifier_prompt import intent_prompt
from utils.prompts.summarize_prompt import (
    build_summarize_narrow_prompt,
    summarize_narrow_system_prompt,
)
from utils.prompts.summary_template import render_summary_skeleton


class _FakeLLM:
    def __init__(self, outputs: list[str]) -> None:
        self.outputs = list(outputs)
        self.calls: list[dict[str, Any]] = []

    async def complete(self, prompt: str, **kwargs) -> str:
        self.calls.append({"prompt": prompt, **kwargs})
        return self.outputs.pop(0)


# ── Classifier ─────────────────────────────────────────────────────────────


def _classify(payload: dict) -> IntentClassification:
    llm = _FakeLLM([json.dumps(payload)])
    return asyncio.run(LLMIntentClassifier(llm).classify("q"))


def test_classifier_parses_narrow_scope():
    result = _classify({
        "intent": "summarize_supplier_position", "confidence": 0.9,
        "response_mode": "conversational", "summary_scope": "narrow",
    })
    assert result.intent is Intent.SUMMARIZE_SUPPLIER_POSITION
    assert result.summary_scope == "narrow"


@pytest.mark.parametrize("value", [None, "summary", "SUMMARY", "whole", 3])
def test_anything_but_narrow_is_the_template(value):
    payload = {"intent": "summarize_supplier_position", "confidence": 0.9}
    if value is not None:
        payload["summary_scope"] = value
    assert _classify(payload).summary_scope == "summary"


def test_classifier_prompt_defines_the_scope_and_asks_for_it():
    assert "## SUMMARY SCOPE" in intent_prompt
    assert '"summary_scope": "<summary|narrow>"' in intent_prompt
    assert '"summary_scope": "narrow"' in intent_prompt  # at least one example


def test_classifier_node_writes_the_scope_to_state():
    class _Port:
        async def classify(self, message, context=None, history=None):
            return IntentClassification(
                intent=Intent.SUMMARIZE_SUPPLIER_POSITION, confidence=0.9,
                summary_scope="narrow",
            )

    out = asyncio.run(make_intent_classifier_node(_Port())({"message": "outlook?"}))
    assert out["summary_scope"] == "narrow"


# ── Narrow prompt ──────────────────────────────────────────────────────────


def test_narrow_prompt_carries_the_data_and_the_reference_briefing():
    facts = client_sample_facts()
    brief = brief_from(facts)
    prompt = build_summarize_narrow_prompt("what's driving the outlook?", facts, brief=brief)
    assert "## FACTS" in prompt
    assert "## NEGOTIATION ARGUMENTS" in prompt
    assert "## ANALYSIS" in prompt
    assert "- Leverage:" in prompt
    assert "- Financial Sensitivity:" in prompt
    assert "reference only, do not reproduce" in prompt
    assert "**Probability of Success**: High" in prompt


def test_narrow_system_prompt_answers_one_thing_from_the_data():
    assert "SPECIFIC question" in summarize_narrow_system_prompt
    assert "Do NOT\n   reproduce it" in summarize_narrow_system_prompt
    assert "Never score the signals" in summarize_narrow_system_prompt


# ── Node branch ────────────────────────────────────────────────────────────


def _state(**kw) -> dict[str, Any]:
    brief = brief_from(client_sample_facts())
    return {
        "message": "How much leverage do we have?",
        "context": type("Ctx", (), {"facts": brief.facts, "raw": {}})(),
        "brief": brief,
        **kw,
    }


def test_narrow_scope_answers_from_data_without_the_template():
    answer = (
        "Our leverage is **low**.\n"
        "  • **Buyer Leverage**: low — the supplier is a large, AA-rated company.\n"
        "  • **Position**: current **45 days** → target **60 days**; No BATNA."
    )
    llm = _FakeLLM([answer])
    result = asyncio.run(make_summarize_node(llm)(_state(summary_scope="narrow")))
    assert len(llm.calls) == 1
    assert llm.calls[0]["stream_to_client"] is False
    assert "## FACTS" in llm.calls[0]["prompt"]
    assert "LENGTH INSTRUCTION" in llm.calls[0]["prompt"]
    assert result["response"] == answer
    assert "errors" not in result


def test_narrow_scope_revises_an_ungrounded_draft_once():
    good = "Our leverage is **low** against a current **45 days** term."
    llm = _FakeLLM(["Our leverage is low; they usually accept 99 days.", good])
    result = asyncio.run(make_summarize_node(llm)(_state(summary_scope="narrow")))
    assert len(llm.calls) == 2
    assert "FAILED THESE CHECKS" in llm.calls[1]["prompt"]
    assert "99 days" in llm.calls[1]["prompt"]
    assert result["response"] == good


def test_summary_scope_and_missing_scope_default_to_large():
    from utils.prompts.supplier_summary import render_supplier_summary
    expected = render_supplier_summary(brief_from(client_sample_facts()), "large")
    for scope in ("summary", None):
        llm = _FakeLLM([])
        state = _state(message="Summarize supplier data")
        if scope is not None:
            state["summary_scope"] = scope
        result = asyncio.run(make_summarize_node(llm)(state))
        assert llm.calls == []
        assert result["summary_tier"] == "large"
        assert result["response"] == expected


# ── Verifier knows the benchmark statistics ────────────────────────────────


def test_benchmark_average_and_quartile_are_sourced_figures():
    """A narrow answer quoting "75 days by top 3rd-quartile clients" is quoting
    the brief. The P1 allowlist used to hold the value alone, so the shared
    verifier flagged the statistics the argument line now carries."""
    from domain.services.output_verifier import known_day_figures, verify_output

    brief = brief_from(client_sample_facts())
    known = known_day_figures(brief)
    assert {67, 65, 75} <= known
    assert verify_output("They accept 67 days on average and 75 days at the top quartile.", brief)
