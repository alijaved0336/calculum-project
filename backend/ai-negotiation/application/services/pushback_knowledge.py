"""The client's supplier-pushback knowledge, served from the knowledge base.

Replaces the hand-copied ``PUSHBACK_KB`` dict, which carried 18 of the 55
categories in the client's uploaded pushback playbook and could never pick up
an edit to it. Two operations:

* :meth:`PushbackKnowledgeService.categories` — every category in the
  configured pushback document(s), parsed whole from their chunks and cached.
  The anticipate mode's objection scan reads this.
* :meth:`PushbackKnowledgeService.match` — the 0-2 categories that answer one
  objection: every category of the pushback document scored by the
  cross-encoder against both the extracted objection and the negotiator's own
  message (a vector search SCOPED to the document shortlists them once the
  catalogue outgrows the full-rerank cap).

Retrieval is scoped by filename on purpose. Unscoped, the search also reaches
the client's Concepts Definitions and B2B case studies, and that is exactly how
"harmonise in 15-day steps" and case-study BATNAs once came back as live
pushback advice. And the model is handed parsed counters — name, coaching note,
script — never raw passages, so nothing procedural can ride along.

Never raises into the node: any failure is logged as ``[RAG_FAILURE]`` and
answered with no categories, which leaves the reply grounded in the brief alone.
"""
from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Callable
from typing import Any

from domain.entities.pushback import PushbackCategory
from domain.entities.retrieval_result import RetrievalResult
from domain.ports.reranker_port import RerankerPort
from domain.ports.vector_store_port import VectorStorePort
from domain.services.pushback_playbook_parser import (
    parse_pushback_categories,
    stitch_chunks,
)
from infrastructure.observability.langfuse_tracing import observe as _observe

logger = logging.getLogger(__name__)

# After a failed load, retry this soon rather than on every turn or only after
# the full TTL.
_RETRY_AFTER_FAILURE_SECONDS = 60
_MATCH_TIMEOUT_SECONDS = 30.0


class PushbackKnowledgeService:
    def __init__(
        self,
        vector_store: VectorStorePort,
        reranker: RerankerPort,
        *,
        filenames: list[str],
        top_k_retrieve: int,
        max_categories: int,
        rerank_score_threshold: float,
        unstated_objection_threshold: float,
        runner_up_margin: float,
        full_rerank_max_categories: int,
        cache_ttl_seconds: int,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._vector_store = vector_store
        self._reranker = reranker
        self._filenames = list(filenames)
        self._top_k_retrieve = top_k_retrieve
        self._max_categories = max_categories
        self._rerank_score_threshold = rerank_score_threshold
        self._unstated_objection_threshold = unstated_objection_threshold
        self._runner_up_margin = runner_up_margin
        self._full_rerank_max_categories = full_rerank_max_categories
        self._cache_ttl_seconds = cache_ttl_seconds
        self._clock = clock
        self._lock = asyncio.Lock()
        self._categories: dict[str, PushbackCategory] = {}
        # chunk id → the keys of every category that chunk's text spans.
        self._chunk_index: dict[str, list[str]] = {}
        self._expires_at: float | None = None

    # ── the catalogue ──────────────────────────────────────────────────────

    async def categories(self) -> dict[str, PushbackCategory]:
        """Every parsed category, keyed by slug. Last good copy on failure."""
        if self._fresh():
            return self._categories
        async with self._lock:
            if self._fresh():
                return self._categories
            try:
                categories, chunk_index = await self._load()
            except Exception:
                logger.exception(
                    "[RAG_FAILURE] pushback_kb: could not load pushback categories "
                    "from %s — serving %d cached categor(ies)",
                    self._filenames,
                    len(self._categories),
                )
                self._expires_at = self._clock() + _RETRY_AFTER_FAILURE_SECONDS
                return self._categories
            if not categories:
                logger.error(
                    "[RAG_FAILURE] pushback_kb: no pushback categories parsed from %s — "
                    "check PUSHBACK_KB_FILENAMES matches the uploaded document and "
                    "that it keeps the 'N.S Supplier Pushback Argument' layout",
                    self._filenames,
                )
                self._expires_at = self._clock() + _RETRY_AFTER_FAILURE_SECONDS
                return self._categories
            self._categories, self._chunk_index = categories, chunk_index
            self._expires_at = self._clock() + self._cache_ttl_seconds
            logger.info(
                "pushback_kb: %d categories loaded from %s", len(categories), self._filenames
            )
            return self._categories

    def _fresh(self) -> bool:
        return self._expires_at is not None and self._clock() < self._expires_at

    async def _load(self) -> tuple[dict[str, PushbackCategory], dict[str, list[str]]]:
        chunks = await self._vector_store.fetch_by_filenames(self._filenames)
        by_file: dict[str, list[RetrievalResult]] = {}
        for chunk in chunks:
            by_file.setdefault(chunk.file_id, []).append(chunk)

        categories: dict[str, PushbackCategory] = {}
        chunk_index: dict[str, list[str]] = {}
        for file_id, file_chunks in by_file.items():
            text, spans = stitch_chunks(file_chunks)
            filename = file_chunks[0].metadata.get("filename")
            for category in parse_pushback_categories(
                text, spans, file_id=file_id, filename=filename
            ):
                # The same document ingested twice (the KB has duplicate
                # uploads under different file ids) yields the same keys: keep
                # the first copy, but let the duplicate's chunks find it.
                categories.setdefault(category.key, category)
                for chunk_id in category.chunk_ids:
                    keys = chunk_index.setdefault(chunk_id, [])
                    if category.key not in keys:
                        keys.append(category.key)
        return categories, chunk_index

    # ── matching one objection ─────────────────────────────────────────────

    async def match(
        self, objection: str | None, *, message: str | None = None
    ) -> list[PushbackCategory]:
        """The categories that answer this objection, best first (0-max).

        Searched aggressively: with BOTH the extracted ``objection`` and the
        negotiator's own ``message``, each category keeping its better score.
        The extraction is one LLM call's reading of the message, and on the live
        KB it returned nothing for 3 of 14 real concerns phrased as hypotheticals
        ("what if their credit insurer cuts our limit?") — searched only with
        the extraction, those turns got no playbook counters at all.

        Two gates. With an extracted objection, the normal threshold. Without
        one, the message alone must match CONFIDENTLY
        (``unstated_objection_threshold``): a bare refusal ("they said no")
        scored as high as -0.5 against some category, while real concerns the
        extractor missed scored +1.0 and above.
        """
        queries = list(dict.fromkeys(
            q.strip() for q in (objection, message) if q and q.strip()
        ))
        if not queries:
            return []
        try:
            return await asyncio.wait_for(
                self._match(queries, stated=bool(objection and objection.strip())),
                _MATCH_TIMEOUT_SECONDS,
            )
        except Exception:
            logger.exception(
                "[RAG_FAILURE] pushback_kb: matching failed, answering without "
                "counter-arguments (queries=%r)",
                [q[:80] for q in queries],
            )
            return []

    @_observe(name="pushback_kb_match")
    async def _match(self, queries: list[str], *, stated: bool) -> list[PushbackCategory]:
        categories = await self.categories()
        if not categories:
            return []

        # Every category goes to the cross-encoder while the playbook is small
        # enough: full recall, and faster than a vector search (no embedding
        # call — 55 categories score in ~0.5s). Past the cap, the vector search
        # shortlists.
        full = len(categories) <= self._full_rerank_max_categories
        keys = list(categories) if full else await self._dense_candidates(queries)
        best = await self._best_scores(queries, keys, categories)

        if best and all(score is None for score in best.values()):
            # Nothing judged relevance (ScorePassthroughReranker): fail open, as
            # RAGService does — but on the vector search's order, never on an
            # arbitrary walk of the whole catalogue.
            ranked = [(key, None) for key in await self._dense_candidates(queries)]
        else:
            ranked = sorted(best.items(), key=lambda kv: -1e9 if kv[1] is None else kv[1], reverse=True)

        threshold = (
            self._rerank_score_threshold if stated else self._unstated_objection_threshold
        )
        passed = self._gate(ranked, threshold)
        logger.info(
            "pushback_kb: queries=%r stated=%s top=%s matched=%s",
            [q[:80] for q in queries],
            stated,
            [(k, None if v is None else round(v, 2)) for k, v in ranked[:5]],
            passed,
        )
        return [categories[key] for key in passed if key in categories]

    async def _dense_candidates(self, queries: list[str]) -> list[str]:
        """Category keys behind a scoped vector search for each query, in hit order."""
        keys: list[str] = []
        for query in queries:
            hits = await self._vector_store.retrieve(
                query,
                top_k=self._top_k_retrieve,
                score_threshold=None,
                filenames=self._filenames,
            )
            for hit in hits:
                for key in self._chunk_index.get(hit.id, []):
                    if key not in keys:
                        keys.append(key)
        return keys

    async def _best_scores(
        self,
        queries: list[str],
        keys: list[str],
        categories: dict[str, PushbackCategory],
    ) -> dict[str, float | None]:
        """Each category's best cross-encoder score across the queries."""
        best: dict[str, float | None] = {}
        if not keys:
            return best
        candidates = [_as_candidate(categories[key], 0.0) for key in keys if key in categories]
        for query in queries:
            for result in await self._reranker.rerank(query, candidates, top_n=len(candidates)):
                score, seen = result.rerank_score, best.get(result.id)
                if result.id not in best or (
                    score is not None and (seen is None or score > seen)
                ):
                    best[result.id] = score
        return best

    def _gate(self, ranked: list[tuple[str, float | None]], threshold: float) -> list[str]:
        """Above the threshold, and — past the first — close to the best score.

        A None score means nothing judged it (ScorePassthroughReranker): fail
        open, as RAGService does.
        """
        passed = [(key, score) for key, score in ranked if score is None or score >= threshold]
        if passed and passed[0][1] is not None:
            top = passed[0][1]
            passed = [
                (key, score) for key, score in passed
                if score is None or top - score <= self._runner_up_margin
            ]
        return [key for key, _ in passed[: self._max_categories]]


def _as_candidate(category: PushbackCategory, dense_score: float) -> RetrievalResult:
    return RetrievalResult(
        id=category.key,
        score=dense_score,
        text=category.match_text(),
        file_id=category.file_id,
        chunk_type="pushback_category",
        page_numbers=list(category.page_numbers),
        prev_id=None,
        next_id=None,
        metadata={"filename": category.filename},
    )


def as_rag_source(category: PushbackCategory) -> dict[str, Any]:
    """A matched category in the shape the source panel reads (``rag_sources``)."""
    return {
        "file_id": category.file_id,
        "filename": category.filename,
        "page_numbers": list(category.page_numbers),
        "text": category.text,
        "id": category.key,
        "chunk_type": "pushback_category",
    }
