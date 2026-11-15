"""Split a multi-intent support prompt into its distinct sub-questions so each intent can be
retrieved + answered independently; single-intent prompts pass straight through.

A cheap deterministic gate (:func:`_looks_multi_intent`) avoids the LLM call for obviously
single questions. When it fires, one small LLM call returns the sub-questions. Conservative:
on any doubt or failure we fall back to ``[question]`` (today's single-section behaviour)."""
from __future__ import annotations

import json
import logging
import re

logger = logging.getLogger(__name__)

# Surface signals that a prompt likely bundles more than one ask. Conservative on purpose —
# a miss just means one section (today's behaviour); the LLM makes the final call.
_MULTI_INTENT_SIGNALS = (" and ", " also ", " as well as ", " plus ", "additionally", ";")
_MIN_WORDS = 6

_SPLIT_SYSTEM = (
    "You split a user's product-support question into the distinct sub-questions it contains. "
    "Return ONLY a JSON array of strings — each a self-contained question, in the user's "
    "original order. If the input is really a single question, return a one-element array. "
    "Never answer the questions; only split them. Return at most {n} items."
)


def _looks_multi_intent(question: str) -> bool:
    q = (question or "").lower()
    if len(q.split()) < _MIN_WORDS:
        return False
    if q.count("?") >= 2:
        return True
    return any(sig in q for sig in _MULTI_INTENT_SIGNALS)


def _parse_subquestions(raw: str) -> list[str]:
    """Extract a JSON array of strings from the model output; tolerant of surrounding text."""
    match = re.search(r"\[.*\]", raw or "", re.DOTALL)
    if not match:
        return []
    try:
        arr = json.loads(match.group(0))
    except (json.JSONDecodeError, ValueError):
        return []
    return [s.strip() for s in arr if isinstance(s, str) and s.strip()]


async def decompose_query(question: str, llm, max_subquestions: int = 4) -> list[str]:
    """Return the ordered sub-questions in ``question`` (``[question]`` when single-intent)."""
    question = (question or "").strip()
    if not question:
        return []
    if not _looks_multi_intent(question):
        return [question]
    try:
        raw = await llm.complete(
            question, system=_SPLIT_SYSTEM.format(n=max_subquestions), max_tokens=256
        )
    except Exception:  # noqa: BLE001 — a split failure must never break the turn
        logger.exception("decompose.llm_failed")
        return [question]
    subs = _parse_subquestions(raw)
    if len(subs) <= 1:
        return [question]  # model saw a single question (or output was unparseable)
    logger.info("decompose.split n=%d", len(subs))
    return subs[:max_subquestions]
