"""Format prior chat turns into a compact block injected into the answer prompt for
multi-turn memory (mirrors AI Negotiation's conversation-history formatting)."""
from __future__ import annotations

_LABELS = {"user": "USER", "assistant": "ASSISTANT", "ai": "ASSISTANT"}


def format_conversation_history(
    history: list[dict] | None, max_turns: int = 4, max_chars_per_turn: int = 600
) -> str:
    """Render the last ``max_turns`` messages as a ``## RECENT CONVERSATION`` block.

    ``history`` is oldest-first ``[{"role", "content"}]``. Each turn is truncated to
    ``max_chars_per_turn``. Returns ``""`` when there is nothing to show.
    """
    if not history:
        return ""
    recent = history[-max_turns:] if max_turns else history
    lines = ["## RECENT CONVERSATION", ""]
    rendered = False
    for turn in recent:
        content = (turn.get("content") or "").strip()
        if not content:
            continue
        if max_chars_per_turn and len(content) > max_chars_per_turn:
            content = content[:max_chars_per_turn]
        label = _LABELS.get(turn.get("role"), "USER")
        lines.append(f"{label}: {content}")
        rendered = True
    return "\n".join(lines).rstrip() if rendered else ""
