from __future__ import annotations

from enum import Enum


class FollowUpTopic(str, Enum):
    """Curated follow-up journeys that get a FIXED chip set instead of an
    LLM-generated one.

    Resolved deterministically by ``domain.services.follow_up_policy`` from
    the negotiator's message and the classified intent. Anything that does not
    resolve to one of these keeps the contextual LLM flow
    (``agents.nodes.follow_up_generator``).
    """

    OPENING_OFFER = "opening_offer"
    PLAYBOOK = "playbook"
    OPPORTUNITY_SUMMARY = "opportunity_summary"
    OPENING_STRATEGY = "opening_strategy"
    SUPPLIER_STANDARD_CAUTION = "supplier_standard_caution"
    SUPPLIER_PUSHBACK = "supplier_pushback"
    TERM_IMPACT = "term_impact"
    EMAIL = "email"
