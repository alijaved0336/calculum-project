"""The negotiator's question, and the rule that the answer must serve it.

Every node already received the negotiator's message and rendered it into its
own prompt — under six different headings ("Negotiator's question",
"Negotiator's request", "Negotiator's message", ...), in one case *after* the
data blocks rather than before them, and in every case as a bare label with
nothing said about what to do with it.

So the message was present and inert. What actually decided the answer was the
output shape in each node's system prompt, and those shapes are written for the
broad case: a summary names three required sections, the playbook names six.
Ask for "the basic info about this supplier" and the shape still fires, so the
reply is the whole brief — every benchmark, every argument bucket, the BATNA
floor — when four labelled lines were the answer.

This module is the other half of passing the question: the block that carries
it, and :data:`ANSWER_THE_QUESTION_ASKED`, the rule that makes it govern.

The rule DEFERS to a mandated shape rather than overriding it. That is not
timidity, it is the lesson `response_mode` already paid for (see its module
docstring): two instructions that cannot both be obeyed do not average out, the
model picks one per turn and the same intent comes back differently each time.
A narrowed question is served by keeping the untouched parts to their shortest
form — which is what "basic info" asks for anyway — never by dropping a section
the document spec requires.
"""
from __future__ import annotations

# ── Headings ───────────────────────────────────────────────────────────────
#
# One shape, so the question reads the same in every prompt and always sits
# directly under the conversation history. The wording after the em dash is the
# part that does the work: "## Negotiator's question" labels a field, "the
# answer must serve THIS" states an obligation.
#
# The noun still differs per surface, because it tells the model what KIND of
# thing the message is before it reads a word of it — a question to answer, a
# request to fulfil, or a supplier objection being relayed. That distinction is
# load-bearing on `pushback`, where the message is not addressed to us at all.

QUESTION_HEADING = "## THE NEGOTIATOR'S QUESTION — the answer must serve THIS"
REQUEST_HEADING = "## THE NEGOTIATOR'S REQUEST — the output must serve THIS"
MESSAGE_HEADING = "## THE NEGOTIATOR'S MESSAGE — the answer must serve THIS"
PUSHBACK_HEADING = (
    "## SUPPLIER PUSHBACK REPORTED BY THE NEGOTIATOR — the reply must answer THIS"
)


def render_question(
    message: str | None,
    *,
    heading: str = QUESTION_HEADING,
    fallback: str,
) -> str:
    """The negotiator's message as its own labelled block.

    ``fallback`` stands in when the turn carries no message — a node reached by
    a UI button rather than typed text. It is phrased as the request the button
    stands for ("(no specific question — give a general overview)") so the model
    reads a broad ask rather than an empty one, which is the difference between
    a full briefing and an apology for having nothing to answer.
    """
    return f"{heading}\n{(message or '').strip() or fallback}"


# ── The rule ───────────────────────────────────────────────────────────────

ANSWER_THE_QUESTION_ASKED = """\
## ANSWER THE QUESTION THAT WAS ASKED — REQUIRED AT EVERY LENGTH
The negotiator's question is the block headed "THE NEGOTIATOR'S QUESTION /
REQUEST / MESSAGE". It decides WHAT the answer covers. Everything after it is
the material AVAILABLE to you, not a checklist to work through.
  - Use the parts that serve the question and leave the rest out. A figure being
    present in the inputs is not a reason to print it.
  - When the question NARROWS the subject — "basic info", "just the ratings",
    "only the term position", "not related to payment terms", one named figure —
    that narrowing IS the instruction. Answer inside it. Do not widen it back
    out because more data happens to be available.
  - When the question is BROAD — "tell me about them", "where do we stand",
    "everything you have" — the fuller picture is what was asked for, so give it.
  - Answer the question first, in the opening line, before any supporting
    material. If the inputs do not carry what was asked for, say so plainly;
    never answer a different question because that is the material you have.
  - IF THESE INSTRUCTIONS ALSO SPECIFY A FIXED OUTPUT SHAPE — named sections, a
    required set of headings, a document template — that shape still WINS. Serve
    a narrowed question by keeping the parts it does not touch to their shortest
    form, never by dropping them."""


# ── Continuing a thread ────────────────────────────────────────────────────
#
# The counterpart to the rule above. That one decides how WIDE the answer is;
# this one decides what the question even MEANS, because half the time it cannot
# be read on its own: "why?", "and how does that compare?", "explain each of
# these". Both have to hold at once — a follow-up is still answered at the width
# it asks for, and a resolved reference is still not licence to re-run the whole
# previous answer.
#
# The third bullet is the one that fixes the reported case. A follow-up asking
# for "useful benchmarks I can use" after a general-details answer needs the
# argument block — data the FIRST answer deliberately left out. Without saying
# so, the model treats the previous answer as the boundary of what it may draw
# on and answers the new question out of the old material.

FOLLOW_UP_HANDLING = """\
## IF THIS MESSAGE CONTINUES THE CONVERSATION
A message that points backwards — "these", "those", "it", "its", "the second
one", "why", "and how does that compare", "explain each of them" — is a
follow-up, not a fresh request. It cannot be read on its own, so before
answering:
  - RESOLVE the reference against RECENT CONVERSATION. Where it could be read
    more than one way, say in one clause which reading you took, then answer
    that reading — do not ask and stop.
  - Answer the NEW part only. Do not re-derive or restate what you already said
    last turn; the negotiator still has it on screen. "Explain each of these"
    means explain them, not list them again first.
  - Bring in whatever the follow-up now needs, even when the previous answer did
    not use it. The inputs below are the FULL set available to you, not just the
    part the last answer drew on — a follow-up that asks for benchmarks gets the
    benchmarks, whether or not the answer before it mentioned any.
  - Carry forward what was already established — the supplier, the figures, the
    subject under discussion — instead of resetting to a general answer.
  - Only if the reference genuinely cannot be resolved from the conversation:
    say what you need, and name the candidates you can see."""


def render_resolved_reading(resolved_question: str | None) -> str:
    """The classifier's standalone rewrite of a back-referring message.

    Rendered as a READING, never as the question. The negotiator's own words
    stay authoritative and stay in their own block: a rewrite is a second model
    output, and the failure mode of promoting one to "what the user asked" is
    that a mis-resolved pronoun becomes unfalsifiable — the answering node would
    have nothing left to check it against.

    Empty string when there is nothing to add (no history, the message already
    stood alone, or the rewrite came back identical), so callers can drop it.
    """
    if not resolved_question:
        return ""
    return (
        "Resolved reading of this message, with its back-references already "
        f"substituted: \"{resolved_question}\"\n"
        "  Answer THAT. The negotiator's own words above stay authoritative — "
        "where this reading and their wording disagree, follow their wording, "
        "and where this reading names something their words only pointed at, "
        "it is telling you what they pointed at."
    )


def render_language_instruction(language: str | None) -> str:
    """Write the answer in the language the negotiator asked for.

    There was no concept of output language anywhere in this system. Asked three
    times for a German email, the assistant returned English three times and
    then claimed the English one was German — and none of that was the model
    being careless, because nothing in any prompt had ever mentioned language.

    Placeholders are excepted by name. They are fill-in tokens the negotiator
    replaces, not prose, and the email validator checks for them literally: a
    translated "[Ihr Name]" fails that check, the draft is regenerated, and the
    regeneration comes back in English. Translating them is how a language
    request turns into a loop. The name placeholder is the unbracketed "XXX"
    (`SIGN_OFF_NAME_PLACEHOLDER`), so it has to be excepted explicitly — a
    German draft that helpfully signs "Name" instead is the same loop.
    """
    if not language:
        return ""
    return (
        f"## LANGUAGE — REQUIRED\n"
        f"Write the ENTIRE response in {language}, including any subject line, "
        f"salutation and sign-off. This is the language the negotiator asked "
        f"for; do not answer in English and do not append a translation.\n"
        f"  - Figures, dates and term counts keep their values exactly — only "
        f"the words around them change.\n"
        f"  - Sign-off placeholders (XXX, [Company]) stay EXACTLY as "
        f"written, in English. They are fill-in tokens, not prose — and XXX is "
        f"three literal characters, never a name in any language.\n"
        f"  - If you cannot produce this response in {language}, say so plainly "
        f"in one sentence, in English, and explain why — never return English "
        f"content as though it were {language}."
    )


def render_conversation_directives(
    *, has_history: bool, resolved_question: str | None, language: str | None = None
) -> str:
    """The thread-continuation rules, for a node that takes no format instruction.

    Most surfaces get these inside :func:`response_mode.get_format_instruction`.
    A surface whose output is not read on the negotiator's screen cannot take
    that block's readability and country-flag rules, so the conversation half is
    separable. This returns the half that is safe everywhere, and returns ""
    when there is no thread to continue.
    """
    parts = []
    if has_history:
        parts.append(FOLLOW_UP_HANDLING)
        reading = render_resolved_reading(resolved_question)
        if reading:
            parts.append(reading)
    # Not gated on history: "draft this in German" is a language request on the
    # very first turn, which is exactly where it was being dropped.
    instruction = render_language_instruction(language)
    if instruction:
        parts.append(instruction)
    return "\n\n".join(parts)
