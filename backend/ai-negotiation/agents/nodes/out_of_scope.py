from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.ports.llm_port import LLMPort
from utils.prompts.out_of_scope_prompt import (
    build_out_of_scope_prompt,
    out_of_scope_system_prompt,
)

logger = logging.getLogger(__name__)

# Returned only when the explanation call fails.
_DEFAULT_MESSAGE = (
    "This assistant is focused on negotiating payment terms with a single "
    "supplier — summarizing their position, running term-change scenarios, "
    "handling their pushback, and drafting negotiation guides for "
    "this account. I can't help with that request as phrased. If it does "
    "concern this supplier, try rephrasing it as a specific question about "
    "them — their profile, their benchmarks, or their current, target, or "
    "proposed term."
)


def make_out_of_scope_node(llm: LLMPort) -> NodeFn:
    """Build the `out_of_scope` node.

    The intent classifier has already decided the message falls outside
    single-supplier payment-term negotiation. A static refusal hid WHY, so the
    negotiator could not tell a misread from a genuine limit. This node makes
    one small LLM call that turns the classifier's reasoning into a plain-words
    explanation and asks the negotiator to clarify if they meant something
    else. Falls back to the fixed message if the call fails.
    """

    async def out_of_scope_node(state: NegotiationState) -> dict[str, Any]:
        reasoning = state.get("intent_reasoning")
        logger.info("out_of_scope: %s", reasoning)

        context = state.get("context")
        facts = getattr(context, "facts", None) if context is not None else None
        prompt = build_out_of_scope_prompt(
            state.get("message", ""),
            reasoning,
            state.get("conversation_history"),
            supplier_name=getattr(facts, "supplier_name", None),
        )

        try:
            draft = await llm.complete(prompt, system=out_of_scope_system_prompt, stream_to_client=True)
        except Exception:
            logger.exception("out_of_scope: explanation failed, using fixed message")
            return {"response": _DEFAULT_MESSAGE}

        return {"response": draft or _DEFAULT_MESSAGE}

    return out_of_scope_node
