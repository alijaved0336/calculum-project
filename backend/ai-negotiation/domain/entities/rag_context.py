from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RAGContext:
    """Formatted, injection-ready context block for an LLM prompt.

    `context_text` is the complete Markdown block nodes append verbatim to
    their prompt.  `chunk_count == 0` means no relevant chunks were found;
    nodes should skip injection in that case.
    """

    context_text: str
    source_ids: list[str]
    chunk_count: int
    query: str
    # Per-chunk file metadata for the reranked hits, carrying each passage's
    # full text so the source panel can surface it in full.
    # Each entry: {"file_id": str, "page_numbers": list[int], "text": str}
    chunk_file_info: tuple[dict, ...] = ()
    # WHY the context is empty, when it is. `chunk_count == 0` on its own cannot
    # distinguish "searched, nothing matched" from "the search never ran" — and
    # that difference decides what the prompt should tell the model. A missing
    # collection used to be indistinguishable from an honest miss.
    #   ok      — chunks retrieved
    #   empty   — searched successfully, nothing passed the gate
    #   failed  — retrieval raised (bad collection, dead embedder, payload drift)
    #   timeout — the pipeline exceeded its deadline
    status: str = "ok"
    # Per-stage survivor counts, for the /retrieval/rag probe and the logs:
    # dense_retrieved, after_dedupe, rerank_candidates, passed_gate, after_expand, final.
    # Tuple of pairs rather than a dict because this dataclass is frozen/hashable.
    stages: tuple[tuple[str, int], ...] = ()
