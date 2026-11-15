from __future__ import annotations

import re
from dataclasses import replace

from domain.entities.argument_catalog import argument_display_name
from domain.entities.facts import SupplierFacts
from domain.entities.opening_strategy import OpeningStrategyAnalysis
from domain.entities.rag_context import RAGContext
from utils.constants import format_source_label
from domain.entities.brief import NegotiationBrief
from domain.services.brief_builder import brief_from
from utils.prompts.brief import LEVEL_STANDARD, collect_fact_sources
from domain.entities.intent import Intent
from utils.prompts.brief import (
    INTENT_PROFILES,
    VOICE_RECOMMEND,
    collect_fact_sources,
    render_brief,
)
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import (
    FORMATTING_GUARDRAIL,
    NEGOTIATION_DIRECTION_GUARDRAIL,
    PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS,
)
from utils.prompts.brief.posture import RATIONALE_HEADING, render_posture
from utils.prompts.question_focus import render_question
from utils.prompts.kb_reference import render_kb_reference

explain_recommendation_system_prompt = """
You are the Calculum AI Negotiation Assistant, explaining the reasoning behind
a specific recommendation you have made to a procurement professional.

This explanation is for the negotiator's own situational awareness — it is
never read aloud to, or forwarded to, the supplier. Every figure and judgment,
including the BATNA, may be stated plainly here.

You will receive a RATIONALE BRIEF that already contains the computed reasoning
behind every recommendation this session can produce: the target term (and
which benchmark drove it), leverage, financial sensitivity, business
priority, the categorised negotiation arguments (benchmarks + spend, grouped by
how far they support the target), the opening anchor, and any opening-strategy
signals (stretch ceiling, phased approach, SCF). The reasoning is already done
— your job is to:

  1. Identify which recommendation the negotiator is asking about. If the
     question is vague ("why that?", "explain the rating"), resolve it using
     the ## RECENT CONVERSATION block.
  2. Explain that recommendation's reasoning clearly, using only the rationale
     fields in the BRIEF below — do not recompute, re-derive, or second-guess.
  3. If the question covers multiple recommendations ("why 62 days AND why high
     leverage?"), address each in turn.

If the negotiator asks which benchmark or argument to use, cite, or lead with
("should I use the industry benchmark or the supplier standard?"), answer from
the categorised NEGOTIATION ARGUMENTS block — reason about each candidate's
POSITION relative to the target and the BATNA, never merely which one
has a value:
  - USE TO JUSTIFY THE ASK (at or above the target) — lead with these to justify
    the ask; order by SOURCE credibility, strongest first (the supplier's own
    history outranks a bigger industry number).
  - HOLD IN RESERVE (above our current term but below the target) — do NOT open
    with these; they cannot justify the ask itself. They argue for MOVEMENT off
    the current term, and defend landing above the floor if the supplier
    resists the first ask.
  - NOT ARGUMENTS (at or below our current term) — do not cite; those below the
    current term are the supplier's potential counter-evidence.
  - NOT AVAILABLE — has no value at all for this supplier (dropped upstream,
    never a low number — there is simply nothing to compare). This group is
    for YOUR reference only: never show it. No "Not available" heading, group,
    label or bullet in the answer — a source with no data is mentioned only
    when the negotiator's question names it.

  An open request to RECOMMEND or SHOW the arguments ("recommend negotiation
  arguments", "show additional arguments to optimize payment terms") names no
  benchmark — answer it from the same groups: first the arguments to lead with
  (USE TO JUSTIFY THE ASK, strongest source first), then those to HOLD IN
  RESERVE, each with its figure and one line on how to use it. Mention NOT
  ARGUMENTS only briefly — the benchmarks with a figure, so the negotiator
  knows not to cite them. Nothing else: no group or line for sources with no
  data or ruled-out assessments, and nothing described as "unavailable". This is the answer itself, not an explanation of an earlier
  one.

  MANDATORY STRUCTURE for a "should I use X or Y (or Z...)" question — follow
  this order exactly, one clause per name, BEFORE any recommendation:
    1. Take EVERY benchmark name the negotiator's question mentions (there may
       be two, three, or more — not just the first one). List them out to
       yourself first.
    2. For EACH one, in the order asked, give one explicit clause with its
       status and why: its figure and which of those groups it is in, or
       — if it has no value — say so plainly in that clause ("Supplier Standard
       has no data for this supplier"), never under a "Not available" label. A benchmark being unavailable or non-supporting
       is not a reason to skip mentioning it — it is the answer for that one.
    3. ONLY AFTER every named benchmark has its own clause, give your
       recommendation (which one to lead with, or none if all are unusable).
  SELF-CHECK before finalising: re-read the negotiator's question, count the
  benchmark names in it, and count the status clauses in your draft answer —
  the counts MUST match. If your draft only explains one of two (or more)
  named benchmarks and jumps straight to recommending a THIRD one the
  negotiator never named, that is exactly the failure this rule exists to
  prevent — go back and add the missing clause(s) before answering. Never
  prefer one benchmark over another just because the other is missing, and
  never treat "not available" as if it were a low or unfavorable value.

Formatting:
  - Plain prose or short bullets — no rigid template, no section numbering.
  - Be direct: state the reason first, then the supporting evidence. Avoid
    filler like "Great question!" or preamble restating what was asked.
  - Keep it concise — a few focused sentences or bullets, not an essay.
  - If the question refers to something not covered by the BRIEF (e.g. a
    recommendation from a different tool), say so briefly rather than guessing.
"""


# "Recommend negotiation arguments.", "Show additional arguments to optimize
# payment terms.", "suggest arguments I can use" — an open request for the
# argument set, as opposed to a question about one recommendation or source.
_ARGUMENT_RECOMMENDATION_RE = re.compile(
    r"\b(?:recommend|suggest|show|list|provide|give)\b[^?.!]*\barguments?\b",
    re.IGNORECASE,
)


def is_argument_recommendation_request(*texts: str | None) -> bool:
    """True when the turn asks for the arguments themselves, not about one."""
    return any(t and _ARGUMENT_RECOMMENDATION_RE.search(t) for t in texts)


def build_explain_recommendation_prompt(
    message: str,
    facts: SupplierFacts,
    opening_strategy: OpeningStrategyAnalysis | None,
    history: list[ConversationTurn] | None = None,
    rag_context: RAGContext | None = None,
    prompt_instructions: list[str] | None = None,
    brief: NegotiationBrief | None = None,
    resolved_question: str | None = None,
) -> str:
    brief = brief or brief_from(facts, opening_strategy=opening_strategy)
    profile = INTENT_PROFILES[Intent.EXPLAIN_RECOMMENDATION]
    if is_argument_recommendation_request(message, resolved_question):
        profile = replace(profile, arguments=VOICE_RECOMMEND)
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        render_question(
            message,
            fallback="(no specific question — explain the key recommendations for this supplier)",
        ),
        *render_brief(brief, profile),
        _applied_benchmark_block(facts),
        render_posture(
            brief,
            heading=RATIONALE_HEADING,
            include_sequence=True,
            sequence_note="(how the negotiation case was structured)",
            include_term_days=True,
        ),
    ]
    if opening_strategy is not None:
        blocks.append(_opening_strategy_block(opening_strategy))
    blocks.append(render_kb_reference(rag_context))
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    return "\n\n".join(b for b in blocks if b)


def _applied_benchmark_block(facts: SupplierFacts) -> str:
    """WHICH benchmark set the target, and what else was considered.

    The argument block lists every benchmark and where it sits against the ask;
    it does not say which one the upstream system actually used to derive the
    target. That is the first thing "why 76 days?" is asking, so it is stated
    here rather than left for the model to infer from the ordering.
    """
    lines = ["## TARGET DERIVATION — which benchmark set the target"]
    applied = next((b for b in facts.strategy_benchmarks if b.applied), None)
    if applied is None:
        lines.append(
            "- No strategy benchmark is marked applied — the target was not "
            "derived from a single benchmark. Say so rather than picking one."
        )
        return "\n".join(lines)
    lines.append(
        f"- Applied: {argument_display_name(applied.name)} ({applied.label}) "
        f"= {applied.value} days"
    )
    if applied.description:
        lines.append(f"  Detail: {applied.description}")
    if applied.occurrences is not None:
        avg = f", avg {applied.avg} days" if applied.avg is not None else ""
        q3 = f", Q3 {applied.q3} days" if applied.q3 is not None else ""
        lines.append(f"  Sample: {applied.occurrences} occurrences{avg}{q3}")
    others = [b for b in facts.strategy_benchmarks if not b.applied]
    if others:
        lines.append(
            "- Considered but not applied: "
            + ", ".join(
                f"{argument_display_name(b.name)} ({b.value} days)" for b in others
            )
        )
    return "\n".join(lines)


def _opening_strategy_block(opening_strategy: OpeningStrategyAnalysis) -> str:
    lines = ["## OPENING STRATEGY RATIONALE — why each opening-move recommendation was made"]

    anchor = opening_strategy.primary_anchor
    if anchor is not None:
        lines += [
            f"- Primary anchor: {anchor.label} ({argument_display_name(anchor.source)}) = {anchor.value} days",
            f"  Detail: {anchor.detail}",
            f"  Why chosen: {anchor.rationale}",
        ]
    else:
        lines.append("- Primary anchor: none (no applied strategy benchmark usable as the anchor)")

    supports = [b for b in opening_strategy.benchmark_ladder if b.classification == "supports"]
    if supports:
        lines.append("- Supporting benchmarks (reinforce the ask):")
        for b in supports:
            lines.append(
                f"  • {b.label} ({argument_display_name(b.source)}): {b.detail}"
            )

    if opening_strategy.counter_evidence:
        lines.append("- Counter-evidence benchmarks (sit below the ask — the supplier may cite these):")
        for b in opening_strategy.counter_evidence:
            lines.append(
                f"  • {b.label} ({argument_display_name(b.source)}): {b.detail}"
            )

    if opening_strategy.stretch_ceiling is not None:
        sc = opening_strategy.stretch_ceiling
        lines.append(
            f"- Stretch ceiling: {sc.term_days} days ({sc.gap_days} days above target) — {sc.rationale}"
        )

    if opening_strategy.phased_approach_recommended:
        lines.append(f"- Phased approach recommended: {opening_strategy.phased_approach_reason}")

    # Available levers only — an unavailable SCF lever is not part of the
    # reasoning to explain, and printing it (with both rates in its rationale)
    # is how SCF got into answers for suppliers it cannot be offered to.
    lever = opening_strategy.scf_reserve_lever
    if lever is not None and lever.available:
        lines.append(f"- SCF reserve lever [available]: {lever.rationale}")

    if opening_strategy.cash_discount_note:
        lines.append(f"- Cash discount note: {opening_strategy.cash_discount_note}")

    return "\n".join(lines)


# ── Source attribution ────────────────────────────────────────────────────────

def collect_explain_sources(
    brief: NegotiationBrief,
    opening_strategy: OpeningStrategyAnalysis | None,
) -> dict[str, dict[str, object]]:
    """Map the facts most likely referenced in an explanation to their payload paths."""
    facts = brief.facts
    sources = collect_fact_sources(brief, LEVEL_STANDARD)

    applied = next((b for b in facts.strategy_benchmarks if b.applied), None)
    if applied is not None:
        sources[format_source_label("applied_benchmark")] = {
            "path": f"negotiationStrategy.{applied.name}.value",
            "value": applied.value,
        }

    if opening_strategy is not None and opening_strategy.primary_anchor is not None:
        anchor = opening_strategy.primary_anchor
        if anchor.source is not None:
            sources[format_source_label("primary_anchor")] = {
                "path": f"negotiationStrategy.{anchor.source}.value",
                "value": anchor.value,
            }

    return sources


explain_recommendation_system_prompt = (
    explain_recommendation_system_prompt
    + "\n---\n"
    + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS
    + NEGOTIATION_DIRECTION_GUARDRAIL
    + FORMATTING_GUARDRAIL
)
