from __future__ import annotations

import re

from domain.entities.argument_catalog import ARGUMENT_CATALOG, argument_display_name
from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.entities.opening_strategy import OpeningStrategyAnalysis
from domain.entities.rag_context import RAGContext
from utils.constants import format_source_label
from domain.entities.brief import NegotiationBrief
from domain.services.brief_builder import brief_from
from domain.services.negotiation_arguments import citable_support_benchmarks
from utils.prompts.brief import LEVEL_STANDARD, collect_fact_sources
from domain.entities.intent import Intent
from utils.prompts.brief import INTENT_PROFILES, collect_fact_sources, render_brief
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import (
    FORMATTING_GUARDRAIL,
    NEGOTIATION_DIRECTION_GUARDRAIL,
    PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS,
)
from utils.prompts.brief.posture import FLOOR_INTERNAL, render_posture
from utils.prompts.question_focus import REQUEST_HEADING, render_question
from utils.prompts.kb_reference import render_kb_reference

opening_strategy_system_prompt = """
You are the Calculum AI Negotiation Assistant, preparing the OPENING MOVE of a payment-term negotiation — narrow and tactical, NOT a full playbook (that's `generate_negotiation_playbook`). Answer the one question: "what do I say in the first minute?" Produce ready-to-use output.

## THE REQUEST DECIDES THE SHAPE
The three-section template below is the DEFAULT — what a plain "what's my opening strategy?" gets. It is not a cage.
- They asked for ONE PART of it ("just give me the line to open with", "what number do I open at?", "how should I frame this?") → give that part alone, in the shape they asked for. No headings they did not ask for, no sections they did not ask for.
- They asked for a different LENGTH or LAYOUT ("one paragraph", "in bullets", "keep it short", "walk me through it properly") → honour it. How many sections there are, and how long they run, is theirs to change.
- They asked to lead with something specific, or to leave something out ("focus on the peer benchmark", "don't mention the industry number") → do it. If they name an argument that is NOT in USE TO JUSTIFY THE ASK, say so in one line and lead with the strongest one that is — never argue from a figure this brief does not support.
- They asked for another language or a particular register → that applies to everything you write.
- No specific instruction → the full three-section template, every time.
Flexibility is about FORM. Every figure, name and judgment still comes from the BRIEF, whatever shape the answer takes.

Inputs in the BRIEF (apply as given — never recompute or second-guess):
1. FACTS — verbatim figures (target/current term, financials, ratings). Quote exactly.
2. NEGOTIATION ARGUMENTS — the categorised, precedence-ordered evidence:
   - USE TO JUSTIFY THE ASK: arguments AT OR ABOVE the target. The list is ordered by source credibility (the supplier's own history first; a bigger industry number does NOT outrank it).
   - ANSWER THEIR OBJECTIONS: these do not justify the term and are never offered as reasons for it.
   - NOT ARGUMENTS: at or below the BATNA — named without figures because they are unusable. Never cite one or infer a value for one.
   - RULED OUT: assessed for this supplier and NOT usable. These are claims the supplier can check and disprove — make none of them, anywhere.
3. BENCHMARK EVIDENCE — the day figure, the occurrence count and the market-evidence wording for each benchmark that supports the ask. This is where section 1's figures come from. It lists the same benchmarks in the same source order as USE TO JUSTIFY THE ASK and never re-ranks them. One benchmark may be marked APPLIED — the one the upstream system used to set the target. Section 1 LEADS with that one even where the source order puts another first; the others then follow in the listed order. Nothing else about the ranking changes.
4. ANALYSIS — final judgments (leverage, financial sensitivity, priority) with the rationale behind them.
5. BACKGROUND SIGNALS — stretch ceiling, phased approach, SCF reserve lever, cash discount. NOT part of the default document (see below). Use one only if the negotiator's request asks about it.
6. TONE — the negotiator's chosen wording style. Apply it; never name it.

ASYMMETRY GUARD: the BATNA term, the buyer's cash-flow / working-capital unlock, the exact spend figure, and financing economics (WACC, SCF rate, supplier financing rate, cost of debt spread) are INTERNAL ONLY — never state them in Sequencing, and never frame the buyer's cash-flow gain as a shared benefit. Use them only to reason about framing, as guidance to the negotiator.

Structure — the default document:

  Opening Strategy - {Supplier} ({Country})

  **1. Target**
  The number and the evidence for it. Nothing else.
  - Lead with the figure alone on its own clause: "**{N} days**." - the target
    from FACTS. Do NOT write a "Target:" label here; the section title already
    names it, and repeating "Target: N days" breaks the same formatting Tone
    and Sequencing use (figures bold, labels only on section titles).
  - The LEAD argument, named exactly as BENCHMARK EVIDENCE names it, with its day figure and what it is: "Lead with Peer Group Standard at **60 days** as the current market benchmark you are aligning your payment terms to." Lead with the APPLIED benchmark where BENCHMARK EVIDENCE marks one, otherwise the first USE-TO-JUSTIFY argument.
  - Each reinforcing argument, named with its figure and - where BENCHMARK EVIDENCE gives an occurrence count - that count: "This is also supported by the Supplier Standard at **67 days** (backed by 16 occurrences in the Calculum database)."
  - The market-evidence sentence, ONLY where BENCHMARK EVIDENCE supplies one. Use the wording it gives: it says whose average and whose top quartile the figures describe, and getting that wrong states something untrue about this supplier.
  - If nothing supports the ask, say so plainly and anchor on the target-vs-current gap.
  This section is EVIDENCE. It carries no tactics: never write what to withhold, what to "reveal if pressed", how to describe a figure to the supplier, or what to call it instead. State the arguments and their figures.

  **2. Tone**
  Two short sentences, no more:
  - How to position the request — a mutual investment in the long-term stability of the partnership, aligned with standard market practice.
  - The posture to hold, grounded in the read: name the buyer leverage AND what drives it, and the success probability. "Given the low buyer leverage (low spend materiality) but high success probability, hold a collaborative but firm posture." Bring in a supplier-profile factor only where it changes the posture (SME, protected-business designation, credit rating, an APPLIED regulatory cap — a regulatory reference marked NOT applied shapes nothing).
  Write to the NEGOTIATOR, in the second person: "your leverage", "your relationship with them". Never justify the ask by the buyer's own finances ("without compromising our financial health"), and never name the tone you are applying.

  **3. Sequencing**
  The order to deploy if the supplier does not agree. Never lead with Supplier Standard — that makes them defensive. Open at the TARGET term (a higher benchmark never overrules it).
  - First: the general company-policy / treasury opening line, at the target.
  - Then each USE-TO-JUSTIFY argument in the listed order, one at a time.
  Write 1-2 short sentences per step, in the buyer's voice for step 1 only. No sample size, occurrence count, quartile, or other internal figure in anything sayable.

THERE IS NO "SUGGESTED OPENING" SECTION AND NO PUSHBACK SECTION. BATNA terms, stretch ceilings, phased structures, SCF, cash discounts and how to answer an objection are not part of this document — the negotiator gets those from the playbook and from `handle_supplier_pushback`. Never add a section for them, and never add a line saying one of them does not apply here.

Formatting:
  - Each section title is its OWN line, wrapped in **bold** exactly as shown (`**1. Target**`).
  - Put the body on the FOLLOWING line(s). Never glue title and body on one line. Never write `1. Title — body`.
  - Section 1 runs to a few short lines; sections 2 and 3 are 1-2 sentences each. No nested sub-headers.
  - Section 3 is the ONLY section that may be said to the supplier; the other two are negotiator-only.
""" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS + NEGOTIATION_DIRECTION_GUARDRAIL + FORMATTING_GUARDRAIL


# Fixed section titles in prompt order — used to repair glued / unbolded drafts.
# Names only (no leading "N."); the regex captures the number separately.
#
# Three sections. Client 2026-09-09: drop "Suggested Opening"; Sequencing is
# the order to deploy arguments (company policy first, never supplier standard).
# "If They Push Back Immediately" stays out — that is handle_supplier_pushback.
#
# Repair only ever fires on a title that is actually present, so a reply the
# negotiator asked to be shaped differently passes through untouched.
_OPENING_STRATEGY_SECTION_TITLES = (
    "Target",
    "Tone",
    "Sequencing",
)

_OPENING_TITLE_ALT = "|".join(re.escape(t) for t in _OPENING_STRATEGY_SECTION_TITLES)
_OPENING_CANONICAL = {t.lower(): t for t in _OPENING_STRATEGY_SECTION_TITLES}

# `1. Title — body` / `1. Title body` / optional ## or ** wrappers → split + bold title.
_OPENING_GLUED_RE = re.compile(
    rf"^[ \t]*(?:#{{1,6}}\s+)?(?:\*\*)?(\d{{1,2}})\.\s+"
    rf"({_OPENING_TITLE_ALT})(?:\*\*)?"
    rf"(?:\s*(?:—+|-+|:)\s*|\s+)(\S.*)$",
    re.IGNORECASE | re.MULTILINE,
)
# Solo title line missing bold (or wrapped in ##).
_OPENING_SOLO_RE = re.compile(
    rf"^[ \t]*(?:#{{1,6}}\s+)?(?:\*\*)?(\d{{1,2}})\.\s+"
    rf"({_OPENING_TITLE_ALT})(?:\*\*)?[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)


def normalize_opening_strategy_structure(draft: str | None) -> str:
    """Force section titles onto their own bolded lines.

    The model often copies the old prompt shape (`1. Title — body` on one line)
    or drops the blank line between title and body. Same idea as
    ``normalize_playbook_structure``: repair after generation so the chat
    renderer always gets ``**N. Title**`` alone, then body.

    Also strips a redundant ``Target:`` label on the first body line of
    section 1 — the section title already names Target.
    """
    if not draft:
        return draft or ""

    def _title_line(num: str, raw_title: str) -> str:
        title = _OPENING_CANONICAL.get(raw_title.lower(), raw_title)
        return f"**{num}. {title}**"

    def split_glued(match: re.Match[str]) -> str:
        return f"{_title_line(match.group(1), match.group(2))}\n{match.group(3).strip()}"

    def bold_solo(match: re.Match[str]) -> str:
        return _title_line(match.group(1), match.group(2))

    text = _OPENING_GLUED_RE.sub(split_glued, draft)
    text = _OPENING_SOLO_RE.sub(bold_solo, text)
    return _strip_redundant_target_label(text)


def _strip_redundant_target_label(text: str) -> str:
    """``**1. Target**`` then ``Target: **60 days**.`` → drop the ``Target:`` prefix."""
    lines = text.splitlines()
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)
        plain = line.replace("*", "").strip()
        if plain.startswith("1. Target"):
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                out.append(lines[j])
                j += 1
            if j < len(lines):
                body = lines[j]
                stripped = body.lstrip()
                indent = body[: len(body) - len(stripped)]
                for prefix in ("Target: ", "Target:", "**Target:** ", "**Target**: ", "**Target:**"):
                    if stripped.startswith(prefix):
                        stripped = stripped[len(prefix) :].lstrip()
                        break
                out.append(indent + stripped)
                i = j + 1
                continue
        i += 1
    return "\n".join(out)


def build_opening_strategy_prompt(
    message: str,
    facts: SupplierFacts,
    opening_strategy: OpeningStrategyAnalysis,
    tone: dict[str, str] | None,
    history: list[ConversationTurn] | None = None,
    rag_context: RAGContext | None = None,
    prompt_instructions: list[str] | None = None,
    brief: NegotiationBrief | None = None,
) -> str:
    brief = brief or brief_from(facts, opening_strategy=opening_strategy)
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        render_question(
            message,
            heading=REQUEST_HEADING,
            fallback="(no specific request — produce the opening strategy for this supplier)",
        ),
        *render_brief(brief, INTENT_PROFILES[Intent.RECOMMEND_OPENING_STRATEGY]),
        render_posture(
            brief,
            floor=FLOOR_INTERNAL,
            include_sequence=True,
            sequence_note="(fallback anchor framing if no PRIMARY ANCHOR is given below)",
        ),
        benchmark_evidence_block(facts, opening_strategy),
        _anchor_strategy_block(opening_strategy),
        _tone_block(tone),
    ]
    blocks.append(render_kb_reference(rag_context))
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    return "\n\n".join(b for b in blocks if b)


# How a benchmark's average and top-quartile figures are WORDED, per source.
#
# The statistics are the same three numbers on every benchmark, and they mean
# something different on each one. `supplierStandard`'s average is what THIS
# SUPPLIER already accepts from its other customers; `peerGroupStandard`'s is
# what COMPARABLE SUPPLIERS accept; `industryRegionStandard`'s is the industry
# and region. The client's reviewed copy states the first of those about the
# supplier by name — "Adp, Inc is already accepting on average 67 days from
# other customers" — which is true of that source and false of the other two.
#
# So the sentence is written here, per source, rather than left to the model to
# infer from a bare "avg 67, q3 79". A source with no wording below prints its
# figures with no claim attached.
_MARKET_EVIDENCE_WORDING: dict[str, str] = {
    "supplierStandard": (
        "market evidence: {supplier} is already accepting on average {avg} days "
        "from its other customers{q3_clause}"
    ),
    "peerGroupStandard": (
        "market evidence: comparable suppliers average {avg} days{q3_clause}"
    ),
    "industryRegionStandard": (
        "market evidence: the industry and region average {avg} days{q3_clause}"
    ),
}

_Q3_CLAUSE: dict[str, str] = {
    "supplierStandard": ", and {q3} days from its top-quartile customers",
    "peerGroupStandard": ", with the top quartile at {q3} days",
    "industryRegionStandard": ", with the top quartile at {q3} days",
}


def _format_days(value: float | int) -> str:
    """A day figure as the negotiator reads it — 67, not 67.0."""
    number = float(value)
    return str(int(number)) if number.is_integer() else f"{number:g}"


def market_evidence_claim(
    benchmark: StrategyBenchmark, *, supplier_name: str | None
) -> str | None:
    """Fragment for one benchmark (`market evidence: …` / `internal evidence: …`)."""
    template = _MARKET_EVIDENCE_WORDING.get(benchmark.name)
    # Industry/region from Calculum is almost always value-only (no avg/q3).
    # `value` is that average; require avg alone and every industry bullet
    # falls through to the catalog meaning with the day figure scrubbed off.
    average = benchmark.avg if benchmark.avg is not None else benchmark.value
    if template is None or average is None:
        return None
    q3_clause = (
        _Q3_CLAUSE[benchmark.name].format(q3=_format_days(benchmark.q3))
        if benchmark.q3 is not None
        else ""
    )
    return template.format(
        supplier=supplier_name or "this supplier",
        avg=_format_days(average),
        q3_clause=q3_clause,
    )


def format_market_evidence_sentence(
    benchmark: StrategyBenchmark, *, supplier_name: str | None
) -> str | None:
    """Full Key Arguments evidence sentence for one benchmark, or None."""
    claim = market_evidence_claim(benchmark, supplier_name=supplier_name)
    if claim is None:
        return None
    if claim.startswith("internal evidence:"):
        sentence = (
            "There is internal evidence that "
            + claim.removeprefix("internal evidence:").strip()
        )
    else:
        sentence = (
            "There is market evidence that "
            + claim.removeprefix("market evidence:").strip()
        )
    if benchmark.occurrences is not None:
        sentence += (
            f" (backed by n={benchmark.occurrences} occurrences in the "
            "Calculum database)"
        )
    return sentence + "."


def benchmark_evidence_block(
    facts: SupplierFacts, opening_strategy: OpeningStrategyAnalysis | None = None
) -> str:
    """The figures section 1 quotes: value, sample size, average, top quartile.

    Same set and order as USE TO JUSTIFY THE ASK. ``opening_strategy`` is
    optional — without it, no benchmark is marked APPLIED.
    """
    benchmarks = [b for b in citable_support_benchmarks(facts) if b.value is not None]
    if not benchmarks:
        return ""

    def _rank(benchmark) -> int:
        definition = ARGUMENT_CATALOG.get(benchmark.name)
        return definition.rank if definition else 99

    applied_source = (
        opening_strategy.primary_anchor.source
        if opening_strategy is not None and opening_strategy.primary_anchor is not None
        else None
    )

    lines = [
        "## BENCHMARK EVIDENCE — the figures section 1 quotes",
        "Name each benchmark exactly as it is named here. Quote only the "
        "statistics printed under it: an average or a quartile figure that is "
        "not listed does not exist for that source.",
        "Listed in the client's SOURCE order — the same order as USE TO JUSTIFY "
        "THE ASK, which this block never re-ranks. The one exception is the "
        "benchmark marked APPLIED: section 1 leads with THAT one, because it is "
        "the benchmark the target was actually derived from. The rest follow in "
        "the order below.",
    ]
    for benchmark in sorted(benchmarks, key=_rank):
        name = argument_display_name(benchmark.name)
        applied = benchmark.name == applied_source
        tag = (
            "  [APPLIED — the benchmark that set the target; lead section 1 with it]"
            if applied
            else ""
        )
        lines.append(f"- {name} — {_format_days(benchmark.value)} days{tag}")
        if benchmark.occurrences is not None:
            lines.append(
                f"    backed by {benchmark.occurrences} occurrences in the "
                "Calculum database"
            )
        claim = market_evidence_claim(
            benchmark, supplier_name=facts.supplier_name
        )
        if claim is not None:
            lines.append(f"    {claim}")
    if applied_source is None:
        lines.append(
            "- No benchmark is marked APPLIED — lead section 1 with the first "
            "USE TO JUSTIFY THE ASK argument."
        )
    lines.append(
        "The occurrence counts and quartile figures above are for sections 1 "
        "and 2 only. Section 3 is said to the supplier: it may carry a "
        "benchmark's day figure, never a sample size, an occurrence count or a "
        "quartile."
    )
    return "\n".join(lines)


def _anchor_strategy_block(opening_strategy: OpeningStrategyAnalysis) -> str:
    """The signals the default document does NOT have a section for.

    The primary anchor moved out of here: it decides which benchmark section 1
    leads with, so it belongs with the figures section 1 quotes, in
    `benchmark_evidence_block`, marked on the benchmark itself.

    What is left — a stretch ceiling, a phased structure, an SCF lever, a cash
    discount — used to be section 4, and the client struck section 4 (see
    `_OPENING_STRATEGY_SECTION_TITLES`). It stays in the prompt because a
    negotiator can ask about any of it and the answer should not be "I don't
    have that", and it is labelled as background so a model looking for
    something to write does not turn it back into a section. The block is
    dropped entirely when there is nothing in it: an empty heading is an
    invitation to fill it.
    """
    lines = []

    if opening_strategy.stretch_ceiling is not None:
        sc = opening_strategy.stretch_ceiling
        lines.append(f"- STRETCH CEILING: {sc.rationale}")

    if opening_strategy.phased_approach_recommended:
        lines.append(f"- PHASED APPROACH RECOMMENDED: {opening_strategy.phased_approach_reason}")

    # Only an AVAILABLE lever is printed. The unavailable one used to be shown
    # as "[not available]: <why>", which put the programme, its rate and the
    # supplier's own financing rate in front of a model asked to sequence
    # levers — and it duly sequenced SCF as the fallback for suppliers it could
    # not be offered to. A lever we cannot pull is not a lever.
    lever = opening_strategy.scf_reserve_lever
    if lever is not None and lever.available:
        lines.append(f"- SCF RESERVE LEVER [available]: {lever.rationale}")

    if opening_strategy.cash_discount_note:
        lines.append(f"- CASH DISCOUNT: {opening_strategy.cash_discount_note}")

    if not lines:
        return ""
    return "\n".join([
        "## BACKGROUND SIGNALS — NOT part of the opening-strategy document",
        "None of these gets a section. Use one only if the negotiator's request "
        "asks about it; otherwise it does not appear in the answer at all, not "
        "even to say it does not apply.",
        *lines,
    ])


def _tone_block(tone: dict[str, str] | None) -> str:
    if not tone:
        return (
            "## TONE\n"
            "No tone was selected — default to a balanced, professional, "
            "fact-led tone for Sequencing."
        )
    return (
        "## TONE — apply throughout, especially to Sequencing\n"
        f"- {tone.get('label', '')}: {tone.get('description', '')}\n"
        f"- Wording rules: {tone.get('wording_rules', '')}"
    )


# ── Source attribution ────────────────────────────────────────────────────

def collect_opening_strategy_sources(
    brief: NegotiationBrief, opening_strategy: OpeningStrategyAnalysis
) -> dict[str, dict[str, object]]:
    """Map each fact/benchmark used to produce the opening strategy to its
    payload path and value, mirroring `collect_guide_sources`."""
    facts = brief.facts
    sources = collect_fact_sources(brief, LEVEL_STANDARD)

    anchor = opening_strategy.primary_anchor
    if anchor is not None and anchor.source is not None:
        sources[format_source_label("primary_anchor")] = {
            "path": f"negotiationStrategy.{anchor.source}.value",
            "value": anchor.value,
        }

    if opening_strategy.stretch_ceiling is not None and "opportunity_term_days" in facts.source_paths:
        sources[format_source_label("opportunity_term_days")] = {
            "path": facts.source_paths["opportunity_term_days"],
            "value": facts.opportunity_term_days,
        }

    return sources
