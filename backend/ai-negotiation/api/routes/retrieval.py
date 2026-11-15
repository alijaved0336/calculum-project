from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from config import settings
from dependencies import get_current_user_any, get_reranker, get_vector_store
from domain.ports.reranker_port import RerankerPort
from domain.ports.vector_store_port import VectorStorePort

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/retrieval",
    tags=["retrieval"],
    dependencies=[Depends(get_current_user_any)],
)


class RetrievalRequest(BaseModel):
    query: str
    # None → use the configured production values rather than a literal that
    # drifts away from config.py the moment either is tuned.
    top_k: int | None = None
    score_threshold: float | None = None


class RetrievalHit(BaseModel):
    id: str
    score: float
    text: str
    chunk_type: str
    page_numbers: list[int]
    file_id: str


class RetrievalResponse(BaseModel):
    query: str
    hits: list[RetrievalHit]


@router.post("/test", response_model=RetrievalResponse)
async def test_retrieval(
    body: RetrievalRequest,
    store: VectorStorePort = Depends(get_vector_store),
):
    results = await store.retrieve(
        query=body.query,
        top_k=body.top_k if body.top_k is not None else settings.rag_top_k_retrieve,
        score_threshold=(
            body.score_threshold
            if body.score_threshold is not None
            else settings.rag_dense_score_floor
        ),
    )
    return RetrievalResponse(
        query=body.query,
        hits=[
            RetrievalHit(
                id=r.id,
                score=r.score,
                text=r.text,
                chunk_type=r.chunk_type,
                page_numbers=r.page_numbers,
                file_id=r.file_id,
            )
            for r in results
        ],
    )


# ============================================================================
# TODO(temp): TEMPORARY RAG PROBE ENDPOINT — REMOVE WHEN DONE TESTING.
# ----------------------------------------------------------------------------
# `/retrieval/test` above only runs raw DENSE RETRIEVAL. This one runs the FULL
# pipeline the agent actually uses (retrieve -> expand -> dedupe -> rerank ->
# format) and returns the exact `context_text` that gets injected into node
# prompts, plus a per-stage breakdown so you can see WHERE results disappear.
# It deliberately calls RAGService's private stage methods to count each stage;
# that couples it to those internals, which is acceptable only because this is a
# throwaway debug endpoint. Search "TODO(temp)" to delete.
# ============================================================================


class RagProbeRequest(BaseModel):
    query: str
    # All optional — omit to use the configured production values.
    top_k_retrieve: int | None = None
    top_n_rerank: int | None = None
    rerank_max_candidates: int | None = None
    rerank_score_threshold: float | None = None
    dense_score_floor: float | None = None
    context_max_chars: int | None = None


class RagStageCounts(BaseModel):
    """Survivor count at each stage, straight from RAGContext.stages."""

    dense_retrieved: int = 0
    after_dedupe: int = 0
    rerank_candidates: int = 0
    passed_gate: int = 0
    after_expand: int = 0
    final: int = 0


class RagCollectionInfo(BaseModel):
    name: str
    exists: bool
    points_count: int | None = None


class RagChunk(BaseModel):
    rank: int
    id: str
    score: float
    # Cross-encoder logit — the signal the gate actually uses. None for a chunk
    # that was never reranked (a neighbour spliced in after the gate).
    rerank_score: float | None = None
    chunk_type: str
    page_numbers: list[int]
    file_id: str
    text: str


class RagProbeResponse(BaseModel):
    query: str
    diagnosis: str
    collection: RagCollectionInfo
    params: dict
    stages: RagStageCounts
    chunk_count: int
    # ok | empty | failed | timeout — why context_text is empty, when it is.
    status: str
    source_ids: list[str]
    chunks: list[RagChunk]
    # Verbatim block injected into node prompts ("" when nothing was retrieved).
    context_text: str


async def _points_count(store: VectorStorePort) -> int | None:
    """Best-effort point count. Reaches into the Qdrant adapter's client, so it
    is deliberately defensive — returns None rather than failing the probe."""
    client = getattr(store, "_client", None)
    if client is None:
        return None
    try:
        info = await client.get_collection(settings.collection_knowledge_base)
        return getattr(info, "points_count", None)
    except Exception:
        return None


@router.post("/rag", response_model=RagProbeResponse)
async def probe_rag(
    body: RagProbeRequest,
    store: VectorStorePort = Depends(get_vector_store),
    reranker: RerankerPort = Depends(get_reranker),
):
    """Run the full RAG pipeline for a query and return everything it produced.

    This calls ``RAGService.query`` — the same entry point the agent uses — and
    reads the per-stage counts off the returned context. It used to re-implement
    the pipeline by calling the private stage methods in a hardcoded order, which
    meant reordering the real pipeline silently desynced the diagnostic from
    production.
    """
    from application.services.rag_service import RAGService

    def _pick(override, configured):
        return override if override is not None else configured

    top_k = _pick(body.top_k_retrieve, settings.rag_top_k_retrieve)
    top_n = _pick(body.top_n_rerank, settings.rag_top_n_rerank)
    max_candidates = _pick(body.rerank_max_candidates, settings.rag_rerank_max_candidates)
    gate = _pick(body.rerank_score_threshold, settings.rag_rerank_score_threshold)
    dense_floor = _pick(body.dense_score_floor, settings.rag_dense_score_floor)
    max_chars = _pick(body.context_max_chars, settings.rag_context_max_chars)
    params = {
        "top_k_retrieve": top_k,
        "top_n_rerank": top_n,
        "rerank_max_candidates": max_candidates,
        "rerank_score_threshold": gate,
        "dense_score_floor": dense_floor,
        "context_max_chars": max_chars,
    }

    exists = await store.health_check()
    collection = RagCollectionInfo(
        name=settings.collection_knowledge_base,
        exists=exists,
        points_count=await _points_count(store) if exists else None,
    )

    def _empty(diagnosis: str, status: str = "failed") -> RagProbeResponse:
        return RagProbeResponse(
            query=body.query, diagnosis=diagnosis, collection=collection, params=params,
            stages=RagStageCounts(), chunk_count=0, status=status, source_ids=[],
            chunks=[], context_text="",
        )

    if not exists:
        return _empty(
            f"Collection '{collection.name}' does not exist in Qdrant — nothing can "
            f"be retrieved. Ingest the knowledge base into that collection first, and "
            f"check it matches COLLECTION_KNOWLEDGE_BASE in the ingestion service."
        )
    if collection.points_count == 0:
        return _empty(
            f"Collection '{collection.name}' exists but contains 0 points — the "
            f"knowledge base has not been ingested yet. Note kb_documents rows can "
            f"read 'Upserted' while the vectors never landed; trust this count."
        )

    service = RAGService(
        vector_store=store,
        reranker=reranker,
        top_k_retrieve=top_k,
        top_n_rerank=top_n,
        rerank_max_candidates=max_candidates,
        rerank_score_threshold=gate,
        dense_score_floor=dense_floor,
        context_max_chars=max_chars,
    )
    try:
        ctx = await service.query(body.query)
    except Exception as exc:  # surface the failure instead of a 500 stack trace
        logger.exception("rag probe failed")
        return _empty(f"RAG pipeline raised an error: {type(exc).__name__}: {exc}")

    counts = dict(ctx.stages)
    stages = RagStageCounts(**{k: v for k, v in counts.items() if k in RagStageCounts.model_fields})

    if ctx.status == "timeout":
        diagnosis = "The pipeline exceeded its 60s deadline — no context was produced."
    elif not counts.get("dense_retrieved"):
        diagnosis = (
            f"Dense retrieval returned 0 chunks (dense_score_floor={dense_floor}). "
            f"Nothing in the KB is close to this query."
        )
    elif not counts.get("passed_gate"):
        diagnosis = (
            f"Retrieved {counts.get('dense_retrieved')} chunk(s), deduped to "
            f"{counts.get('after_dedupe')}, reranked {counts.get('rerank_candidates')} "
            f"— but ALL of them scored below the cross-encoder gate "
            f"({gate}). Nothing in the KB actually answers this query. Inspect the "
            f"per-candidate 'rerank[i] ce_score=' log lines to confirm, and lower the "
            f"gate only if genuinely relevant passages are being cut."
        )
    else:
        diagnosis = (
            f"OK — {ctx.chunk_count} chunk(s) returned. `context_text` is exactly what "
            f"gets injected into the agent's prompt."
        )

    return RagProbeResponse(
        query=body.query, diagnosis=diagnosis, collection=collection, params=params,
        stages=stages, chunk_count=ctx.chunk_count, status=ctx.status,
        source_ids=ctx.source_ids,
        chunks=[
            RagChunk(
                rank=i,
                id=info.get("id") or "",
                score=info.get("score") or 0.0,
                rerank_score=info.get("rerank_score"),
                chunk_type=info.get("chunk_type") or "",
                page_numbers=info.get("page_numbers") or [],
                file_id=info.get("file_id") or "",
                text=info.get("text") or "",
            )
            for i, info in enumerate(ctx.chunk_file_info, 1)
        ],
        context_text=ctx.context_text,
    )
