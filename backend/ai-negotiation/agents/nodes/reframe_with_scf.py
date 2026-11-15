from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from agents.verified_generation import generate_verified, verification_errors
from domain.services.brief_builder import build_negotiation_brief
from domain.ports.llm_port import LLMPort
from domain.services.scf_analysis import SCF_RATE_TOLERANCE_PTS, analyze_scf_viability
from utils.prompts.reframe_with_scf_prompt import (
    build_reframe_with_scf_prompt,
    collect_scf_sources,
    reframe_with_scf_system_prompt,
)
from utils.prompts.response_mode import get_format_instruction
from utils.prompts.tone_guidance import get_tone_guidance

logger = logging.getLogger(__name__)

_RULE = "-" * 88

_NO_SCF_MESSAGE = (
    "Supply Chain Finance (SCF) cannot be offered in this negotiation: "
    "we do not have an SCF programme rate on file for this session."
)

_NO_SUPPLIER_RATE_MESSAGE = (
    "Supply Chain Finance (SCF) cannot be positioned in this negotiation: "
    "the supplier's financing rate is not available, so we cannot confirm how "
    "our programme compares. SCF should only be pitched once that comparison "
    "is certain."
)

_NOT_COMPETITIVE_MESSAGE = (
    "Supply Chain Finance (SCF) cannot be offered in this negotiation: our "
    f"programme rate runs more than {SCF_RATE_TOLERANCE_PTS:.0f} percentage point "
    "above the supplier's own financing rate. A small premium is workable — the "
    "programme still pays them at day 5 and stays off their balance sheet — but "
    "at this gap the offer is not credible and could undermine the broader "
    "negotiation."
)

_INVIABLE_RESPONSES = {
    "no_scf_rate": _NO_SCF_MESSAGE,
    "no_supplier_rate": _NO_SUPPLIER_RATE_MESSAGE,
    "not_competitive": _NOT_COMPETITIVE_MESSAGE,
}




def make_reframe_with_scf_node(llm: LLMPort) -> NodeFn:
    """Build the `reframe_with_financing` node.

    Flow:
      1. Run ``analyze_scf_viability`` (deterministic) — checks our SCF rate
         against the supplier's financing rate, allowing a premium of up to
         ``SCF_RATE_TOLERANCE_PTS``.
      2. Not viable → return a plain, contextual explanation with no LLM call.
      3. Viable → build the SCF pitch prompt → LLM → asymmetry guard →
         return the guarded draft.

    The asymmetry guard is the backstop for internal rate figures (SCF rate,
    supplier financing rate, WACC, spend volume, target cash flow) that the
    prompt instructs the LLM to withhold but that might still leak.
    """

    async def reframe_with_scf_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if context is None or context.facts is None:
            logger.warning("reframe_with_scf: missing supplier context/facts")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't assess SCF for this supplier."
                ),
                "errors": ["reframe_with_scf: missing context/facts"],
            }

        facts = context.facts
        # The turn's brief, built ONCE by the route from the resolved context
        # (overrides applied, SCF stripped where the turn disallows it). Rebuilt
        # here only for a direct invocation that never went through the route —
        # from the CONTEXT, so the bundles it already resolved are reused rather
        # than recomputed from bare facts.
        brief = state.get("brief") or build_negotiation_brief(
            context, scf_enabled=state.get("scf_enabled", False)
        )

        # ── Stage 1: Deterministic SCF viability check ────────────────────
        viability = analyze_scf_viability(facts, brief.arguments)

        if not viability.viable:
            reason = viability.inviable_reason or "unknown"
            logger.info("reframe_with_scf: not viable (%s)", reason)
            return {
                "response": _INVIABLE_RESPONSES.get(reason, _NOT_COMPETITIVE_MESSAGE),
                "source": {},
            }

        logger.info(
            "reframe_with_scf: viable — spread=%.1f pts, sensitivity=%s, leverage=%s",
            viability.rate_spread_pts,
            viability.financial_sensitivity_level,
            viability.leverage_posture,
        )

        # ── Stage 2: Build prompt ─────────────────────────────────────────
        tone = get_tone_guidance(state.get("selected_tone"))

        prompt = build_reframe_with_scf_prompt(
            message=state.get("message", ""),
            viability=viability,
            tone=tone,
            history=state.get("conversation_history"),
            prompt_instructions=state.get("prompt_instructions"),
            brief=brief,
        )
        prompt += f"\n\n{get_format_instruction(state.get('response_mode'), has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

        # ── Stage 3: LLM drafts the pitch ─────────────────────────────────
        try:
            # No asymmetry guard here — it scoped its redaction to a
            # [[SUPPLIER_FACING]] span and would now fail closed, blanking every
            # internal figure in the negotiator's own analysis. The output
            # verifier replaced it: figures checked against the brief, positions
            # against the ladder. `revise=False` — this surface streams (§6.3).
            draft, violations = await generate_verified(
                node="reframe_with_scf",
                prompt=prompt,
                brief=brief,
                revise=False,
                generate=lambda p: llm.complete(
                    p, system=reframe_with_scf_system_prompt, stream_to_client=True
                ),
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("reframe_with_scf: drafting failed")
            return {"response": None, "errors": [f"reframe_with_scf: {exc}"]}

        sources = collect_scf_sources(viability, facts.source_paths)

        return {
            "response": draft,
            "source": sources,
            **verification_errors("reframe_with_scf", violations),
        }

    return reframe_with_scf_node
