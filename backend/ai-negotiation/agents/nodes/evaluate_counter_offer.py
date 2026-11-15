from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.services.brief_builder import build_negotiation_brief
from domain.entities.counter_offer import CounterOfferExtraction
from domain.ports.llm_port import LLMPort
from domain.services.counter_offer_calculator import analyze_counter_offer
from domain.services.scf_policy import apply_scf_prompt_policy
from utils.prompts.evaluate_counter_offer_prompt import (
    build_counter_offer_extraction_prompt,
    build_counter_offer_response_prompt,
    collect_counter_offer_sources,
    counter_offer_extraction_system_prompt,
    counter_offer_response_system_prompt,
)
from utils.json_extract import extract_first_json_object
from utils.prompts.response_mode import get_format_instruction

logger = logging.getLogger(__name__)

_RULE = "-" * 88

_VALID_COUNTER_TYPES = {
    "days_only",
    "days_with_price_premium",
    "days_with_cash_discount",
    "days_with_ramp",
    "conditional_non_financial",
    "unclear",
}

_UNPARSEABLE_REASON = (
    "This assistant couldn't parse a clear counter-offer from that message. "
    "Try describing what the supplier proposed more specifically — for example: "
    "'They countered at 45 days' or 'They accepted 62 days but want a 1% price increase'."
)




def _as_float(value: object) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_extraction(raw: str) -> CounterOfferExtraction:
    data = extract_first_json_object(raw)
    if data is None:
        logger.warning("evaluate_counter_offer: extraction returned no valid JSON: %r", raw)
        return CounterOfferExtraction(counter_type="unclear", reasoning=_UNPARSEABLE_REASON)

    counter_type = str(data.get("counter_type") or "unclear").strip().lower()
    if counter_type not in _VALID_COUNTER_TYPES:
        counter_type = "unclear"

    return CounterOfferExtraction(
        counter_type=counter_type,
        counter_term_days=_as_float(data.get("counter_term_days")),
        accepts_proposed_days=bool(data.get("accepts_proposed_days", False)),
        price_premium_pct=_as_float(data.get("price_premium_pct")),
        cash_discount_pct=_as_float(data.get("cash_discount_pct")),
        early_payment_days=_as_float(data.get("early_payment_days")),
        ramp_months=_as_float(data.get("ramp_months")),
        non_financial_condition=data.get("non_financial_condition") or None,
        reasoning=data.get("reasoning") or None,
        assumptions=data.get("assumptions") or None,
    )


def make_evaluate_counter_offer_node(llm: LLMPort) -> NodeFn:
    """Build the `evaluate_counter_offer` node.

    Three-stage flow:

      1. Extract — lightweight LLM call that turns the negotiator's free-text
         description of the supplier's counter into a structured
         :class:`CounterOfferExtraction` (counter type, days, financial
         conditions, ramp, etc.).

      2. Calculate — :func:`domain.services.counter_offer_calculator.analyze_counter_offer`
         runs all deterministic analysis: zone determination, gross/net unlock,
         buyer economic profit of any price condition, SCF viability comparison, and a pre-determined verdict.
         No LLM involved.

      3. Draft — full LLM call that phrases the already-computed result into
         a structured internal assessment for the negotiator: where the offer
         lands, the financial impact, the verdict, the recommended next move
         (with suggested wording), and any watch-outs.

    This node produces an internal advisory document — the negotiator (not the
    supplier) is the reader. The asymmetry guard is not applied; the system
    prompt instructs the LLM to keep only the "Suggested Wording" sub-section
    clean of internal figures.

    The same :mod:`domain.services.scenario_calculator` functions used by the
    scenario node power the financial calculations here, keeping the numbers
    consistent across intents.
    """

    async def evaluate_counter_offer_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if context is None or context.facts is None:
            logger.warning("evaluate_counter_offer: missing supplier context/facts")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't evaluate this counter-offer."
                ),
                "errors": ["evaluate_counter_offer: missing context/facts"],
            }

        facts = context.facts
        message = state.get("message", "")
        # The turn's brief, built ONCE by the route from the resolved context
        # (overrides applied, SCF stripped where the turn disallows it). Rebuilt
        # here only for a direct invocation that never went through the route —
        # from the CONTEXT, so the bundles it already resolved are reused rather
        # than recomputed from bare facts.
        brief = state.get("brief") or build_negotiation_brief(
            context, scf_enabled=state.get("scf_enabled", False)
        )
        history = state.get("conversation_history")


        # ── Call 1: extract counter-offer structure ────────────────────────
        extraction_prompt = build_counter_offer_extraction_prompt(message, facts, history)

        try:
            raw_extraction = await llm.complete(
                extraction_prompt,
                system=counter_offer_extraction_system_prompt,
                temperature=0,
                enable_thinking=False,
                stream_to_client=False,
            )
        except Exception as exc:
            logger.exception("evaluate_counter_offer: extraction failed")
            return {"response": None, "errors": [f"evaluate_counter_offer: {exc}"]}


        extraction = _parse_extraction(raw_extraction)
        logger.info(
            "evaluate_counter_offer: counter_type=%s accepts_days=%s counter_term=%s "
            "premium_pct=%s discount_pct=%s ramp_months=%s",
            extraction.counter_type,
            extraction.accepts_proposed_days,
            extraction.counter_term_days,
            extraction.price_premium_pct,
            extraction.cash_discount_pct,
            extraction.ramp_months,
        )

        # ── Deterministic calculation ──────────────────────────────────────
        ca = analyze_counter_offer(extraction, facts, brief.arguments)
        logger.info(
            "evaluate_counter_offer: zone=%s verdict=%s economic_profit=%s scf_viable=%s",
            ca.zone,
            ca.verdict,
            (
                [str(s.result.economic_profit) for s in ca.economic_profit.scenarios]
                if ca.economic_profit is not None
                else None
            ),
            ca.scf_viable,
        )

        # ── Call 2: draft the assessment ───────────────────────────────────
        response_prompt = build_counter_offer_response_prompt(
            message, extraction, ca, facts, history,
            prompt_instructions=state.get("prompt_instructions"),
            scf_enabled=state.get("scf_enabled", False),
            # The turn's brief, built once by the route — never recomputed here.
            brief=brief,
        )
        response_prompt += f"\n\n{get_format_instruction(state.get('response_mode'), has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

        try:
            draft = await llm.complete(response_prompt, system=apply_scf_prompt_policy(counter_offer_response_system_prompt, brief, state.get("scf_enabled", False)), stream_to_client=True)
        except Exception as exc:
            logger.exception("evaluate_counter_offer: drafting failed")
            return {"response": None, "errors": [f"evaluate_counter_offer: {exc}"]}


        sources = collect_counter_offer_sources(brief, ca)

        return {"response": draft, "source": sources}

    return evaluate_counter_offer_node
