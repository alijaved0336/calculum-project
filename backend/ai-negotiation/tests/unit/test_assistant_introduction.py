from __future__ import annotations

import asyncio

from agents.graph import _route_after_intent
from agents.nodes.answer_data_question import make_answer_data_question_node
from agents.nodes.rag_query import make_rag_query_node
from domain.entities.intent import Intent
from domain.entities.rag_context import RAGContext
from infrastructure.intent.llm_intent_classifier import LLMIntentClassifier
from utils.prompts.assistant_introduction_prompt import NO_ASSISTANT_INFO

_KB_TEXT = "Calculum is a working-capital platform for procurement teams."


class _LLM:
    def __init__(self, reply: str = "", exc: Exception | None = None) -> None:
        self.reply, self.exc, self.calls = reply, exc, []

    async def complete(self, prompt, **kwargs):
        self.calls.append((prompt, kwargs))
        if self.exc:
            raise self.exc
        return self.reply


def _rag(chunks: int = 1) -> RAGContext:
    return RAGContext(
        context_text=_KB_TEXT if chunks else "",
        source_ids=["s1"] if chunks else [],
        chunk_count=chunks,
        query="q",
        chunk_file_info=({"file_id": "f1", "page_numbers": [1], "text": _KB_TEXT},) if chunks else (),
        status="ok" if chunks else "empty",
    )


def _ask(llm: _LLM, **state) -> dict:
    node = make_answer_data_question_node(llm)
    return asyncio.run(node({"message": "who are you?", "about_assistant": True, **state}))


def test_no_kb_content_gives_the_fixed_intro_without_an_llm_call():
    llm = _LLM()
    for rag in (None, _rag(0)):
        result = _ask(llm, rag_context=rag, user_name="Admin")
        assert result["response"].startswith("Hi Admin!")
        assert "Calculum AI Assistant" in result["response"]
    assert llm.calls == []


def test_kb_content_is_answered_by_the_llm_without_supplier_context():
    llm = _LLM(reply="I'm the Calculum AI Assistant. Calculum is a working-capital platform.")
    result = _ask(llm, rag_context=_rag())
    assert result["response"] == llm.reply
    assert "source" in result
    prompt, kwargs = llm.calls[0]
    assert _KB_TEXT in prompt
    assert kwargs["stream_to_client"] is False


def test_kb_with_nothing_about_calculum_falls_back():
    result = _ask(_LLM(reply=NO_ASSISTANT_INFO), rag_context=_rag())
    assert "Calculum AI Assistant" in result["response"]
    assert NO_ASSISTANT_INFO not in result["response"]


def test_llm_failure_falls_back():
    result = _ask(_LLM(exc=RuntimeError("down")), rag_context=_rag())
    assert "Calculum AI Assistant" in result["response"]
    assert result["errors"]


def test_supplier_data_question_is_not_answered_as_an_intro():
    node = make_answer_data_question_node(_LLM())
    result = asyncio.run(node({"message": "what is their WACC?"}))
    assert "Calculum AI Assistant" not in (result["response"] or "")


def test_routes_through_the_knowledge_base():
    assert _route_after_intent({"intent": Intent.ANSWER_DATA_QUESTION}) == "rag_query"


def test_rag_query_names_calculum_in_the_search():
    class _Service:
        query_seen = None

        async def query(self, query):
            _Service.query_seen = query
            return _rag()

    asyncio.run(make_rag_query_node(_Service())({"message": "who are you?", "about_assistant": True}))
    assert _Service.query_seen == "Calculum AI assistant: who are you?"


def test_classifier_sets_the_flag_only_on_data_questions():
    classifier = LLMIntentClassifier(llm=None)
    intro = classifier._parse('{"intent": "answer_data_question", "confidence": 0.9, "about_assistant": true}', "who are you?")
    assert intro.about_assistant is True
    other = classifier._parse('{"intent": "summarize_supplier_position", "confidence": 0.9, "about_assistant": true}', "tell me about them")
    assert other.about_assistant is False
    # Salvaged out of JSON that does not parse.
    broken = classifier._parse('{"intent": "answer_data_question", "reasoning": "a "quoted" rule", "about_assistant": true}', "who are you?")
    assert broken.about_assistant is True
