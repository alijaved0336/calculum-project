from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from agents.verified_generation import generate_verified, verification_errors
from application.services.pushback_knowledge import (
    PushbackKnowledgeService,
    as_rag_source,
)
from domain.entities.brief import NegotiationBrief
from domain.entities.facts import SupplierFacts
from domain.entities.pushback import PushbackCategory
from domain.ports.llm_port import LLMPort
from domain.services.brief_builder import build_negotiation_brief
from domain.services.scf_policy import apply_scf_prompt_policy
from utils.prompts.pushback_objection_prompt import (
    PUSHBACK_OBJECTION_SYSTEM,
    build_objection_user_prompt,
    parse_objection_response,
)
from utils.prompts.pushback_prompt import (
    anticipated_pushback_system_prompt,
    build_anticipated_pushback_prompt,
    build_pushback_prompt,
    collect_pushback_sources,
    pushback_system_prompt,
)
from utils.prompts.brief.rules import strip_rank_tags

logger = logging.getLogger(__name__)


async def _extract_objection(llm: LLMPort, message: str) -> str | None:
    """The supplier's stated reason, in the supplier's voice — or None.

    A cheap first call; its output is the knowledge-base search query. None for
    a bare refusal ("they said no"), and on any failure — which costs the reply
    its ready-made scripts but leaves the FACTS/ARGUMENTS/ANALYSIS brief fully
    intact, so the node still answers.
    """
    if not message.strip():
        return None
    try:
        raw = await llm.complete(
            build_objection_user_prompt(message),
            system=PUSHBACK_OBJECTION_SYSTEM,
            stream_to_client=False,
        )
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("pushback: objection extraction failed: %s", exc)
        return None
    objection = parse_objection_response(raw)
    logger.info("pushback: extracted objection=%r", objection)
    return objection


async def _search_playbook(
    llm: LLMPort,
    knowledge: PushbackKnowledgeService | None,
    state: NegotiationState,
    message: str,
) -> tuple[str | None, list[PushbackCategory]]:
    """The objection the message names, and the playbook categories that answer it.

    Runs on EVERY pushback turn, in both modes, and searches with the
    negotiator's own words as well as the extraction — see
    :meth:`PushbackKnowledgeService.match`. The same bank-covenant question
    asked twice used to get a playbook answer once and an improvised one once:
    the extractor read the hypothetical as "nothing said" 4 times in 6, and 1
    classification in 6 put it in anticipate mode, which never searched.
    """
    # The classifier's standalone rewrite when it made one: a one-word answer
    # to the clarifying question ("cash flow") arrives with its context.
    text = (state.get("resolved_question") or "").strip() or message
    objection = await _extract_objection(llm, text)
    if knowledge is None:
        return objection, []
    return objection, await knowledge.match(objection, message=text)


def _reactive_prompt(
    state: NegotiationState,
    message: str,
    facts: SupplierFacts,
    brief: NegotiationBrief,
    scf_enabled: bool,
    categories: list[PushbackCategory],
) -> tuple[str, str]:
    """The prompts for a RELAYED (or named) objection — the default mode."""
    prompt = build_pushback_prompt(
        message,
        facts,
        state.get("conversation_history"),
        prompt_instructions=state.get("prompt_instructions"),
        # The turn's brief, built once by the route — never recomputed here.
        brief=brief,
        counter_categories=categories,
        scf_enabled=scf_enabled,
    )
    # No `response_mode` format instruction is appended. This node owns its
    # own output shape, and the appended one contradicted it: the "full"
    # variant tells the model the user wants a comprehensive response while
    # the system prompt asks for three short labelled parts. The result was
    # the worst of both — long, and unformatted.
    system = apply_scf_prompt_policy(pushback_system_prompt, brief, scf_enabled)
    return prompt, system


def make_pushback_node(
    llm: LLMPort, knowledge: PushbackKnowledgeService | None = None
) -> NodeFn:
    """Build the `handle_supplier_pushback` node.

    Two modes, set by the classifier's ``pushback_anticipate``:

    Every turn first extracts the objection the message names (one LLM call)
    and searches the client's pushback playbook in the knowledge base
    (``knowledge``) with it AND with the message itself.

    * RELAYED (default), or any message that names a concern — the reply is
      drafted with the matched categories' counter-strategies as its primary
      source for wording.
    * ANTICIPATE (a general "prepare potential pushbacks", nothing named) — the
      objections engine's plan (the playbook's Objections section), the
      knowledge-base categories the supplier's data points to
      (:mod:`domain.services.objection_scan`), and any category the message
      matched.

    This node is routed around the shared `rag_query` step and does its own,
    SCOPED retrieval. Unscoped passages once reached this prompt from the
    client's other documents, and the model relayed their plan-building
    procedure as live advice — stepping the ask down in fixed day-increments to
    numbers nothing in this system had evidenced. The knowledge service searches
    the pushback playbook only and hands over parsed counters, never passages;
    the fallback move still comes off the computed argument sequence and the
    reserve bucket.

    ``knowledge`` None (a direct caller or a test) means no counter-arguments:
    the reply is grounded in the brief alone.

    No asymmetry guard runs on the draft: the guard scopes its redaction to a
    [[SUPPLIER_FACING]] span, and with the marker instruction removed from the
    prompts it would fail closed and blank every internal figure in the
    negotiator's own analysis. This surface is negotiator-facing. The guard
    still runs on the opening email, the one fully supplier-facing output.
    """

    async def pushback_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if context is None or context.facts is None:
            logger.warning("pushback: missing supplier context/facts")
            return {
                "response": (
                    "I don't have supplier data loaded for this session yet, "
                    "so I can't help with this supplier's pushback."
                ),
                "errors": ["pushback: missing context/facts"],
            }

        facts = context.facts
        message = state.get("message", "")
        scf_enabled = state.get("scf_enabled", False)
        # The turn's brief, built ONCE by the route from the resolved context
        # (overrides applied, SCF stripped where the turn disallows it). Rebuilt
        # here only for a direct invocation that never went through the route —
        # from the CONTEXT, so the bundles it already resolved are reused rather
        # than recomputed from bare facts.
        brief = state.get("brief") or build_negotiation_brief(
            context, scf_enabled=scf_enabled
        )

        objection, categories = await _search_playbook(llm, knowledge, state, message)
        # Anticipate mode is for a GENERAL "prepare potential pushbacks". A
        # message that names a concern ("what if longer terms breach their bank
        # covenant?") is answered as that objection even when the classifier
        # flagged it anticipatory — the prepared list never reaches the
        # playbook's answer to the one thing asked.
        if state.get("pushback_anticipate") and objection is None:
            # Nothing was relayed, so there is no objection to classify and no
            # clarifying question to ask. The approved objections (as in the
            # playbook) plus the objections the supplier's data points to, and
            # any category the message itself matched; the prompt answers the
            # actual message, so "any others?" is not handed the same list again.
            prompt = build_anticipated_pushback_prompt(
                message,
                brief,
                state.get("conversation_history"),
                prompt_instructions=state.get("prompt_instructions"),
                response_language=state.get("response_language"),
                scf_enabled=scf_enabled,
                kb=await knowledge.categories() if knowledge is not None else None,
                asked=categories,
            )
            system = apply_scf_prompt_policy(
                anticipated_pushback_system_prompt, brief, scf_enabled
            )
        else:
            prompt, system = _reactive_prompt(
                state, message, facts, brief, scf_enabled, categories
            )

        try:
            # Verified, not guarded. The asymmetry guard was removed from this
            # node and nothing deterministic replaced it, while the surface is
            # read aloud mid-call and is handed the BATNA. `revise=
            # False`: a pushback reply is one move in a live exchange, so a
            # second round-trip costs more than the label does (§6.3).
            draft, violations = await generate_verified(
                node="pushback",
                prompt=prompt,
                brief=brief,
                revise=False,
                # stream_to_client=False so strip_rank_tags / label colons run
                # before the WS fake-streams the final text. Live streaming
                # would ship raw ``**Read** The…`` tokens and skip postprocess.
                generate=lambda p: llm.complete(p, system=system, stream_to_client=False),
                postprocess=strip_rank_tags,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("pushback: drafting failed")
            return {"response": None, "errors": [f"pushback: {exc}"]}

        return {
            "response": draft,
            "source": collect_pushback_sources(brief),
            # The playbook categories the counters came from, for the source panel.
            "rag_sources": [as_rag_source(c) for c in categories],
            **verification_errors("pushback", violations),
        }

    return pushback_node
