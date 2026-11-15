from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

# Fixed set shown on every session's first screen. Deliberately NOT randomised:
# a consistent, predictable entry point beats novelty here (client feedback).
_FIXED_STARTER_QUESTIONS: tuple[str, ...] = (
    "Show key facts about the supplier.",
    "Provide summary of payment terms opportunity.",
    "Generate negotiation playbook.",
    "Draft email for payment term optimization.",
)


async def generate_starter_questions() -> list[str]:
    """Return the fixed 4 starter questions shown at the start of a session."""
    logger.info(
        "starter_questions: source=fixed count=%d",
        len(_FIXED_STARTER_QUESTIONS),
    )
    return list(_FIXED_STARTER_QUESTIONS)
