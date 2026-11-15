from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from domain.services.brief_builder import build_negotiation_brief
from domain.entities.facts import resolve_effective_batna
from domain.services.scf_policy import apply_scf_prompt_policy
from domain.ports.llm_port import LLMPort
from utils.constants import collect_rag_source
from utils.prompts.assistant_introduction_prompt import (
    NO_ASSISTANT_INFO,
    assistant_introduction_system_prompt,
    build_assistant_introduction,
    build_assistant_introduction_prompt,
)
from utils.prompts.data_question_prompt import (
    build_data_question_prompt,
    collect_data_question_sources,
    data_question_system_prompt,
)
from utils.prompts.response_mode import get_format_instruction

logger = logging.getLogger(__name__)


async def _answer_about_assistant(llm: LLMPort, state: NegotiationState) -> dict[str, Any]:
    """"Who are you?" / "tell me about Calculum" — from the KB when it has something.

    Not streamed: the model may answer NO_ASSISTANT_INFO, and that has to be
    swapped for the fixed introduction before the negotiator sees anything. The
    route fake-streams a response that produced no chunks.
    """
    fallback = build_assistant_introduction(state.get("user_name"))
    rag_context = state.get("rag_context")
    if rag_context is None or rag_context.chunk_count == 0:
        return {"response": fallback}

    prompt = build_assistant_introduction_prompt(
        state.get("message", ""),
        rag_context,
        resolved_question=state.get("resolved_question"),
        response_language=state.get("response_language"),
    )
    try:
        draft = await llm.complete(prompt, system=assistant_introduction_system_prompt, stream_to_client=False)
    except Exception as exc:
        logger.exception("answer_data_question: assistant introduction failed, using the fixed one")
        return {"response": fallback, "errors": [f"answer_data_question: {exc}"]}

    if not draft or not draft.strip() or NO_ASSISTANT_INFO in draft:
        return {"response": fallback}
    return {"response": draft.strip(), "source": collect_rag_source(rag_context)}


def make_answer_data_question_node(llm: LLMPort) -> NodeFn:
    """Build the `answer_data_question` node.

    Answers factual questions about this supplier's benchmark, peer, and
    regulatory data, grounded entirely in `context.facts` (Tier-1, verbatim).
    The computed BATNA is included so "what is our fallback
    term" resolves to the reserve figure rather than the model guessing it
    equals a benchmark; other negotiation-economics figures (financing rates,
    spend, cash flow) stay in the INTERNAL FIGURES block — this intent is
    information retrieval, not negotiation strategy.
    """

    async def answer_data_question_node(state: NegotiationState) -> dict[str, Any]:
        # About the assistant, not the supplier — needs no supplier data.
        if state.get("about_assistant"):
            return await _answer_about_assistant(llm, state)

        context = state.get("context")
        if context is None or context.facts is None:
            logger.warning("answer_data_question: missing supplier context/facts")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't answer data questions about this supplier."
                ),
                "errors": ["answer_data_question: missing context/facts"],
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

        # Reserve floor: prefer the brief's already-resolved value — it carries
        # any session BATNA override (and the kept-default when the target was
        # overridden), which recomputing from facts alone would miss. Fall back to
        # a direct computation only when the brief carries no terms.
        if brief.batna_floor is not None:
            effective_batna = brief.batna_floor
            batna_note = brief.batna_note
        else:
            effective_batna, batna_note = resolve_effective_batna(facts)

        prompt = build_data_question_prompt(
            message, facts,
            state.get("conversation_history"),
            state.get("rag_context"),
            prompt_instructions=state.get("prompt_instructions"),
            effective_batna=effective_batna,
            batna_note=batna_note,
            scf_enabled=state.get("scf_enabled", False),
            # The turn's brief, built once by the route — never recomputed here.
            brief=brief,
        )
        prompt += f"\n\n{get_format_instruction(state.get('response_mode'), has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

        # SCF note: the SCF figure is already stripped from `facts`/prompt when
        # scf_enabled is False, so the model has no SCF *data* to quote. The
        # remaining residual risk is the model volunteering SCF from world
        # knowledge — and because this streams (stream_to_client=True), the
        # post-hoc output backstop cannot un-stream it. `apply_scf_prompt_policy` (the
        # system-prompt directive) is therefore the only live guard on the
        # streamed text here. Accepted residual risk.
        try:
            draft = await llm.complete(prompt, system=apply_scf_prompt_policy(data_question_system_prompt, brief, state.get("scf_enabled", False)), stream_to_client=True)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("answer_data_question: drafting failed")
            return {"response": None, "errors": [f"answer_data_question: {exc}"]}

        sources = collect_data_question_sources(brief, effective_batna=effective_batna)
        sources.update(collect_rag_source(state.get("rag_context")))
        return {"response": draft, "source": sources}

    return answer_data_question_node
