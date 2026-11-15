"""The three-way KNOWLEDGE BASE REFERENCE branch.

The `None` case is the one that regresses silently: SUMMARIZE_SUPPLIER_POSITION,
EXPLAIN_RECOMMENDATION and META_OPERATION are in `_NO_RAG_INTENTS` and never
reach `rag_query`, so their rag_context is always None. Emitting "no passages
were retrieved from the client's documents" there would be a false statement
about a search that never ran.
"""
from __future__ import annotations

import pytest

from domain.entities.rag_context import RAGContext
from utils.prompts.kb_reference import render_kb_reference


def _ctx(**kw) -> RAGContext:
    base = dict(context_text="", source_ids=[], chunk_count=0, query="q")
    return RAGContext(**{**base, **kw})


def test_populated_context_is_passed_through_verbatim():
    ctx = _ctx(context_text="## KNOWLEDGE BASE REFERENCE\nreal passage", chunk_count=2)
    assert render_kb_reference(ctx) == "## KNOWLEDGE BASE REFERENCE\nreal passage"


def test_none_renders_nothing_because_the_kb_was_never_searched():
    assert render_kb_reference(None) == ""


def test_an_honest_miss_says_nothing_was_retrieved():
    out = render_kb_reference(_ctx(status="empty"))
    assert "No passages were retrieved" in out
    assert "could not be searched" not in out


@pytest.mark.parametrize("status", ["failed", "timeout"])
def test_a_failed_search_is_distinguished_from_an_empty_one(status):
    out = render_kb_reference(_ctx(status=status))
    assert "could not be searched" in out
    assert "No passages were retrieved" not in out


def test_extra_wording_is_appended_only_to_the_empty_case():
    out = render_kb_reference(_ctx(status="empty"), extra="A number is not a definition.")
    assert "A number is not a definition." in out


def test_the_blocks_stay_within_the_prompt_size_budget():
    """negotiation_guide has ~550 chars of headroom against its ceiling."""
    for ctx in (_ctx(status="empty"), _ctx(status="failed")):
        assert len(render_kb_reference(ctx)) <= 330
