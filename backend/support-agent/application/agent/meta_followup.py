"""Detect conversational-meta follow-ups — requests that operate on the PRIOR conversation
(summarize / rewrite / shorten / translate / "the above message") rather than asking a new
knowledge-base question. These are answered from conversation history, bypassing RAG.

Deterministic and conservative (no LLM), a sibling of ``smalltalk.py``. The rule requires
BOTH a transform verb AND a reference to the prior turn — so it never hijacks a substantive
KB question like "summarize the onboarding video" or "how do I set it up". The agent only
takes the meta path when there is actual conversation history to operate on.
"""
from __future__ import annotations

_TRANSFORM_VERBS = {
    "summarize", "summarise", "rewrite", "reword", "rephrase", "shorten", "condense",
    "expand", "elaborate", "translate", "edit", "revise", "remove", "delete", "reformat",
    "format", "paraphrase",
}
# Phrases that clearly point at the previous assistant/user turn.
_PRIOR_REFERENCES = (
    "the above", "above message", "above response", "above answer",
    "previous message", "previous response", "previous answer", "previous reply",
    "last message", "last response", "last answer", "last reply",
    "your last", "your previous", "that message", "that answer", "that response",
    "this message", "earlier message", "the previous", "the last one", "prior message",
)
_BARE_PRONOUNS = {"it", "that", "this"}
_MAX_SHORT_WORDS = 8  # bare-pronoun follow-ups ("shorten that") are short imperatives


def _tokens(norm: str) -> list[str]:
    return [w.strip(".,!?;:'\"()") for w in norm.split()]


def is_meta_followup(question: str) -> bool:
    """True for a request that transforms/operates on the prior conversation turn."""
    norm = (question or "").lower().strip()
    if not norm:
        return False

    words = _tokens(norm)
    has_transform = bool(_TRANSFORM_VERBS.intersection(words))
    has_tldr = "tl;dr" in norm or "tldr" in words
    has_ref_phrase = any(p in norm for p in _PRIOR_REFERENCES)
    make_it = "make it" in norm or "make that" in norm
    short = len(words) <= _MAX_SHORT_WORDS
    bare_ref = bool(_BARE_PRONOUNS.intersection(words))

    # Strong signal: an explicit "…the above/previous/last/that message/answer…" reference
    # combined with a transform op.
    if has_ref_phrase and (has_transform or has_tldr or make_it):
        return True
    # "make it shorter / longer / formal …" — short imperative on the prior output.
    if make_it and short:
        return True
    # "shorten that", "rewrite it", "summarize it", "tl;dr it" — transform + bare pronoun, kept
    # short so it can't hijack a long substantive request that merely contains "it".
    if (has_transform or has_tldr) and bare_ref and short:
        return True
    return False
