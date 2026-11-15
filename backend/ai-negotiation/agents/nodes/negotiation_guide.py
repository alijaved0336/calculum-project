from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from agents.verified_generation import generate_verified
from domain.services.brief_builder import build_negotiation_brief
from domain.services.scf_policy import apply_scf_prompt_policy
from utils.prompts.tone_guidance import get_tone_guidance
from domain.ports.llm_port import LLMPort
from utils.constants import collect_rag_source
from utils.prompts.negotiation_guide_prompt import (
    build_negotiation_guide_prompt,
    collect_guide_sources,
    missing_playbook_sections,
    negotiation_guide_system_prompt,
    normalize_playbook_structure,
)
from utils.prompts.prompt_instructions import drop_response_length_instructions
from utils.prompts.response_mode import get_format_instruction

logger = logging.getLogger(__name__)


def make_negotiation_guide_node(llm: LLMPort) -> NodeFn:
    """Build the `generate_negotiation_playbook` node — the most important intent.

    The drafting step is deliberately the *last* thing that happens. Every
    figure and judgment in the guide comes from `context.facts` (verbatim,
    source-tagged Tier-1 values) and the Tier-2 bundle the brief carries —
    `argument_analysis` — computed once in
    `build_supplier_context` and shared by every intent. The LLM is only asked to phrase that already-decided brief —
    using the user-selected tone's wording rules — never to compute or judge
    anything itself.

    Unlike nodes that draft literal supplier-facing language, this playbook
    is strictly for the negotiator's own prep — never read aloud to or
    forwarded to the supplier — so it deliberately skips the asymmetry guard.
    The format itself (Target and BATNA, Opening Position and Argumentation,
    Objections and Concessions, Rationale) requires stating the BATNA
    and financial figures as core content; running the guard here would redact
    the very numbers the document exists to show.
    """

    async def negotiation_guide_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if context is None or context.facts is None:
            logger.warning("negotiation_guide: missing supplier context/facts")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't build a negotiation guide."
                ),
                "errors": ["negotiation_guide: missing context/facts"],
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

        def finalize(draft: str | None) -> str:
            return normalize_playbook_structure(draft, brief=brief)

        tone = get_tone_guidance(state.get("selected_tone"))

        prompt = build_negotiation_guide_prompt(
            message=state.get("message", ""),
            facts=facts,
            tone=tone,
            # No conversation history: the playbook is a document generated
            # from facts/analysis (the negotiator's request is still passed).
            # The LLM server's context window is shared between prompt and
            # completion — ~10 messages of history can eat the entire output
            # budget and truncate the playbook mid-section.
            history=None,
            # The turn's brief, built once by the route — never recomputed here.
            brief=brief,
            rag_context=state.get("rag_context"),
            # Chat-style length caps ("keep responses under 180 words") would
            # make the model stop this four-section document mid-section —
            # drop them; every policy rule (SCF, review thresholds) is kept.
            prompt_instructions=drop_response_length_instructions(
                state.get("prompt_instructions")
            ),
        )
        # The playbook is a fixed four-section document — always use the "full"
        # format instruction, never the user's response_mode. A quick/
        # conversational instruction ("2-3 sentences", "skip template
        # sections") would override the four-section spec and shrink the
        # playbook.
        prompt += f"\n\n{get_format_instruction('full', has_history=bool(state.get('conversation_history')), resolved_question=state.get('resolved_question'), response_language=state.get('response_language'))}"

        system = apply_scf_prompt_policy(negotiation_guide_system_prompt, brief, state.get("scf_enabled", False))
        errors: list[str] = []
        try:
            # max_tokens=4096: 3000 was observed truncating verbose drafts
            # mid-section, silently dropping later sections.
            #
            # stream_to_client=False — deliberately. The client renders the
            # raw token stream, so anything fixed AFTER generation
            # (normalization, the four-section retry) would never reach the
            # screen: the user would keep seeing the broken draft. With no
            # tokens streamed, the WS route fake-streams the final
            # `response` instead — which IS the normalized, validated
            # playbook.
            draft = await llm.complete(prompt, system=system, max_tokens=4096, stream_to_client=False)
            # Repair run-together structure (headings/bullets emitted inline)
            # so the frontend's section-card parser always finds the four
            # headings on their own lines. No-op on well-formed drafts.
            draft = finalize(draft)

            # Deterministic four-section backstop: if the draft omitted any
            # required heading (disobedience or truncation), retry once with
            # a corrective instruction. The client never saw the bad draft —
            # nothing has been streamed.
            missing = missing_playbook_sections(draft)
            if missing:
                logger.warning(
                    "negotiation_guide: draft missing sections %s — retrying once", missing
                )
                retry_prompt = prompt + (
                    "\n\n## REGENERATE — PREVIOUS DRAFT WAS INCOMPLETE\n"
                    "The previous draft omitted these required sections: "
                    + ", ".join(missing)
                    + ". Produce sections 1-3 again with exact headings "
                    "(1. Target and BATNA … 3. Objections and Concessions). "
                    "Do not write 4. Rationale — it is appended after generation. "
                    "Keep every section tight so nothing is cut off."
                )
                draft = finalize(
                    await llm.complete(retry_prompt, system=system, max_tokens=4096, stream_to_client=False)
                )
                still_missing = missing_playbook_sections(draft)
                if still_missing:
                    # Two failed attempts. The playbook still goes back — a
                    # partial prep document beats none — but it goes back
                    # LABELLED, the way the opening-email path already does it.
                    logger.error(
                        "negotiation_guide: playbook still missing sections after retry: %s",
                        still_missing,
                    )
                    errors.append(
                        "negotiation_guide: incomplete playbook — missing sections: "
                        + ", ".join(still_missing)
                    )
                    draft = (
                        f"{draft.rstrip()}\n\n"
                        "[Incomplete — this playbook is missing: "
                        + ", ".join(still_missing)
                        + ". Ask me to regenerate it before you rely on it.]"
                    )

            # Content verification, after structure. This is the one surface
            # that DOES pay for a revision pass (§6.3): the playbook is a
            # document the negotiator carries into the room and reads figures
            # off, nothing has been streamed yet, and a wrong benchmark here is
            # the sentence they repeat to the supplier.
            draft, violations = await generate_verified(
                node="negotiation_guide",
                prompt=prompt,
                brief=brief,
                generate=lambda p: llm.complete(
                    p, system=system, max_tokens=4096, stream_to_client=False
                ),
                postprocess=finalize,
                initial=draft,
            )
            errors.extend(f"negotiation_guide: {v}" for v in violations)
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("negotiation_guide: drafting failed")
            return {
                "response": None,
                "errors": [f"negotiation_guide: {exc}"],
            }

        sources = collect_guide_sources(brief)
        sources.update(collect_rag_source(state.get("rag_context")))

        result: dict[str, Any] = {"response": draft, "source": sources}
        if errors:
            result["errors"] = errors
        return result

    return negotiation_guide_node
