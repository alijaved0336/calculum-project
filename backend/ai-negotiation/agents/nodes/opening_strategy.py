from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from agents.verified_generation import generate_verified, verification_errors
from domain.services.brief_builder import build_negotiation_brief
from domain.services.scf_policy import apply_scf_prompt_policy
from domain.ports.llm_port import LLMPort
from utils.constants import collect_rag_source
from utils.prompts.opening_strategy_prompt import (
    build_opening_strategy_prompt,
    collect_opening_strategy_sources,
    normalize_opening_strategy_structure,
    opening_strategy_system_prompt,
)
from utils.prompts.brief.rules import strip_rank_tags
from utils.prompts.response_mode import get_format_instruction
from utils.prompts.tone_guidance import get_tone_guidance

logger = logging.getLogger(__name__)


def _opening_postprocess(text: str) -> str:
    return normalize_opening_strategy_structure(strip_rank_tags(text))


def make_opening_strategy_node(llm: LLMPort) -> NodeFn:
    """Build the `recommend_opening_strategy` node.

    Every figure and judgment comes from `context.facts` (Tier-1), the two
    Tier-2 bundles the brief carries, and `context.opening_strategy` (Tier-2,
    opening-move-specific — primary anchor, benchmark ladder, stretch
    ceiling, payment reliability, phased-approach flag, SCF reserve lever),
    all computed once in `build_supplier_context`. The LLM only phrases this
    already-decided brief using the user-selected tone — never computes or
    judges anything itself.

    Unlike the negotiation playbook, Sequencing step 1 (the company-policy
    opening line) may be read aloud or sent to the supplier — the prompt keeps
    internal figures out of it. The draft itself is returned unredacted: this
    output is mostly negotiator-facing analysis, which legitimately names those
    figures.
    """

    async def opening_strategy_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if (
            context is None
            or context.facts is None
            or context.opening_strategy is None
        ):
            logger.warning("opening_strategy: missing supplier context/facts/opening_strategy")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't recommend an opening strategy."
                ),
                "errors": ["opening_strategy: missing context/facts/opening_strategy"],
            }

        facts, opening_strategy = context.facts, context.opening_strategy
        # The turn's brief, built ONCE by the route from the resolved context
        # (overrides applied, SCF stripped where the turn disallows it). Rebuilt
        # here only for a direct invocation that never went through the route —
        # from the CONTEXT, so the bundles it already resolved are reused rather
        # than recomputed from bare facts.
        brief = state.get("brief") or build_negotiation_brief(
            context, scf_enabled=state.get("scf_enabled", False)
        )


        tone = get_tone_guidance(state.get("selected_tone"))

        prompt = build_opening_strategy_prompt(
            message=state.get("message", ""),
            facts=facts,
            opening_strategy=opening_strategy,
            tone=tone,
            history=state.get("conversation_history"),
            rag_context=state.get("rag_context"),
            prompt_instructions=state.get("prompt_instructions"),
            # The turn's brief, built once by the route — never recomputed here.
            brief=brief,
        )
        # The turn's own response mode, NOT a hard-coded "full".
        #
        # It was pinned to "full" so a fixed multi-section template could not be
        # collapsed. The pin cost more than it bought: "just give me the line to
        # open with" is classified quick and was answered with the whole
        # document anyway. The system prompt keeps the three-section default for
        # a plain request and hands the shape to the negotiator when they ask
        # for one. Absent a classification, "full" is still the default.
        prompt += f"\n\n{get_format_instruction(state.get('response_mode') or 'full', has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

        system = apply_scf_prompt_policy(
            opening_strategy_system_prompt, brief, state.get("scf_enabled", False)
        )
        try:
            # No asymmetry guard here. It scoped its redaction to a
            # [[SUPPLIER_FACING]] span, and with the marker instruction removed
            # from the prompts it would fail closed and blank every internal
            # figure in the negotiator's own analysis. This surface is
            # negotiator-facing; the guard still runs on the opening email,
            # which is the one fully supplier-facing output.
            #
            # stream_to_client=False — structure is normalized AFTER generation;
            # streaming raw tokens would leave the client on the broken draft
            # (same reason the playbook node does not stream). The WS route
            # fake-streams the final `response`.
            #
            # `revise=False`: failure is labelled rather than paid for with a
            # second round-trip (§6.3).
            draft, violations = await generate_verified(
                node="opening_strategy",
                prompt=prompt,
                brief=brief,
                revise=False,
                generate=lambda p: llm.complete(p, system=system, stream_to_client=False),
                postprocess=_opening_postprocess,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("opening_strategy: drafting failed")
            return {"response": None, "errors": [f"opening_strategy: {exc}"]}

        sources = collect_opening_strategy_sources(brief, opening_strategy)
        sources.update(collect_rag_source(state.get("rag_context")))

        return {
            "response": draft,
            "source": sources,
            **verification_errors("opening_strategy", violations),
        }

    return opening_strategy_node
