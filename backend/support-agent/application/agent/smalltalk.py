"""Lightweight small-talk handling so greetings / thanks / goodbyes get a friendly
conversational reply instead of falling through RAG and hitting the "not in the
knowledge base" + escalation path.

This is deliberately a small, deterministic rule-based detector (no LLM call, no
classifier) that lives in the agent seam next to the RAG pipeline. Anything it does not
recognize as small talk is left for the normal retrieve → generate flow.
"""
from __future__ import annotations

import re

_GREETING_WORDS = {
    "hi", "hii", "hiya", "heya", "hello", "helloo", "hey", "yo", "howdy", "greetings", "sup",
}
_GREETING_PHRASES = (
    "good morning", "good afternoon", "good evening", "good day",
    "how are you", "how are u", "how r u", "hows it going", "how is it going",
    "whats up", "what is up", "how do you do", "nice to meet you",
)
_THANKS_PHRASES = (
    "thank you", "thanks", "thank u", "thankyou", "thx", "ty", "appreciate it",
    "much appreciated", "many thanks", "thanks a lot",
)
_GOODBYE_PHRASES = (
    "goodbye", "good bye", "bye bye", "bye", "see you", "see ya", "cya",
    "take care", "catch you later", "talk later",
)

_MAX_WORDS = 6  # longer messages are treated as real questions, not small talk

_REPLIES = {
    "greeting": (
        "Hi! I'm the Calculum support assistant. Ask me anything about the product and "
        "I'll answer from our support videos and documents — with a video clip when one applies."
    ),
    "thanks": "You're welcome! Happy to help. Feel free to ask another question anytime.",
    "goodbye": "Thanks for stopping by! If you need anything else, just ask. Have a great day.",
}


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9\s]+", " ", text.lower()).strip()


def _matches(norm: str, phrases: tuple[str, ...]) -> bool:
    padded = f" {norm} "
    return any(f" {p} " in padded for p in phrases)


def detect_smalltalk(text: str) -> str | None:
    """Return ``"greeting"`` / ``"thanks"`` / ``"goodbye"`` for a social pleasantry, else None."""
    norm = _normalize(text)
    if not norm:
        return None
    words = norm.split()
    if len(words) > _MAX_WORDS:
        return None
    if _matches(norm, _THANKS_PHRASES):
        return "thanks"
    if _matches(norm, _GOODBYE_PHRASES):
        return "goodbye"
    if words[0] in _GREETING_WORDS or _matches(norm, _GREETING_PHRASES):
        return "greeting"
    return None


def smalltalk_reply(category: str) -> str:
    """Friendly canned response for a detected small-talk category."""
    return _REPLIES.get(category, _REPLIES["greeting"])
