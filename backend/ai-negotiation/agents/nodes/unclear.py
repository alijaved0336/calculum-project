from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn

logger = logging.getLogger(__name__)

_UNCLEAR_MESSAGE = (
    "I couldn't understand that message. Could you rephrase it as a "
    "question or request about this supplier's payment-term negotiation?"
)


def make_unclear_node() -> NodeFn:
    """Build the `unclear` node.

    No LLM call: the intent classifier has already determined the message is
    garbled or has no discernible meaning, so this node just returns a fixed
    "please rephrase" message.
    """

    async def unclear_node(state: NegotiationState) -> dict[str, Any]:
        return {"response": _UNCLEAR_MESSAGE}

    return unclear_node
