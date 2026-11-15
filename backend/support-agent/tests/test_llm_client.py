from infrastructure.llm.llm_client import LLMClient, ThinkFilter, strip_reasoning


def test_strip_reasoning_removes_think_block():
    assert strip_reasoning("<think>deliberation</think>Answer") == "Answer"
    assert strip_reasoning("plain answer") == "plain answer"
    assert strip_reasoning("<THINK>x\ny</THINK>  Final") == "Final"


def test_think_filter_handles_tags_split_across_chunks():
    # A <think> block whose open/close tags straddle streamed-token boundaries must be
    # fully suppressed, leaking no partial tag text.
    f = ThinkFilter()
    out = "".join(f.feed(c) for c in ["<th", "ink>reas", "on</thi", "nk>Ans", "wer"])
    out += f.flush()
    assert out == "Answer"


def test_think_filter_passes_plain_text():
    f = ThinkFilter()
    out = "".join(f.feed(c) for c in ["Hel", "lo ", "world"]) + f.flush()
    assert out == "Hello world"


class _FakeResp:
    def __init__(self, content):
        self._content = content

    def raise_for_status(self):
        pass

    def json(self):
        return {"choices": [{"message": {"content": self._content}}]}


class _FakeClient:
    def __init__(self, content):
        self._content = content
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json, headers):
        self.calls.append({"url": url, "json": json})
        return _FakeResp(self._content)


async def test_complete_strips_reasoning_and_sends_messages():
    fake = _FakeClient("<think>reasoning</think>SSO is configured under Settings [01:30–02:30]")
    client = LLMClient(
        base_url="http://llm", api_key="k", model="Qwen", chat_path="/v1/chat/completions",
        client_factory=lambda: fake,
    )
    out = await client.complete("How to enable SSO?", system="You are a support agent.", max_tokens=256)
    assert out == "SSO is configured under Settings [01:30–02:30]"
    sent = fake.calls[0]["json"]
    assert sent["messages"][0] == {"role": "system", "content": "You are a support agent."}
    assert sent["messages"][1] == {"role": "user", "content": "How to enable SSO?"}


async def test_complete_sends_low_default_temperature():
    # Production bug: with no temperature sent, the inference server's own (higher) default
    # applies, and the SAME prompt can sample a different citation format every call. A low,
    # explicit temperature must always be sent so behaviour is reproducible.
    fake = _FakeClient("answer")
    client = LLMClient(base_url="http://llm", api_key="k", model="Qwen", client_factory=lambda: fake)
    await client.complete("q")
    assert fake.calls[0]["json"]["temperature"] == 0.1


async def test_complete_sends_configured_temperature():
    fake = _FakeClient("answer")
    client = LLMClient(
        base_url="http://llm", api_key="k", model="Qwen", temperature=0.0, client_factory=lambda: fake,
    )
    await client.complete("q")
    assert fake.calls[0]["json"]["temperature"] == 0.0


class _FakeStreamResp:
    def __init__(self, lines):
        self._lines = lines

    def raise_for_status(self):
        pass

    async def aiter_lines(self):
        for line in self._lines:
            yield line


class _FakeStreamCtx:
    def __init__(self, lines):
        self._lines = lines

    async def __aenter__(self):
        return _FakeStreamResp(self._lines)

    async def __aexit__(self, *exc):
        return False


class _FakeStreamClient:
    def __init__(self, lines):
        self._lines = lines
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    def stream(self, method, url, json, headers):
        self.calls.append({"method": method, "url": url, "json": json})
        return _FakeStreamCtx(self._lines)


async def test_stream_yields_tokens_and_strips_reasoning():
    lines = [
        'data: {"choices":[{"delta":{"content":"<think>"}}]}',
        'data: {"choices":[{"delta":{"content":"reason"}}]}',
        'data: {"choices":[{"delta":{"content":"</think>Ans"}}]}',
        'data: {"choices":[{"delta":{"content":"wer"}}]}',
        "data: [DONE]",
    ]
    fake = _FakeStreamClient(lines)
    client = LLMClient(base_url="http://llm", api_key="k", model="Qwen", client_factory=lambda: fake)
    tokens = [tok async for tok in client.stream("q", system="sys", max_tokens=64)]
    assert "".join(tokens) == "Answer"
    assert fake.calls[0]["json"]["stream"] is True
    assert fake.calls[0]["json"]["temperature"] == 0.1
