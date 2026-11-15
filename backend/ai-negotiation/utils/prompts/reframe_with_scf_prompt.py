from __future__ import annotations

from utils.constants import format_camel_label
from domain.services.scf_analysis import ScfViability
from utils.constants import format_source_label
from domain.entities.brief import NegotiationBrief
from domain.entities.intent import Intent
from utils.prompts.brief import INTENT_PROFILES, render_brief
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import (
    FORMATTING_GUARDRAIL,
    NEGOTIATION_DIRECTION_GUARDRAIL,
    PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS,
)
from utils.prompts.question_focus import REQUEST_HEADING, render_question

reframe_with_scf_system_prompt = """
You are the Calculum AI Negotiation Assistant, positioning Supply Chain Finance (SCF) as part of a payment-term negotiation. The upstream system has already confirmed SCF is worth offering here. Whether it is also CHEAPER than the supplier's own borrowing varies: the programme is offered on a small rate premium too, where it wins on settlement timing and off-balance-sheet treatment instead. The SCF ANALYSIS block states which case this is — follow it exactly and never claim a rate saving it does not report.

Inputs (quote facts exactly, never recompute):
1. FACTS — verbatim supplier values (term days, identity, industry, spend volume, cash-flow opportunity).
2. SCF ANALYSIS — precomputed signals: where our rate sits against the supplier's own financing (a spread to pitch, or a premium that makes timing the pitch instead); financial sensitivity (calibrate urgency/tone); leverage posture/strength (how assertively to frame); the SME flag (gentler for SMEs); priority signals (spend, cash-flow opportunity).
3. TONE — the negotiator's chosen style; apply throughout, especially Suggested Framing.

ASYMMETRY GUARD — INTERNAL ONLY, never state the raw values in any supplier-facing section (use only to reason about framing): our SCF rate, the supplier's financing rate, the supplier's WACC, spend volume and target cash flow (reference impact conceptually), the BATNA. In supplier-facing text, express a rate advantage as the SPREAD in percentage points (e.g. "approximately X pts below your current short-term borrowing cost") — the spread is derived and acceptable to state — and only when the SCF ANALYSIS block reports one. Where it reports a premium instead, state no rate comparison at all, in either direction.

Structure (use these exact headings, this order, every time):
  SCF Pitch — {Supplier} ({Country})
  1. Why SCF Works Here (negotiator-only) — 2-3 sentences: the rate position (advantage, or the premium and why the offer still stands), financial sensitivity, and any SME/leverage signals that make it compelling or call for a gentler approach.
  2. When to Deploy It (negotiator-only) — 1-2 sentences on timing: up front with the term ask, or held as a reserve lever? Factor in financial sensitivity and leverage. If the applied benchmark is SCF-linked (scfPeerStandard, scfCostPositive), introduce early.
  3. Suggested Framing (supplier-facing) — 2-3 sentences of literal, sayable pitch language. The centrepiece. Use the spread if there is one (never raw rates), otherwise lead on day-5 settlement and off-balance-sheet treatment; frame SCF as reducing the cash-flow impact of the longer term, not a concession; calibrate to TONE; for SMEs add brief reassurance on simplicity/reliability. This is the ONLY sayable section: keep every internal figure out of it.
  4. Objection Anticipation — the single most likely pushback (onboarding complexity, existing factoring, distrust of the buyer's bank) + a one-sentence pivot. Tight.

Formatting: 2-3 sentences per section, no bullet essays. Sections 1-2 negotiator-only and stay OUTSIDE the markers; Section 3 is the only one the supplier hears (and the only one inside the markers) — keep it crisp and non-technical.
""" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS + NEGOTIATION_DIRECTION_GUARDRAIL + FORMATTING_GUARDRAIL


def build_reframe_with_scf_prompt(
    message: str,
    viability: ScfViability,
    tone: dict[str, str] | None,
    history: list[ConversationTurn] | None = None,
    prompt_instructions: list[str] | None = None,
    brief: NegotiationBrief | None = None,
) -> str:
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        render_question(
            message,
            heading=REQUEST_HEADING,
            fallback="(no specific request — build the SCF pitch for this supplier)",
        ),
        _facts_block(viability),
        # The success probability alone — this surface writes its own four-line
        # FACTS block, so it takes the signal without the brief's. An SCF pitch
        # is a different pitch when the term ask is unlikely to land: financing
        # becomes the primary offer rather than a sweetener.
        *render_brief(brief, INTENT_PROFILES[Intent.REFRAME_WITH_FINANCING]),
        _scf_analysis_block(viability),
        _tone_block(tone),
    ]
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    return "\n\n".join(b for b in blocks if b)


def _facts_block(v: ScfViability) -> str:
    extension_days = (
        (v.target_term_days - v.current_term_days)
        if v.target_term_days is not None and v.current_term_days is not None
        else None
    )
    lines = [
        "## FACTS — quote exactly, do not recompute",
        f"- Supplier: {v.supplier_name} ({v.country}, {v.industry})",
        f"- Current agreed term: {v.current_term_days} days",
        f"- Target term we are proposing: {v.target_term_days} days",
    ]
    if extension_days is not None:
        lines.append(f"- Term extension being negotiated: {extension_days} days")
    return "\n".join(lines)


def _scf_analysis_block(v: ScfViability) -> str:
    lines = [
        "## SCF ANALYSIS — already computed, apply, do not recompute",
        *_rate_position_lines(v),
        f"- Financial sensitivity: {v.financial_sensitivity_level} — {v.financial_sensitivity_rationale}",
        f"- Leverage: {format_camel_label(str(v.leverage_posture or ''))} / "
        f"{v.leverage_strength} strength — {v.leverage_rationale}",
    ]
    if v.is_sme:
        lines.append(
            "- SME supplier: use reassuring, accessible language about programme simplicity "
            "and reliability in the Suggested Framing."
        )
    if v.spend_volume is not None:
        lines.append(
            f"- [INTERNAL ONLY] Spend volume on record — reference the business scale "
            f"conceptually ('meaningful programme scale', 'significant annual spend') "
            f"without stating the figure."
        )
    if v.target_cash_flow is not None:
        lines.append(
            f"- [INTERNAL ONLY] Cash-flow opportunity on record — frame the programme as "
            f"directly addressing this opportunity without citing the specific figure."
        )
    if v.wacc_after_tax is not None:
        lines.append(
            f"- [INTERNAL ONLY] Supplier WACC after-tax on record — use only to calibrate "
            f"how cost-sensitive this supplier is to financing; never state the value."
        )
    return "\n".join(lines)


def _rate_position_lines(v: ScfViability) -> list[str]:
    """Where our programme rate sits against the supplier's own borrowing.

    Viability tolerates a small premium (see
    :data:`domain.services.scf_analysis.SCF_RATE_TOLERANCE_PTS`), so this block
    cannot assume a saving. Stating one that does not exist is the failure mode
    it exists to prevent: the pitch would be quoting a number the supplier can
    check against their own bank.
    """
    if v.undercuts_supplier_rate and v.rate_spread_pts is not None:
        return [
            f"- Rate advantage: our SCF programme rate is {v.rate_spread_pts:.1f} percentage points "
            f"below the supplier's current short-term financing rate — a credible, material saving.",
            "  [INTERNAL ONLY — do not state raw rates]: SCF rate vs supplier financing rate comparison "
            "confirms the spread above; never state the individual rate values in supplier-facing text.",
        ]

    premium = abs(v.rate_spread_pts) if v.rate_spread_pts is not None else None
    magnitude = (
        f"about {premium:.1f} percentage points above" if premium else "level with"
    )
    return [
        f"- NO rate advantage: our SCF programme rate sits {magnitude} the supplier's own "
        f"short-term financing rate. The programme is still worth offering — settlement as "
        f"early as day 5 and off-balance-sheet treatment are the argument here — but it is "
        f"NOT cheaper money for them.",
        "  [INTERNAL ONLY — do not state raw rates]: make NO rate comparison in supplier-facing "
        "text, in either direction. Do not say the programme is cheaper, do not quote a spread, "
        "and do not volunteer that it costs more; pitch timing and balance-sheet treatment.",
    ]


def _tone_block(tone: dict[str, str] | None) -> str:
    if not tone:
        return (
            "## TONE\n"
            "No tone was selected — default to a balanced, professional tone "
            "in the Suggested Framing."
        )
    return (
        "## TONE — apply throughout, especially to the Suggested Framing\n"
        f"- {tone.get('label', '')}: {tone.get('description', '')}\n"
        f"- Wording rules: {tone.get('wording_rules', '')}"
    )


_SCF_FACT_FIELDS = (
    "scf_rate",
    "supplier_financing_rate",
    "target_term_days",
    "current_term_days",
    "spend_volume",
    "target_cash_flow",
)


def collect_scf_sources(viability: ScfViability, facts_source_paths: dict[str, str]) -> dict[str, dict[str, object]]:
    """Map the facts backing the SCF pitch to their payload paths."""
    result: dict[str, dict[str, object]] = {}
    field_values = {
        "scf_rate": viability.scf_rate,
        "supplier_financing_rate": viability.supplier_financing_rate,
        "target_term_days": viability.target_term_days,
        "current_term_days": viability.current_term_days,
        "spend_volume": viability.spend_volume,
        "target_cash_flow": viability.target_cash_flow,
    }
    for name in _SCF_FACT_FIELDS:
        if name in facts_source_paths and field_values.get(name) is not None:
            result[format_source_label(name)] = {"path": facts_source_paths[name], "value": field_values[name]}
    return result
