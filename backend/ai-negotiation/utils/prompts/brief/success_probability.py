"""The SUCCESS PROBABILITY block — how likely the ask is to be AGREED.

This replaces the scored "negotiating strength" verdict that stood here until
2026-08-20. That composite was computed in the domain from five inputs — spend
volume, buyer leverage, credit rating, cost impact and company size — and the
client dropped it: the upstream payload already carries its own read of whether
the ask lands, as ``supplier.successProbability``, and two answers to one
question is one answer too many.

So nothing is scored any more. The five inputs the composite consumed are still
put in front of the model, but as the plain facts they are (see
:mod:`utils.prompts.brief.facts`) — buyer leverage, credit rating, company size
and spend volume in the FACTS block, cost impact as an assessment in the
ARGUMENTS block — and the model reasons over them directly instead of over
points it cannot trace.

The block below exists for the surfaces that render NO facts block at all (a
scenario calculation, an SCF pitch): they still need this one signal, and
without it the only way for them to get it would be a whole FACTS block they
have no other use for. Every surface that renders facts already gets the line
from there — see :data:`utils.prompts.brief.profiles.INTENT_PROFILES` — so the
signal is never printed twice in one prompt.
"""
from __future__ import annotations

from domain.entities.brief import NegotiationBrief
from utils.constants import format_camel_label

HEADING = "## SUCCESS PROBABILITY — decided upstream, apply, do not recompute"

# Read by the FACTS block too, so the same signal is described the same way
# wherever it is rendered.
LABEL = "Success Probability (upstream read on how likely this ask is to be agreed)"

APPLY_NOTE = (
    "- Let this set how confidently the ask is framed. It says how likely the "
    "supplier is to AGREE — not how hard we could push, and not how good our "
    "evidence is. Never turn it into a score, a percentage or a "
    "\"negotiating strength\": it is a level, and there is no calculation "
    "behind it to show."
)
INTERNAL_NOTE = (
    "- Internal only: never state it, or the fact that we rate it at all, to "
    "the supplier."
)
UNKNOWN_NOTE = (
    "- Success probability: not provided for this supplier. Say the read is "
    "unavailable — never infer one from the leverage, the credit rating, the "
    "spend or the strength of the arguments."
)


def render_success_probability(brief: NegotiationBrief | None) -> str:
    """The success-probability block, or "" when there is no brief."""
    if brief is None or brief.facts is None:
        return ""
    level = brief.success_probability
    if not level:
        return "\n".join([HEADING, UNKNOWN_NOTE])
    return "\n".join(
        [HEADING, f"- {LABEL}: {format_camel_label(str(level))}", APPLY_NOTE, INTERNAL_NOTE]
    )
