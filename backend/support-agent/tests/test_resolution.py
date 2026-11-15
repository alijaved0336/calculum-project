from application.agent.resolution import is_resolved
from domain.entities.rag_context import RAGContext


def _ctx(chunk_count, top_score):
    return RAGContext(
        context_text="ctx" if chunk_count else "",
        source_ids=[],
        chunk_count=chunk_count,
        query="q",
        top_score=top_score,
    )


def test_unresolved_when_no_chunks():
    assert is_resolved(_ctx(0, 0.9), threshold=0.5) is False


def test_resolved_when_chunks_and_score_above_threshold():
    assert is_resolved(_ctx(2, 0.8), threshold=0.5) is True


def test_unresolved_when_score_below_threshold():
    assert is_resolved(_ctx(2, 0.3), threshold=0.5) is False
