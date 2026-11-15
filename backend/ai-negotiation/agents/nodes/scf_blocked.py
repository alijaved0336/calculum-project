from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.services.scf_policy import scf_refusal_message, scf_unofferable_message

logger = logging.getLogger(__name__)


def make_scf_blocked_node() -> NodeFn:
    """Build the `scf_blocked` node.

    No LLM call. Reached when the user's request is about Supply Chain Finance
    but it cannot go ahead: either SCF is disabled for this session
    (`scf_enabled` is False), or it is enabled but cannot be offered to this
    supplier (`brief.scf_offerable` is False — e.g. the SCF email template with
    no programme rate on file). It returns a fixed, honest reply for whichever
    case applies, so the model is never given the chance to describe or pitch
    SCF. This is the hard route block that backs up the data-level stripping in
    `domain.services.scf_policy`.
    """

    async def scf_blocked_node(state: NegotiationState) -> dict[str, Any]:
        if state.get("scf_enabled", False):
            brief = state.get("brief")
            reason = brief.scf_inviable_reason if brief is not None else None
            logger.info(
                "scf_blocked: SCF request refused (not offerable: %s) — reasoning=%s",
                reason,
                state.get("intent_reasoning"),
            )
            response = scf_unofferable_message(reason)
        else:
            logger.info(
                "scf_blocked: SCF request refused (scf disabled) — reasoning=%s",
                state.get("intent_reasoning"),
            )
            response = scf_refusal_message()
        return {"response": response, "source": {}, "blocked_by": "scf_disabled"}

    return scf_blocked_node
