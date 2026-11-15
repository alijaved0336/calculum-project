from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.services.improvement_opportunity import assess_improvement_opportunity

logger = logging.getLogger(__name__)


def make_no_opportunity_node() -> NodeFn:
    """Build the `no_opportunity` node.

    No LLM call. Reached when the ask is at or below the current payment terms
    (§2) and the request would otherwise have produced a strategy, a playbook,
    an opening or a supplier-facing draft.

    The message is computed, not generated: it states both figures, says plainly
    that there is nothing to negotiate, and offers a higher target ONLY when a
    benchmark above the current term evidences one. Routing here rather than
    prompting for it is the point — a model handed a 90-day ask against 90-day
    terms writes a confident playbook for a negotiation that does not exist, and
    no prompt wording reliably stopped it.

    The same node answers the regulatory case — an APPLIED regulatory cap at or
    below the current terms — with the difference that no higher target is
    offered there, because none would survive the cap. The verdict says which
    of the two closed the door (``blocked_by``).
    """

    async def no_opportunity_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        verdict = assess_improvement_opportunity(context.facts)
        logger.info(
            "no_opportunity: blocked %s (%s) — current=%s ask=%s "
            "regulatory_cap=%s suggested=%s",
            state.get("intent"),
            verdict.blocked_by,
            verdict.current_term_days,
            verdict.ask_term_days,
            verdict.regulatory_cap_days,
            verdict.suggested_target_days,
        )
        return {"response": verdict.message, "source": {}, "blocked_by": verdict.blocked_by}

    return no_opportunity_node
