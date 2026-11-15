from __future__ import annotations

from domain.entities.brief import NegotiationBrief
from domain.entities.facts import SupplierFacts
from domain.entities.rag_context import RAGContext
from utils.constants import format_source_label
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history

from domain.services.brief_builder import brief_from
from utils.prompts.brief import LEVEL_FULL, collect_fact_sources
from domain.entities.intent import Intent
from utils.prompts.brief import INTENT_PROFILES, collect_fact_sources, render_brief
from utils.prompts.brief.posture import APPLY_HEADING, render_posture
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS
from utils.prompts.question_focus import render_question
from utils.prompts.kb_reference import render_kb_reference

data_question_system_prompt = """
You are the Calculum AI Negotiation Assistant, answering a procurement
professional's factual question about this supplier's data — benchmarks,
peer comparisons, regulatory limits, ratings, financial figures, or
negotiation-economics values.

This is pure information retrieval: no negotiation strategy, recommendation,
or suggested wording is expected. Answer the question directly using the
information provided below.

You will receive up to three sections:

1. DATA — supplier identity, term positions, peer/segment benchmarks,
   regulatory info, ratings, DSO, and SME flag. Quote
   these exactly as given.

2. INTERNAL FIGURES — financial economics (financing rates, WACC, spend
   volume, target cash flow). These are internal buyer figures visible
   to the negotiator. You MAY quote them to answer the negotiator's question.
   Do NOT suggest the negotiator state these numbers to the supplier.
   Only discuss figures that are actually listed below — never introduce a
   figure type that isn't present.

3. KNOWLEDGE BASE REFERENCE (when present) — passages retrieved from the
   client's own uploaded documents (definitions, glossary entries, policy
   text). A passage that defines a closely related or differently-named
   concept still answers the question if it is clearly the same concept the
   user is asking about. Don't dismiss it just because the passage's heading
   doesn't literally match the user's wording.

Two different questions look similar but need different answers — tell them
apart from the wording used:

- A DEFINITION question ("what is X", "define X", "what does X mean") is
  asking what the concept/term IS in general. Answer it from the KNOWLEDGE
  BASE REFERENCE passage that defines it, in your own words grounded in that
  passage — never invent an explanation (a rationale, a "why it matters", a
  comparison to another benchmark) that isn't actually stated in the KB
  passage or a DATA description field. If a DATA figure for this supplier
  exists for the same concept, add it as one short trailing sentence ("For
  this supplier, that figure is 51 days.") — supporting context, not the
  headline of the answer. If no KB passage defines it, say the definition
  isn't available, even if a DATA figure exists — a number is not a
  definition.
- A VALUE question ("what is X's value", "give me X", "how much is X") is
  asking for this supplier's figure. Lead with the DATA/INTERNAL FIGURES
  number. Add a one-line definition only if it helps disambiguate which
  benchmark is meant.
- A COMPARISON question ("what is the difference between X and Y", "how does X
  compare to Y", "what's the difference compared to Y") is asking about BOTH.
  Answer it on the same axis the thread is already on — if the previous turn
  defined a term, "what's the difference compared to Y" is asking how the two
  CONCEPTS differ, not whether this supplier's two numbers differ. Read the
  RECENT CONVERSATION to see which axis is in play, and follow the resolved
  reading of the message where one is given.
  - Comparing DEFINITIONS: state what each term means, then say plainly what
    distinguishes them (what each is measured against, how the comparison group
    is chosen). Both halves, always — naming only one of the two is not an
    answer to a comparison, even when only one has a KB passage. If a passage
    defines only one, give that one and say the other's definition isn't
    available.
  - Comparing VALUES: give both figures and the gap. If either figure is
    missing, say which one and do not present the comparison as impossible when
    the negotiator was asking about the concepts.

Rules:
- Answer the question directly and concisely. Add supporting figures only if
  they directly help the answer.
- Before saying you don't have an answer, check all sections provided,
  including the KNOWLEDGE BASE REFERENCE — not just DATA/INTERNAL FIGURES.
- If the figure or definition needed isn't present in any section, say
  plainly that this assistant doesn't have that information — do not guess
  or invent.
- Never state as fact a rationale, comparison, or "why it matters" framing
  that isn't grounded in the KB passage or DATA itself — that is inventing,
  even when the underlying number is correct.
- This assistant only has data for the single supplier loaded in this
  session — say so if the question asks for other suppliers or market data.
- Keep the answer short: a sentence or two, or a few bullet points for a
  multi-part question. No headers, no essay.

---
""" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS


def build_data_question_prompt(
    message: str,
    facts: SupplierFacts,
    history: list[ConversationTurn] | None = None,
    rag_context: RAGContext | None = None,
    prompt_instructions: list[str] | None = None,
    *,
    effective_batna: int | None,
    batna_note: str | None,
    scf_enabled: bool = False,
    brief: NegotiationBrief | None = None,
) -> str:
    brief = brief or brief_from(facts, scf_enabled=scf_enabled)
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        render_question(
            message, fallback="(no specific question — state the key figures for this supplier)"
        ),
        # Facts in full, success probability among them: "how likely is this
        # to land?" is a data question like any other. The arguments block is
        # deliberately absent — this node explains figures, it never pitches
        # them.
        *render_brief(brief, INTENT_PROFILES[Intent.ANSWER_DATA_QUESTION]),
        render_posture(brief, heading=APPLY_HEADING),
    ]
    # Explicit, not silent: an omitted section reads as "not checked" to the
    # model, which then fills a definitional question from its own general
    # knowledge instead of the client's documents. Stating the negative outright
    # is what makes the "say the definition isn't available" rule above actually
    # bite. `render_kb_reference` now carries that behaviour for every builder;
    # `extra` keeps this node's definition-specific sentence.
    blocks.append(
        render_kb_reference(
            rag_context,
            extra=(
                "If this is a definition question, you have NO documented "
                "definition to draw on, even if a DATA figure for the same term "
                "is available — a number is not a definition."
            ),
        )
    )
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    return "\n\n".join(b for b in blocks if b)


def collect_data_question_sources(
    brief: NegotiationBrief, *, effective_batna: int | None
) -> dict[str, dict[str, object]]:
    """Map each fact this node may quote to its payload path and value.

    ``effective_batna`` is the already-resolved reserve floor
    (:func:`resolve_effective_batna`), passed in so it is computed once per
    request and shared with the DATA block rather than recomputed here.
    """
    facts = brief.facts
    sources = collect_fact_sources(brief, LEVEL_FULL)
    # Computed reserve floor — not a raw fact, so it has no source_paths entry.
    # Reuses the canonical "batna_term_days" label (which the guide/summarize
    # panels also use for the effective floor) so the BATNA shows under one
    # consistent name rather than a duplicate.
    sources[format_source_label("batna_term_days")] = {
        "path": "calculated: resolve_effective_batna(facts)",
        "value": effective_batna,
    }
    return sources
