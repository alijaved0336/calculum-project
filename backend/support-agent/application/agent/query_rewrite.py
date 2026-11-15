"""Route an ambiguous follow-up to one of three outcomes, instead of silently guessing:

1. **Answer directly** — the follow-up can be fully answered using ONLY what's already in the
   recent conversation (e.g. "just the names" after an answer that already named them). No new
   retrieval; the LLM composes the reply straight from the conversation it's given.
2. **Retrieve** — the follow-up needs information not already present, so it's rewritten into a
   standalone question for a fresh RAG search.
3. **Clarify** — even with the conversation, intent can't be confidently determined; ask the
   user instead of guessing.

Two layers, cheapest first:

- Content-free input (``"?"``, ``"..."``, whitespace) is detected deterministically — no LLM
  needed to know it carries no meaning. Always routes to clarification.
- A short/pronoun-heavy follow-up ("only names ?", "what about that?") is ambiguous only in
  light of prior conversation, so it goes through one LLM call that has the last few exchanges
  (not just the last one — enough for "just the names" to be answerable from what was already
  said) and returns one of the three outcomes above as structured JSON, validated against
  ``application.agent.schemas.RouteDecision``. The prompt itself lives in
  ``utils.prompts.followup_route_prompt`` alongside this codebase's other LLM prompts.

Conservative by construction: a self-contained question or a thread's first message never pays
for the LLM call (mirrors ``query_decomposition.py``'s cheap-gate-first shape), and any parse
failure/exception falls back to plain retrieval on the original question, unchanged, rather than
blocking the turn.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from pydantic import ValidationError

from application.agent.schemas import RouteDecision
from utils.conversation_history import format_conversation_history
from utils.prompts.followup_route_prompt import build_followup_route_prompt

logger = logging.getLogger(__name__)

# Reference/ellipsis signals that mean a question likely can't stand on its own.
_BARE_PRONOUNS = {"it", "that", "this", "those", "these", "them"}
_CONTINUATION_WORDS = {"only", "just", "same", "instead"}
_LEAD_IN_PHRASES = ("what about", "how about", "and the", "also the")
_MAX_STANDALONE_WORDS = 8

# Last ~3 exchanges, generously sized — an "answer from history" decision needs the actual
# content of the prior answer(s), not just a truncated snippet.
_HISTORY_MAX_TURNS = 6
_HISTORY_MAX_CHARS_PER_TURN = 1200
_ROUTE_MAX_TOKENS = 512

# Content-free input: nothing but punctuation/whitespace (e.g. "?", "...", "!!").
_NON_WORD_RE = re.compile(r"[^\w]", re.UNICODE)

# The model's raw JSON reply, tolerant of surrounding text.
_JSON_OBJECT_RE = re.compile(r"\{.*\}", re.DOTALL)


@dataclass
class FollowupRoute:
    """``query`` is always retrieval-ready (falls back to the original question on any
    failure/ambiguity). ``answer`` is set when the follow-up was fully answered from the
    conversation already given — the caller should use it directly and skip retrieval.
    ``clarify`` is set only when the caller should short-circuit and ask the user instead.
    At most one of ``answer``/``clarify`` is ever set."""

    query: str
    answer: str | None = None
    clarify: str | None = None


def is_content_free(question: str) -> bool:
    """True for input with no real semantic content: empty, whitespace, or punctuation-only.

    Deterministic and unambiguous — no LLM needed to tell that "?" carries nothing to search
    for. Callers should route this straight to a clarification request without spending a RAG
    or LLM call on it.
    """
    return not _NON_WORD_RE.sub("", question or "")


def _looks_context_dependent(question: str) -> bool:
    words = question.lower().split()
    if len(words) <= _MAX_STANDALONE_WORDS:
        return True
    low = question.lower()
    tokens = {w.strip(".,!?;:'\"()") for w in words}
    if tokens & _BARE_PRONOUNS:
        return True
    if tokens & _CONTINUATION_WORDS:
        return True
    return any(p in low for p in _LEAD_IN_PHRASES)


def _parse_decision(raw: str) -> RouteDecision | None:
    """Extract + validate the LLM's JSON reply against ``RouteDecision``; tolerant of
    surrounding text and any malformed/unrecognized shape (returns ``None``, caller falls back
    safely to plain retrieval on the original question)."""
    match = _JSON_OBJECT_RE.search(raw or "")
    if not match:
        return None
    try:
        return RouteDecision.model_validate_json(match.group(0))
    except ValidationError:
        return None


async def route_followup(question: str, recent: list[dict], llm) -> FollowupRoute:
    """Decide how to handle ``question`` given ``recent`` history: answer it directly, expand
    it into a standalone retrieval query, or ask for clarification. Assumes ``question`` is
    already known non-empty and non-content-free — callers handle that case separately."""
    question = (question or "").strip()
    if not question:
        return FollowupRoute(query=question)
    if not recent:
        logger.info("rewrite.gate_skipped reason=no_history question_len=%d", len(question))
        return FollowupRoute(query=question)
    if not _looks_context_dependent(question):
        logger.info("rewrite.gate_skipped reason=self_contained question_len=%d", len(question))
        return FollowupRoute(query=question)

    history = format_conversation_history(
        recent, max_turns=_HISTORY_MAX_TURNS, max_chars_per_turn=_HISTORY_MAX_CHARS_PER_TURN
    )
    if not history:
        logger.info("rewrite.gate_skipped reason=empty_history_block question_len=%d", len(question))
        return FollowupRoute(query=question)

    system, user_prompt = build_followup_route_prompt(question, history)
    logger.info("rewrite.llm_started question_len=%d history_len=%d", len(question), len(history))
    try:
        raw = await llm.complete(user_prompt, system=system, max_tokens=_ROUTE_MAX_TOKENS)
    except Exception:  # noqa: BLE001 — a routing failure must never break the turn
        logger.exception("rewrite.llm_failed")
        return FollowupRoute(query=question)

    decision = _parse_decision(raw)
    if decision is None:
        logger.warning("rewrite.unparseable_response raw_len=%d", len(raw or ""))
        return FollowupRoute(query=question)

    if decision.action == "answer":
        if decision.answer and decision.answer.strip():
            logger.info("rewrite.answered_from_history answer_len=%d", len(decision.answer.strip()))
            return FollowupRoute(query=question, answer=decision.answer.strip())
        logger.warning("rewrite.fallback_invalid_output reason=missing_answer_field")
        return FollowupRoute(query=question)

    if decision.action == "clarify":
        if decision.clarify and decision.clarify.strip():
            logger.info("rewrite.clarify_requested clarify_len=%d", len(decision.clarify.strip()))
            return FollowupRoute(query=question, clarify=decision.clarify.strip())
        logger.warning("rewrite.fallback_invalid_output reason=missing_clarify_field")
        return FollowupRoute(query=question)

    # action == "retrieve"
    rewritten = decision.query
    if rewritten and rewritten.strip() and len(rewritten) <= max(200, len(question) * 6):
        logger.info(
            "rewrite.applied original_len=%d rewritten_len=%d", len(question), len(rewritten.strip())
        )
        return FollowupRoute(query=rewritten.strip())
    logger.warning(
        "rewrite.fallback_invalid_output reason=%s",
        "missing_query_field" if not rewritten else "query_too_long",
    )
    return FollowupRoute(query=question)
