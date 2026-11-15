"""The rag_query node's contract: which string is searched, and what a failure looks like."""
from __future__ import annotations

import pytest

from agents.nodes.rag_query import make_rag_query_node
from domain.entities.rag_context import RAGContext


class _RecordingRAGService:
    """Captures the query string the node actually searched with."""

    def __init__(self, result: RAGContext | None = None, raises: Exception | None = None):
        self.queries: list[str] = []
        self._result = result
        self._raises = raises

    async def query(self, query: str) -> RAGContext:
        self.queries.append(query)
        if self._raises is not None:
            raise self._raises
        return self._result or RAGContext(
            context_text="ctx", source_ids=["a"], chunk_count=1, query=query
        )


async def test_it_searches_with_the_resolved_question_when_there_is_one():
    """A follow-up like "why?" is useless as an embedding; the rewrite is not."""
    service = _RecordingRAGService()
    node = make_rag_query_node(service)

    await node({"message": "why?", "resolved_question": "why is our buyer leverage high?"})

    assert service.queries == ["why is our buyer leverage high?"]


async def test_it_falls_back_to_the_raw_message_when_there_is_no_rewrite():
    """`resolved_question` is None whenever the rewrite matched what was typed —
    which is the case for every plain "what is X" question."""
    service = _RecordingRAGService()
    node = make_rag_query_node(service)

    await node({"message": "What is buyer standards?", "resolved_question": None})

    assert service.queries == ["What is buyer standards?"]


@pytest.mark.parametrize("resolved", ["", "   "])
async def test_a_blank_rewrite_is_not_used_as_the_query(resolved):
    service = _RecordingRAGService()
    node = make_rag_query_node(service)

    await node({"message": "What is supplier standard?", "resolved_question": resolved})

    assert service.queries == ["What is supplier standard?"]


async def test_a_retrieval_failure_is_reported_not_swallowed_silently():
    """A missing collection used to look exactly like an honest empty result."""
    service = _RecordingRAGService(raises=RuntimeError("collection does not exist"))
    node = make_rag_query_node(service)

    out = await node({"message": "What is buyer leverage?"})

    assert out["rag_context"].chunk_count == 0
    assert out["rag_context"].status == "failed"
    assert out["errors"] == ["rag_query: retrieval failed"]


async def test_a_successful_empty_result_is_not_reported_as_an_error():
    service = _RecordingRAGService(
        result=RAGContext(
            context_text="", source_ids=[], chunk_count=0, query="q", status="empty"
        )
    )
    node = make_rag_query_node(service)

    out = await node({"message": "how do I bake sourdough bread?"})

    assert out["rag_context"].status == "empty"
    assert "errors" not in out


# ── the supplier's name never reaches the search ──────────────────────────────


from types import SimpleNamespace  # noqa: E402

from agents.nodes.rag_query import strip_supplier_name  # noqa: E402


def _context(name: str) -> SimpleNamespace:
    return SimpleNamespace(facts=SimpleNamespace(supplier_name=name))


async def test_the_supplier_name_the_rewrite_added_is_not_searched():
    """Live KB: 4 chunks for "what is the scf rate", 0 once the rewrite appended
    "for U.S. Foodservice, Inc" — the same question flipping between grounded
    and ungrounded depending on whether the classifier added the name."""
    service = _RecordingRAGService()
    node = make_rag_query_node(service)

    await node({
        "message": "what is the scf rate",
        "resolved_question": "what is the scf rate for U.S. Foodservice, Inc",
        "context": _context("U.S. Foodservice, Inc"),
    })

    assert service.queries == ["what is the scf rate"]


@pytest.mark.parametrize("query, name, expected", [
    ("define supplier standard for Adp, Inc", "ADP, Inc.", "define supplier standard"),
    ("what is buyer leverage with U.S. Foodservice, Inc?", "U.S. Foodservice, Inc", "what is buyer leverage?"),
    ("What is Adp's DSO?", "Adp, Inc", "What is DSO?"),
    # Inside another word, or no name at all: untouched.
    ("adapt the plan", "Adp, Inc", "adapt the plan"),
    ("what is the scf rate", "Adp, Inc", "what is the scf rate"),
    # Too short to strip safely.
    ("what is x", "Co", "what is x"),
])
def test_strip_supplier_name(query, name, expected):
    assert strip_supplier_name(query, name) == expected


def test_a_query_that_is_only_the_name_is_kept():
    assert strip_supplier_name("Adp, Inc", "Adp, Inc") == "Adp, Inc"
