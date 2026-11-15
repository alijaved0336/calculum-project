from infrastructure.embedding.http_embedding_adapter import HttpEmbeddingAdapter


class _FakeResp:
    def __init__(self, data):
        self._data = data

    def raise_for_status(self):
        pass

    def json(self):
        return self._data


class _FakeClient:
    def __init__(self, data):
        self._data = data
        self.calls = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, url, json, headers):
        self.calls.append({"url": url, "json": json, "headers": headers})
        return _FakeResp(self._data)


async def test_embed_query_returns_2560_vector():
    fake = _FakeClient({"data": [{"embedding": [0.1] * 2560}]})
    adapter = HttpEmbeddingAdapter(
        base_url="http://embed",
        api_key="k",
        model="Qwen3-Embedding-4B",
        client_factory=lambda: fake,
    )
    vec = await adapter.embed_query("how do I set up auth?")
    assert len(vec) == 2560
    assert fake.calls[0]["url"] == "http://embed/v1/embeddings"
    assert fake.calls[0]["json"] == {"model": "Qwen3-Embedding-4B", "input": ["how do I set up auth?"]}
    assert fake.calls[0]["headers"]["Authorization"] == "Bearer k"
