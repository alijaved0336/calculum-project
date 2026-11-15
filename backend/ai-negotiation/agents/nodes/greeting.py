from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from agents.state import NegotiationState

logger = logging.getLogger(__name__)

NodeFn = Callable[[NegotiationState], Awaitable[dict[str, Any]]]

_GREETING_TEMPLATE = (
    "Hi, {user_name}, I'm your Calculum AI Assistant. I can help you with this "
    "supplier's negotiation — summarizing their position, running "
    "term-change scenarios, handling their pushback, and drafting "
    "negotiation guides for this account. What would you like to do?"
)

_GREETING_FALLBACK = (
    "Hi, I'm your Calculum AI Assistant. I can help you with this "
    "supplier's negotiation — summarizing their position, running "
    "term-change scenarios, handling their pushback, and drafting "
    "negotiation guides for this account. What would you like to do?"
)


# What "hello" and "thanks" have in common is that there is nothing to act on;
# what they do NOT have in common is where they sit in a conversation. The
# intent cannot tell them apart — "good" opens no thread and closes one — but
# the state can, so the choice is made here on whether a thread already exists.
#
# It used to be one branch, and the negotiator who said "good" after four turns
# of work was introduced to the assistant from scratch, as though nothing had
# happened. That reads as the assistant having forgotten the conversation,
# which — at that point in the thread — it had.
_ACKNOWLEDGEMENT = "Happy to help. What next?"

_ACKNOWLEDGEMENT_NAMED = "Happy to help, {user_name}. What next?"


def make_greeting_node() -> NodeFn:
    """Build the `greeting` node.

    No LLM call: the intent classifier has already determined the message is a
    bare greeting or acknowledgement with no negotiation content. This node
    picks between introducing the assistant and simply acknowledging, on whether
    the thread has any prior turns.
    """

    async def greeting_node(state: NegotiationState) -> dict[str, Any]:
        user_name = state.get("user_name")
        # Mid-thread, this is "good" / "thanks" / "ok" — an acknowledgement, not
        # a first contact. Re-introducing the assistant here is the single most
        # obvious way to look like it has lost the conversation.
        if state.get("conversation_history"):
            message = (
                _ACKNOWLEDGEMENT_NAMED.format(user_name=user_name)
                if user_name
                else _ACKNOWLEDGEMENT
            )
        else:
            message = (
                _GREETING_TEMPLATE.format(user_name=user_name)
                if user_name
                else _GREETING_FALLBACK
            )
        return {"response": message}

    return greeting_node
