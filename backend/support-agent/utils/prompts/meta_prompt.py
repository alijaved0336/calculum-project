"""Prompt for conversational-meta follow-ups (summarize / rewrite / shorten / translate the
prior turn). Answered from the conversation history only — no RAG context, no KB grounding."""
from __future__ import annotations

SYSTEM_PROMPT = (
    "You are a support assistant continuing an ongoing conversation. The user is asking you to "
    "operate on the previous messages — for example summarize, rewrite, reword, shorten, expand, "
    "translate, reformat, or remove part of an earlier message. Use ONLY the conversation below to "
    "fulfill the request. Do not introduce new facts, do not cite or invent knowledge-base content, "
    "and do not add video timestamps. If the conversation does not contain what the user refers to, "
    "say so briefly and ask them to clarify."
)


def build_meta_prompt(question: str, conversation_history: str) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for a history-only meta operation."""
    user_prompt = f"{conversation_history}\n\nUSER REQUEST: {question}"
    return SYSTEM_PROMPT, user_prompt
