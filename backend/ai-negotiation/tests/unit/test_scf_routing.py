"""Routing tests for the SCF hard block in the negotiation graph."""
from __future__ import annotations

import asyncio
from types import SimpleNamespace

from agents.graph import _route_after_intent, _route_after_rag
from agents.nodes.scf_blocked import make_scf_blocked_node
from domain.entities.intent import Intent
from domain.services.scf_policy import scf_refusal_message


def test_reframe_blocked_when_scf_disabled_at_intent():
    state = {"intent": Intent.REFRAME_WITH_FINANCING, "scf_enabled": False}
    assert _route_after_intent(state) == "scf_blocked"


def test_reframe_allowed_reaches_rag_when_scf_enabled():
    state = {"intent": Intent.REFRAME_WITH_FINANCING, "scf_enabled": True}
    assert _route_after_intent(state) == "rag_query"


def test_reframe_blocked_backstop_after_rag():
    state = {"intent": Intent.REFRAME_WITH_FINANCING, "scf_enabled": False}
    assert _route_after_rag(state) == "scf_blocked"


def test_reframe_routes_to_node_after_rag_when_enabled():
    state = {"intent": Intent.REFRAME_WITH_FINANCING, "scf_enabled": True}
    assert _route_after_rag(state) == Intent.REFRAME_WITH_FINANCING.value


def test_non_scf_intent_unaffected():
    state = {"intent": Intent.ANSWER_DATA_QUESTION, "scf_enabled": False}
    assert _route_after_intent(state) == "rag_query"


def test_scf_blocked_node_returns_refusal():
    node = make_scf_blocked_node()
    result = asyncio.run(node({"intent": Intent.REFRAME_WITH_FINANCING, "scf_enabled": False}))
    assert result["response"] == scf_refusal_message()


def test_scf_blocked_node_explains_unofferable_when_scf_enabled():
    # SCF on for the account, but no programme rate for this supplier: the
    # reply must not claim the programme is disabled.
    node = make_scf_blocked_node()
    brief = SimpleNamespace(scf_offerable=False, scf_inviable_reason="no_scf_rate")
    result = asyncio.run(node({"intent": Intent.DRAFT_EMAIL, "scf_enabled": True, "brief": brief}))
    assert result["response"] != scf_refusal_message()
    assert "part of this account's negotiation program" in result["response"]
    assert "no SCF programme rate is on file for this supplier" in result["response"]
