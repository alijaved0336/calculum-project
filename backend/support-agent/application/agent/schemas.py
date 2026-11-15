"""Structured-output contract for the follow-up router LLM call (see
utils/prompts/followup_route_prompt.py for the prompt this validates the response against)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


class RouteDecision(BaseModel):
    """Raw, validated shape of the router LLM's JSON reply. Deliberately permissive on the
    unused fields (e.g. ``answer`` when ``action="retrieve"``) — business-rule checks (field
    required for the given action, length caps, etc.) happen in
    ``application.agent.query_rewrite.route_followup`` after validation, where they can fail
    soft (fall back to plain retrieval) instead of raising."""

    action: Literal["answer", "retrieve", "clarify"]
    answer: str | None = None
    query: str | None = None
    clarify: str | None = None
