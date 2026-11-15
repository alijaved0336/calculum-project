from __future__ import annotations

from typing import Any, Awaitable, Callable, TypedDict

from domain.entities.brief import NegotiationBrief
from domain.entities.context import SupplierContext
from domain.entities.intent import Intent
from domain.entities.rag_context import RAGContext


class NegotiationState(TypedDict, total=False):
    """Shared state passed between LangGraph nodes.

    Each node receives the current state and returns a partial dict that
    LangGraph merges back in. ``total=False`` means every key is optional, so
    nodes only need to populate the fields they own.

    Conventions:
      * Identity / inputs (``session_id``, ``supplier_id``, ``message``) are set
        when the graph is invoked.
      * ``context`` holds the supplier's negotiation context, and
        ``argument_analysis`` the full argument picture built from it. Both are
        resolved for the turn by the API route before the graph runs, and read
        (never recomputed) by downstream nodes.
      * Intent fields are populated by the intent-classifier node.
      * ``response`` is the assistant's final reply.
    """

    # ── Inputs / identity ──────────────────────────────────────────────
    session_id: str
    supplier_id: str
    # Tenant that owns this session — combined with ``supplier_id`` to scope
    # direct spend-table lookups so a buyer only ever sees their own supplier's
    # spend rows (see agents/nodes/spends.py).
    tenant_id: str
    message: str
    user_name: str | None

    # ── User preferences ───────────────────────────────────────────────
    # Picked via a UI control (not inferred/scored) — looked up against
    # `utils.prompts.tone_guidance.TONE_GUIDANCE` by drafting nodes that need it.
    selected_tone: str | None

    # ── Supplier context ───────────────────────────────────────────────
    context: SupplierContext | None

    # ── The turn's brief ───────────────────────────────────────────────
    # EVERYTHING this turn knows about the negotiation, in one object: facts,
    # the argument bundle and (where loaded) the opening-move signals. How
    # likely the ask is to be agreed rides along on the facts as
    # `success_probability` — decided upstream, not scored here (the composite
    # that used to be scored in its place was dropped by the client on
    # 2026-08-20). Built ONCE by the API route from the SAME resolved
    # context the nodes see — session target/walkaway overrides applied, SCF
    # stripped when the turn disallows it — so a node reads it rather than
    # recomputing, which is what keeps the summary, the playbook and a data
    # question naming the same arguments in the same order.
    #
    # This is what prompt builders should take. The dict key below is the same
    # data under the name the per-turn debug output prints.
    #
    # Derived, never authoritative — nothing should mutate it.
    brief: NegotiationBrief | None

    # ── Negotiation arguments ──────────────────────────────────────────
    # EVERYTHING `domain.services.negotiation_arguments` worked out for this
    # turn, as one JSON-serialisable bundle (see `build_argument_analysis`):
    #
    #   terms          — ask, current term, walkaway floor + why it is there
    #   supporting     — arguments ABOVE THE SUPPORT BAR, plus the usable
    #                    assessments; ranked by the client's source order and
    #                    carrying both wordings (what it is / how to pitch it)
    #   non_supporting — at or below the SUPPORT BAR; the ones below the
    #                    current term are `undermines` — the supplier's
    #                    potential counter-evidence, never ours
    #   unavailable    — argument-eligible sources with no value at all
    #   assessments    — payment reliability, DSO alignment, cost impact,
    #                    relationship: EVERY one, including those that came back
    #                    unusable, each with the reason
    #   posture        — leverage, financial sensitivity, priority
    #   sequence       — the ordered case
    #
    # TWO argument buckets, split at the current term. There is no `reserve`
    # tier (client, 2026-08-18) and no per-source exception to the split — see
    # `_classify`.
    #
    # The non-supporting half matters as much as the supporting half: it is what
    # tells the negotiator how firm the position actually is, and what to say
    # when the supplier names a figure of their own.
    #
    # Computed ONCE per turn by the API route from the SAME resolved context the
    # nodes see (session target/walkaway overrides applied, SCF stripped when
    # the turn disallows it), so a node reads it rather than recomputing — which
    # is what keeps the summary, the playbook and a data question naming the
    # same arguments in the same order. Per-turn, not per-session: the ask moves
    # when the negotiator overrides the target, and the whole bundle with it.
    # Derived, never authoritative — nothing should mutate it.
    argument_analysis: dict[str, Any] | None

    # ── SCF mode gate ──────────────────────────────────────────────────
    # Whether Supply Chain Finance is available for this turn. Tenant session
    # allowance ∩ Active Goal (`negotiation_strategy`). When False, `context`
    # is SCF-stripped for the turn, reframe_with_financing is refused, and SCF
    # is gated out of prompts/KB — see domain.services.scf_policy.
    scf_enabled: bool

    # ── Conversation history ───────────────────────────────────────────
    # Last few turns of this thread (user + ai), oldest first, fetched by
    # the WS route before the current message is saved. Passed to every
    # LLM-calling node so prompts can include it as background context —
    # see `utils.prompts.conversation_history.format_conversation_history`.
    conversation_history: list[dict[str, str]] | None

    # ── Intent classification ──────────────────────────────────────────
    intent: Intent | None
    intent_confidence: float | None
    intent_low_confidence: bool | None
    intent_group: str | None
    intent_agent: str | None
    intent_reasoning: str | None
    # How much output the user actually asked for — set by the intent classifier
    # alongside intent so every downstream node can adapt its format without a
    # second LLM call.  "quick" = 2-3 sentences; "conversational" = 1-2 focused
    # paragraphs; "full" = complete structured template (default).
    response_mode: str | None
    # The turn's message rewritten to stand alone, with back-references
    # ("its", "these", "why") replaced by what they point to. Produced by the
    # classifier, which already resolves them to route the turn and is the one
    # call that sees the thread. Rendered ALONGSIDE the verbatim message, never
    # instead of it — see `utils.prompts.question_focus.render_question`.
    resolved_question: str | None
    # The language the answer must be written in ("German"); None = English.
    # Sticky across the thread, resolved by the classifier — see
    # `utils.prompts.question_focus.render_language_instruction`.
    response_language: str | None
    # Set by the classifier on draft_email turns only (None / False otherwise):
    # the approved email format named this turn, and whether the turn edits the
    # previously drafted email instead of asking for a new one.
    email_template: str | None
    email_edit: bool | None
    email_changes: bool | None
    # Set by the classifier on handle_supplier_pushback turns only (False
    # otherwise): the negotiator wants to PREPARE for the objections this
    # supplier is likely to raise, not answer one they raised.
    pushback_anticipate: bool | None
    # True when an answer_data_question turn is about THIS ASSISTANT or Calculum
    # ("who are you?", "tell me about Calculum") rather than the supplier. Set by
    # the classifier on every turn; read by `rag_query` (search for Calculum) and
    # `answer_data_question` (KB answer, or the fixed introduction).
    about_assistant: bool | None
    # Summary scope renders the selected small/large tier; narrow scope
    # answers one question and ignores the tier. Both summary tiers ship a
    # progress-bar card; field depth follows the tier.
    summary_scope: str | None
    summary_tier: str | None
    summary_card: dict[str, Any] | None

    # ── RAG context ────────────────────────────────────────────────────
    # Populated by rag_query_node; consumed by every substantive node to
    # inject the ## KNOWLEDGE BASE REFERENCE block into its prompt.
    rag_context: RAGContext | None
    # Flat list of per-chunk file references from the reranked RAG hits.
    # Each entry: {"file_id": str, "page_numbers": list[int]}
    # Populated by rag_query_node; read by the API route to resolve filenames.
    rag_sources: list[dict] | None

    # ── Operator / tenant instructions ─────────────────────────────────
    # Active prompt instructions from tenant settings (enabled + non-conflicted).
    # Injected into every substantive LLM prompt via
    # format_prompt_instructions_block() from utils/prompts/prompt_instructions.py.
    prompt_instructions: list[str] | None

    # ── Output ─────────────────────────────────────────────────────────
    response: str | None
    # Maps each fact actually used to produce `response` to its payload path
    # and extracted value, e.g. {"target_term_days": {"path": "target.targetPaymentTerms", "value": 60}}.
    # Populated by nodes that draft from sourced facts (e.g. the negotiation
    # guide) so the client can show the negotiator where each figure came from.
    source: dict[str, dict[str, object]] | None
    # Set ONLY by `no_opportunity`/`scf_blocked` when this turn was short-
    # circuited away from the LLM-backed node its intent would normally reach
    # (e.g. "no_extension", "regulatory_cap", "scf_disabled"). `None` on every
    # normal turn. The graph has no checkpointer and `graph_state` is rebuilt
    # fresh per request (see api/routes/negotiation.py), so this never leaks
    # across turns. Read by the route handler so follow-up generation is
    # grounded in what the graph actually did, not just the classified intent.
    blocked_by: str | None
    # Three short follow-up suggestions (2–5 words each) generated after the
    # graph completes. Populated by the route handler, not by any graph node.
    follow_ups: list[str] | None

    # ── Diagnostics ────────────────────────────────────────────────────
    errors: list[str] | None


NodeFn = Callable[[NegotiationState], Awaitable[dict[str, Any]]]
