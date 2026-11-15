"""Generate, verify, revise once, then ship — labelled if it still fails.

The shape §3.4 asks for, in one place so nineteen nodes do not each grow their
own version of it. Two bespoke validators on two nodes is how the codebase got
here; a third bespoke one would not be an improvement.

The policy, from §6.3:

  * every node VERIFIES — the deterministic checks are free;
  * only the document-shaped outputs REGENERATE — a revision pass costs a whole
    round-trip, and the negotiator already finds the assistant slow;
  * a draft that fails twice still ships, and ships CLEAN.

That last point reverses an earlier policy (client, 2026-08-25). A draft that
failed twice used to ship with a "[Check before using — this draft did not pass
the data checks: …]" banner stapled to the end of the document. The reasoning
was that the negotiator should decide knowingly — but in practice the checks
fire on figures the playbook is INSTRUCTED to state (the current-vs-target term
gap, the current term inside a sentence that also contains the word "justified")
and the banner reached the client on a perfectly good playbook. A false alarm
printed at the bottom of a prep document does not make the negotiator careful;
it makes the document look broken and the checks worthless.

So the verdict is now INTERNAL: violations go to the logs and to the node's
`errors` field, where the team sees them, and never into the text the negotiator
reads. The checks still run, and still drive the one corrective retry.
"""
from __future__ import annotations

import logging
from typing import Any, Awaitable, Callable

from domain.entities.brief import NegotiationBrief
from domain.services.output_verifier import (
    Violation,
    format_verification_feedback,
    verify_output,
)

logger = logging.getLogger(__name__)

# A generator takes the (possibly amended) prompt and returns the draft.
Generate = Callable[[str], Awaitable[str]]


async def generate_verified(
    *,
    node: str,
    prompt: str,
    brief: NegotiationBrief | None,
    generate: Generate,
    revise: bool = True,
    postprocess: Callable[[str], str] | None = None,
    initial: str | None = None,
) -> tuple[str, list[Violation]]:
    """Run ``generate``, verify against ``brief``, and revise at most once.

    Returns ``(text, violations)``. ``violations`` is empty when the output
    passed — on the first attempt or the second. The TEXT is the same either
    way: nothing is stamped onto it. A caller returns it as-is and uses the
    list for its ``errors`` field and its logs.

    ``revise=False`` verifies and labels without spending a second call — the
    setting for conversational surfaces, where latency is felt most and the
    output is short enough for the negotiator to sanity-check themselves.

    ``postprocess`` runs on every draft before verification (playbook structure
    normalisation, for instance), so the text that is checked is the text that
    ships.

    ``initial`` hands in a draft the caller already generated, so it is
    verified rather than regenerated. The playbook needs this: it has its own
    structural retry that runs first, and calling ``generate`` again here would
    silently double every playbook request.
    """
    def _finish(text: str) -> str:
        return postprocess(text) if postprocess else text

    draft = _finish(initial) if initial is not None else _finish(await generate(prompt))
    result = verify_output(draft, brief)
    if result:
        return draft, []

    if not revise:
        logger.warning(
            "%s: output failed verification (not revising) — %s",
            node, ", ".join(result.codes),
        )
        return draft, result.violations

    logger.warning(
        "%s: output failed verification (%s) — revising once",
        node, ", ".join(result.codes),
    )
    retry_prompt = f"{prompt}\n\n{format_verification_feedback(result.violations)}"
    draft = _finish(await generate(retry_prompt))

    result = verify_output(draft, brief)
    if result:
        return draft, []

    logger.error(
        "%s: output still failing verification after revision — %s",
        node, "; ".join(str(v) for v in result.violations),
    )
    return draft, result.violations


def verification_errors(node: str, violations: list[Violation]) -> dict[str, Any]:
    """The ``errors`` fragment for a node result, or nothing when it passed."""
    if not violations:
        return {}
    return {"errors": [f"{node}: {v}" for v in violations]}
