from __future__ import annotations
import logging
import threading
from asyncio import AbstractEventLoop
from functools import partial
from pathlib import Path
from typing import Callable

from domain.ports.document_loader import DocumentLoaderPort
from application.ingest.chunk_stage import run_chunk_stage
from application.ingest.concurrency import spawn
from application.ingest.embed_stage import run_embed_stage
from application.ingest.utils import SENTINEL, PipelineState, timed

logger = logging.getLogger(__name__)


class DocumentPipeline:
    """Builds and runs the parse/chunk/embed threads for one document."""

    def __init__(
        self,
        loader_factory: Callable[[Path], DocumentLoaderPort],
        chunker,
        embedder,
        vector_store,
        chunk_size: int = 512,
        concurrency: int = 8,
        embed_batching: bool = False,
        embed_batch_max_tokens: int = 2048,
        upsert_batch_size: int = 32,
    ) -> None:
        self._loader_factory = loader_factory
        self._chunker = chunker
        self._embedder = embedder
        self._vector_store = vector_store
        self._chunk_size = chunk_size                          # token budget for page buffering
        self._concurrency = max(1, concurrency)                # worker threads per stage (chunk & embed)
        self._embed_batching = embed_batching                  # False → one chunk per embed request
        self._embed_batch_max_tokens = embed_batch_max_tokens  # token budget per batched request
        self._upsert_batch_size = upsert_batch_size            # chunks per bulk upsert (batched mode)

    @property
    def concurrency(self) -> int:
        """Worker threads each of the chunk and embed stages runs."""
        return self._concurrency

    async def ensure_collection(self, embed_dims: int) -> None:
        await self._vector_store.ensure_collection(embed_dims)

    async def flush_tail(self, state: PipelineState) -> None:
        """Flush remaining embedded chunks after all embed workers finish."""
        tail = state.take_pending()
        if not tail:
            return
        try:
            written, _ = await self._vector_store.upsert(tail)
            state.write_chunks(written)
        except Exception as exc:
            state.errors.append(exc)

    def start(
        self, main_loop: AbstractEventLoop, file_path: str, file_id: str, extra_metadata: dict | None,
    ) -> tuple[PipelineState, threading.Thread, threading.Thread, threading.Thread]:
        """Start one thread per stage. Chunk and embed each own their worker pool internally,
        so joining a stage's thread means that whole stage is done."""
        state = PipelineState()

        chunk_stage = partial(
            run_chunk_stage, chunker=self._chunker, embedder=self._embedder, file_id=file_id,
            extra_metadata=extra_metadata, chunk_size=self._chunk_size,
            concurrency=self._concurrency,
        )
        embed_stage = partial(
            run_embed_stage, embedder=self._embedder, vector_store=self._vector_store,
            batching=self._embed_batching, batch_max_tokens=self._embed_batch_max_tokens,
            upsert_batch_size=self._upsert_batch_size, concurrency=self._concurrency,
        )
        parse_thread = spawn(self._parse, "ingest-parse", state, file_path)
        chunk_thread = spawn(chunk_stage, "ingest-chunk", state)  # the seq-ordering collector
        embed_thread = spawn(embed_stage, "ingest-embed", state, main_loop)
        return state, parse_thread, chunk_thread, embed_thread

    # ── Stages (each runs in its own thread) ────────────────────────────────────

    def _parse(self, state: PipelineState, file_path: str) -> None:
        """Stage 1: load the document and push each page onto page_queue."""
        try:
            with timed(state, "parse_seconds"):
                loader = self._loader_factory(Path(file_path))
                for page in loader.load(Path(file_path)):
                    state.page_queue.put(page)
                    state.pages_parsed += 1
        except Exception as exc:
            state.errors.append(exc)
        finally:
            state.page_queue.put(SENTINEL)  # no more pages for the chunk stage


