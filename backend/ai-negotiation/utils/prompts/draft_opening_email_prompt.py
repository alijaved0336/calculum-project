from __future__ import annotations

from typing import Any

from domain.entities.brief import NegotiationBrief
from domain.entities.facts import SupplierFacts
from domain.entities.rag_context import RAGContext
from domain.services.brief_builder import brief_from
from domain.services.opening_email import (
    SIGN_OFF_NAME_PLACEHOLDER,
    EmailViolation,
    OpeningEmailSpec,
    build_opening_email_spec,
    format_spec_requirements,
    format_violations,
)
from domain.services.opening_email_templates import (
    DEADLINE_PLACEHOLDER,
    FIRM_EMPHASIS_REFUSALS,
    FIRM_EMPHASIS_RULES,
    DeadlineKind,
)
from utils.constants import EMAIL_FACT_FIELDS, format_source_label
from domain.entities.intent import Intent
from utils.prompts.brief import INTENT_PROFILES, render_brief
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import (
    FORMATTING_GUARDRAIL,
    NEGOTIATION_DIRECTION_GUARDRAIL,
    PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS,
)
from utils.prompts.conversation_history import (
    ConversationTurn,
    format_conversation_history,
)
from utils.prompts.question_focus import REQUEST_HEADING, render_question
from utils.prompts.kb_reference import render_kb_reference

draft_opening_email_system_prompt = """
You are the Calculum AI Negotiation Assistant. Write a payment-terms email to
send directly to a supplier.

You are filling in an approved document, not composing one. The negotiator asked
for this document as it stands and supplied the values that go in it — they have
NOT asked for it to say anything different. A request to change what it says
goes to a different prompt and never reaches you, so on this turn there is
nothing to weigh up: reproduce the document, fill the blanks, stop.

Two blocks decide everything. EMAIL TEMPLATE is the document. EMAIL SPEC is the
values. Nothing else is yours to supply.

## OUTPUT

- Return only the email — subject line (where the variant has one) through
  sign-off. Nothing before it, nothing after it.
- No preamble, no "here is the email", no heading naming the variant, no
  closing offer to revise it.
- Never write your own reasoning into the email: no analysis, no rationale, no
  note about what you did or did not include, no bracketed aside, no reference
  to instructions, rules, templates, specs or data you were given. The supplier
  reads this text.
- If something cannot go in, leave it out silently. Never write a sentence
  explaining that you could not do it.

## THE DOCUMENT — EMAIL TEMPLATE

That block names one of the client's approved variants and reproduces its
reference email in full. Which variant it is was decided before you were called:
it is not yours to choose, to change, or to blend with another. Never name the
variant in the email, and never offer a different one.

The reference is the email, not a model of one:

- Reproduce its sentences, in its order, at its length, in its register. Follow
  the section list it gives and stay inside its word budget. Add no section it
  does not list.
- Do not reword a sentence to read better, do not merge or split its
  paragraphs, and do not add a sentence of your own. Prose you supply is prose
  nobody approved, going out over the buyer's name.
- Never carry a value over from it. Every number, name, date and contact comes
  from EMAIL SPEC.

The negotiator's own words are in the REQUEST block. On this turn they contain
values and a choice of document — both already resolved into the two blocks
above. Where their words look like they name a format — "longer",
"collaborative", "with SCF", "from senior management" — that reading is already
made and is the EMAIL TEMPLATE block. Do not re-read it and switch documents
mid-draft.

## THE VALUES — EMAIL SPEC

Use only values provided in EMAIL SPEC. Never:

- calculate dates
- infer missing dates
- modify payment terms
- add unsupported numbers

- **Payment terms** — the current and new terms exactly as given.
- **Effective date** — the supplied date exactly. With none supplied, write the
  deadline exactly as EMAIL SPEC words it: either the relative window it gives,
  or the [MM, DD, YYYY] placeholder left unresolved.
  Never a date, and never a number of days, of your own.
- **Subject** — fixed by EMAIL SPEC. Copy it exactly; do not modify wording or
  formatting. Under a LANGUAGE instruction, translate it, keeping every day
  figure exactly as given and using that language's own subject label. Where
  EMAIL SPEC says the variant has no subject line, write none — the email opens
  on the greeting.
- **Administrative contact** — Only include an administrative contact when provided.
  Never invent: emails, departments, names, phone numbers.
  If not provided, omit the contact sentence.
- **Closing** — as EMAIL SPEC gives it. With none named, the reference's own
  closing line, copied unchanged.

The reference carries the client's own placeholders. Resolve each from EMAIL
SPEC, and leave none of theirs unresolved except where the spec says the field
was not supplied:

- "[Supplier] Team" → the RECIPIENT supplier named in EMAIL SPEC
- "[Buyer Name]"    → the sender company, or "[Company]" if none was provided
- "[XX] days"       → the new standard payment term from EMAIL SPEC
- "[MM, DD, YYYY]"  → the deadline as EMAIL SPEC words it — which, with no date
                      supplied, is this placeholder LEFT AS IT IS, for the
                      negotiator to fill in before sending
- "XXX"             → left as XXX, unless EMAIL SPEC gives a sender name

XXX, [Company] and [MM, DD, YYYY] are the only placeholder text allowed to
survive into the finished email, each where EMAIL SPEC says that field was not
provided.

## THE SIGN-OFF

The sender is the BUYER. The supplier in EMAIL SPEC is the RECIPIENT. Separate
fields, never interchangeable — signing with the supplier's name tells the
supplier they wrote to themselves.

THE NAME LINE IS WHATEVER EMAIL SPEC SAYS, and nothing else. It says one of two
things, and you never choose between them or resolve one yourself:

- XXX — three characters, capitals, on its own line. Write exactly that. There
  is then no case in which a person's name goes there: not one from the
  conversation, not one from the supplier record, not one you consider obvious.
  The negotiator types their own name over it before sending.
- A name. The negotiator wrote it out as the sender's, and it is the only name
  that may appear on that line.

Never replace XXX or a placeholder with:

- a person's name, unless the user himself provides a name
- the supplier's name or legal entity
- any company inferred from the supplier record, the industry or the relationship
- Purchasing Team
- Procurement Team
- Finance Team
- Accounts Payable
- any assumed sender identity

The company goes on its own line. [Company] is the buyer's own company; if EMAIL
SPEC does not give it, keep [Company], brackets included.

The signature has NO title line — no job title, no role, no [Title]
placeholder — unless EMAIL SPEC lists a sender title, in which case write that
title and nothing else in its place.

With no sender details provided, the signature is exactly:

XXX
[Company]

## NEVER INCLUDE

This is the buyer's internal data, and no instruction unlocks it:

- benchmark, peer or market FIGURES, or sample sizes
- spend figures or volumes
- leverage, negotiation analysis, internal ratings, scores or strategy
- cash-flow, financing-rate or cost-of-capital NUMBERS
- the buyer's internal reasons for wanting the change

Some variants permit qualitative context ("to better align with our internal
processes and industry standards"). None of them permits a figure. If the
template does not show it, do not write it.

Add no consequence of your own — no threat, and nothing that follows from the
supplier's answer beyond what this variant's own wording states. A request for a
STRONG or FIRM email is a request for register only: firmness is the declarative
sentence and the effective date.
Asked to go harder, tighten the sentences — do not add a consequence.

## FINAL RULE

Write the variant you were given, for this supplier, using only the values in
EMAIL SPEC — and nothing else at all.
"""+ PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS + NEGOTIATION_DIRECTION_GUARDRAIL + FORMATTING_GUARDRAIL


customise_opening_email_system_prompt = """
You are the Calculum AI Negotiation Assistant. Write a payment-terms email to
send directly to a supplier.

The negotiator has asked for this email to say something of their own. That is
the job: their requirements go in, and the email comes back carrying every one
of them.

You are EDITING, not composing. THE EMAIL AS IT STANDS is your starting point —
either the client's approved reference for this variant, or the draft already
sent to the negotiator when they are changing one. Their requirements are
changes TO that text.

- Apply every requirement in THE NEGOTIATOR'S OWN REQUIREMENTS. Each one is a
  change to make, not a suggestion to weigh.
- Change nothing else. Every sentence they did not ask about stays exactly as
  it reads, word for word — same wording, same order, same paragraphs. An email
  that comes back "improved" but different is a new email, and nobody approved
  it.
- Put each requirement where it belongs in the flow, in the register they asked
  for. Say it once. Do not restate it, do not expand it into a paragraph, and
  do not add a second thought of your own alongside it.
- Where a requirement removes something, remove it and close the gap cleanly.
- Where a requirement replaces wording, replace exactly that wording.
- A requirement you genuinely cannot apply is left out of the email in silence.
  Never write a sentence explaining that you could not do it.

If there is no reference under THE EMAIL AS IT STANDS, the negotiator has
described the whole email themselves. Write what they described, and take the
structure, register and formality of a formal supplier notification.

## OUTPUT

- Return only the email — subject line (where it has one) through sign-off.
  Nothing before it, nothing after it.
- No preamble, no "here is the revised email", no summary of what you changed,
  no closing offer to revise it again.
- Never write your own reasoning into the email: no analysis, no rationale, no
  note about what you did or did not include, no bracketed aside, no reference
  to instructions, rules, templates, specs or data you were given. The supplier
  reads this text.

## THE VALUES — EMAIL SPEC

Their freedom is over WORDING. It is never over values, and this does not
loosen by one word because they asked for changes.

Use only values provided in EMAIL SPEC. Never:

- calculate dates
- infer missing dates
- modify payment terms
- add unsupported numbers

- **Payment terms** — the current and new terms exactly as given.
- **Effective date** — the supplied date exactly. With none supplied, write the
  deadline exactly as EMAIL SPEC words it: either the relative window it gives,
  or the [MM, DD, YYYY] placeholder left unresolved.
  Never a date, and never a number of days, of your own.
- **Subject** — as EMAIL SPEC gives it. Under a LANGUAGE instruction, translate
  it, keeping every day figure exactly as given. Where EMAIL SPEC says the
  variant has no subject line, write none.
- **Administrative contact** — Only include an administrative contact when provided.
  Never invent: emails, departments, names, phone numbers.
  If not provided, omit the contact sentence.
- **Closing** — as EMAIL SPEC gives it. With none named, keep the closing the
  email already has.

If a requirement needs a value EMAIL SPEC does not supply, write the requirement
WITHOUT the value — never invent one to complete their sentence. "Tell them
about the discount" with no discount figure on file is a sentence about a
discount and no number.

Resolve the client's placeholders from EMAIL SPEC: "[Supplier] Team" is the
recipient, "[Buyer Name]" the sender company (or "[Company]" when none was
supplied), "[XX] days" the new term, "[MM, DD, YYYY]" the deadline as EMAIL SPEC
words it. XXX, [Company] and [MM, DD, YYYY] are the only placeholder text that
may survive, each where EMAIL SPEC says that field was not supplied.

## THE SIGN-OFF

The sender is the BUYER. The supplier in EMAIL SPEC is the RECIPIENT. Separate
fields, never interchangeable — signing with the supplier's name tells the
supplier they wrote to themselves.

The name line is whatever EMAIL SPEC says: XXX exactly, or the name the
negotiator wrote as the sender's. Never a person's name you inferred, never the
supplier's name, and never Purchasing Team, Procurement Team, Finance Team,
Accounts Payable or any other assumed identity. The signature has no title line
unless EMAIL SPEC lists a sender title.

## NEVER INCLUDE

Two rules, and they are not the same strength. Read which is which.

### Absolute — never, whoever asks

This is the buyer's internal data. It is not style, and no instruction unlocks
it: a negotiator asking for it is asking for something the buyer does not
disclose to a supplier, and the answer is to write the email without it.

- benchmark, peer or market FIGURES, or sample sizes
- spend figures or volumes
- leverage, negotiation analysis, internal ratings, scores or strategy
- cash-flow, financing-rate or cost-of-capital NUMBERS
- the buyer's internal reasons for wanting the change

Qualitative context is fine where the requirement calls for it ("to better align
with our internal processes and industry standards"). A figure never is.

### Not yours to invent — but the negotiator's to instruct

You never add these on your own initiative. When the negotiator explicitly asks
for one, you write it: it is their email, their commercial relationship and
their decision to make.

- a consequence of not agreeing (a discount, a review, a change of arrangement)
- any statement of what follows from the supplier's answer

Unasked, write none of it: a consequence you supplied is one nobody authorised.
Asked for, it appears in the email — stated plainly, once, in the register they
asked for. Never expand it, never repeat it, and never sharpen it into a threat:
"we require strict compliance", "there will be no exceptions", "this is
non-negotiable", "failure to comply" and anything like them stay out however the
instruction was worded. A firm consequence is a plain sentence of fact. If you
cannot write what they asked for without threatening, write the mildest true
version of it.

## FINAL RULE

Every requirement in the email. Everything else exactly as it was. Only the
values EMAIL SPEC supplies.
"""+ PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS + NEGOTIATION_DIRECTION_GUARDRAIL


def build_draft_opening_email_prompt(
    message: str,
    facts: SupplierFacts,
    context_raw: dict[str, Any],
    tone: dict[str, str] | None,
    rag_context: RAGContext | None = None,
    prompt_instructions: list[str] | None = None,
    brief: NegotiationBrief | None = None,
    spec: OpeningEmailSpec | None = None,
    user_name: str | None = None,
    history: list[ConversationTurn] | None = None,
) -> str:
    # History WAS excluded here — "so context from earlier requests does not
    # bleed into a fresh email". The instinct was right and the tool was wrong.
    # What stops content bleeding into this email is the SPEC and the validator
    # after it: the dates, figures, contacts and sign-off are resolved in code
    # and the draft is checked against them, so an earlier turn cannot smuggle a
    # number or an address in. Excluding the transcript did not add safety on
    # top of that — it only made the node deaf.
    #
    # And deaf is what it was. Asked to redraft, the negotiator was answered
    # with "Would you like me to rewrite that email?"; they said "yes"; this
    # node received the word "yes" with no idea what had been offered, and
    # rebuilt the same email again. Twice more. Tightly capped, because the
    # instruction is in the last turn or two and nothing here needs an essay.
    brief = brief or brief_from(facts)
    # The node resolves the spec once and validates the draft against that same
    # object; building one here covers a direct call that skipped the node.
    spec = spec or build_opening_email_spec(facts, message, prompt_instructions, user_name)
    blocks = [
        format_conversation_history(
            history, max_turns=2, max_chars_per_turn=250, last_turn_chars=900
        ),
        render_question(
            message,
            heading=REQUEST_HEADING,
            fallback="(no specific request — draft the opening email for this supplier)",
        ),
        _requirements_block(spec),
        _template_block(spec),
        _email_data_block(brief, context_raw, spec),
        _tone_block(facts, tone, spec.language),
    ]
    blocks.append(render_kb_reference(rag_context))
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    return "\n\n".join(b for b in blocks if b)


email_correction_system_prompt = """
You are correcting a payment-terms email that was written for a supplier and
rejected by automated checks before it could be sent.

This is not a drafting task. A draft exists. Your only job is to return that
same email with the named faults fixed.

- Change what the faults name, and nothing else. Every sentence that was not
  faulted stays exactly as it is, word for word.
- Do not rewrite, restructure, re-order, improve, shorten or re-tone the email.
  A draft that comes back "better" but different is a new draft, and it has not
  been checked.
- Where a fault names a value, take the replacement from THE VALUES THIS EMAIL
  MAY CARRY. Never supply one of your own — a date, a contact, a name or a
  figure that is not in that list is the fault being repeated.
- Where a fault names wording (a phrase that reads as a request, a threat, a
  justification), delete or replace that phrase. Deleting is usually right; the
  sentence around it stays.
- If a fault cannot be fixed without inventing something, leave the placeholder
  the values list gives you.

Return only the corrected email — subject line (where the variant has one)
through sign-off. No preamble, no explanation of what you changed, no note
about the faults, nothing after the signature.
""" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS


def build_email_correction_prompt(
    rejected_draft: str,
    violations: list[EmailViolation],
    spec: OpeningEmailSpec,
) -> str:
    """The retry, written as a correction rather than a second attempt.

    The regeneration used to be the ENTIRE drafting prompt with a corrective
    block stapled underneath: ~200 lines of "here is how to write a supplier
    email" and then, at the bottom, the news that one had already been written
    and rejected. The model re-read the drafting brief and did what it said —
    wrote the email again, from scratch, reliably reintroducing whatever the
    first attempt got right and sometimes losing it instead.

    This prompt says the true thing instead: a draft exists, here it is, here is
    what is wrong with it, fix those and change nothing else. The template block
    still goes in, because the corrected email must still BE that variant, and
    the spec restatement goes in as a flat checklist of permitted values
    (`format_spec_requirements`) rather than as prose to be read for the first
    time.

    What is deliberately left OUT: conversation history, the knowledge-base
    block, the tone block and the negotiator's original request. All of them
    were already applied in the draft being corrected; re-supplying them invites
    a fresh interpretation of the request, which is the one thing a correction
    pass must not do.
    """
    return "\n\n".join(block for block in [
        "## THE DRAFT THAT WAS REJECTED",
        rejected_draft.strip(),
        "## WHAT IS WRONG WITH IT",
        format_violations(violations),
        "## THE VALUES THIS EMAIL MAY CARRY",
        format_spec_requirements(spec),
        # The negotiator's own requirements come along. Correcting a fault is
        # not licence to drop them: without this block the correction pass is
        # the one call in the flow that has never been told what they asked for,
        # and "fix the subject line" would come back having also quietly removed
        # the paragraph they asked for.
        _requirements_block(spec),
        # The reference goes in only for a DEFAULT email, where it is the
        # approved wording the draft has to match. On a customised one it is not
        # the answer any more — the rejected draft above is the base, and
        # handing back a block headed "reproduce these sentences as they stand"
        # would have the correction undo the negotiator's changes while fixing
        # the fault.
        "" if spec.content_directed else _template_block(spec),
        "Return the corrected email, and nothing else.",
    ] if block)


def build_customise_opening_email_prompt(
    message: str,
    facts: SupplierFacts,
    context_raw: dict[str, Any],
    spec: OpeningEmailSpec,
    brief: NegotiationBrief | None = None,
    tone: dict[str, str] | None = None,
    prompt_instructions: list[str] | None = None,
    previous_draft: str | None = None,
    history: list[ConversationTurn] | None = None,
) -> str:
    """The customisation prompt: the email as it stands, plus what to change.

    ``previous_draft`` is the email already on the negotiator's screen, passed
    WHOLE. It has to be: "change the greeting" is an edit to a specific document,
    and the drafting prompt's conversation-history block truncates a turn to 900
    characters — shorter than three of the five references, so the collaborative,
    SCF and senior-management emails all reached the model cut off mid-sentence
    and an "edit" silently became a regeneration.

    With no previous draft this is a first email, and the base is the approved
    reference for the variant. With neither — the negotiator describing the whole
    thing themselves — the base is omitted and the system prompt says to write
    what they described.

    No knowledge-base block: retrieval answers questions about the negotiation,
    and this turn is a text edit against a document already in the prompt.
    """
    brief = brief or brief_from(facts)
    base = (previous_draft or "").strip()
    blocks = [
        format_conversation_history(
            history, max_turns=2, max_chars_per_turn=250, last_turn_chars=900
        ),
        render_question(
            message,
            heading=REQUEST_HEADING,
            fallback="(no specific request — apply the requirements below)",
        ),
        _requirements_block(spec),
        "\n".join(_emphasis_lines(spec)) if spec.is_firm else "",
        "\n".join([
            "## THE EMAIL AS IT STANDS — your starting point",
            "",
            "This is the email you are editing. Apply the requirements to it and "
            "leave every other sentence exactly as it reads here. Take none of "
            "its values: every number, name, date and contact comes from EMAIL "
            "SPEC below, even where this text already shows one.",
            "",
            base if base else spec.template_spec.reference,
        ]),
        _email_data_block(brief, context_raw, spec),
        _tone_block(facts, tone, spec.language),
        format_prompt_instructions_block(prompt_instructions),
    ]
    return "\n\n".join(b for b in blocks if b)


def _requirements_block(spec: OpeningEmailSpec) -> str:
    """What the negotiator asked this email to SAY, as numbered requirements.

    The spec used to carry only a flag saying they had asked for content of
    their own. A flag is not an instruction: the prompt was told that a request
    existed and never told what it was, so the model did the only thing the rest
    of the prompt supports — reproduced the reference. A negotiator who asked
    for a treasury-policy paragraph and a soft warning about a discount got the
    client's collaborative email back with neither in it.

    Their words are in the REQUEST block too, but that is not enough on its own
    and was never going to be: REQUEST is one short paragraph inside a prompt
    that spends forty lines insisting the reference IS the email. This block
    exists to be the other side of that argument, in the same voice — the
    requirements are numbered, and the email is not finished until each one is
    in it.
    """
    if not spec.content_instructions:
        return ""
    return "\n".join([
        "## THE NEGOTIATOR'S OWN REQUIREMENTS — ALL OF THESE MUST BE IN THE EMAIL",
        "",
        "They asked for this email to say specific things. Each line below is a",
        "requirement, not a suggestion, and the draft is not finished until every",
        "one of them is in it:",
        "",
        *[f"  {n}. {text}" for n, text in enumerate(spec.content_instructions, 1)],
        "",
        "Write these INTO the reference email, in the place each one belongs. Keep "
        "every sentence they did not ask you to change exactly as the reference "
        "has it, and add or alter only what these requirements call for.",
        "",
        "These are wording. They never license a figure, a date, a contact or a "
        "sign-off that EMAIL SPEC does not supply — if a requirement needs a value "
        "that is not there, write the requirement without the value.",
    ])


def _emphasis_lines(spec: OpeningEmailSpec) -> list[str]:
    """The firmness instruction, for whichever prompt is drafting.

    Firmness is a register change made by SUBTRACTION, and the budget tightens
    with it — an email asked to read harder that comes back longer has had
    things added, which is the one way to get this wrong. Rendered by both
    prompts: "make it stronger" on an email already on screen is an EDIT of
    that email, and the edit prompt used to carry no emphasis rules at all.
    """
    template = spec.template_spec
    return [
        "EMPHASIS — THE NEGOTIATOR ASKED FOR A STRONGER EMAIL:",
        *[f"  - {rule}" for rule in FIRM_EMPHASIS_RULES],
        *[f"  ! {rule}" for rule in FIRM_EMPHASIS_REFUSALS],
        f"  Target about {int(template.word_cap * 0.75)} words — shorter than "
        "the reference, because the cushioning is gone.",
    ]


def _template_block(spec: OpeningEmailSpec) -> str:
    """The client's reference email for this variant, and the rules it carries.

    The reference goes in verbatim rather than being paraphrased into bullet
    points. Five documents described in prose all come back as the same email
    with different adjectives; five documents SHOWN come back as five documents.
    What the prose here adds is only what the reference cannot show on its own —
    the section list to hold on to when the negotiator's instruction moves the
    wording around, and the rules that are specific to this variant.
    """
    template = spec.template_spec
    sections = [f"  {i}. {name}" for i, name in enumerate(template.structure, 1)]
    lines = [
        f"## EMAIL TEMPLATE — {template.label}",
        "",
        "This is the variant to write. It was chosen from the negotiator's "
        "request; write this one and no other.",
        "",
        template.purpose,
        "",
        "SECTIONS, in order:",
        *sections,
        "",
        f"LENGTH: about {template.word_cap} words, and never more.",
    ]
    if template.deadline_kind is DeadlineKind.NONE:
        lines += [
            "",
            "DEADLINE: this variant states none. Write no date and no window.",
        ]
    else:
        lines += [
            "",
            "DEADLINE — write this, adapted to the surrounding wording but with "
            "the value unchanged:",
            f"  {spec.deadline_instruction}",
        ]
    if template.notes:
        lines += ["", "RULES FOR THIS VARIANT:", *[f"  - {n}" for n in template.notes]]
    if spec.is_firm:
        lines += ["", *_emphasis_lines(spec)]
    # One branch, because this block is only ever built for the DEFAULT prompt
    # now. A turn where the negotiator asked for wording of their own goes to
    # `customise_opening_email_system_prompt`, which renders its own base — and
    # the two instructions ("reproduce this exactly" / "change what they asked")
    # no longer have to share a paragraph and contradict each other.
    #
    # "Follow its shape and register" was the earlier instruction, and shape is
    # not wording: what came back was fluent prose that resembled the reference
    # and reproduced almost none of it.
    lines += [
        "",
        "REFERENCE EMAIL — the approved wording for this variant, and the "
        "email you are writing. Reproduce its sentences as they stand. The "
        "ONLY things that change are the values EMAIL SPEC supplies — the "
        "supplier, the terms, the deadline, the sign-off — and its "
        "placeholders, which resolve to those values. Do not reword a "
        "sentence to read better, do not merge or split its paragraphs, and "
        "do not add a sentence of your own: nobody has asked for anything "
        "the reference does not already say.",
        "",
        template.reference,
    ]
    return "\n".join(lines)


def _email_data_block(
    brief: NegotiationBrief,
    context_raw: dict[str, Any],
    spec: OpeningEmailSpec | None = None,
) -> str:
    facts = brief.facts
    supplier_raw = context_raw.get("supplier", {}) if context_raw else {}
    program_applied = supplier_raw.get("programApplied")
    spec = spec or build_opening_email_spec(facts)

    template = spec.template_spec
    current_term = (
        f"{spec.current_term_days} days"
        if spec.current_term_days is not None
        else "not on file — state only the new term, with no 'from X' clause"
    )
    if template.deadline_kind is DeadlineKind.NONE:
        effective_date = (
            "NOT USED — this variant states no deadline. Write no calendar "
            "date, month name, year or relative window anywhere in the email."
        )
    elif spec.has_effective_date:
        effective_date = (
            f"{spec.effective_date}   (supplied by the negotiator — reproduce it "
            f"exactly, as: {spec.deadline_instruction})"
        )
    elif spec.has_effective_window:
        effective_date = (
            "NONE SUPPLIED — the negotiator asked for a relative window instead. "
            f"State the deadline as: {spec.deadline_instruction} "
            "No calendar date, no month name, no year anywhere in the email."
        )
    else:
        effective_date = (
            f"NONE SUPPLIED — keep the placeholder {DEADLINE_PLACEHOLDER}, exactly "
            "as the reference prints it, for the negotiator to fill in before "
            f"sending. Write the deadline as: {spec.deadline_instruction} "
            "Invent no date and no number of days: no calendar date, no month "
            "name, no year, and no window of your own anywhere in the email."
        )
    admin_contact = (
        f"{spec.admin_contact}   (approved — reproduce it exactly)"
        if spec.admin_contact
        else "NONE APPROVED — omit the contact sentence entirely; invent nothing"
    )
    # The sender is buyer-side and has nothing to do with the supplier record
    # above. Each line says either the approved value or the placeholder that
    # stands in for it — never "unknown", which reads as an invitation to fill
    # the gap in.
    def _sender_line(label: str, value: str | None, placeholder: str) -> str:
        resolved = (
            f"{value}   (approved — use exactly)"
            if value
            else f"NOT PROVIDED — keep the placeholder {placeholder}, brackets included"
        )
        return f"  {label:<15}: {resolved}"

    sign_off = [
        "  The sender is the BUYER, not the supplier. The supplier named above is",
        "  the recipient: never sign the email with it, and never use it as the",
        "  sender company.",
        # The closing is a line of the reference like any other, so with nobody
        # naming one it is copied like any other. Named, it REPLACES the
        # reference's — which is a change to approved wording, and so has to be
        # stated here rather than left to the model to infer from the request.
        *(
            [
                f"  {'Closing':<15}: {spec.closing} — the negotiator asked for this "
                "closing. Write it",
                f"                   in place of the reference's own, exactly as "
                f"'{spec.closing}'.",
            ]
            if spec.closing
            else [
                f"  {'Closing':<15}: as the reference has it — copy its closing line "
                "unchanged.",
            ]
        ),
        # Not routed through `_sender_line`: an unsupplied name is not a gap
        # waiting to be filled the way an unsupplied company is. Printed as
        # "NOT PROVIDED" it reads as one, and that is how a name gets written
        # into it.
        *(
            [
                f"  {'Sender name':<15}: {spec.sender_name} — the negotiator wrote "
                "this name as the sender's.",
                "                   Write it on the name line exactly. No other "
                "name may appear there.",
            ]
            if spec.sender_name
            else [
                f"  {'Sender name':<15}: {SIGN_OFF_NAME_PLACEHOLDER} — ALWAYS. Write "
                f"{SIGN_OFF_NAME_PLACEHOLDER} on the name line. Nobody",
                "                   supplied a name, and it is never a person's "
                "name you inferred.",
            ]
        ),
        _sender_line("Sender company", spec.sender_company, "[Company]"),
        # Title only when the negotiator dictated one. There is no placeholder
        # branch: an unsupplied title is not a gap in the signature any more,
        # it is a line the signature does not have — printing "NOT PROVIDED"
        # for it is what put a [Title] bracket under every email.
        *(
            [
                f"  {'Sender title':<15}: {spec.sender_title}   (approved — write "
                "it under the company)",
            ]
            if spec.sender_title
            else [
                "  Sender title   : NONE. The signature has no title line — write "
                "no job title,",
                "                   no role and no [Title] placeholder.",
            ]
        ),
    ]
    extra_sender_lines = [
        line
        for line in spec.approved_sender_lines
        if line not in {spec.sender_name, spec.sender_company, spec.sender_title}
    ]
    if extra_sender_lines:
        sign_off.append(
            "  Also approved  : " + ", ".join(extra_sender_lines)
        )

    # No PRIOR ARRANGEMENTS block. The first email states the current term, the
    # new term and the date and stops (see §5), so there is no paragraph for a
    # previously-agreed figure to go in — and the elaborate "omit this section"
    # instructions it needed are gone with it.
    return "\n".join([
        "## EMAIL SPEC — the only values this email may contain",
        "Quote them exactly. Do not recompute, round, reformat or supplement them.",
        "",
        "RECIPIENT — the supplier this email is addressed TO",
        f"  Supplier company : {spec.supplier_name}",
        f"  Country          : {facts.country}",
        f"  Industry         : {facts.industry}",
        # The contact person, which exists only because the negotiator said so.
        # The supplier record has no such field, and a model that needs a name
        # and is given none writes a convincing one.
        *(
            [
                f"  Greet            : {spec.greeting_addressee}"
                + (f", {spec.recipient_title}" if spec.recipient_title else "")
                + "   (named by the negotiator — address the email to them)",
            ]
            if spec.has_recipient
            else [
                "  Greet            : the company above, or nobody by name.",
                "  NO CONTACT PERSON was supplied. Never invent one — this email",
                "  reaches a real inbox and a plausible name is still a wrong name.",
            ]
        ),
        "  The supplier is the recipient. It is not the sender and never appears",
        "  in the sign-off.",
        "",
        *(
            [
                "SUBJECT LINE",
                "  NONE — this variant carries no subject line. Open on the greeting.",
            ]
            if not template.requires_subject
            # Translated, the English wording is a MODEL to render, not text
            # to copy. Told to "copy it exactly" while also told to write in
            # German, the model obeyed both halves at once and produced a
            # German email under an English subject.
            else [
                f"SUBJECT LINE (first line of the email — translate into {spec.language},",
                "keeping the day figures exactly as they are)",
                f"  Subject: {spec.subject_line}",
            ]
            if spec.is_translated
            else [
                "SUBJECT LINE (verbatim, first line of the email)",
                f"  Subject: {spec.subject_line}",
                *(
                    [
                        "  The negotiator wrote this subject themselves. Reproduce it",
                        "  character for character: do not correct its spelling,",
                        "  spacing, punctuation or date format, and do not restyle it",
                        "  to match the template's usual wording.",
                    ]
                    if spec.subject_is_dictated
                    else []
                ),
            ]
        ),
        "",
        "TERMS",
        *(
            [
                f"  Current agreed payment terms : {current_term}",
                f"  New standard payment term    : {spec.proposed_term_days} days",
            ]
            if template.requires_term_figure
            else [
                "  NOT STATED IN THIS VARIANT — it announces the initiative and",
                "  leaves every number to the Category Manager. Write no day",
                "  figure and no payment-term number anywhere in the email.",
            ]
        ),
        f"  Programme                    : {program_applied or 'Term Extension'}",
        "",
        "DEADLINE",
        f"  {effective_date}",
        "",
        "ADMINISTRATIVE CONTACT",
        f"  {admin_contact}",
        "",
        "SIGN-OFF",
        *sign_off,
        *render_brief(brief, INTENT_PROFILES[Intent.DRAFT_OPENING_EMAIL]),
    ])


# Tone sets the REGISTER — how warm or clipped the wording is. It never decides
# whether the email explains itself, invites a reply, or softens the change into
# a request: that is the format (see §0/§1/§5), and it is the same in all three.
# These used to fight it — "collaborative" asked for a shared-goals opener and
# "methodical" asked to lead with benchmark figures and sample sizes, both of
# which are exactly what the first email withholds.
#
# Since the variants arrived, tone is strictly the smaller of the two: the
# EMAIL TEMPLATE decides what this email says, and tone only colours it. These
# rules used to be written as if the short notice were the only email there is —
# "still 'we are standardising', never 'we would like to'" is correct for four
# variants and is the exact wording the client's negotiable reference uses in
# the fifth. So they now bound the register and defer on content.
_EMAIL_TONE_RULES: dict[str, str] = {
    "collaborative": (
        "Warm register. Courteous address, and where the template leaves room, "
        "a single respectful sentence acknowledging the relationship. It stays "
        "an acknowledgement: it never becomes a reason for the change, and it "
        "never introduces a figure. Do not soften a declarative sentence the "
        "template states declaratively."
    ),
    "assertive": (
        "Clipped register. Straight to the point, short sentences, no softeners, "
        "no hedging beyond what the template's own wording uses. Firm and final "
        "— but never a threat, and never a consequence the template does not "
        "state. Keep every section the template lists, however brief."
    ),
    "methodical": (
        "Precise, administrative register — a terms-update notice from accounts "
        "payable, not an argument. Exact days, exact dates, exact windows, "
        "plainly laid out. Cite NO figure the EMAIL SPEC does not supply: "
        "precision here means being unambiguous about the change, not "
        "evidencing it."
    ),
}

# Maps substrings of tone labels (lower-cased) → _EMAIL_TONE_RULES key.
# Tone labels come from tone_guidance.py (e.g. "The Value Creator").
_TONE_LABEL_MAP: dict[str, str] = {
    "value creator": "collaborative",
    "assertive": "assertive",
    "direct": "assertive",
    "methodical": "methodical",
    "analytical": "methodical",
}


def _resolve_tone_key(tone: dict[str, str] | None) -> str | None:
    if not tone:
        return None
    label_lower = tone.get("label", "").lower()
    for fragment, key in _TONE_LABEL_MAP.items():
        if fragment in label_lower:
            return key
    return None


def _tone_block(
    facts: SupplierFacts, tone: dict[str, str] | None, language: str | None = None
) -> str:
    # Formality, NOT language. "Apply the salutation style for {country}" is
    # read as "salute them in that country's language", and for a German
    # supplier it produced "Sehr geehrte Damen und Herren" on top of an English
    # body — a mixed-language email nobody asked for, every time.
    #
    # Which language the email is written in is the negotiator's decision now
    # (see `question_focus.render_language_instruction`), not something inferred
    # from where the supplier is registered. What the country still decides is
    # how formal it reads and how the address conventions run.
    country_line = (
        f"Country: {facts.country} — match the formality level and address "
        f"conventions normal for business correspondence in {facts.country}. "
        f"This governs REGISTER ONLY, never language: write the WHOLE email — "
        f"subject, salutation, body and sign-off — in {language or 'English'}. "
        f"Never mix two languages in one email, and never take the language "
        f"from the supplier's country."
        if facts.country
        else (
            "Country: unknown — use a professionally neutral, internationally "
            f"standard style. Write the whole email in {language or 'English'}."
        )
    )

    tone_key = _resolve_tone_key(tone)

    if tone and tone_key:
        tone_line = (
            f"Tone — {tone.get('label', '')}:\n"
            f"  General intent  : {tone.get('description', '')}\n"
            f"  Email behaviour : {_EMAIL_TONE_RULES[tone_key]}"
        )
    elif tone:
        tone_line = (
            f"Tone — {tone.get('label', '')}: {tone.get('description', '')}\n"
            f"Wording rules: {tone.get('wording_rules', '')}"
        )
    else:
        tone_line = (
            "Tone: none selected — use a balanced, professional, fact-led style."
        )

    precedence = (
        "Tone sets the REGISTER only. The EMAIL TEMPLATE decides what this "
        "email says, which sections it has and how long it is; tone never "
        "drops a section the template lists, never adds one it does not, and "
        "never overrides a phrase the reference email uses."
    )

    return (
        "## TONE AND COUNTRY CALIBRATION\n\n"
        f"{precedence}\n\n{country_line}\n\n{tone_line}"
    )


# ── Source attribution ────────────────────────────────────────────────────


def collect_draft_opening_email_sources(
    facts: SupplierFacts,
    context_raw: dict[str, Any],
    spec: OpeningEmailSpec | None = None,
) -> dict[str, dict[str, object]]:
    sources: dict[str, dict[str, object]] = {
        format_source_label(name): {"path": facts.source_paths[name], "value": getattr(facts, name)}
        for name in EMAIL_FACT_FIELDS
        if name in facts.source_paths and getattr(facts, name, None) is not None
    }

    supplier_raw = context_raw.get("supplier", {}) if context_raw else {}

    sources[format_source_label("supplier_name")] = {
        "path": "supplier.name",
        "value": facts.supplier_name,
    }

    program_applied = supplier_raw.get("programApplied")
    sources[format_source_label("program_applied")] = {
        "path": "supplier.programApplied",
        "value": program_applied,
    }

    # The two values that exist only if a human supplied them. Shown with
    # what the email actually did in their absence, so the negotiator can see
    # at a glance that no date and no contact were invented for them.
    if spec is not None:
        sources[format_source_label("effective_date")] = {
            "path": "negotiator request",
            "value": spec.effective_date
            or (
                f"none supplied — stated as within {spec.effective_window_days} days"
                if spec.has_effective_window
                else f"none supplied — left as {DEADLINE_PLACEHOLDER} to fill in"
            ),
        }
        sources[format_source_label("admin_contact")] = {
            "path": "negotiator request",
            "value": spec.admin_contact or "none supplied — contact line omitted",
        }

    return sources
