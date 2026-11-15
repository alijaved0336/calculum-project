from __future__ import annotations

import logging


logger = logging.getLogger(__name__)
from domain.entities.counter_offer import CounterOfferAnalysis, CounterOfferExtraction
from domain.entities.facts import SupplierFacts, resolve_effective_batna
from utils.constants import format_source_label
from domain.entities.brief import NegotiationBrief
from domain.services.brief_builder import brief_from
from utils.prompts.scenario_prompt import (
    collect_economic_profit_sources,
    render_economic_profit_block,
)
from utils.prompts.brief import (
    INTENT_PROFILES,
    LEVEL_MINIMAL,
    collect_fact_sources,
    format_money,
    render_brief,
)
from domain.entities.intent import Intent
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import (
    FORMATTING_GUARDRAIL,
    NEGOTIATION_DIRECTION_GUARDRAIL,
    PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS,
)
from utils.prompts.brief.posture import FLOOR_NONE, render_posture
from utils.prompts.question_focus import MESSAGE_HEADING, render_question

# ── Stage 1: extraction ──────────────────────────────────────────────────────

counter_offer_extraction_system_prompt = """
You are the parameter-extraction step for a counter-offer evaluation node. Read the negotiator's message and the KNOWN FIGURES block, then return JSON describing the supplier's counter-offer. You do not evaluate or draft a reply.

## COUNTER TYPES (pick exactly one)
- days_only — supplier proposed a different number of days, no financial conditions attached.
- days_with_price_premium — supplier proposes or accepts days AND demands a price/cost increase (e.g. "1% higher on invoices", "uplift of 2%").
- days_with_cash_discount — supplier proposes or accepts days AND offers a cash/early-payment discount (e.g. "1% off if you pay within 10 days").
- days_with_ramp — supplier accepts the proposed days but wants a phased/gradual implementation (e.g. "over 12 months", "90-day ramp").
- conditional_non_financial — supplier accepts or proposes days but attaches a non-financial condition (volume commitment, exclusivity, minimum spend, contract length, etc.).
- unclear — message does not contain a recognisable counter-offer with enough detail to extract.

## RESOLVING NAMED TERMS
Use KNOWN FIGURES to resolve references — never invent values:
- "our target" / "what we asked" / "our proposal" → target term from KNOWN FIGURES
- "current terms" / "today's terms" / "status quo" → current term
- "the BATNA" / "our floor" / "minimum" → BATNA
- "their counter" / the number stated by the supplier → counter_term_days
If the supplier explicitly agrees to our proposed days, set accepts_proposed_days=true and counter_term_days=null.

## UNIT CONVERSIONS (always convert before returning)
- Days to months: "3 months" ≈ 90 days, "6 months" ≈ 180 days, "1 month" ≈ 30 days.
- Ramp lengths: "90-day ramp" → ramp_months=3; "6-month phase-in" → ramp_months=6.
- Percentages as decimals: "1% increase" → 0.01; "2.5% uplift" → 0.025; "0.5% off" → 0.005.
- If a percentage is already a decimal in the message, keep it as-is.

## MULTI-DIMENSIONAL OFFERS
If the counter-offer combines days AND a financial condition (e.g. "45 days AND a 1% premium"), set the counter_type that matches the financial condition (days_with_price_premium), fill counter_term_days AND the financial field, and set accepts_proposed_days=false.
If there are multiple financial conditions, pick the dominant one and note the other in assumptions.

## OUTPUT — valid JSON only, no preamble or markdown
{
  "counter_type": "<days_only|days_with_price_premium|days_with_cash_discount|days_with_ramp|conditional_non_financial|unclear>",
  "counter_term_days": <number or null>,
  "accepts_proposed_days": <bool>,
  "price_premium_pct": <decimal or null>,
  "cash_discount_pct": <decimal or null>,
  "early_payment_days": <number or null>,
  "ramp_months": <number or null>,
  "non_financial_condition": "<string or null>",
  "reasoning": "<one sentence: what the supplier proposed and how you resolved any named terms>",
  "assumptions": "<one sentence on any defaulted or converted values, or null>"
}
Fill only the fields relevant to the chosen counter_type; leave the rest null.
""" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS


def build_counter_offer_extraction_prompt(
    message: str,
    facts: SupplierFacts,
    history: list[ConversationTurn] | None = None,
) -> str:
    effective_fallback, _ = resolve_effective_batna(facts)
    known = [
        "## KNOWN FIGURES (resolve named terms against these; do not invent values)",
        f"- current term: {facts.current_term_days}",
        f"- target term (our proposed ask): {facts.target_term_days}",
        f"- BATNA: {effective_fallback}",
        f"- benchmark term: {facts.benchmark_term_days}",
    ]
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        f"## Negotiator's message\n{message}",
        "\n".join(known),
    ]
    return "\n\n".join(b for b in blocks if b)


# ── Stage 2: response drafting ───────────────────────────────────────────────

counter_offer_response_system_prompt = """
You are the Calculum AI Negotiation Assistant, evaluating a supplier's counter-offer on behalf of the negotiator.

This is a fully internal assessment — the negotiator is reading it, not the supplier. Use all available figures (including the BATNA and financial rates) freely in your analysis sections. In the "Suggested Wording" sub-section only, write as if speaking to the supplier: keep those 2-3 sentences clean of internal figures (BATNA, WACC, financing rates, spend volume, SCF rate). Everything else is internal.

You will receive four input blocks. Treat them as follows:
1. COUNTER-OFFER EXTRACTION — what the supplier proposed, already parsed. Interpret it accurately.
2. CALCULATION RESULTS — all figures already computed deterministically. Never recompute, round, or second-guess any number. The verdict is pre-determined; your job is to explain it, not override it.
3. FACTS — verbatim supplier values. Quote exactly as given.
4. ANALYSIS — pre-computed judgments (leverage, financial sensitivity, business priority, argument sequence). Use to ground the recommended move — do not recompute.

## VERDICT CODES
- accept — the counter meets or exceeds our target, and any price premium stays below its break-even.
- counter_push_days — above the BATNA, below target; push for more.
- counter_with_scf — the premium is financially positive, but our SCF programme gives the supplier the same liquidity for less; offer SCF in place of the premium.
- counter_reject_premium — the premium costs more after tax than the extra payment days are worth (negative economic profit); reject the premium, counter on days or at a premium below the break-even.

NO BATNA NEVER MEANS ACCEPT. Staying on the current terms is always available and has an economic profit of zero, so a counter with NEGATIVE economic profit is worse than no deal at all. Never argue "there is no BATNA / no alternative, so accept" - the absence of an alternative negotiation is not the absence of an alternative outcome.
- reject — at or below current term.
- borderline — above current but below BATNA; judgment call.
- non_financial_flag — condition is non-financial; flag for human/commercial judgment.
- unclear — counter-offer could not be parsed; ask for clarification.

## OUTPUT STRUCTURE (use these headings exactly)

### Counter-Offer Assessment — {Supplier}

**1. What the Supplier Proposed**
One short paragraph interpreting the counter in plain terms — what the supplier actually said, and which type of counter this is (days, premium, discount, ramp, conditional).

**2. Where It Lands**
2–4 sentences covering: counter vs. target / BATNA / benchmark / current term. State the gaps in days. Quote the gross working-capital unlock if available. For a price premium or cash discount, state its valuation from PRICE CONDITION, VALUED: the price impact after tax, the value of the working capital, the net economic profit, and the break-even premium. The gross unlock is a one-off balance-sheet figure and the price impact is annual - NEVER subtract one from the other, and never call the working-capital swing a profit or a "net unlock". For ramps, state the foregone unlock. Be specific with numbers.

**3. Verdict: {ACCEPT | COUNTER | BORDERLINE — JUDGMENT CALL | REJECT}**
1–2 sentences of rationale grounded in ANALYSIS (leverage, financial sensitivity, business priority). No generic negotiation advice — tie it to this supplier's specific profile.

**4. Recommended Move**
What to do next. For COUNTER: state a specific next position (anchor or benchmark from the argument sequence) and the 1–2 strongest arguments to use. Include a "Suggested Wording" sub-section of 2–3 sentences the negotiator can say or send (supplier-facing — no internal figures). For counter_with_scf: frame the SCF pitch briefly. For REJECT: how to frame the BATNA professionally (1 sentence). For ACCEPT: whether to accept as-is or attach any conditions. For BORDERLINE: lay out the key trade-off and what would tip the decision.

**5. Watch-Outs** (only if any apply — omit the section entirely if none)
Bullet list, max 3 items: SME flag, regulatory cap, high financial sensitivity, SCF opportunity that wasn't already covered above.

---
Keep the whole assessment tight — 250–400 words. This is read mid-negotiation, not as prep material.
""" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS + NEGOTIATION_DIRECTION_GUARDRAIL + FORMATTING_GUARDRAIL


def build_counter_offer_response_prompt(
    message: str,
    extraction: CounterOfferExtraction,
    ca: CounterOfferAnalysis,
    facts: SupplierFacts,
    history: list[ConversationTurn] | None = None,
    prompt_instructions: list[str] | None = None,
    scf_enabled: bool = False,
    brief: NegotiationBrief | None = None,
) -> str:
    brief = brief or brief_from(facts, scf_enabled=scf_enabled)
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        render_question(
            message,
            heading=MESSAGE_HEADING,
            fallback="(no specific message — assess the counter-offer below)",
        ),
        _extraction_block(extraction),
        # Offerability, not enablement: the SCF lines below tell the model
        # what SCF buys against this counter-offer, and a lever we cannot put
        # on the table is not part of the answer.
        _calculation_block(ca, brief.scf_offerable),
        *render_brief(brief, INTENT_PROFILES[Intent.EVALUATE_COUNTER_OFFER]),
        render_posture(
            brief,
            floor=FLOOR_NONE,
            include_sequence=True,
            sequence_note="(use for the recommended counter position)",
        ),
    ]
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    result = "\n\n".join(b for b in blocks if b)
    logger.info("build_counter_offer_response_prompt assembled:\n%s", result)
    return result


def _extraction_block(e: CounterOfferExtraction) -> str:
    lines = [
        "## COUNTER-OFFER EXTRACTION — what the supplier proposed",
        f"- counter_type: {e.counter_type}",
        f"- Supplier accepted our proposed days: {e.accepts_proposed_days}",
        f"- Counter-offer term: {e.counter_term_days if e.counter_term_days is not None else '(accepted our term)'}",
    ]
    if e.price_premium_pct is not None:
        lines.append(f"- Price premium demanded: {e.price_premium_pct * 100:.2f}%")
    if e.cash_discount_pct is not None:
        lines.append(f"- Cash discount offered: {e.cash_discount_pct * 100:.2f}%")
    if e.early_payment_days is not None:
        lines.append(f"- Early-payment window for discount: {e.early_payment_days:.0f} days")
    if e.ramp_months is not None:
        lines.append(f"- Ramp requested: {e.ramp_months:.0f} months")
    if e.non_financial_condition:
        lines.append(f"- Non-financial condition: {e.non_financial_condition}")
    if e.reasoning:
        lines.append(f"- Extraction reasoning: {e.reasoning}")
    if e.assumptions:
        lines.append(f"- Assumptions: {e.assumptions}")
    return "\n".join(lines)


def _calculation_block(ca: CounterOfferAnalysis, scf_offerable: bool = False) -> str:
    lines = [
        "## CALCULATION RESULTS — do not recompute any of these",
        f"- Effective counter-offer term: {_fmt_days(ca.effective_counter_term_days)}",
        f"- Zone: {ca.zone or 'N/A'} — {ca.zone_rationale or 'N/A'}",
        f"- Gap vs. our target: {_fmt_days(ca.gap_vs_target_days)} ({_fmt_currency(ca.cash_gap_vs_target)} cash impact)",
        f"- Gross working-capital unlock (at counter term vs. current): {_fmt_currency(ca.gross_unlock)}",
    ]
    if ca.gross_unlock_formula:
        lines.append(f"  Formula: {ca.gross_unlock_formula}")

    # The price condition, valued by the SAME model and rendered by the SAME
    # function as the scenario surface - see `render_economic_profit_block`.
    # The gross unlock above is a one-off balance-sheet figure and is never
    # netted against an annual price cost; this block is the only place the
    # two meet, and it meets them through the cost of capital.
    if ca.economic_profit is not None:
        lines.append(
            render_economic_profit_block(
                ca.economic_profit,
                heading=(
                    "- PRICE CONDITION, VALUED (buyer economic profit - the ONLY "
                    "valuation of the premium/discount; do not net it against the "
                    "gross unlock yourself):"
                ),
            )
        )

    if ca.ramp_foregone_unlock is not None:
        lines.append(f"- Foregone working-capital unlock due to ramp (vs. immediate switch): {_fmt_currency(ca.ramp_foregone_unlock)}")

    # SCF viability signals are omitted entirely unless SCF can actually be
    # offered to this supplier, so the model is never handed an SCF lever it
    # cannot pull — whether the programme is off for the session or simply not
    # offerable here.
    if scf_offerable:
        lines.append(f"- SCF viable: {ca.scf_viable}")
        if ca.scf_rate_spread_pts is not None:
            # The spread is signed: SCF stays viable at a small premium, so a
            # zero or negative value must not be read out as an "advantage".
            if ca.scf_rate_spread_pts > 0:
                lines.append(f"- SCF rate advantage over supplier financing: {ca.scf_rate_spread_pts:.1f} percentage points")
            else:
                lines.append(
                    f"- SCF rate vs supplier financing: NO rate advantage "
                    f"({abs(ca.scf_rate_spread_pts):.1f} pts above their own rate) — the SCF "
                    f"argument here is day-5 settlement and off-balance-sheet treatment, not price"
                )
        lines.append(f"- SCF undercuts implied financial condition rate: {ca.scf_undercuts_implied_rate}")

    lines += [
        f"- PRE-DETERMINED VERDICT: {ca.verdict}",
        f"- Verdict rationale: {ca.verdict_rationale}",
    ]
    if ca.notes:
        lines.append("- Notes:")
        for note in ca.notes:
            lines.append(f"  • {note}")
    return "\n".join(lines)


# ── Source attribution ────────────────────────────────────────────────────────

def collect_counter_offer_sources(
    brief: NegotiationBrief,
    ca: CounterOfferAnalysis,
) -> dict[str, dict[str, object]]:
    """Map each figure used in the assessment back to its origin."""
    sources = collect_fact_sources(brief, LEVEL_MINIMAL)

    if ca.gross_unlock is not None:
        sources[format_source_label("gross_unlock")] = {
            "path": f"calculated: {ca.gross_unlock_formula}",
            "value": ca.gross_unlock,
        }
    if ca.economic_profit is not None:
        sources.update(collect_economic_profit_sources(brief.facts, ca.economic_profit))
    if ca.cash_gap_vs_target is not None:
        sources[format_source_label("cash_gap_vs_target")] = {
            "path": "calculated: delta(counter, target)", "value": ca.cash_gap_vs_target
        }
    if ca.ramp_foregone_unlock is not None:
        sources[format_source_label("ramp_foregone_unlock")] = {
            "path": "calculated: ramp model", "value": ca.ramp_foregone_unlock
        }

    return sources


# ── Helpers ──────────────────────────────────────────────────────────────────

def _fmt_days(value: float | None) -> str:
    if value is None:
        return "N/A"
    return f"{value:.0f} days"


def _fmt_currency(value: float | None) -> str:
    return format_money(value)
