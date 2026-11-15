"""The buyer TELLS the supplier the terms are changing. It never asks.

This is one rule with two homes. The opening strategy's Suggested Opening and
the opening email are the only two things this system produces that a supplier
actually hears, and both of them state a decision the buyer has already taken:

    "We are changing our current payment terms of 45 days to 60 days
     effective [MM, DD, YYYY]."

Not:

    "Could we move from the current 45 days to 60 days effective
     [MM, DD, YYYY]?"

The difference is not tone. A question invites "no" and hands the supplier a
veto over something that was never theirs to veto; it turns a standardisation
notice into a favour being asked, which is the posture the whole product exists
to avoid. None of the client's five reference emails contains a single question
mark — the convention was always theirs, it was simply never enforced anywhere,
and both surfaces drifted into asking whenever the tone came out collaborative.

Scoped to the ASK, deliberately. "Could you confirm receipt?" is a fine sentence
in a supplier email and none of this touches it. What is caught is a request or
a question ABOUT THE TERMS — the one sentence that must be a statement.
"""
from __future__ import annotations

import re

# Openers that turn a statement into a request. Matched at the start of a
# sentence only: "we would like" mid-sentence is caught by the email's own
# negotiation-language check, and this list is about the shape of the ask.
_REQUESTING_OPENER_RE = re.compile(
    r"^\s*(?:so\s+|and\s+|but\s+)?(?:"
    r"could\s+(?:we|you)|can\s+(?:we|you)|may\s+we|shall\s+we|"
    r"would\s+(?:you|it\s+be\s+possible)|are\s+you\s+(?:able|willing|open)|"
    r"we\s+(?:would|'d)\s+like\s+to|we\s+are\s+asking|we\s+ask\s+(?:that|if)|"
    r"we\s+propose|we\s+request|we\s+would\s+propose|"
    r"do\s+you\s+agree|is\s+(?:that|this)\s+acceptable|"
    r"how\s+(?:do|would)\s+you\s+feel|what\s+are\s+your\s+thoughts"
    r")\b",
    re.IGNORECASE,
)

# What makes a sentence the ASK rather than any other sentence. Without this the
# check would swallow "Could you confirm receipt?", which is not what it is for.
_ABOUT_THE_TERMS_RE = re.compile(
    r"\b(?:payment\s+terms?|terms?|\d{1,4}\s*-?\s*days?)\b",
    re.IGNORECASE,
)

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+")

# Quotes and brackets that close around a sentence rather than belonging to it.
_TRAILING_MARKS_RE = re.compile(r'["\u201d\u2019\')\]]+\s*$')


def is_requesting_the_ask(sentence: str) -> bool:
    """Whether this sentence ASKS for the terms change instead of stating it."""
    text = (sentence or "").strip()
    if not text or not _ABOUT_THE_TERMS_RE.search(text):
        return False
    return text.endswith("?") or bool(_REQUESTING_OPENER_RE.match(text))


def find_requesting_sentences(text: str) -> list[str]:
    """Every sentence in ``text`` that asks for the change rather than stating it."""
    return [
        sentence.strip()
        for sentence in _SENTENCE_SPLIT_RE.split(text or "")
        if is_requesting_the_ask(sentence)
    ]


def declarative_ask_sentence(
    current_term_days: int | None,
    target_term_days: int | None,
    deadline: str = "[MM, DD, YYYY]",
) -> str | None:
    """The client's own wording for the ask, as a statement.

    The same sentence the standard reference email states, which is what makes
    it safe to substitute: it is approved wording, not a rewrite invented here.
    Returns None when a figure is missing — there is then no sentence to build,
    and a half-built one is worse than the model's.
    """
    if target_term_days is None:
        return None
    if current_term_days is None:
        return (
            f"We are changing our payment terms to {target_term_days} days "
            f"effective {deadline}."
        )
    return (
        f"We are changing our current payment terms of {current_term_days} days "
        f"to {target_term_days} days effective {deadline}."
    )


def enforce_declarative_ask(
    text: str,
    current_term_days: int | None,
    target_term_days: int | None,
) -> tuple[str, list[str]]:
    """Replace any sentence that ASKS for the change with the one that states it.

    Substitution rather than regeneration, and substitution rather than a
    rewrite of the model's own words: the replacement is the client's approved
    sentence built from figures already resolved in code, so this cannot invent
    a term, a date or a claim. Everything else in the passage is untouched.

    Returns ``(text, replaced)``. ``replaced`` is empty when nothing asked —
    the overwhelmingly common case, and the one where this is a no-op.

    Only the FIRST offending sentence is replaced; any others are dropped. Two
    sentences both asking for the change are two attempts at the same sentence,
    and stating the ask twice reads worse than the question did.
    """
    offenders = find_requesting_sentences(text)
    if not offenders:
        return text, []

    replacement = declarative_ask_sentence(current_term_days, target_term_days)
    if replacement is None:
        # Nothing safe to put in its place. Reported, not silently mangled —
        # the caller logs it and the negotiator still gets the model's wording.
        return text, offenders

    out = text
    for index, offender in enumerate(offenders):
        # The Suggested Opening is printed as a quoted line, so the last
        # sentence carries the closing quote. Swapping the sentence without it
        # leaves the quotation open and the section reads as though it was cut
        # off mid-word.
        trailing = _TRAILING_MARKS_RE.search(offender)
        suffix = trailing.group(0) if trailing else ""
        out = out.replace(offender, (replacement + suffix) if index == 0 else "", 1)
    # Substitution can leave doubled spaces where a sentence was dropped.
    return re.sub(r"[ \t]{2,}", " ", out).replace(" \n", "\n"), offenders
