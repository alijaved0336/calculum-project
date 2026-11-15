from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.ports.llm_port import LLMPort
from domain.services.brief_builder import build_negotiation_brief
from domain.services.scf_policy import apply_scf_prompt_policy
from agents.verified_generation import generate_verified
from utils.constants import collect_rag_source
from utils.prompts.brief import LEVEL_FULL, collect_fact_sources
from utils.prompts.brief.rules import strip_rank_tags
from utils.prompts.response_mode import get_format_instruction
from utils.prompts.summarize_prompt import (
    build_summarize_narrow_prompt,
    collect_summarize_sources,
    summarize_narrow_system_prompt,
)
from utils.prompts.supplier_summary import (
    build_summary_card, collect_summary_sources, render_supplier_summary,
)


logger = logging.getLogger(__name__)


def make_summarize_node(llm: LLMPort) -> NodeFn:
    """Render the selected summary tier, or answer one narrow question.

    Summary facts and category boundaries are deterministic. No generation
    step can turn a profile into a negotiation briefing or change its figures.
    Narrow answers retain the shared generation and verification pipeline.
    """

    async def summarize_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if context is None or context.facts is None:
            logger.warning("summarize: missing supplier context/facts")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't summarize this supplier's position."
                ),
                "errors": ["summarize: missing context/facts"],
            }

        facts = context.facts
        message = state.get("message", "")
        # The turn's brief, built ONCE by the route from the resolved context
        # (overrides applied, SCF stripped where the turn disallows it). Rebuilt
        # here only for a direct invocation that never went through the route.
        brief = state.get("brief") or build_negotiation_brief(
            context, scf_enabled=state.get("scf_enabled", False)
        )
        if (state.get("summary_scope") or "summary") == "narrow":
            return await _narrow(state, brief, facts, message)
        requested = state.get("summary_tier")
        # Two tiers: small (key facts) and large (full position). Anything
        # else — including a stale "medium" — renders the full position.
        tier = "small" if requested == "small" else "large"
        print(f"[summary] rendering tier={tier} (state summary_tier={requested!r})", flush=True)
        return {
            "response": render_supplier_summary(brief, tier),
            "source": collect_summary_sources(brief, tier),
            "summary_scope": "summary",
            "summary_tier": tier,
            # Progress-bar card for both tiers; field depth follows ``tier``.
            "summary_card": build_summary_card(brief, tier),
        }

    async def _narrow(
        state: NegotiationState, brief, facts, message: str
    ) -> dict[str, Any]:
        """One question inside the position, answered from the data.

        The template is not forced here. What IS enforced is grounding: the
        draft goes through the shared output verifier (every day-figure in the
        brief, no argument graded, no invented source) with one revision, the
        same as the other reasoning surfaces. Streaming stays off so the
        revised draft is the one the negotiator sees.
        """
        prompt = build_summarize_narrow_prompt(
            message, facts,
            state.get("conversation_history"),
            state.get("rag_context"),
            prompt_instructions=state.get("prompt_instructions"),
            brief=brief,
        )
        # `quick` would cap a "what's driving the outlook?" answer at two
        # sentences with none of the drivers; the direct answer plus its
        # reasons is what conversational asks for.
        mode = (state.get("response_mode") or "conversational").strip().lower()
        if mode == "quick":
            mode = "conversational"
        prompt += f"\n\n{get_format_instruction(mode, has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"
        system = apply_scf_prompt_policy(
            summarize_narrow_system_prompt, brief, state.get("scf_enabled", False)
        )
        try:
            draft, violations = await generate_verified(
                node="summarize",
                prompt=prompt,
                brief=brief,
                generate=lambda p: llm.complete(p, system=system, stream_to_client=False),
                postprocess=strip_rank_tags,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("summarize: narrow drafting failed")
            return {"response": None, "errors": [f"summarize: {exc}"]}

        # A narrow answer may quote any fact the data blocks carried.
        sources = collect_fact_sources(brief, LEVEL_FULL)
        sources.update(collect_summarize_sources(brief))
        sources.update(collect_rag_source(state.get("rag_context")))
        result: dict[str, Any] = {"response": draft, "source": sources, "summary_card": None}
        if violations:
            result["errors"] = [f"summarize: {v}" for v in violations]
        return result

    return summarize_node
