import pytest

from application.agent.query_rewrite import (
    FollowupRoute,
    _looks_context_dependent,
    _parse_decision,
    is_content_free,
    route_followup,
)
from application.agent.schemas import RouteDecision
from utils.prompts.followup_route_prompt import FOLLOWUP_ROUTE_SYSTEM_PROMPT


class _FakeLLM:
    def __init__(self, reply):
        self.reply = reply
        self.calls = 0
        self.prompts = []
        self.systems = []

    async def complete(self, prompt, system=None, max_tokens=1024):
        self.calls += 1
        self.prompts.append(prompt)
        self.systems.append(system)
        return self.reply


class _Boom:
    async def complete(self, *a, **k):
        raise RuntimeError("down")


_RECENT = [
    {"role": "user", "content": "what are the negotiation tones?"},
    {"role": "assistant", "content": "There are five: NTA, NTB, NTC, NTD, NTE."},
]


def test_content_free_detects_punctuation_and_whitespace_only():
    assert is_content_free("?")
    assert is_content_free("...")
    assert is_content_free("   ")
    assert is_content_free("")
    assert is_content_free("!!")


def test_content_free_false_for_real_text():
    assert not is_content_free("only names ?")
    assert not is_content_free("hi")


def test_combined_clarification_reply_still_content_free():
    # "? — ?" is what _combine_with_clarification (support_agent.py) produces when the user
    # answers a clarification prompt with another bare "?" — must still register as content-free
    # so the resuming-turn "give up" path (support_agent.py) can catch it.
    assert is_content_free("? — ?")


def test_gate_skips_long_self_contained_question():
    assert not _looks_context_dependent(
        "how do I configure global filters for the negotiation planning module"
    )


def test_gate_fires_on_short_or_pronoun_questions():
    assert _looks_context_dependent("only names ?")
    assert _looks_context_dependent("and dates?")
    assert _looks_context_dependent(
        "can you tell me more about that specific configuration option"
    )


class TestRouteDecisionSchema:
    """The Pydantic contract the router LLM's JSON reply is validated against."""

    def test_valid_answer_action(self):
        d = RouteDecision.model_validate({"action": "answer", "answer": "NTA, NTB."})
        assert d.action == "answer"
        assert d.answer == "NTA, NTB."

    def test_valid_retrieve_action_with_no_extra_fields(self):
        d = RouteDecision.model_validate({"action": "retrieve", "query": "what is SSO?"})
        assert d.action == "retrieve"
        assert d.answer is None
        assert d.clarify is None

    def test_action_field_required(self):
        with pytest.raises(Exception):
            RouteDecision.model_validate({"query": "x"})

    def test_unknown_action_rejected(self):
        with pytest.raises(Exception):
            RouteDecision.model_validate({"action": "shrug"})


def test_parse_decision_tolerates_surrounding_text():
    decision = _parse_decision('junk {"action": "retrieve", "query": "x"} trailing')
    assert decision == RouteDecision(action="retrieve", query="x")


def test_parse_decision_returns_none_for_non_json():
    assert _parse_decision("not json") is None


def test_parse_decision_returns_none_for_unknown_action():
    assert _parse_decision('{"action": "shrug"}') is None


async def test_no_history_skips_llm():
    llm = _FakeLLM('{"action": "retrieve", "query": "should not be used"}')
    out = await route_followup("only names ?", [], llm)
    assert out == FollowupRoute(query="only names ?")
    assert llm.calls == 0


async def test_self_contained_question_skips_llm_even_with_history():
    llm = _FakeLLM('{"action": "retrieve", "query": "should not be used"}')
    question = "how do I configure global filters for the negotiation planning module"
    out = await route_followup(question, _RECENT, llm)
    assert out == FollowupRoute(query=question)
    assert llm.calls == 0


async def test_retrieve_action_rewrites_query():
    llm = _FakeLLM('{"action": "retrieve", "query": "What are the names of the negotiation tones?"}')
    out = await route_followup("only names ?", _RECENT, llm)
    assert out == FollowupRoute(query="What are the names of the negotiation tones?")
    assert llm.calls == 1


async def test_unrelated_standalone_question_is_not_contaminated_by_history():
    # Short enough to trip the gate, but genuinely unrelated to _RECENT's negotiation-tones
    # topic. A correctly-behaving model returns it (roughly) unchanged as a plain RETRIEVE —
    # this locks in the wiring for that contract; the prompt wording is what actually steers a
    # real model there, which a unit test can't verify.
    llm = _FakeLLM('{"action": "retrieve", "query": "what is SSO?"}')
    out = await route_followup("what is SSO?", _RECENT, llm)
    assert out == FollowupRoute(query="what is SSO?")
    assert "tone" not in out.query.lower()
    assert "NT" not in out.query


async def test_answer_action_returns_direct_answer_no_retrieval_needed():
    llm = _FakeLLM('{"action": "answer", "answer": "NTA, NTB, NTC, NTD, NTE."}')
    out = await route_followup("just names", _RECENT, llm)
    assert out.answer == "NTA, NTB, NTC, NTD, NTE."
    assert out.clarify is None
    assert out.query == "just names"          # unused when answer is set, but preserved


async def test_clarify_action_requests_clarification():
    llm = _FakeLLM('{"action": "clarify", "clarify": "Could you say a bit more about what you mean?"}')
    out = await route_followup("what about it", _RECENT, llm)
    assert out.query == "what about it"
    assert out.clarify == "Could you say a bit more about what you mean?"
    assert out.answer is None


async def test_falls_back_on_llm_exception():
    out = await route_followup("only names ?", _RECENT, _Boom())
    assert out == FollowupRoute(query="only names ?")


async def test_falls_back_on_malformed_json():
    llm = _FakeLLM("not json at all")
    out = await route_followup("only names ?", _RECENT, llm)
    assert out == FollowupRoute(query="only names ?")


async def test_falls_back_on_unknown_action():
    llm = _FakeLLM('{"action": "shrug"}')
    out = await route_followup("only names ?", _RECENT, llm)
    assert out == FollowupRoute(query="only names ?")


async def test_falls_back_when_answer_action_missing_answer_field():
    llm = _FakeLLM('{"action": "answer"}')
    out = await route_followup("only names ?", _RECENT, llm)
    assert out == FollowupRoute(query="only names ?")


async def test_falls_back_when_retrieve_query_absurdly_long():
    llm = _FakeLLM('{"action": "retrieve", "query": "%s"}' % ("x " * 500))
    out = await route_followup("only names ?", _RECENT, llm)
    assert out == FollowupRoute(query="only names ?")


async def test_history_includes_actual_assistant_answer_content():
    # The routing call needs the PRIOR ANSWER's real content (not just a truncated snippet) to
    # be able to decide "answer directly from what was already said" — assert the prompt sent
    # to the LLM actually carries the assistant's prior answer text.
    llm = _FakeLLM('{"action": "answer", "answer": "NTA, NTB, NTC, NTD, NTE."}')
    await route_followup("just names", _RECENT, llm)
    assert "NTA, NTB, NTC, NTD, NTE" in llm.prompts[0]


def test_route_system_prompt_forbids_refusal_answers():
    # Regression tripwire: a future edit shouldn't silently drop the calibration language that
    # fixes the "ANSWER used as a refusal" / "CLARIFY fired on a new-but-clear topic" bugs.
    low = FOLLOWUP_ROUTE_SYSTEM_PROMPT.lower()
    assert "must go through retrieve" in low
    assert "never\nclarify" in low or "never clarify" in low.replace("\n", " ")
