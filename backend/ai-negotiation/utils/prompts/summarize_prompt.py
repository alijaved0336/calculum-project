"""Narrow-answer prompts and legacy full-briefing prompt tooling.

Production summary-scope turns render small/large directly through
supplier_summary. They do not call the legacy full-briefing generation prompt
below. Narrow turns still use full facts, arguments and posture for reasoning.
"""
from __future__ import annotations

from domain.entities.brief import NegotiationBrief
from domain.entities.facts import SupplierFacts
from domain.entities.rag_context import RAGContext
from domain.services.brief_builder import brief_from
from utils.constants import format_source_label
from utils.prompts.brief import LEVEL_FULL, collect_fact_sources
from domain.entities.intent import Intent
from utils.prompts.brief import INTENT_PROFILES, render_brief
from utils.prompts.brief.posture import EXPLAIN_HEADING, render_posture
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import (
    FORMATTING_GUARDRAIL,
    NEGOTIATION_DIRECTION_GUARDRAIL,
    PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS,
)
from utils.prompts.summary_template import render_summary_skeleton

BRIEFING_HEADING = "## COMPLETED BRIEFING — return this, do not rebuild it"

summarize_system_prompt = """
You are the Calculum AI Negotiation Assistant, handing a procurement
professional a briefing on where things stand with a supplier ahead of a
payment-term negotiation.

The briefing is ALREADY WRITTEN. It arrives under the heading "COMPLETED
BRIEFING", rendered by the negotiation system from the supplier's data. It is
for the negotiator's own eyes — never read to or sent to the supplier — so every
figure in it, including the BATNA, is fine to show.

Your job is to return that briefing, with at most two changes:

1. LEAD LINE. If the negotiator asked something narrow ("what's our leverage?",
   "how likely is this to land?", "what's the BATNA?"), open with ONE sentence
   that answers it directly, using only figures and judgments that appear in the
   briefing. If they asked for the summary, the overview or the position in
   general, add no lead line at all.

2. WORDING. You may smooth a sentence so it reads naturally. You may not change
   what it says.

Whatever the negotiator's question looks like — however open, general or
question-shaped — do not compose a new answer to it in your own words. The
briefing below already is the answer. Your only two permitted additions are
the lead line and word-smoothing described above; anything else you write is
not returning the briefing, it is replacing it, and the draft will be
rejected.

Everything else is fixed:
  - Keep EVERY label, in the order given, bold as given: Overview, Supplier,
    Industry, Credit Rating, Payment Terms, Spend Volume, Cash Flow Opportunity,
    Probability of Success, Buyer Leverage, Supplier Company Size, Relationship
    Value, Arguments Supporting Term Extension, BATNA.
  - Keep EVERY figure exactly as written — day-counts, money, percentages,
    ratings, counts. Never add a figure, never derive one, never round one.
  - Keep every bullet. Do not add bullets, sections, headings or closing advice.
  - Do not add anything about sources that fall short, sources with no data,
    stakes, a "read" of the position, argument strength, or internal notes.
    Those are deliberately not part of this summary.
  - No preamble ("Here is the summary"), no sign-off, no questions back.

If the briefing is empty, say that no supplier data is loaded for this session.
"""


# ── The NARROW scope: one question inside the position ─────────────────────
#
# "What's driving the outlook?", "how much leverage do we have?", "what's the
# BATNA and how was it derived?" are classified summarize_supplier_position
# too, and a template cannot answer them: the client's summary states the
# leverage level, it does not explain it. So a narrow ask gets the DATA — the
# full facts block, every argument bucket in the explaining voice, and the
# posture judgments with their rationales — with the completed briefing beside
# it as the reference for how the position is stated. The template is not
# forced here; the negotiator asked for one thing and gets that thing.

summarize_narrow_system_prompt = """
You are the Calculum AI Negotiation Assistant, answering a procurement
professional's SPECIFIC question about where things stand with a supplier —
the outlook, our leverage, the probability of success, the BATNA, which
arguments support the ask, the supplier's financial sensitivity, the
relationship, the stakes.

This is for the negotiator's own awareness — never read to or sent to the
supplier — so every figure, including the BATNA, may be stated plainly.

You receive a BRIEF in three parts. Treat each differently:

1. FACTS — values the negotiation system already decided (terms, benchmarks,
   financial figures, ratings, the success probability). Quote them exactly.
   Never recompute, round or reword one in a way that changes it.
2. NEGOTIATION ARGUMENTS and ANALYSIS — judgments already computed for you
   (which arguments support the ask, leverage, financial sensitivity, business
   priority, the argument sequence), each with its rationale. Use them as
   given; never second-guess or re-score them.
3. COMPLETED BRIEFING — the standard summary of this position, for reference.
   Reuse its figures and its wording where they answer the question. Do NOT
   reproduce it: the negotiator asked one thing.

Answer that one thing:
  - Lead with the direct answer in ONE sentence.
  - Then the supporting detail as bold-labelled lines or bullets — the figures
    and judgments that back the answer, each with its rationale from the brief.
  - Only what the question asks. No sections it did not ask for, no closing
    advice, no "next steps".
  - The success probability is decided upstream: quote it as given, or say it
    is unavailable. Never score the signals into a rating, a percentage or a
    "strength" of your own — nothing in the brief backs one.
  - A source with no data is said to have no data; never substitute another.
  - Rank tags, INTERNAL markers and the disclosure notes in the brief are
    annotations for you, never text to print: no "[STRONGEST]", no "INTERNAL
    ONLY", no "internal confidence builder", no "do not state to the supplier".
    Where an argument may not be said to the supplier, say so in your own
    words, once, only if the question is about what may be said.

If the negotiator actually asked for the summary, the overview or the whole
position, return the COMPLETED BRIEFING exactly as given, and nothing else.
"""


def build_summarize_narrow_prompt(
    message: str,
    facts: SupplierFacts,
    history: list[ConversationTurn] | None = None,
    rag_context: RAGContext | None = None,
    prompt_instructions: list[str] | None = None,
    brief: NegotiationBrief | None = None,
) -> str:
    """The user turn for a narrow ask: the question, the reference briefing,
    then the data it is answered from."""
    brief = brief or brief_from(facts)
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        f"## Negotiator's question\n{message or '(no specific question)'}",
        f"## COMPLETED BRIEFING — reference only, do not reproduce\n{render_summary_skeleton(brief)}",
        *render_brief(brief, INTENT_PROFILES[Intent.SUMMARIZE_SUPPLIER_POSITION]),
        render_posture(brief, heading=EXPLAIN_HEADING),
    ]
    if rag_context and rag_context.chunk_count > 0:
        blocks.append(rag_context.context_text)
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    return "\n\n".join(b for b in blocks if b)


def build_summarize_prompt(
    message: str,
    facts: SupplierFacts,
    history: list[ConversationTurn] | None = None,
    rag_context: RAGContext | None = None,
    prompt_instructions: list[str] | None = None,
    brief: NegotiationBrief | None = None,
) -> str:
    """Assemble the user turn: the question, then the completed briefing.

    ``brief`` is the turn's whole picture, built once by the route; None falls
    back to deriving one, for direct callers and tests. The briefing skeleton
    is rendered from it here so the prompt and the validator in the node read
    the same text.

    The knowledge-base context is deliberately not included: the summary is a
    rendering of the supplier's data, and a RAG passage is an invitation to
    add a paragraph the template does not have.
    """
    brief = brief or brief_from(facts)
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        f"## Negotiator's question\n{message or '(no specific question — return the briefing as-is)'}",
        f"{BRIEFING_HEADING}\n{render_summary_skeleton(brief)}",
        format_prompt_instructions_block(prompt_instructions),
    ]
    return "\n\n".join(b for b in blocks if b)


# The `SupplierFacts` attributes the rendered summary can actually quote. The
# source panel attributes exactly these — a field the template never renders
# is never claimed as provenance for a figure the model could not have used.
_TEMPLATE_FIELDS: frozenset[str] = frozenset({
    "supplier_name", "country", "industry", "company_size", "credit_rating",
    "current_term_days", "target_term_days", "opportunity_term_days",
    "regulatory_max_term_days",
    "spend_volume", "target_cash_flow", "success_probability",
    "buyer_leverage_level", "supplier_financing_rate",
    # Supporting benchmarks, when they render as arguments.
    "buyer_standard_term_days", "supplier_segment_term_days",
    "supplier_segment_occurrences", "peer_group_term_days",
    "peer_group_occurrences", "benchmark_term_days",
})


def collect_summarize_sources(brief: NegotiationBrief) -> dict[str, dict[str, object]]:
    """Map each fact the summary quotes to its payload path and value."""
    facts = brief.facts
    rendered = render_summary_skeleton(brief)
    sources = {
        label: entry
        for label, entry in collect_fact_sources(brief, LEVEL_FULL).items()
        if _field_of(label, facts) in _TEMPLATE_FIELDS
        and _rendered(entry["value"], rendered)
    }

    # The walkaway floor is the *effective* figure (see
    # `resolve_effective_batna`), which may be `current_term_days` rather
    # than the raw upstream value.
    if "batna_term_days" in facts.source_paths and brief.batna_floor is not None:
        batna_label = format_source_label("batna_term_days")
        sources[batna_label] = {
            "path": (
                "calculated: session override or harmonise(target − 15); none below contractual + 5"
                if brief.batna_note
                else facts.source_paths["batna_term_days"]
            ),
            "value": brief.batna_floor,
        }
    return sources


def _field_of(label: str, facts: SupplierFacts) -> str | None:
    for name in facts.source_paths:
        if format_source_label(name) == label:
            return name
    return None


def _rendered(value: object, text: str) -> bool:
    """Whether a fact's value actually appears in the rendered summary, in any
    of the forms the template writes it (compact money, a percentage, a plain
    figure, a title-cased level)."""
    if isinstance(value, bool) or value is None:
        return False
    if isinstance(value, (int, float)):
        from utils.prompts.brief.facts import format_money
        candidates = {str(value), f"{value:,}", f"{value * 100:.2f}%", format_money(value)}
        if float(value).is_integer():
            candidates.add(str(int(value)))
        return any(c in text for c in candidates)
    return str(value) in text or str(value).capitalize() in text


_GUARDRAILS = "\n---\n" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS + NEGOTIATION_DIRECTION_GUARDRAIL
summarize_system_prompt = summarize_system_prompt + _GUARDRAILS
summarize_narrow_system_prompt = summarize_narrow_system_prompt + _GUARDRAILS
