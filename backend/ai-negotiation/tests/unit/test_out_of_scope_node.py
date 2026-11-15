"""out_of_scope node: explains WHY a message was refused via a small LLM call,
and falls back to the fixed message when that call fails."""
from __future__ import annotations

from typing import Any

import pytest

from agents.nodes.out_of_scope import _DEFAULT_MESSAGE, make_out_of_scope_node


class _FakeLLM:
    def __init__(self, response: str = "explanation", fail: bool = False) -> None:
        self._response = response
        self._fail = fail
        self.prompts: list[str] = []
        self.systems: list[str] = []

    async def complete(self, prompt: str, **kwargs: Any) -> str:
        if self._fail:
            raise RuntimeError("boom")
        self.prompts.append(prompt)
        self.systems.append(kwargs.get("system", ""))
        return self._response


def _state() -> dict:
    return {
        "session_id": "s1",
        "message": "what's our total spend across all suppliers?",
        "intent_reasoning": "Cross-supplier total, not this one supplier's term change.",
    }


@pytest.mark.asyncio
async def test_reasoning_and_message_reach_the_prompt():
    llm = _FakeLLM("That covers every supplier, not just this one.")
    result = await make_out_of_scope_node(llm)(_state())

    assert result["response"] == "That covers every supplier, not just this one."
    assert "Cross-supplier total" in llm.prompts[0]
    assert "across all suppliers" in llm.prompts[0]
    assert "## SECURITY" in llm.systems[0]


@pytest.mark.asyncio
async def test_llm_failure_falls_back_to_fixed_message():
    result = await make_out_of_scope_node(_FakeLLM(fail=True))(_state())
    assert result["response"] == _DEFAULT_MESSAGE


@pytest.mark.asyncio
async def test_empty_completion_falls_back_to_fixed_message():
    result = await make_out_of_scope_node(_FakeLLM(""))(_state())
    assert result["response"] == _DEFAULT_MESSAGE
