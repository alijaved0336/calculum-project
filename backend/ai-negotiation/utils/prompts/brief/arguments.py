"""The argument block — one renderer, three voices.

All three render the SAME per-turn buckets off
:class:`domain.entities.brief.NegotiationBrief`, so a surface that EXPLAINS an
argument and a surface that PITCHES it can never disagree about which arguments
support the ask or how strong each one is. Four separate blocks used to do this
job:

  * two of them listed the same benchmarks under DIFFERENT rankings, so a
    prompt carrying both was told twice which argument was strongest, and told
    two different things;
  * the two typed-bucket renderers had no place for ``buyerStandard`` at all —
    it is not in ``ARGUMENT_SOURCE_PRECEDENCE`` — while the client's ranking
    leads with it, so four intents never saw the buyer's own standard as an
    argument;
  * only the bundle-based renderers carried the per-argument disclosure flags
    (``sayable`` / ``internal_only`` / ``disclosure_note``), so the surfaces on
    the typed buckets had to be told about disclosure in prose instead.

The voices differ in DETAIL, never in which bucket something is in:

  * :data:`VOICE_EXPLAIN` — what each argument IS, every bucket, figures
    included. For the surfaces that inform (summary, data questions, explaining
    a recommendation): the arguments that fall short are part of the
    negotiator's position too, and are exactly what "how firm is this really?"
    is asking about.
  * :data:`VOICE_PITCH` — the supporting ones with how to put them, for the
    surfaces that draft. The non-supporting ones appear by NAME ONLY, with no
    figures — see :data:`~utils.prompts.brief.rules.NOT_ARGUMENTS_RULE` for why.
  * :data:`VOICE_COUNTER` — the same content as the pitch voice, told to SELECT
    rather than to enumerate. A pushback reply is one move in a live exchange,
    not the case for the ask; told to "cite every one of these" the model works
    through all seven supporting arguments and the answer turns into an essay,
    which is exactly what a negotiator mid-call cannot use.
  * :data:`VOICE_PLAYBOOK` — the supporting set and NOTHING else, for the
    negotiation playbook. Same rendering as the pitch voice; the four
    non-supporting groups are not emitted at all, so the document cannot list
    them. See :func:`render_arguments` for why the playbook is the one drafting
    surface that gets no counter-evidence.

Wording comes from the client catalogue
(:mod:`domain.entities.argument_catalog`); nothing here invents a sentence.
"""
from __future__ import annotations

from domain.entities.argument_catalog import ARGUMENT_CATALOG, argument_display_name
from domain.entities.brief import NegotiationBrief
from utils.constants import format_camel_label
from utils.prompts.brief.rules import (
    FIGURE_CITATION_RULE,
    GROUP_NOT_ARGUMENTS,
    GROUP_OBJECTION_ANSWERS,
    GROUP_SUPPORTING,
    GROUP_UNAVAILABLE,
    NOT_ARGUMENTS_EXPLAIN_RULE,
    NOT_ARGUMENTS_RULE,
    NOTHING_SUPPORTS_LINE,
    PLAYBOOK_ORDER_NOTE,
    RELATIVE_STRENGTH_RULE,
    SOURCE_ORDER_NOTE,
    STRETCH_TARGET_NOTE,
    RECOMMEND_SET_NOTE,
    SUPPORTING_ONLY_NOTE,
    UNAVAILABLE_RULE,
    rank_tag,
)

VOICE_EXPLAIN = "explain"
VOICE_PITCH = "pitch"
VOICE_COUNTER = "counter"
VOICE_PLAYBOOK = "playbook"
# An open "recommend / show the arguments" request: the explain voice minus the
# RULED OUT and NOT AVAILABLE groups, which such an answer must never list.
VOICE_RECOMMEND = "recommend"
# The supplier email. Same content as the pitch voice, but held as BACKGROUND:
# the email follows an approved template, and told to "cite every one of these"
# the model would turn a two-paragraph notice into the case for the ask.
VOICE_EMAIL = "email"

HEADING = "## NEGOTIATION ARGUMENTS"

# The four assessment-driven arguments, paired with the key they are filed under
# in the bundle's ``assessments`` map. Order is the catalogue ranking.
_ASSESSMENTS: tuple[tuple[str, str], ...] = (
    ("dso", "dso_alignment"),
    ("payOnTerms", "payment_reliability"),
    ("costImpact", "cost_impact"),
    ("relationship", "relationship"),
)



def render_arguments(brief: NegotiationBrief | None, *, voice: str) -> str:
    """The argument block for one surface. Empty string when there is nothing
    to say, so a caller can drop the block entirely.

    ``VOICE_PLAYBOOK`` emits the supporting set ALONE. The playbook is a
    standalone document the negotiator takes into the room, and every group it
    was shown ended up printed in it: a "Not used — and why" list naming the
    benchmarks that fall short, the sources with no data, and — copied straight
    out of the RULED OUT group — the internal do-not-say notes for ``dso`` and
    ``payOnTerms``, rendered as if they were findings. No prompt wording held
    that back reliably, because listing what you rejected is a plausible thing
    to put in a prep document. So the playbook is not given them. The other
    drafting surfaces are conversational and still get the full picture: a
    negotiator asking "what about the peer group?" mid-pushback needs an answer.
    """
    if brief is None:
        return ""
    if not (brief.supporting or brief.non_supporting or brief.unavailable):
        return ""
    supporting_only = voice == VOICE_PLAYBOOK
    pitching = voice in (VOICE_PITCH, VOICE_COUNTER, VOICE_PLAYBOOK, VOICE_EMAIL)
    # Neither the playbook nor the email narrates relative strength.
    ranked = voice not in (VOICE_PLAYBOOK, VOICE_EMAIL)
    order_note = PLAYBOOK_ORDER_NOTE if supporting_only else SOURCE_ORDER_NOTE
    if voice == VOICE_EMAIL:
        # Everything the email writes is supplier-facing: no BATNA, and
        # no negotiator-facing "state the figure every time" rule.
        lines = [HEADING, _terms_line(brief, include_floor=False), order_note]
    else:
        lines = [HEADING, _terms_line(brief), order_note, FIGURE_CITATION_RULE]
    # The ranking rule is about the set actually being ranked — the supporting
    # arguments, or the reserve bucket when nothing reaches the ask and it is
    # therefore what we argue from. With fewer than two there is no ranking to
    # state, and the rule is 800 characters telling the model about tags it will
    # never see. The playbook never states a ranking, so it never gets either the
    # rule or the tags — PLAYBOOK_ORDER_NOTE forbids the language outright.
    if ranked and len(_ranked_set(brief)) >= 2:
        lines.append(RELATIVE_STRENGTH_RULE)

    lines += [
        "",
        *_supporting_lines(
            brief,
            pitching=pitching,
            ranked=ranked,
            selecting=voice == VOICE_COUNTER,
            background=voice == VOICE_EMAIL,
        ),
    ]
    lines += _objection_answer_lines(brief, pitching=pitching)
    if supporting_only:
        # The withholding is stated, not just done — see SUPPORTING_ONLY_NOTE.
        lines += ["", SUPPORTING_ONLY_NOTE]
        return "\n".join(lines)
    if voice == VOICE_RECOMMEND:
        lines += _not_arguments_lines(brief, pitching=pitching)
        lines += ["", RECOMMEND_SET_NOTE]
        return "\n".join(lines)
    lines += _ruled_out_lines(brief, pitching=pitching)
    lines += _not_arguments_lines(brief, pitching=pitching)
    lines += _unavailable_lines(brief)
    return "\n".join(lines)


def _ranked_set(brief: NegotiationBrief) -> list[dict]:
    """The arguments the negotiator actually deploys, and so the ones ranked.

    The evidence — benchmarks above the support bar. There is no reserve tier
    to fall back to any more (two buckets, not three).
    """
    return brief.evidence


# ── The terms every argument is measured against ───────────────────────────


def _terms_line(brief: NegotiationBrief, *, include_floor: bool = True) -> str:
    """Ask, floor and current term, one stat per line.

    The current term is included on every voice: an argument's whole meaning is
    where it sits relative to what we already pay, and a reader given the ask
    and the floor alone cannot tell a hard-won 76 from a routine one.
    """
    lines = [
        f"Current: **{brief.current_term} days**",
        f"Target: **{brief.ask} days**",
    ]
    if include_floor:
        lines.append(f"BATNA: **{brief.batna_floor} days**")
    return "\n".join(lines)


# ── The supporting set ─────────────────────────────────────────────────────


def _display_name(argument: dict) -> str:
    """What this argument is CALLED in front of a negotiator — always words.

    The catalogue title where there is one, and the key spaced out where there
    is not. Never the raw camelCase key: it is a payload identifier, and a
    playbook bullet reading ``spendLineOpportunity — 120 days`` shows the
    negotiator a field name where the client expects "Max Spend Opportunity".
    """
    return argument.get("title") or argument_display_name(argument["key"])


def _line(argument: dict, tag: str = "") -> str:
    """One argument line, led by the argument's proper NAME.

    The name comes first because it is the string the drafting surfaces copy —
    the playbook tells the model to take it "exactly as it appears at the start
    of its line", and whatever sits there is what lands in the document. It used
    to be the camelCase key, which is precisely how `relationship` and
    `spendLineOpportunity` ended up printed in a client-facing playbook.

    Naming it explicitly is still the point: the alternative to a fixed name is
    the model inventing one, which is what turned ``supplierStandard`` into
    "this supplier's own segment".

    Bullets, not ``1.`` numbering: the playbook reserves a leading digit-and-dot
    for its six section headings, and a brief that numbers its own lines invites
    the model to echo that shape into the document.
    """
    detail = f" — {argument['detail']}" if argument.get("detail") else ""
    return f"  - {_display_name(argument)}{detail}{tag}"


def _bucketed_line(argument: dict, tag: str = "") -> str:
    """A line for the reserve / non-supporting buckets.

    Those entries carry a raw ``value_days`` rather than a rendered ``detail``,
    so the figure is composed here into the same shape every other argument
    line uses.
    """
    days = argument.get("value_days")
    detail = f" — {days} days" if days is not None else ""
    return f"  - {_display_name(argument)}{detail}{tag}"


def _supporting_lines(
    brief: NegotiationBrief, *, pitching: bool, ranked: bool = True,
    selecting: bool = False,
    background: bool = False,
) -> list[str]:
    """The supporting set.

    ``ranked=False`` drops the per-argument rank tags. A surface that must not
    narrate relative strength is not given the tags at all — told only "do not
    say it", a model reliably says it anyway, because the tag is sitting on the
    line and looks like content to convey.

    ``selecting=True`` is the counter voice: same set, told to pick from it
    rather than work through it.

    ``background=True`` is the email voice: same set, used only when the
    negotiator asks for a justification.
    """
    if background:
        intro = (
            f"{GROUP_SUPPORTING} — the benchmarks that support the ask, strongest SOURCE first. "
            "BACKGROUND for the email, not content to add: use one only when the "
            "negotiator asks to justify the change or to mention it. When you do, "
            "use the approved wording as-is and never paraphrase it into a stronger "
            "claim. Leave its day-count out UNLESS the negotiator explicitly asks "
            "for that value — an explicit request overrides a note saying to keep "
            "the figure out, and the figure is then stated exactly as listed here. "
            "The negotiator may call a source by its 'Also called' name:"
        )
    elif selecting:
        intro = (
            f"{GROUP_SUPPORTING} — at or above the proposed term, strongest SOURCE "
            "first. SELECT the ONE or TWO that actually answer the objection the "
            "supplier raised; a reply in a live exchange makes one move, it does "
            "not re-argue the whole case. Do NOT work through this list, do not "
            "mention an argument you are not deploying, and do not append the "
            "others as extra support. The approved wording is what may be said: "
            "use it as-is, never paraphrase it into a stronger claim, and never "
            "add a figure to a sentence that has none:"
        )
    elif pitching and not ranked:
        intro = (
            f"{GROUP_SUPPORTING} — at or above the proposed term, strongest SOURCE "
            "first. Cite every one of these, in this order, each put as evidence "
            "in its own right — never as a lesser version of the one above it. "
            "The approved wording is what may be said: use it as-is, never "
            "paraphrase it into a stronger claim, and never add a figure to a "
            "sentence that has none:"
        )
    elif pitching:
        intro = (
            f"{GROUP_SUPPORTING} — at or above the proposed term, strongest SOURCE "
            "first. Cite every one of these; lead with the first and introduce "
            "each of the others as a step weaker. The approved wording is what "
            "may be said: use it as-is, never paraphrase it into a stronger "
            "claim, and never add a figure to a sentence that has none:"
        )
    else:
        intro = (
            f"{GROUP_SUPPORTING} — at or above the proposed term; these justify "
            "the ask itself:"
        )
    lines = [intro]

    supporting = brief.evidence
    if not supporting:
        lines.append(NOTHING_SUPPORTS_LINE)
        return lines

    total = len(supporting)
    for i, argument in enumerate(supporting):
        lines.append(_line(argument, rank_tag(i, total) if ranked else ""))
        if background:
            # The payload name, which is what the negotiator sees in the UI
            # ("Parent Or Supplier Max") and so what they ask for by name.
            alias = format_camel_label(argument["key"])
            if alias != _display_name(argument):
                lines.append(f"      Also called: {alias}")
        lines.append(f"      What it is: {argument['meaning']}")
        if pitching:
            if argument.get("sayable"):
                lines.append(f'      How to pitch it: "{argument["supplier_pitch"]}"')
            else:
                lines.append(
                    "      NOT SAYABLE — internal evidence only. Use it for your "
                    "own confidence and firmness; put none of it to the supplier."
                )
        elif argument.get("internal_only"):
            lines.append(
                "      INTERNAL ONLY — explain it to the negotiator, never to "
                "the supplier."
            )
        # Both voices: the note says what the argument is NOT — that Pay-on-Terms
        # is not a benchmark, that a peer comparison is not an industry standard.
        # A surface that EXPLAINS an argument needs that as much as one that
        # pitches it; "is DSO a payment-term benchmark?" is a data question.
        if argument.get("disclosure_note"):
            lines.append(f"      Note: {argument['disclosure_note']}")

    if brief.is_stretch_target:
        lines += ["", STRETCH_TARGET_NOTE]
    return lines


# ── The rest of the position ───────────────────────────────────────────────


def _objection_answer_lines(brief: NegotiationBrief, *, pitching: bool) -> list[str]:
    """The assessments — what to say when the supplier pushes back.

    A separate heading from the evidence, because they answer a different
    question. None of them carries a term as a market day-count: DSO leverage
    names contractual / DSO / ask figures but is not a benchmark; the payment
    record is a trust argument that never justifies the ask. Presented under
    `USE TO JUSTIFY THE ASK` alongside real benchmarks, they read as weak
    reasons for the number — which is the complaint the client kept raising.
    """
    answers = brief.objection_answers
    if not answers:
        return []

    lines = [
        "",
        f"{GROUP_OBJECTION_ANSWERS} — these do NOT justify the term, and must "
        "never be offered as reasons for it. Each one removes an objection the "
        "supplier may raise. Deploy the matching one WHEN they raise it; if "
        "they do not raise it, do not bring it up:",
    ]
    for argument in answers:
        # The figures on an assessment line are the NEGOTIATOR's — their DSO,
        # our payment variance, the spend behind the relationship score. Saying
        # so on the line is what resolves the contradiction the prompt used to
        # carry: a global "quote those figures exactly" rule sitting directly
        # above per-argument notes reading "never state their DSO figure". The
        # scope is now on the line itself, so neither instruction has to be
        # inferred from where it happens to appear.
        lines.append(_line(argument, ""))
        lines.append(f"      What it is: {argument['meaning']}")
        if argument.get("detail"):
            lines.append(
                "      The figures above are YOURS to reason with, not to "
                "state — they are how this was assessed, not something to say."
            )
        if pitching:
            if argument.get("sayable"):
                lines.append(f'      How to put it: "{argument["supplier_pitch"]}"')
            else:
                lines.append(
                    "      NOT SAYABLE — internal only. Use it for your own "
                    "confidence; put none of it to the supplier."
                )
        elif argument.get("internal_only"):
            lines.append(
                "      INTERNAL ONLY — explain it to the negotiator, never to "
                "the supplier."
            )
        # Both voices: the note says what the argument is NOT — that Pay-on-Terms
        # is not a benchmark, that DSO is not a payment-term standard. A surface
        # that EXPLAINS an argument needs that as much as one that pitches it;
        # "is DSO a payment-term benchmark?" is a data question.
        if argument.get("disclosure_note"):
            lines.append(f"      Note: {argument['disclosure_note']}")
    return lines


def _ruled_out_lines(brief: NegotiationBrief, *, pitching: bool) -> list[str]:
    """The assessments that were run for this supplier and came back unusable.

    A benchmark that falls short still appears, in a lower bucket. An assessment
    that fails its gate simply vanishes from the supporting set — and "absent"
    is not an instruction. A model that never sees DSO mentioned is perfectly
    free to write "the proposed term is aligned with your receivables cycle",
    which for a supplier whose cycle is 40 days against a 90-day ask is a claim
    they can check and disprove.

    So each one is named with the reason it is out and the claim not to make.
    """
    ruled_out = [
        (key, assessment)
        for key, assessment in _ASSESSMENTS
        if (entry := (brief.arguments.get("assessments") or {}).get(assessment))
        and not entry.get("usable_as_argument")
    ]
    if not ruled_out:
        return []
    lines = [
        "",
        "RULED OUT — assessed for this supplier and NOT usable. These are not "
        "weak arguments to use carefully; they are claims the supplier can "
        "check and disprove. Make none of them:",
    ]
    for key, assessment in ruled_out:
        definition = ARGUMENT_CATALOG[key]
        entry = brief.arguments["assessments"][assessment]
        # A drafting surface needs the instruction, not the derivation; a surface
        # that EXPLAINS is often being asked the derivation directly ("why can't
        # we use our payment record?").
        reason = f": {_reason(entry)}" if not pitching else ""
        lines.append(f"  - {key}  ({definition.title}){reason}")
        if definition.unusable_note:
            lines.append(f"      → {definition.unusable_note}")
        # What the argument IS and is not travels with it whether or not it is
        # usable — "Pay-on-Terms is not a benchmark" is exactly the thing a
        # negotiator asks about an argument that was ruled out.
        if definition.disclosure_note:
            lines.append(f"      Note: {definition.disclosure_note}")
    return lines


def _reason(entry: dict) -> str:
    """An assessment's rationale as one sentence.

    Most carry a prose string; the relationship carries its scoring signals as a
    list, which renders as a Python repr if handed straight to a format string.
    """
    rationale = entry.get("rationale") or ""
    if isinstance(rationale, (list, tuple)):
        return "; ".join(str(r) for r in rationale) or "no scoring signals available"
    return str(rationale)


def _not_arguments_lines(brief: NegotiationBrief, *, pitching: bool) -> list[str]:
    if not brief.non_supporting:
        return []
    if pitching:
        # Names, never figures — see NOT_ARGUMENTS_RULE.
        names = ", ".join(_display_name(a) for a in brief.non_supporting)
        return ["", f"{GROUP_NOT_ARGUMENTS} — {NOT_ARGUMENTS_RULE.format(names=names)}"]

    lines = ["", f"{GROUP_NOT_ARGUMENTS} — {NOT_ARGUMENTS_EXPLAIN_RULE}"]
    for argument in brief.non_supporting:
        counter = (
            "  [the supplier could cite this against us]"
            if argument.get("undermines") else ""
        )
        lines.append(_bucketed_line(argument, counter))
        if argument.get("rationale"):
            lines.append(f"      {argument['rationale']}")
    return lines


def _unavailable_lines(brief: NegotiationBrief) -> list[str]:
    if not brief.unavailable:
        return []
    # `brief.unavailable` carries raw source keys — the one place they are still
    # the identifier, because these sources never became arguments and so have
    # no rendered line. Named in words here like every other source the
    # negotiator reads.
    names = ", ".join(argument_display_name(name) for name in brief.unavailable)
    return ["", f"{GROUP_UNAVAILABLE} — {UNAVAILABLE_RULE.format(names=names)}"]


def render_unavailable(brief: NegotiationBrief) -> str:
    """The NOT AVAILABLE list as a block of its own, for a facts-only surface.

    `answer_data_question` renders facts and deliberately no arguments — its
    system prompt opens "this is pure information retrieval", and handing it the
    ranked argument set turned factual lookups into pitches.

    But the "which sources have no data" list rode along inside that argument
    block, so excluding one excluded the other. The facts block omits a null
    field rather than printing it, so a source with no value was simply absent —
    and asked "what is the supplier standard?", the model had nothing saying it
    does not exist, went looking for the nearest figure and answered about a
    different benchmark entirely. Confidently, with a real number.

    Same list, same rule, without the ranking the prompt cannot have.
    """
    lines = _unavailable_lines(brief)
    return "\n".join(line for line in lines if line)
