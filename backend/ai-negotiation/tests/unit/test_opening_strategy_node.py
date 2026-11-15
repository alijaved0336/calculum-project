"""The opening-strategy node: the turn's length reaches the model.

The node used to overwrite `response_mode` with a hard-coded "full", so the
three-section document was forced onto every request. That was defensible while
the document was a fixed five-section template that a shorter mode could
collapse into unreadable output. It is not defensible now: the client asked for
a strategy that bends to what the negotiator actually asked for, and "just give
me the line to open with" cannot be honoured by a prompt that was told, before
the model saw it, to produce the whole document.
"""
from __future__ import annotations

from typing import Any

import pytest

from agents.nodes.opening_strategy import make_opening_strategy_node
from domain.services.context_builder import build_supplier_context


class _FakeLLM:
    def __init__(self, response: str = "**1. Target**\nTarget: **60 days**.") -> None:
        self._response = response
        self.prompts: list[str] = []
        self.systems: list[str] = []

    async def complete(self, prompt: str, **kwargs: Any) -> str:
        self.prompts.append(prompt)
        self.systems.append(kwargs.get("system", ""))
        return self._response


def _payload() -> dict[str, Any]:
    return {
        "supplier": {
            "name": "Adp, Inc", "uuid": "u1", "country": "United States",
            "mainIndustryName": "Data Processing Services", "companySize": "LARGE",
            "spendVolume": 4_000_000.0,
        },
        "target": {"targetPaymentTerms": 60, "opportunityPaymentTerms": 76},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": 45,
            "actualPaymentTerms": 45,
        },
        "agreement": {},
        "negotiationStrategy": {
            "supplierStandard": {"value": 67, "occurrences": 16, "avg": 67, "q3": 79},
            # Above current + 15 (45 + 15 = 60, ask 75) so it clears the
            # benchmark support bar and reaches the evidence block.
            "peerGroupStandard": {
                "value": 65, "applied": True, "occurrences": 40, "avg": 58, "q3": 64,
            },
        },
    }


async def _run(llm, **state):
    node = make_opening_strategy_node(llm)
    return await node({
        "message": "what's my opening strategy?",
        "context": build_supplier_context(_payload()),
        **state,
    })


# ── The length the classifier read is the length the model is given ────────


@pytest.mark.asyncio
async def test_a_quick_request_is_not_expanded_into_the_full_document():
    llm = _FakeLLM()
    await _run(llm, message="just give me the line to open with", response_mode="quick")
    prompt = llm.prompts[0]
    assert "MUST be 2–3 sentences" in prompt
    assert "comprehensive" not in prompt


@pytest.mark.asyncio
async def test_a_focused_request_keeps_its_conversational_length():
    llm = _FakeLLM()
    await _run(llm, message="how should I frame this?", response_mode="conversational")
    assert "not a request for a full structured brief" in llm.prompts[0]


@pytest.mark.asyncio
async def test_a_plain_request_still_gets_the_full_document():
    llm = _FakeLLM()
    await _run(llm, response_mode="full")
    assert "comprehensive" in llm.prompts[0].lower()


@pytest.mark.asyncio
async def test_an_unclassified_turn_falls_back_to_full():
    """A direct invocation with no classification behind it is the old
    behaviour, and the whole document is the right default for it."""
    llm = _FakeLLM()
    await _run(llm)
    assert "comprehensive" in llm.prompts[0].lower()


# ── What the model is actually handed ──────────────────────────────────────


@pytest.mark.asyncio
async def test_the_evidence_for_section_one_reaches_the_prompt():
    llm = _FakeLLM()
    await _run(llm)
    prompt = llm.prompts[0]
    assert "## BENCHMARK EVIDENCE" in prompt
    assert "backed by 16 occurrences in the Calculum database" in prompt
    assert "Adp, Inc is already accepting on average 67 days" in prompt
    assert "[APPLIED" in prompt


@pytest.mark.asyncio
async def test_the_deleted_sections_are_not_in_the_system_prompt():
    llm = _FakeLLM()
    await _run(llm)
    system = llm.systems[0]
    assert "**1. Target**" in system
    assert "**2. Framing**" in system
    assert "**3. Suggested Opening**" in system
    assert "Sequencing" not in system
    assert "If They Push Back Immediately" not in system


@pytest.mark.asyncio
async def test_the_system_prompt_hands_the_shape_to_the_negotiator():
    llm = _FakeLLM()
    await _run(llm)
    assert "THE REQUEST DECIDES THE SHAPE" in llm.systems[0]
