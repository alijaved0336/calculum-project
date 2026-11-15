from __future__ import annotations
import logging
from asyncio import AbstractEventLoop, run_coroutine_threadsafe
from functools import partial

from domain.ports.embeddings import EmbeddingPort
from domain.ports.vector_store import VectorStorePort
from application.ingest.concurrency import join_workers, spawn_workers
from application.ingest.utils import SENTINEL, PipelineState, timed, collect_token_batch

logger = logging.getLogger(__name__)


def _upsert(
    state: PipelineState, main_loop: AbstractEventLoop, vector_store: VectorStorePort, embedded: list,
) -> None:
    written, _ = run_coroutine_threadsafe(vector_store.upsert(embedded), main_loop).result()
    state.write_chunks(written)


def _flush_shared(
    state: PipelineState, main_loop: AbstractEventLoop, vector_store: VectorStorePort,
    upsert_batch_size: int,
) -> None:
    while True:
        batch = state.take_pending(upsert_batch_size)
        if not batch:
            return
        _upsert(state, main_loop, vector_store, batch)


def _embed_chunk_worker(
    state: PipelineState, main_loop: AbstractEventLoop, *,
    embedder: EmbeddingPort, vector_store: VectorStorePort,
    batching: bool, batch_max_tokens: int, upsert_batch_size: int,
) -> None:
    """Drain chunk_queue until the SENTINEL, re-broadcasting it so peers stop too.
    Order is irrelevant here — unlike the chunk stage, nothing downstream re-links."""
    while True:
        with timed(state, "embed_seconds"):
            try:
                if not batching:
                    chunk = state.chunk_queue.get()
                    if chunk is SENTINEL:
                        state.chunk_queue.put(SENTINEL)  # re-broadcast for the other workers
                        return
                    embedded = [embedder.embed_one_sync(chunk)]
                    _upsert(state, main_loop, vector_store, embedded)
                else:
                    with state._batch_lock:
                        if state._overflow:
                            first_chunk = state._overflow.popleft()
                        else:
                            first_chunk = state.chunk_queue.get()
                            if first_chunk is SENTINEL:
                                state.chunk_queue.put(SENTINEL)
                                return
                        batch, overflow = collect_token_batch(
                            state.chunk_queue, first_chunk, embedder.count_tokens,
                            max(1, batch_max_tokens),
                        )
                        if overflow is not None:
                            state._overflow.append(overflow)
                    embedded = embedder.embed_batch_sync(batch)
                    state.extend_pending(embedded)
                    _flush_shared(state, main_loop, vector_store, upsert_batch_size)
            except Exception as exc:
                state.errors.append(exc)


def run_embed_stage(
    state: PipelineState, main_loop: AbstractEventLoop, *,
    embedder: EmbeddingPort, vector_store: VectorStorePort,
    batching: bool, batch_max_tokens: int, upsert_batch_size: int, concurrency: int,
) -> None:
    """Stage 3: chunk_queue → N concurrent embedders → vector-store upserts.
    No producer and no collector — embed results need no reordering (see chunk_stage)."""
    worker_count = max(1, concurrency)  # 0 would spawn nothing and strand every chunk
    worker = partial(
        _embed_chunk_worker, embedder=embedder, vector_store=vector_store, batching=batching,
        batch_max_tokens=batch_max_tokens, upsert_batch_size=upsert_batch_size,
    )
    workers = spawn_workers(worker, worker_count, "ingest-embed", state, main_loop)
    join_workers(workers)
    logger.info("embed_stage.done workers=%d chunks_written=%d", worker_count, state.chunks_written)
