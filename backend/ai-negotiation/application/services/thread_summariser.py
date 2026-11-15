from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime

from domain.ports.llm_port import LLMPort
from domain.services.prompt_builder import SUMMARY_SYSTEM
from utils.constants import (
    SUMMARY_TRANSCRIPT_HEAD,
    SUMMARY_TRANSCRIPT_TAIL,
    SUMMARY_TRANSCRIPT_MAX_CHARS,
)

logger = logging.getLogger(__name__)

_TITLE_PREFIX = "Title:"
_DEFAULT_TITLE_PREFIX = "Negotiation"
_TITLE_MAX_LEN = 100


@dataclass
class ThreadSummaryResult:
    summary_text: str
    created_at: datetime
    thread_name: str | None = None


def split_summary_title(raw: str) -> tuple[str | None, str]:
    """Pull a leading ``Title: …`` line off the briefing card body."""
    lines = raw.splitlines()
    if not lines:
        return None, raw
    first = lines[0].strip()
    if not first.startswith(_TITLE_PREFIX):
        return None, raw
    name = first[len(_TITLE_PREFIX):].strip().strip('"').strip("'")
    body = "\n".join(lines[1:]).lstrip("\n")
    if not name:
        return None, body or raw
    return name[:_TITLE_MAX_LEN], body or raw


async def maybe_apply_thread_title(thread_adapter, thread_id: str, thread_name: str | None) -> None:
    if not thread_name:
        return
    thread = await thread_adapter.get_thread(thread_id)
    if thread is None:
        return
    if not (thread.title or "").startswith(_DEFAULT_TITLE_PREFIX):
        return
    try:
        await thread_adapter.update_thread(thread_id, title=thread_name[:_TITLE_MAX_LEN])
    except Exception:
        logger.warning("Failed to auto-apply thread title thread=%s", thread_id)


async def summarise_thread(
    thread_id: str,
    llm: LLMPort,
    thread_adapter,
) -> ThreadSummaryResult | None:
    """Fetch messages, generate a 4-bullet briefing card, and persist it.

    Returns ``None`` when the thread has no messages (caller should 204).
    Raises on LLM or persistence errors so the route can translate to HTTP.
    """
    messages = await thread_adapter.get_messages(thread_id)
    if not messages:
        return None

    # For long chats keep the first HEAD messages (goal/anchor) and the last
    # TAIL messages (current state/open risk) so the transcript fits within the
    # LLM context window while preserving the semantically important parts.
    if len(messages) > SUMMARY_TRANSCRIPT_HEAD + SUMMARY_TRANSCRIPT_TAIL:
        omitted = len(messages) - SUMMARY_TRANSCRIPT_HEAD - SUMMARY_TRANSCRIPT_TAIL
        kept = messages[:SUMMARY_TRANSCRIPT_HEAD] + messages[-SUMMARY_TRANSCRIPT_TAIL:]
        lines: list[str] = []
        for i, m in enumerate(kept):
            lines.append(f"{m.role.value.upper()}: {m.content or ''}")
            if i == SUMMARY_TRANSCRIPT_HEAD - 1:
                lines.append(f"[... {omitted} messages omitted ...]")
        transcript = "\n".join(lines)
    else:
        transcript = "\n".join(
            f"{m.role.value.upper()}: {m.content or ''}" for m in messages
        )

    if len(transcript) > SUMMARY_TRANSCRIPT_MAX_CHARS:
        transcript = transcript[-SUMMARY_TRANSCRIPT_MAX_CHARS:]

    prompt = (
        f"Transcript:\n{transcript}\n\n"
        "Produce the Title line and the 4-bullet briefing card."
    )

    tokens: list[str] = []
    async for token in llm.stream(prompt, system=SUMMARY_SYSTEM, max_tokens=512):
        tokens.append(token)
    raw_text = "".join(tokens)
    thread_name, summary_text = split_summary_title(raw_text)

    persisted = await thread_adapter.insert_thread_summary(
        thread_id=thread_id,
        content=summary_text,
        token_count=len(summary_text.split()),
        thread_name=thread_name,
    )
    await maybe_apply_thread_title(thread_adapter, thread_id, thread_name)
    return ThreadSummaryResult(
        summary_text=summary_text,
        created_at=persisted.created_at,
        thread_name=thread_name,
    )


if __name__ == "__main__":
    name, body = split_summary_title("Title: Extend terms to 90 days\n• Goal: 90 days\n• Anchor: 60")
    assert name == "Extend terms to 90 days"
    assert body.startswith("• Goal:")
    none_name, raw = split_summary_title("• Goal: only bullets")
    assert none_name is None and raw.startswith("• Goal:")
    print("thread_summariser ok")
