"""Every destination the routers can return must have an edge to reach it.

The graph compiles happily with a router that returns a node name absent from
its conditional-edge map — the mismatch only surfaces at routing time, as a
LangGraph ``KeyError`` on a live turn. That is how ``handle_supplier_pushback``
shipped broken: it was added to ``_NO_RAG_INTENTS`` (so ``_route_after_intent``
started returning it) without being added to the ``intent_classifier`` path map,
and every pushback message failed mid-graph.

These tests walk the compiled graph instead of the source, so they catch the
next one regardless of how the maps are written.
"""
from __future__ import annotations

from unittest.mock import MagicMock

from langgraph.graph import END

from agents.graph import (
    _NO_RAG_INTENTS,
    _RAG_QUERY,
    _route_after_intent,
    build_negotiation_graph,
)
from domain.entities.intent import Intent


def _edges() -> set[tuple[str, str]]:
    graph = build_negotiation_graph(MagicMock(), MagicMock(), MagicMock())
    return {(edge.source, edge.target) for edge in graph.get_graph().edges}


def test_every_no_rag_intent_is_reachable_from_the_classifier():
    edges = _edges()
    missing = [
        node for node in _NO_RAG_INTENTS.values()
        if ("intent_classifier", node) not in edges
    ]
    assert not missing, f"no edge from intent_classifier to {missing}"


def test_pushback_routes_straight_to_its_node():
    assert _route_after_intent(
        {"intent": Intent.HANDLE_SUPPLIER_PUSHBACK}
    ) == Intent.HANDLE_SUPPLIER_PUSHBACK.value


def test_every_intent_routes_to_a_node_that_exists():
    """No intent may route to a destination the graph cannot reach.

    Covers both hops: whatever `_route_after_intent` returns must be an edge out
    of `intent_classifier`, and an intent sent to `rag_query` must have an edge
    out of `rag_query` too.
    """
    edges = _edges()
    for intent in Intent:
        for scf_enabled in (True, False):
            destination = _route_after_intent(
                {"intent": intent, "scf_enabled": scf_enabled}
            )
            assert ("intent_classifier", destination) in edges, (
                f"{intent.value} (scf_enabled={scf_enabled}) routes to "
                f"{destination!r}, which has no edge from intent_classifier"
            )
            if destination != _RAG_QUERY:
                continue
            assert any(
                source == _RAG_QUERY and target != END
                for source, target in edges
            ), f"{intent.value} reaches rag_query but rag_query has no outward edge"
