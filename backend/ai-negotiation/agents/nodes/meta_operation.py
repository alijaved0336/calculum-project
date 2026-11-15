from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.services.scf_policy import apply_scf_prompt_policy
from domain.ports.llm_port import LLMPort
from utils.prompts.meta_operation_prompt import (
    build_meta_operation_prompt,
    meta_operation_system_prompt,
)

logger = logging.getLogger(__name__)

_RULE = "-" * 88

# Returned when the user asks to operate on prior output but there is none yet
# (e.g. their first message in a fresh thread is "make it shorter"). Phrased as
# what the negotiator can do next — never references internal mechanics.
_NO_HISTORY_MESSAGE = (
    "I don't have an earlier response in this conversation to work with yet. "
    "Tell me what you'd like me to put together first — for example a supplier "
    "summary, an opening strategy, or a full negotiation guide — and once it's "
    "there you can ask me to reshape it, shorten it, or pull specific points "
    "out of it however you need."
)




def make_meta_operation_node(llm: LLMPort) -> NodeFn:
    """Build the `meta_operation` node.

    Unlike every other agent node — which generates fresh output from the
    supplier's brief — this node operates on what the conversation has
    ALREADY produced. It covers three things the negotiator asks for over
    existing material:

      - TRANSFORM   reshape a previous response (shorter/longer, reformat,
                    remove/add/change a part) without regenerating it, so edits
                    accumulate instead of being thrown away.
      - RECALL      summarize or recall what's been discussed in the thread.
      - SYNTHESIZE  build a custom output from named attributes, pulling from the
                    conversation first and `context.facts` only for values not
                    already stated.

    `conversation_history` is the primary input. The turn's `brief` is passed as
    an optional reference for synthesis but is NOT required — editing and recall
    work from history alone, so this node does not hard-fail when supplier
    context is missing; it only needs *some* prior turn to act on.

    Like summarize/explain/guide, the output is for the negotiator's own use, so
    the asymmetry guard is intentionally skipped: running it would redact the
    very figures a playbook edit must preserve. The system prompt instead forbids
    introducing new internal figures into supplier-facing text being reshaped.

    The `response_mode` format instruction other nodes append is deliberately NOT
    added here — the negotiator's instruction ("make it shorter", "expand the
    objections") is itself the format directive, and layering a second generic
    one on top would only create conflict.
    """

    async def meta_operation_node(state: NegotiationState) -> dict[str, Any]:
        history = state.get("conversation_history")
        if not history:
            logger.info("meta_operation: no conversation history to operate on")
            return {"response": _NO_HISTORY_MESSAGE}

        message = state.get("message", "")
        context = state.get("context")
        prompt = build_meta_operation_prompt(
            message, history, state.get("brief"),
            prompt_instructions=state.get("prompt_instructions"),
        )

        try:
            draft = await llm.complete(prompt, system=apply_scf_prompt_policy(meta_operation_system_prompt, state.get("brief"), state.get("scf_enabled", False)), stream_to_client=True)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("meta_operation: drafting failed")
            return {"response": None, "errors": [f"meta_operation: {exc}"]}

        return {"response": draft}

    return meta_operation_node
