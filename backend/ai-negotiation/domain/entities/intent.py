from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Intent(str, Enum):
    """The set of negotiation intents the assistant can recognise.

    This taxonomy mirrors the canonical definitions in
    ``utils/prompts/intent_classifier_prompt.py`` — that prompt is the
    source of truth for *how* each intent is detected; this enum is the typed
    handle the rest of the codebase routes on.
    """

    SUMMARIZE_SUPPLIER_POSITION = "summarize_supplier_position"
    RECOMMEND_OPENING_STRATEGY = "recommend_opening_strategy"
    RUN_SCENARIO = "run_scenario"
    EXPLAIN_RECOMMENDATION = "explain_recommendation"
    GENERATE_NEGOTIATION_PLAYBOOK = "generate_negotiation_playbook"
    DRAFT_EMAIL = "draft_email"
    HANDLE_SUPPLIER_PUSHBACK = "handle_supplier_pushback"
    EVALUATE_COUNTER_OFFER = "evaluate_counter_offer"
    REFRAME_WITH_FINANCING = "reframe_with_financing"
    ANSWER_DATA_QUESTION = "answer_data_question"
    ANSWER_SPENDS_QUESTION = "answer_spends_question"
    META_OPERATION = "meta_operation"
    APPLY_OVERRIDE = "apply_override"
    OUT_OF_SCOPE = "out_of_scope"
    GREETING = "greeting"
    UNCLEAR = "unclear"
    UNKNOWN = "unknown"


class EmailTemplate(str, Enum):
    """The client's approved supplier emails. Member names are the template keys
    (see `utils.prompts.email_templates.EMAIL_TEMPLATES`); values are the short
    names the intent classifier returns."""

    DEFAULT_PAYMENT_TERMS_STANDARDIZATION = "standard"
    LONG_FORM_PAYMENT_TERMS_NOTICE = "longer"
    COLLABORATIVE_NEGOTIABLE_PAYMENT_TERMS = "collaborative"
    SUPPLY_CHAIN_FINANCE_PAYMENT_TERMS = "scf"
    SENIOR_MANAGEMENT_FORMAL_INITIATIVE = "senior_management"


@dataclass(frozen=True)
class IntentClassification:
    """Result produced by an :class:`IntentClassifierPort`.

    ``group`` and ``agent`` mirror the routing hints the classifier prompt
    returns (e.g. group "A" / "objection_handler_agent") so the graph can route
    on them without re-deriving the mapping.

    ``response_mode`` signals how much output the user actually wants:
    - ``"quick"``         — direct 1-3 sentence answer; no structured template
    - ``"conversational"``— focused answer in 1-2 paragraphs; skip unused sections
    - ``"full"``          — comprehensive structured output as specified in the
                            node's system prompt (default when not detected)

    ``follow_ups`` are 4 contextual suggestions for the next action the negotiator
    might take, generated alongside intent classification to eliminate a separate LLM call.

    ``resolved_question`` is the turn's message rewritten to stand on its own,
    with every back-reference replaced by what it points to ("what's ITS
    difference vs peer group standard" → "what is the difference between the
    supplier standard and the peer group standard"). The classifier has to
    resolve those references anyway to route the turn, and it is the one call
    that sees the thread; writing the resolution down means the answering node
    is not left to redo it from a shorter view of the history — which is where
    it went wrong, silently, by resolving the pronoun to the nearest plausible
    subject and answering a question nobody asked.

    It is a READING of the message, never a replacement for it: prompts render
    the negotiator's own words and add this alongside. ``None`` when the message
    already stands alone, when there is no history, or when the field is absent.
    """

    intent: Intent
    confidence: float
    low_confidence: bool = False
    group: str | None = None
    agent: str | None = None
    reasoning: str | None = None
    response_mode: str = "full"  # "quick" | "conversational" | "full"
    follow_ups: list[str] | None = None
    resolved_question: str | None = None
    # The language the ANSWER must be written in, as an English language name
    # ("German"); None means English. Sticky across the thread — a negotiator
    # who asked for German and then says "yes" still wants German, and the
    # classifier is the only component that sees enough of the thread to know.
    response_language: str | None = None
    # Which approved email format the negotiator named (an `EmailTemplate`
    # value). Only set on DRAFT_EMAIL; None when no format was named, so an
    # edit keeps the format of the email it is changing.
    email_template: str | None = None
    # Whether a DRAFT_EMAIL turn changes the email already drafted in this
    # conversation (True) rather than asking for a new one (False). False on
    # every other intent.
    email_edit: bool = False
    # Whether a DRAFT_EMAIL turn asks for anything beyond picking the email —
    # wording, tone, length, content or values. A new email with no changes is
    # the approved template itself, filled in code with no model call.
    email_changes: bool = False
    # Whether a HANDLE_SUPPLIER_PUSHBACK turn asks to PREPARE for objections the
    # supplier has not raised yet ("prepare potential pushbacks", "what
    # objections should I expect") rather than to answer one they did raise.
    # Answered from the playbook's objections engine instead of a clarifying
    # question. False on every other intent.
    pushback_anticipate: bool = False
    # Whether the question is about THIS ASSISTANT or Calculum rather than the
    # supplier ("who are you?", "tell me about Calculum"). Only meaningful for
    # ANSWER_DATA_QUESTION, which answers it from the knowledge base when that
    # holds something on Calculum and from a fixed introduction when it does not.
    about_assistant: bool = False
    # Summary asks select a depth independently of response_mode. Narrow asks
    # remain one-topic answers and ignore summary_tier.
    summary_scope: str = "summary"  # "summary" | "narrow"
    summary_tier: str = "large"  # "small" | "large"
