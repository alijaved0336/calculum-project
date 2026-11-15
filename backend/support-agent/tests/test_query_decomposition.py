from application.agent.query_decomposition import (
    _looks_multi_intent,
    _parse_subquestions,
    decompose_query,
)


class _FakeLLM:
    def __init__(self, reply):
        self.reply = reply
        self.calls = 0

    async def complete(self, prompt, system=None, max_tokens=1024):
        self.calls += 1
        return self.reply


def test_gate_skips_obviously_single_intent():
    assert _looks_multi_intent("how do I apply global filters") is False
    assert _looks_multi_intent("reset password") is False           # too short
    assert _looks_multi_intent("how do I apply global filters and list negotiation tones")


def test_gate_fires_on_multiple_questions():
    assert _looks_multi_intent("How do I export? How do I import the file back?")


def test_parse_tolerates_surrounding_text():
    assert _parse_subquestions('junk ["a", "b"] trailing') == ["a", "b"]
    assert _parse_subquestions("not json") == []


async def test_single_intent_skips_llm():
    llm = _FakeLLM('["x","y"]')
    out = await decompose_query("how do I apply global filters", llm)
    assert out == ["how do I apply global filters"]
    assert llm.calls == 0                                            # gate short-circuited


async def test_multi_intent_splits_via_llm():
    llm = _FakeLLM('["how do I apply global filters", "list the negotiation tones"]')
    out = await decompose_query("how do I apply global filters and list the negotiation tones", llm)
    assert out == ["how do I apply global filters", "list the negotiation tones"]
    assert llm.calls == 1


async def test_falls_back_to_single_when_llm_returns_one_or_fails():
    # one item back → treat as single-intent
    assert await decompose_query("do A and B please now", _FakeLLM('["just one"]')) == \
        ["do A and B please now"]

    class _Boom:
        async def complete(self, *a, **k):
            raise RuntimeError("down")

    assert await decompose_query("do A and B please now", _Boom()) == ["do A and B please now"]


async def test_caps_number_of_subquestions():
    llm = _FakeLLM('["a","b","c","d","e","f"]')
    out = await decompose_query("a and b and c and d and e and f", llm, max_subquestions=3)
    assert out == ["a", "b", "c"]
