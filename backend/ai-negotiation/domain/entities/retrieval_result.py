from dataclasses import dataclass


@dataclass
class RetrievalResult:
    id: str
    score: float
    text: str
    file_id: str
    chunk_type: str
    page_numbers: list[int]
    prev_id: str | None
    next_id: str | None
    metadata: dict
    # Cross-encoder relevance score, set by the reranker; None when the chunk was
    # never reranked (e.g. ScorePassthroughReranker in CI).
    #
    # RAW LOGIT, not a probability: `ms-marco-MiniLM-L-6-v2` declares an Identity
    # activation, so values run roughly -11..+11 and are freely comparable across
    # candidates for the SAME query. This is kept separate from `score` (the dense
    # cosine value) rather than overwriting it, because `_deduplicate` orders by
    # the dense score and the two are on completely different scales.
    rerank_score: float | None = None
