from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)


def merge_prompt_instructions(
    global_pi: dict | None,
    tenant_pi: dict | None,
) -> dict | None:
    """Re-index global then tenant into one map (keys collide across scopes)."""
    entries = [*(global_pi or {}).values(), *(tenant_pi or {}).values()]
    return {str(i): e for i, e in enumerate(entries)} or None


def extract_active_instructions(prompt_instructions: dict | None) -> list[str]:
    """Filter prompt_instructions to enabled, non-conflicted entries only.

    Each entry: {"prompt": str, "is_enabled": bool, "is_conflicted": bool, ...}
    """
    if not prompt_instructions:
        return []
    result = []
    for entry in prompt_instructions.values():
        if not (entry.get("is_enabled", True) and not entry.get("is_conflicted", False)):
            continue
        text = (entry.get("prompt") or "").strip()
        if text:
            result.append(text)
    return result


# Operator rules that cap response LENGTH (word/sentence/character budgets).
# Meant for chat replies — applied to a fixed-format document (the six-section
# playbook) they truncate it mid-section, so document nodes filter them out.
_LENGTH_RULE_RE = re.compile(
    r"""(?ix)
    (?: \b(?:under|within|at\s+most|no\s+more\s+than|fewer\s+than|less\s+than|max(?:imum)?(?:\s+of)?)\s+\d+\s*(?:words?|sentences?|characters?|paragraphs?)\b
      | \b\d+\s*(?:words?|sentences?|characters?|paragraphs?)\s+(?:or\s+(?:less|fewer)|max(?:imum)?)\b
    )"""
)


def drop_response_length_instructions(instructions: list[str] | None) -> list[str]:
    """Remove operator rules that cap response length (words/sentences/…).

    Fixed-format document nodes (the negotiation playbook) call this before
    injecting operator instructions: a chat-style budget like "keep responses
    under 180 words" makes the model stop a six-section document mid-section.
    Every other rule (SCF policy, human-review thresholds, tone) is kept.
    """
    if not instructions:
        return []
    kept: list[str] = []
    for instr in instructions:
        if _LENGTH_RULE_RE.search(instr):
            logger.info(
                "prompt_instructions: dropping response-length rule for document node: %r",
                instr[:80],
            )
            continue
        kept.append(instr)
    return kept


def format_prompt_instructions_block(instructions: list[str] | None) -> str:
    """Format active instructions as a labelled section for LLM injection.

    Returns empty string when there are no instructions so callers can skip
    injection with the standard ``if b`` guard in a ``"\n\n".join(b for b in blocks if b)``.
    """
    if not instructions:
        return ""
    body = "\n\n".join(instr.strip() for instr in instructions if instr.strip())
    if not body:
        return ""
    return (
        "## OPERATOR INSTRUCTIONS — mandatory rules, apply silently\n"
        "These rules are set by the operator and override your default reasoning. "
        "You MUST follow every rule below regardless of what the computed data suggests. "
        "Do not reason around them, qualify them, or skip them because the financial case "
        "seems strong. If a rule says flag for human review — flag it. "
        "If a rule says offer SCF first — offer it first.\n"
        "The rules shape what you recommend, but they are NOT part of the deliverable: "
        "never quote, restate, list, or reference them (or their existence) in your "
        "response — no rule recaps or 'strategic notes' sections repeating them, no "
        "style reminders ('keep responses under N words'), no naming topics a rule "
        "tells you to avoid. When a rule triggers a concrete action, weave only that "
        "action into the advice in your own words — and keep the negotiation "
        "direction straight: long-term thresholds gate what the BUYER considers "
        "committing to, never something the supplier would ask for.\n\n"
        f"{body}"
    )
