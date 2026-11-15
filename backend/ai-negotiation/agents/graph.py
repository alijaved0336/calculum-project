from __future__ import annotations

import logging

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from agents.nodes.answer_data_question import make_answer_data_question_node
from agents.nodes.apply_override import make_apply_override_node
from agents.nodes.draft_email import make_draft_email_node
from agents.nodes.evaluate_counter_offer import make_evaluate_counter_offer_node
from agents.nodes.explain_recommendation import make_explain_recommendation_node
from agents.nodes.greeting import make_greeting_node
from agents.nodes.intent_classifier import make_intent_classifier_node
from agents.nodes.meta_operation import make_meta_operation_node
from agents.nodes.negotiation_guide import make_negotiation_guide_node
from agents.nodes.no_opportunity import make_no_opportunity_node
from agents.nodes.opening_strategy import make_opening_strategy_node
from agents.nodes.out_of_scope import make_out_of_scope_node
from agents.nodes.pushback import make_pushback_node
from agents.nodes.rag_query import make_rag_query_node
from agents.nodes.reframe_with_scf import make_reframe_with_scf_node
from agents.nodes.scf_blocked import make_scf_blocked_node
from agents.nodes.scenario import make_scenario_node
from agents.nodes.spends import make_spends_node
from agents.nodes.summarize import make_summarize_node
from agents.nodes.unclear import make_unclear_node
from agents.state import NegotiationState, NodeFn
from application.services.pushback_knowledge import PushbackKnowledgeService
from application.services.rag_service import RAGService
from domain.entities.intent import EmailTemplate, Intent
from domain.ports.intent_classifier_port import IntentClassifierPort
from domain.ports.llm_port import LLMPort
from domain.services.agent_capabilities import STRATEGY_INTENTS
from domain.services.improvement_opportunity import has_improvement_opportunity

logger = logging.getLogger(__name__)

_RAG_QUERY = "rag_query"

_GENERATE_PLAYBOOK = Intent.GENERATE_NEGOTIATION_PLAYBOOK.value
_RUN_SCENARIO = Intent.RUN_SCENARIO.value
_HANDLE_PUSHBACK = Intent.HANDLE_SUPPLIER_PUSHBACK.value
_EXPLAIN_RECOMMENDATION = Intent.EXPLAIN_RECOMMENDATION.value
_EVALUATE_COUNTER_OFFER = Intent.EVALUATE_COUNTER_OFFER.value
_REFRAME_WITH_FINANCING = Intent.REFRAME_WITH_FINANCING.value
_OUT_OF_SCOPE = Intent.OUT_OF_SCOPE.value
_GREETING = Intent.GREETING.value
_UNCLEAR = Intent.UNCLEAR.value
_SUMMARIZE = Intent.SUMMARIZE_SUPPLIER_POSITION.value
_ANSWER_DATA_QUESTION = Intent.ANSWER_DATA_QUESTION.value
_ANSWER_SPENDS_QUESTION = Intent.ANSWER_SPENDS_QUESTION.value
_RECOMMEND_OPENING = Intent.RECOMMEND_OPENING_STRATEGY.value
_META_OPERATION = Intent.META_OPERATION.value
_APPLY_OVERRIDE = Intent.APPLY_OVERRIDE.value
_DRAFT_EMAIL = Intent.DRAFT_EMAIL.value

# Deterministic refusal for SCF requests when SCF is disabled for the session.
_SCF_BLOCKED = "scf_blocked"

# Deterministic answer when the ask does not improve on the current terms (§2).
_NO_OPPORTUNITY = "no_opportunity"

# The intents that would PRODUCE a negotiation strategy, argument set, opening
# position or supplier-facing draft. Each is gated on there being an
# improvement opportunity at all: with the ask at or below the current terms
# there is no strategy to write, so none of these may reach an LLM (§2).
#
# The rest are deliberately NOT gated. Answering "what are our current terms?",
# summarising the supplier, explaining a past recommendation, running a
# scenario or applying an override are all still legitimate — and still
# accurate — when there is nothing to negotiate. Blocking those would hide
# data the negotiator is entitled to instead of telling them the truth about
# the ask.
#
# Defined in domain.services.agent_capabilities so the follow-up generator
# gates on the exact same set instead of a second, driftable copy.
_STRATEGY_INTENTS = STRATEGY_INTENTS


def _has_improvement_opportunity(state: NegotiationState) -> bool:
    """Whether this session has anything to negotiate (§2).

    Thin wrapper around ``domain.services.improvement_opportunity.
    has_improvement_opportunity`` — the None-safe check itself (missing
    context/figure is not evidence there is nothing to gain) lives there so
    other callers needing the same verdict (e.g. the follow-up generator)
    don't duplicate it.
    """
    context = state.get("context")
    facts = getattr(context, "facts", None) if context is not None else None
    return has_improvement_opportunity(facts)


def _scf_offerable(state: NegotiationState) -> bool:
    """Whether SCF may be offered this turn — the brief's verdict when built."""
    brief = state.get("brief")
    if brief is not None:
        return bool(brief.scf_offerable)
    return bool(state.get("scf_enabled", False))

# Intents that bypass the shared RAG query step (fixed responses or no KB needed)
_SIMPLE_INTENTS = {Intent.GREETING, Intent.UNCLEAR, Intent.OUT_OF_SCOPE, Intent.UNKNOWN}

# Substantive intents that must NEVER trigger a RAG search. They reason purely
# over the supplier's own facts/analysis or over the prior conversation, so
# knowledge-base retrieval adds only noise (and latency). They route straight
# from intent classification to their node, skipping `rag_query`; their nodes
# already treat a missing `rag_context` as "no KB context" and degrade cleanly.
_NO_RAG_INTENTS: dict[Intent, str] = {
    Intent.SUMMARIZE_SUPPLIER_POSITION: _SUMMARIZE,
    Intent.META_OPERATION: _META_OPERATION,
    Intent.EXPLAIN_RECOMMENDATION: _EXPLAIN_RECOMMENDATION,
    # Spend questions are answered by querying the spends table directly, not
    # the knowledge base — skip the RAG step entirely.
    Intent.ANSWER_SPENDS_QUESTION: _ANSWER_SPENDS_QUESTION,
    # Setting/resetting the target or BATNA is a config change over the
    # supplier's own facts — no knowledge-base retrieval involved.
    Intent.APPLY_OVERRIDE: _APPLY_OVERRIDE,
    # Pushback does its OWN retrieval, scoped to the client's pushback playbook
    # and parsed into whole categories (`application.services.pushback_knowledge`).
    # The shared, unscoped step reached the client's other documents too, and
    # the model relayed their plan-building procedure back as live advice —
    # inventing fallback terms by fixed-increment arithmetic. See
    # `agents.nodes.pushback`.
    Intent.HANDLE_SUPPLIER_PUSHBACK: _HANDLE_PUSHBACK,
    # The email is written from an approved template and the conversation.
    Intent.DRAFT_EMAIL: _DRAFT_EMAIL,
}


def _route_after_intent(state: NegotiationState) -> str:
    """Route after intent classification.

    Simple intents (GREETING, UNCLEAR, OUT_OF_SCOPE) go directly to their
    node.  Intents in `_NO_RAG_INTENTS` go straight to their node too, skipping
    the KB search.  All remaining substantive intents pass through `rag_query`
    first so the knowledge-base context is available to their generation node.
    """
    intent = state.get("intent")
    if intent in _SIMPLE_INTENTS:
        if intent == Intent.GREETING:
            return _GREETING
        if intent == Intent.OUT_OF_SCOPE:
            return _OUT_OF_SCOPE
        # UNCLEAR and UNKNOWN both resolve to the unclear node
        return _UNCLEAR
    # SCF hard block: refuse an SCF-framing request outright when SCF is
    # disabled, before any KB search or LLM call could describe it.
    if intent == Intent.REFRAME_WITH_FINANCING and not state.get("scf_enabled", False):
        return _SCF_BLOCKED
    # The SCF email template is refused the same way when SCF cannot be offered.
    if (
        intent == Intent.DRAFT_EMAIL
        and state.get("email_template") == EmailTemplate.SUPPLY_CHAIN_FINANCE_PAYMENT_TERMS.value
        and not _scf_offerable(state)
    ):
        return _SCF_BLOCKED
    # §2: nothing to negotiate → say so, before any KB search or LLM call.
    if intent in _STRATEGY_INTENTS and not _has_improvement_opportunity(state):
        return _NO_OPPORTUNITY
    if intent in _NO_RAG_INTENTS:
        return _NO_RAG_INTENTS[intent]
    return _RAG_QUERY


def _route_after_rag(state: NegotiationState) -> str:
    """Route from rag_query to the correct substantive node."""
    intent = state.get("intent")
    # Backstop the intent-level gate, exactly as the SCF block is backstopped
    # below: a strategy intent must never reach a drafting node with no
    # improvement to argue for.
    if intent in _STRATEGY_INTENTS and not _has_improvement_opportunity(state):
        return _NO_OPPORTUNITY
    if intent == Intent.GENERATE_NEGOTIATION_PLAYBOOK:
        return _GENERATE_PLAYBOOK
    if intent == Intent.RUN_SCENARIO:
        return _RUN_SCENARIO
    if intent == Intent.ANSWER_DATA_QUESTION:
        return _ANSWER_DATA_QUESTION
    if intent == Intent.RECOMMEND_OPENING_STRATEGY:
        return _RECOMMEND_OPENING
    if intent == Intent.EVALUATE_COUNTER_OFFER:
        return _EVALUATE_COUNTER_OFFER
    if intent == Intent.REFRAME_WITH_FINANCING:
        # Backstop the intent-level block in case SCF ever reaches rag_query.
        if not state.get("scf_enabled", False):
            return _SCF_BLOCKED
        return _REFRAME_WITH_FINANCING
    # SUMMARIZE / META_OPERATION / EXPLAIN_RECOMMENDATION / APPLY_OVERRIDE /
    # HANDLE_SUPPLIER_PUSHBACK never reach rag_query (see _NO_RAG_INTENTS) —
    # they route straight to their node.
    logger.warning("_route_after_rag: unhandled intent %r — falling through to END", intent)
    return END


def build_negotiation_graph(
    intent_classifier: IntentClassifierPort,
    llm: LLMPort,
    rag_service: RAGService,
    pushback_knowledge: PushbackKnowledgeService | None = None,
) -> CompiledStateGraph:
    """Assemble the negotiation StateGraph.

    Flow:
      intent_classifier
        ├─ GREETING / UNCLEAR / OUT_OF_SCOPE ──→ simple nodes
        └─ all other intents ──→ rag_query ──→ substantive nodes

    `rag_query` retrieves knowledge-base context and stores it in state so
    every substantive node can inject it into its LLM prompt without coupling
    to the RAG service directly.
    """
    graph = StateGraph(NegotiationState)

    # ── Classification ────────────────────────────────────────────────────
    graph.add_node(
        "intent_classifier",
        make_intent_classifier_node(intent_classifier),
    )

    # ── Shared RAG step ───────────────────────────────────────────────────
    graph.add_node(
        _RAG_QUERY,
        make_rag_query_node(rag_service),
    )

    # ── Substantive nodes ─────────────────────────────────────────────────
    graph.add_node(
        _GENERATE_PLAYBOOK,
        make_negotiation_guide_node(llm),
    )
    graph.add_node(
        _NO_OPPORTUNITY,
        make_no_opportunity_node(),
    )
    graph.add_node(
        _RUN_SCENARIO,
        make_scenario_node(llm),
    )
    graph.add_node(
        _HANDLE_PUSHBACK,
        make_pushback_node(llm, pushback_knowledge),
    )
    graph.add_node(
        _SUMMARIZE,
        make_summarize_node(llm),
    )
    graph.add_node(
        _ANSWER_DATA_QUESTION,
        make_answer_data_question_node(llm),
    )
    graph.add_node(
        _ANSWER_SPENDS_QUESTION,
        make_spends_node(llm),
    )
    graph.add_node(
        _RECOMMEND_OPENING,
        make_opening_strategy_node(llm),
    )
    graph.add_node(
        _EXPLAIN_RECOMMENDATION,
        make_explain_recommendation_node(llm),
    )
    graph.add_node(
        _DRAFT_EMAIL,
        make_draft_email_node(llm),
    )
    graph.add_node(
        _EVALUATE_COUNTER_OFFER,
        make_evaluate_counter_offer_node(llm),
    )
    graph.add_node(
        _REFRAME_WITH_FINANCING,
        make_reframe_with_scf_node(llm),
    )
    graph.add_node(
        _META_OPERATION,
        make_meta_operation_node(llm),
    )
    graph.add_node(
        _APPLY_OVERRIDE,
        make_apply_override_node(llm),
    )

    # ── Simple nodes (no RAG) ─────────────────────────────────────────────
    graph.add_node(
        _OUT_OF_SCOPE,
        make_out_of_scope_node(llm),
    )
    graph.add_node(
        _GREETING,
        make_greeting_node(),
    )
    graph.add_node(
        _UNCLEAR,
        make_unclear_node(),
    )
    graph.add_node(
        _SCF_BLOCKED,
        make_scf_blocked_node(),
    )

    # ── Routing ───────────────────────────────────────────────────────────
    graph.set_entry_point("intent_classifier")

    # intent_classifier → simple nodes or rag_query
    graph.add_conditional_edges(
        "intent_classifier",
        _route_after_intent,
        {
            _RAG_QUERY: _RAG_QUERY,
            _GREETING: _GREETING,
            _UNCLEAR: _UNCLEAR,
            _OUT_OF_SCOPE: _OUT_OF_SCOPE,
            # SCF request refused outright when SCF is disabled.
            _SCF_BLOCKED: _SCF_BLOCKED,
            # Nothing to negotiate — the ask does not beat the current terms.
            _NO_OPPORTUNITY: _NO_OPPORTUNITY,
            # Every no-RAG substantive intent, derived from the table rather
            # than re-listed. Listing them twice is how they drift: adding
            # HANDLE_SUPPLIER_PUSHBACK to `_NO_RAG_INTENTS` without adding it
            # here made `_route_after_intent` return a destination this map had
            # no entry for, and LangGraph raised KeyError at routing time — on
            # every pushback turn, after the graph had already compiled.
            **{node: node for node in _NO_RAG_INTENTS.values()},
        },
    )

    # rag_query → substantive nodes
    graph.add_conditional_edges(
        _RAG_QUERY,
        _route_after_rag,
        {
            _GENERATE_PLAYBOOK: _GENERATE_PLAYBOOK,
            _RUN_SCENARIO: _RUN_SCENARIO,
            _ANSWER_DATA_QUESTION: _ANSWER_DATA_QUESTION,
            _RECOMMEND_OPENING: _RECOMMEND_OPENING,
            _EVALUATE_COUNTER_OFFER: _EVALUATE_COUNTER_OFFER,
            _REFRAME_WITH_FINANCING: _REFRAME_WITH_FINANCING,
            # Reached only by APPLY_OVERRIDE (SUMMARIZE/META/EXPLAIN skip RAG).
            _META_OPERATION: _META_OPERATION,
            # SCF backstop if a reframe request ever reaches rag_query.
            _SCF_BLOCKED: _SCF_BLOCKED,
            # §2 backstop if a strategy intent ever reaches rag_query.
            _NO_OPPORTUNITY: _NO_OPPORTUNITY,
            END: END,
        },
    )

    for node in (
        _GENERATE_PLAYBOOK, _RUN_SCENARIO, _HANDLE_PUSHBACK, _SUMMARIZE,
        _ANSWER_DATA_QUESTION, _ANSWER_SPENDS_QUESTION, _RECOMMEND_OPENING,
        _EXPLAIN_RECOMMENDATION, _DRAFT_EMAIL, _EVALUATE_COUNTER_OFFER,
        _REFRAME_WITH_FINANCING, _META_OPERATION, _APPLY_OVERRIDE, _OUT_OF_SCOPE,
        _GREETING, _UNCLEAR, _SCF_BLOCKED, _NO_OPPORTUNITY,
    ):
        graph.add_edge(node, END)

    return graph.compile()
