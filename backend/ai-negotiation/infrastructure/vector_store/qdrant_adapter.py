from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.exceptions import ResponseHandlingException
from qdrant_client.models import FieldCondition, Filter, MatchAny, SearchParams

from config import settings
from domain.entities.retrieval_result import RetrievalResult
from domain.ports.embedding_port import EmbeddingPort
from domain.ports.vector_store_port import VectorStorePort

logger = logging.getLogger(__name__)

_SCROLL_PAGE_SIZE = 256

T = TypeVar("T")

# A pooled keep-alive connection the Qdrant server (or something in front of
# it) has already closed fails the next request with "Server disconnected
# without sending a response" — the first query after an idle spell. Found in
# the logs as every [RAG_FAILURE] of 2026-09-14..18: the answer went out with no
# KB context, and the same question asked again (on a fresh connection) got its
# chunks. Every call here is a read, so trying again is safe. Timeouts are NOT
# retried: a server that is slow rather than gone would just multiply the wait.
_TRANSIENT_ERRORS = (
    httpx.RemoteProtocolError,
    httpx.ConnectError,
    httpx.ReadError,
    httpx.WriteError,
    httpx.CloseError,
)
_ATTEMPTS = 3
_BACKOFF_SECONDS = 0.2


def _is_transient(exc: Exception) -> bool:
    # qdrant-client wraps every transport error in ResponseHandlingException.
    source = exc.source if isinstance(exc, ResponseHandlingException) else exc
    return isinstance(source, _TRANSIENT_ERRORS)


async def _with_retry(operation: str, call: Callable[[], Awaitable[T]]) -> T:
    for attempt in range(1, _ATTEMPTS + 1):
        try:
            return await call()
        except Exception as exc:
            if attempt == _ATTEMPTS or not _is_transient(exc):
                raise
            logger.warning(
                "qdrant_adapter: %s lost its connection (%s) — retrying (%d/%d)",
                operation,
                exc,
                attempt,
                _ATTEMPTS - 1,
            )
            await asyncio.sleep(_BACKOFF_SECONDS * attempt)
    raise AssertionError("unreachable")


def _filename_condition(filenames: list[str]) -> FieldCondition:
    return FieldCondition(key="metadata.filename", match=MatchAny(any=list(filenames)))


def _to_result(point, score: float) -> RetrievalResult:
    """Build a :class:`RetrievalResult` from a Qdrant point, tolerating payload drift.

    The knowledge base is written by a SEPARATE ingestion pipeline, so the payload
    shape varies between collections/versions. Observed in the live KB: the document
    id is ``file_uuid`` at the TOP level on 100% of points, while ``metadata.file_id``
    (what this adapter used to require) exists on almost none, and ``filename`` is
    missing on some. Indexing those keys directly raised ``KeyError`` for the whole
    batch — and because the rag_query node swallows exceptions, every query silently
    degraded to ZERO context instead of surfacing an error. So: resolve the id from
    whichever key is present, and never hard-fail on an optional field.
    """
    payload = point.payload or {}
    meta = payload.get("metadata") or {}
    file_id = (
        payload.get("file_uuid")
        or meta.get("file_id")
        or meta.get("filename")
        or ""
    )
    return RetrievalResult(
        id=str(point.id),
        score=score,
        text=payload.get("text") or "",
        file_id=str(file_id),
        chunk_type=meta.get("chunk_type") or "unknown",
        page_numbers=meta.get("page_numbers") or [],
        prev_id=meta.get("prev_id"),
        next_id=meta.get("next_id"),
        metadata=meta,
    )


class QdrantAdapter(VectorStorePort):
    def __init__(
        self,
        embedder: EmbeddingPort,
    ) -> None:
        self._embedder = embedder
        if settings.qdrant_host.startswith(("http://", "https://")):
            self._client = AsyncQdrantClient(
                url=settings.qdrant_host,
                api_key=settings.qdrant_api_key or None,
                timeout=30.0,
            )
        else:
            self._client = AsyncQdrantClient(
                host=settings.qdrant_host,
                port=settings.qdrant_port,
                api_key=settings.qdrant_api_key or None,
                https=settings.qdrant_use_tls,
                timeout=30.0,
            )

    async def retrieve(
        self,
        query: str,
        *,
        top_k: int,
        score_threshold: float | None,
        playbook_strategy_types: list[str] | None = None,
        filenames: list[str] | None = None,
    ) -> list[RetrievalResult]:
        query_vector = await self._embedder.embed_query(query)

        must: list = []
        if filenames:
            must.append(_filename_condition(filenames))

        # if playbook_strategy_types:
        #     must.append(FieldCondition(
        #         key="metadata.playbook_strategy_type",
        #         match=MatchAny(any=playbook_strategy_types),
        #     ))

        query_filter = Filter(must=must) if must else None

        response = await _with_retry("query_points", lambda: self._client.query_points(
            collection_name=settings.collection_knowledge_base,
            query=query_vector,
            limit=top_k,
            query_filter=query_filter,
            with_payload=True,
            score_threshold=score_threshold,
        ))

        if not response.points and score_threshold is not None:
            # Only worth retrying when a THRESHOLD is what could have emptied the
            # result. With score_threshold=None Qdrant returns the top_k nearest
            # unconditionally, so an empty response means the collection itself is
            # empty and a brute-force rescan would find the same nothing.
            #
            # The default HNSW search is approximate: it walks a bounded
            # neighbourhood of the graph and can miss a true match near
            # score_threshold, especially with the KB's duplicate content
            # (see rag_service._deduplicate) skewing which copies the walk
            # visits. Retry once with an exact brute-force scan before
            # concluding there is truly nothing above threshold — the full
            # scan cost is only paid on this rare empty-result path, not on
            # every query.
            logger.info(
                "qdrant_adapter: approximate search returned 0 points, "
                "retrying with exact search (query=%r)",
                query[:80],
            )
            response = await _with_retry("query_points(exact)", lambda: self._client.query_points(
                collection_name=settings.collection_knowledge_base,
                query=query_vector,
                limit=top_k,
                query_filter=query_filter,
                with_payload=True,
                score_threshold=score_threshold,
                search_params=SearchParams(exact=True),
            ))
            if response.points:
                logger.info(
                    "qdrant_adapter: exact search recovered %d point(s) "
                    "approximate search missed",
                    len(response.points),
                )

        return [_to_result(hit, hit.score) for hit in response.points]

    async def fetch_by_ids(self, ids: list[str]) -> list[RetrievalResult]:
        if not ids:
            return []
        points = await _with_retry("retrieve", lambda: self._client.retrieve(
            collection_name=settings.collection_knowledge_base,
            ids=ids,
            with_payload=True,
            with_vectors=False,
        ))

        return [_to_result(point, 0.0) for point in points]

    async def fetch_by_filenames(self, filenames: list[str]) -> list[RetrievalResult]:
        if not filenames:
            return []
        query_filter = Filter(must=[_filename_condition(filenames)])
        results: list[RetrievalResult] = []
        offset = None
        while True:
            points, offset = await _with_retry("scroll", lambda: self._client.scroll(
                collection_name=settings.collection_knowledge_base,
                scroll_filter=query_filter,
                limit=_SCROLL_PAGE_SIZE,
                offset=offset,
                with_payload=True,
                with_vectors=False,
            ))
            results += [_to_result(point, 0.0) for point in points]
            if offset is None:
                return results

    async def health_check(self) -> bool:
        try:
            await self._client.get_collection(settings.collection_knowledge_base)
            return True
        except Exception:
            return False
