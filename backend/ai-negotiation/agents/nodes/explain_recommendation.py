from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.services.brief_builder import build_negotiation_brief
from domain.services.scf_policy import apply_scf_prompt_policy
from domain.ports.llm_port import LLMPort
from utils.constants import collect_rag_source
from utils.prompts.explain_recommendation_prompt import (
    build_explain_recommendation_prompt,
    collect_explain_sources,
    explain_recommendation_system_prompt,
)
from utils.prompts.response_mode import get_format_instruction

logger = logging.getLogger(__name__)

_RULE = "-" * 88




def make_explain_recommendation_node(llm: LLMPort) -> NodeFn:
    """Build the `explain_recommendation` node.

    All reasoning is already pre-computed in `context.argument_analysis`
    and `context.opening_strategy` — this node assembles those rationale fields
    into a prompt and asks the LLM to identify which recommendation the
    negotiator is asking about (resolving vague references via conversation
    history) and phrase the existing reasoning clearly.

    Like `summarize` and `negotiation_guide`, this is a negotiator-only
    document, so the asymmetry guard is intentionally skipped.
    """

    async def explain_recommendation_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if context is None or context.facts is None:
            logger.warning("explain_recommendation: missing supplier context/facts")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't explain the recommendations."
                ),
                "errors": ["explain_recommendation: missing context/facts"],
            }

        facts = context.facts
        opening_strategy = context.opening_strategy
        # The turn's brief, built ONCE by the route from the resolved context
        # (overrides applied, SCF stripped where the turn disallows it). Rebuilt
        # here only for a direct invocation that never went through the route —
        # from the CONTEXT, so the bundles it already resolved are reused rather
        # than recomputed from bare facts.
        brief = state.get("brief") or build_negotiation_brief(
            context, scf_enabled=state.get("scf_enabled", False)
        )


        prompt = build_explain_recommendation_prompt(
            message=state.get("message", ""),
            facts=facts,
            opening_strategy=opening_strategy,
            history=state.get("conversation_history"),
            rag_context=state.get("rag_context"),
            prompt_instructions=state.get("prompt_instructions"),
            # The turn's brief, built once by the route — never recomputed here.
            brief=brief,
            resolved_question=state.get("resolved_question"),
        )
        prompt += f"\n\n{get_format_instruction(state.get('response_mode'), has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

        try:
            draft = await llm.complete(prompt, system=apply_scf_prompt_policy(explain_recommendation_system_prompt, brief, state.get("scf_enabled", False)), stream_to_client=True)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("explain_recommendation: drafting failed")
            return {"response": None, "errors": [f"explain_recommendation: {exc}"]}

        sources = collect_explain_sources(brief, opening_strategy)
        sources.update(collect_rag_source(state.get("rag_context")))

        return {"response": draft, "source": sources}

    return explain_recommendation_node
