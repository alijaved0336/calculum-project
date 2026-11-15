from application.agent.support_agent import SupportAgent
from domain.entities.escalation import EscalationOutcome
from domain.entities.rag_context import RAGContext
from domain.entities.retrieval_result import RetrievalResult
from domain.entities.user import User


class _FakeRag:
    def __init__(self, ctx):
        self._ctx = ctx

    async def query(self, q):
        return self._ctx


class _FakeLLM:
    async def complete(self, prompt, system=None, max_tokens=1024):
        return "Answer [00:01–00:03]"


class _FakeEscalation:
    def __init__(self, sent=True):
        self.calls = []
        self._sent = sent

    async def maybe_escalate(self, user, thread_id, transcript, resolved, is_transient_error):
        self.calls.append({"user": user, "thread_id": thread_id, "resolved": resolved})
        return EscalationOutcome(self._sent, None if self._sent else "blocked")


_EMPTY = RAGContext(context_text="", source_ids=[], chunk_count=0, query="q", video_results=[], top_score=0.0)


def _video_ctx():
    r = RetrievalResult(id="c1", score=0.9, text="auth", video_id="v1",
                        start_ms=1000, end_ms=3000, gcs_object="videos/v1.mp4", title="T")
    return RAGContext(context_text="ctx", source_ids=["c1"], chunk_count=1, query="q",
                      video_results=[r], top_score=0.9)


def _agent(ctx, esc):
    return SupportAgent(rag_service=_FakeRag(ctx), llm_client=_FakeLLM(), signer=lambda o: f"s/{o}",
                        answerable_threshold=0.5, escalation_service=esc)


async def test_unresolved_triggers_escalation():
    esc = _FakeEscalation(sent=True)
    res = await _agent(_EMPTY, esc).answer("huh?", user=User(id="u1"), thread_id="t1")
    assert res.resolved is False
    assert res.escalated is True
    assert esc.calls[0]["resolved"] is False
    assert esc.calls[0]["thread_id"] == "t1"


async def test_resolved_does_not_escalate():
    esc = _FakeEscalation()
    res = await _agent(_video_ctx(), esc).answer("q", user=User(id="u1"))
    assert res.resolved is True
    assert res.escalated is False
    assert esc.calls == []
