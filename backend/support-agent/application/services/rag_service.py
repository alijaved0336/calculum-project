from __future__ import annotations

import logging
import math

from domain.entities.rag_context import RAGContext
from domain.entities.retrieval_result import RetrievalResult
from domain.ports.reranker_port import RerankerPort
from domain.ports.vector_store_port import VectorStorePort

logger = logging.getLogger(__name__)


def _cosine(a: list[float] | None, b: list[float] | None) -> float:
    """Cosine similarity of two vectors; 0.0 if either is missing or degenerate."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


def _file_key(c: RetrievalResult) -> str:
    """Identity of the source media item a chunk belongs to."""
    return c.video_id or c.metadata.get("file_id") or c.id


def _is_newer(candidate: RetrievalResult, other: RetrievalResult) -> bool:
    """True if ``candidate`` was indexed more recently than ``other`` (None = oldest)."""
    if candidate.indexed_at is None:
        return False
    return other.indexed_at is None or candidate.indexed_at > other.indexed_at


def ms_to_mmss(ms: int | None) -> str:
    if ms is None:
        return "??:??"
    total_seconds = int(ms) // 1000
    return f"{total_seconds // 60:02d}:{total_seconds % 60:02d}"


class RAGService:
    """Single-collection RAG: retrieve → expand → dedupe → rerank → scope → format.

    Retrieval is over ``video-chunks-v1``, which holds BOTH video-transcript chunks
    (``chunk_source == "video"``) and standalone document chunks
    (``chunk_source == "document"``). The cross-encoder rerank orders the (retrieved +
    neighbour) candidates, then :meth:`_scope_to_videos` keeps every distinct video among
    the survivors; ``build_clip_records`` later groups them into one clip per video.
    """

    def __init__(
        self,
        vector_store: VectorStorePort,
        reranker: RerankerPort,
        top_k: int,
        top_n: int,
        score_threshold: float,
        near_dup_threshold: float = 0.90,
    ) -> None:
        self._vs = vector_store
        self._reranker = reranker
        self._top_k = top_k
        self._top_n = top_n
        self._score_threshold = score_threshold
        self._near_dup_threshold = near_dup_threshold

    async def query(self, query: str) -> RAGContext:
        retrieved = await self._vs.retrieve(query, self._top_k, self._score_threshold)
        if not retrieved:
            return RAGContext(context_text="", source_ids=[], chunk_count=0, query=query)

        expanded = await self._expand(retrieved)
        deduped = self._dedupe(expanded)
        reranked = await self._reranker.rerank(query, deduped, self._top_n)
        if not reranked:
            return RAGContext(context_text="", source_ids=[], chunk_count=0, query=query)

        # "Prefer latest" runs AFTER rerank, so relevance decides survival first: an older chunk
        # that out-ranks a newer near-duplicate is kept (a newer shallow mention can no longer
        # evict the substantive older passage before it is ever scored).
        fresh = self._collapse_stale(reranked)
        kept, video_results = self._scope_to_videos(fresh)
        document_results = [c for c in kept if c.source_type == "document"]
        return self._format(kept, video_results, document_results, query)

    async def _expand(self, retrieved: list[RetrievalResult]) -> list[RetrievalResult]:
        seen = {r.id for r in retrieved}
        neighbour_ids: list[str] = []
        for r in retrieved:
            for nid in (r.prev_id, r.next_id):
                if nid and nid not in seen:
                    neighbour_ids.append(nid)
                    seen.add(nid)
        expanded = list(retrieved)
        if neighbour_ids:
            expanded.extend(await self._vs.fetch_by_ids(neighbour_ids))
        return expanded

    def _dedupe(self, chunks: list[RetrievalResult]) -> list[RetrievalResult]:
        seen: set[str] = set()
        out: list[RetrievalResult] = []
        for chunk in sorted(chunks, key=lambda r: r.score, reverse=True):
            if chunk.id not in seen:
                seen.add(chunk.id)
                out.append(chunk)
        return out

    def _collapse_stale(self, chunks: list[RetrievalResult]) -> list[RetrievalResult]:
        """"Prefer latest": drop chunks that are made stale by a newer one covering the same
        feature. Two chunks from DIFFERENT source files whose vectors are near-duplicates
        (cosine ≥ ``near_dup_threshold``) describe the same feature; the one from the
        OLDER-indexed file is stale and removed — so an updated clip supersedes the matching
        segment(s) of an older long video (one clip can retire several old chunks).

        Same-file chunks (a video's own adjacent segments) are never collapsed; chunks
        without a vector, or a pair with equal/unknown recency, are left untouched (fail-open
        — nothing is dropped unless there is a concretely newer duplicate).

        Relevance-aware: the newer duplicate only supersedes the older one when it is AT LEAST as
        relevant (cross-encoder ``rerank_score``, falling back to retrieval ``score``). So a newer
        but less-relevant "passing mention" no longer evicts the older substantive passage."""
        stale: set[str] = set()
        for i, a in enumerate(chunks):
            for b in chunks[i + 1 :]:
                if _file_key(a) == _file_key(b):
                    continue
                if _cosine(a.vector, b.vector) < self._near_dup_threshold:
                    continue
                if _is_newer(a, b) and self._at_least_as_relevant(a, b):
                    stale.add(b.id)
                elif _is_newer(b, a) and self._at_least_as_relevant(b, a):
                    stale.add(a.id)
        if stale:
            logger.info("rag.collapsed_stale dropped=%d", len(stale))
        return [c for c in chunks if c.id not in stale]

    @staticmethod
    def _at_least_as_relevant(newer: RetrievalResult, older: RetrievalResult) -> bool:
        """True if the ``newer`` chunk is at least as relevant as the ``older`` — so keeping the
        newer and dropping the older does not sacrifice relevance. Uses the cross-encoder
        ``rerank_score`` when available (both must have it), else the retrieval ``score``."""
        if newer.rerank_score is not None and older.rerank_score is not None:
            return newer.rerank_score >= older.rerank_score
        return newer.score >= older.score

    def _scope_to_videos(
        self, reranked: list[RetrievalResult]
    ) -> tuple[list[RetrievalResult], list[RetrievalResult]]:
        """Keep EVERY distinct video among the reranked survivors (plus all documents), so an
        answer can reference more than one video when the question spans several.

        Returns ``(kept, video_results)``:
        - ``kept`` grounds the answer — all surviving chunks (documents + all videos).
        - ``video_results`` are the usable video chunks (have a ``video_id`` + ``gcs_object``);
          :func:`clip_builder.build_clip_records` groups them by ``video_id`` into one merged
          clip per video, so a single clip still never spans two files.
        """
        video_results = [
            c for c in reranked if c.source_type == "video" and c.video_id and c.gcs_object
        ]
        return list(reranked), video_results

    def _format(
        self,
        chunks: list[RetrievalResult],
        video_results: list[RetrievalResult],
        document_results: list[RetrievalResult],
        query: str,
    ) -> RAGContext:
        lines = [
            "## SUPPORT KNOWLEDGE BASE CONTEXT — retrieved from the approved support "
            "knowledge base (videos + documents)",
            "",
        ]
        for i, c in enumerate(chunks, 1):
            title = c.title or c.video_id or "untitled"
            if c.source_type == "video":
                span = f"[{ms_to_mmss(c.start_ms)}–{ms_to_mmss(c.end_ms)}]"
                lines.append(f"### [{i}] video {title} — {span}")
            else:
                pages = c.metadata.get("page_numbers") or (
                    [c.metadata["page_number"]] if c.metadata.get("page_number") is not None else []
                )
                page_hint = f" — p. {', '.join(str(p) for p in pages)}" if pages else ""
                lines.append(f"### [{i}] document {title}{page_hint}")
            lines.append(c.text)
            lines.append("")
        return RAGContext(
            context_text="\n".join(lines).rstrip(),
            source_ids=[c.id for c in chunks],
            chunk_count=len(chunks),
            query=query,
            video_results=video_results,
            document_results=document_results,
            top_score=max((c.score for c in chunks), default=0.0),
        )
