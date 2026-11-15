"""How long a reply runs, and how it is laid out on the page.

The classifier picks a ``response_mode`` per turn; the node appends the matching
block to its prompt. Length is what the mode decides — the READABILITY rules
below are not negotiable at any length, because the failure they exist to stop
is not a long answer, it is an unreadable one:

    "Diageo Brands B.V. is a large beverage manufacturing supplier based in the
    Netherlands with an A- credit rating and AAA country rating. The supplier is
    classified as high business priority due to a spend volume of $37,544,807
    and a projected cash-flow unlock of $2,195,377, though the buyer's leverage
    is low. The current agreed term is 99 days, and the target is 120 days, ..."

Every figure in that is correct and every one of them is buried. Nine distinct
facts arrive in three sentences with no label, no line break and nothing to scan
for, so a negotiator mid-call cannot find the target term without reading the
whole paragraph. ``conversational`` used to ASK for that shape ("answer in 1–2
short paragraphs", structure "ONLY if ... confusing without them"), which is why
the fix lives here and not in one intent's prompt.
"""
from __future__ import annotations

from utils.prompts.question_focus import (
    ANSWER_THE_QUESTION_ASKED,
    FOLLOW_UP_HANDLING,
    render_conversation_directives,
)

# Applies at EVERY length, including a two-sentence answer. These rules govern
# words and figures rather than headings, so they never conflict with the
# per-mode shape below.
_READABILITY = """\
## WRITING RULES — REQUIRED AT EVERY LENGTH
Write for a negotiator skimming mid-call, not a reader working through a report.
  - One idea per sentence. Never chain facts with "and ... though ... which ...".
  - Never stack more than two figures in one sentence. A third needs its own
    line, bullet or label.
  - Put the number first and label it: "Target: **120 days**", not "the target is
    120 days, which aligns with an existing relationship precedent".
  - Bold the figure, not the label. One stat per line, space after the colon:
    Current: **99 days**
    Target: **120 days**
    BATNA: **99 days**
  - Any term that carries its own labelled line in the BRIEF — **Buyer
    Leverage**, **Supplier Standard**, **BATNA**, **Credit Rating**, and the
    rest — keeps that exact Title Case and bold treatment in your own prose
    too. Never let it fall back to an ordinary lowercase noun phrase the
    moment it leaves its labelled line: write "medium **Buyer Leverage**",
    not "medium buyer leverage".
  - Plain words. Say "we can't concede below 99 days", not "no concession below
    the status quo is permitted".
  - MONEY AS GIVEN: quote a money figure in the compact form the brief uses —
    "$37.54M", "$2.20M", "$850K". Always keep the leading "$". Never expand
    one back to digits ("$37,544,807"): nine digits are no more accurate to
    the negotiator and they cost the comparison against the figure beside them.
  - UNITS: payment-term figures always include "days" ("60 days", never bare
    "60"); money figures always include "$" ("$908K", never bare "908K" or
    "997.95").
  - Never a wall of text: no paragraph longer than three sentences."""

_COUNTRY_FLAG = """\
## COUNTRY FLAG INSTRUCTION
When mentioning a supplier country, put the country flag immediately before the
country name. Use no other visual markers."""

_QUICK = """\
## LENGTH INSTRUCTION — REQUIRED
The user asked a quick, direct question. Your response MUST be 2–3 sentences
maximum. Lead immediately with the direct answer. One supporting fact is allowed
if it adds essential context. At this length the answer IS the structure: add no
headings or bullets of your own.
IF THESE INSTRUCTIONS ALSO SPECIFY A FIXED OUTPUT SHAPE — named sections, a
required set of headings, a document template — that shape WINS, and you keep
each part short instead of dropping it. The writing rules above still apply:
bold the key figure, and do not compress three facts into one sentence to fit
the limit."""

_CONVERSATIONAL = """\
## LENGTH INSTRUCTION — REQUIRED
The user asked a focused question, not a request for a full structured brief.
Answer what was asked and skip anything that does not serve it. IF THESE
INSTRUCTIONS ALSO SPECIFY A FIXED OUTPUT SHAPE — named sections, a required set
of headings, a document template — that shape WINS, and you keep each part
short instead of dropping it.

Lay it out so it can be skimmed — a short lead sentence with the direct answer,
then the supporting detail as bullets or labelled lines:

  Current: **99 days**
  Target: **120 days**
  BATNA: **99 days**
  Success Probability: Medium - large supplier, low buyer leverage

Prose is for reasoning that genuinely runs as an argument. A list of facts,
figures or ratings is never prose — the moment you are writing the third figure
in a row, it belongs on its own line. Do not pad to fill sections: two labelled
lines is a complete answer when only two things were asked about."""

_FULL = """\
## FORMAT INSTRUCTION
The user wants a comprehensive response. Use the full structured template as
specified in these instructions, with markdown headings for each section and
bullets or bold-labelled lines underneath — never continuous paragraphs.
Every section must be findable by its heading alone."""


def get_format_instruction(
    response_mode: str | None,
    *,
    has_history: bool = False,
    resolved_question: str | None = None,
    response_language: str | None = None,
) -> str:
    """Return the format instruction block to append to a prompt.

    ``has_history`` adds the follow-up rule. It is a parameter rather than an
    always-on block because on the FIRST message of a thread there is nothing to
    refer back to, and a rule about resolving "these" against a conversation that
    does not exist is an invitation to invent one.

    ``resolved_question`` is the classifier's standalone rewrite of a
    back-referring message, appended to that rule. This is the single seam every
    answering node already goes through, which is why the reading travels here
    rather than through eleven prompt builders — one place to pass it, one place
    to change it.

    Three rules, in the order they decide an answer. SCOPE first — which of the
    inputs the question actually calls for; that is the one the nodes had no rule
    for at all, so a narrow question was answered with the whole brief. Then
    READABILITY, which stops a correct answer arriving as an unreadable one and
    holds at two sentences as much as at two pages. The mode block last, setting
    the LENGTH.

    Scope and length are genuinely different questions and both are needed:
    ``full`` says give the comprehensive response, and the scope rule says
    comprehensive about WHAT. Neither implies the other — a "quick" answer can
    still be about the wrong thing, and a "full" one can still be padded with
    material nobody asked about.

    Length only. The quick and conversational blocks used to open "REQUIRED,
    OVERRIDES DEFAULT STRUCTURE" and forbid section headers outright — appended
    to six nodes whose own system prompts mandate exact headings. Both
    instructions cannot be obeyed, so the model picked one per turn, and the
    same intent came back structured or unstructured at random. `pushback` was
    fixed by dropping the block there entirely; that solved the instance and
    left the other five. The blocks now defer to a mandated shape instead, so
    the conflict is gone wherever it appears, including on nodes nobody has
    written yet.

    For ``"full"`` (or unknown/None) the explicit instruction is returned so the
    LLM has a clear confirmation to use the full template — this avoids the LLM
    second-guessing structure when the user really does want everything.
    """
    mode = (response_mode or "full").strip().lower()
    if mode == "quick":
        shape = _QUICK
    elif mode == "conversational":
        shape = _CONVERSATIONAL
    else:
        shape = _FULL
    # Scope, then (when there is a thread to continue) how to read a message
    # that points back into it, then readability, then length.
    parts = [ANSWER_THE_QUESTION_ASKED]
    directives = render_conversation_directives(
        has_history=has_history,
        resolved_question=resolved_question,
        language=response_language,
    )
    if directives:
        parts.append(directives)
    parts += [_READABILITY, shape, _COUNTRY_FLAG]
    return "\n\n".join(parts)
