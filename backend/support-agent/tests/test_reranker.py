from domain.entities.retrieval_result import RetrievalResult
from infrastructure.reranker.cross_encoder_adapter import CrossEncoderAdapter


class _FakeModel:
    def __init__(self, scores):
        self._scores = scores
        self.calls = []

    def predict(self, pairs):
        self.calls.append(pairs)
        return self._scores


def _cands():
    return [
        RetrievalResult(id="a", score=0.5, text="A text"),
        RetrievalResult(id="b", score=0.5, text="B text"),
    ]


async def test_rerank_orders_by_cross_encoder_score_and_truncates():
    model = _FakeModel([0.1, 0.9])
    adapter = CrossEncoderAdapter(model=model)
    out = await adapter.rerank("q", _cands(), top_n=1)
    assert len(out) == 1
    assert out[0].id == "b"
    assert model.calls[0] == [("q", "A text"), ("q", "B text")]


async def test_rerank_empty_candidates():
    adapter = CrossEncoderAdapter(model=_FakeModel([]))
    assert await adapter.rerank("q", [], top_n=3) == []


def test_load_eagerly_loads_model_exactly_once():
    from config import settings

    built = []

    def factory(name):
        built.append(name)
        return _FakeModel([])

    adapter = CrossEncoderAdapter(model_factory=factory)
    adapter.load()
    adapter.load()  # idempotent — already loaded
    assert built == [settings.reranker_model]  # constructed once, at load() time
