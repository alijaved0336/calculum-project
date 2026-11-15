from __future__ import annotations
import logging
import queue
from datetime import datetime, timezone

from domain.entities.ingestion import Chunk, Page
from domain.ports.chunking import ChunkerPort
from domain.ports.embeddings import EmbeddingPort
from application.ingest.concurrency import fan_out_sentinels, join_workers, spawn, spawn_workers
from application.ingest.utils import SENTINEL, PipelineState, timed
from application.ingest.utils import link_cross_page, stamp_chunk_metadata

logger = logging.getLogger(__name__)

PageGroup = tuple[int, list[Page]]    # (seq, pages) — seq restores order after concurrent chunking
ChunkedGroup = tuple[int, list[Chunk]]


def _produce_page_groups(
    state: PipelineState, group_queue: queue.Queue[PageGroup], embedder: EmbeddingPort,
    chunk_size: int, worker_count: int,
) -> None:
    """Buffer pages up to the token budget; push each seq-tagged group for the workers."""
    seq = 0
    try:
        buffer, buffer_tokens = [], 0
        while True:
            page = state.page_queue.get()  # blocked here waiting on parse — not timed
            if page is SENTINEL:
                break
            buffer.append(page)
            buffer_tokens += embedder.count_tokens(page.content)
            if buffer_tokens >= chunk_size:
                group_queue.put((seq, buffer))
                seq += 1
                buffer, buffer_tokens = [], 0
        if buffer:
            group_queue.put((seq, buffer))  # trailing pages under budget
            seq += 1
    except Exception as exc:
        state.errors.append(exc)
    finally:
        logger.info("chunk_stage.grouped groups=%d workers=%d", seq, worker_count)
        fan_out_sentinels(group_queue, worker_count)  # one sentinel per chunk worker


def _chunk_group_worker(
    state: PipelineState, group_queue: queue.Queue[PageGroup], done_queue: queue.Queue[ChunkedGroup],
    chunker: ChunkerPort, file_id: str,
) -> None:
    """Chunk page groups concurrently; their semantic breakpoint-embed calls overlap."""
    while True:
        group = group_queue.get()
        if group is SENTINEL:
            done_queue.put(SENTINEL)  # this worker is done
            return
        seq, pages = group
        try:
            with timed(state, "chunk_seconds"):  # times chunking only — not the queue put
                chunks = chunker.chunk_pages(pages, file_id)
        except Exception as exc:
            state.errors.append(exc)
            chunks = []  # keep the collector's seq run unbroken
        done_queue.put((seq, chunks))


def _reorder_and_emit(
    state: PipelineState, done_queue: queue.Queue[ChunkedGroup], worker_count: int,
    extra_metadata: dict | None,
) -> None:
    """Restore seq order, link chunks across group boundaries, feed the embed stage."""
    held_back = None  # previous group's last chunk, awaiting a cross-group link
    created_at = datetime.now(timezone.utc).isoformat()

    def emit_group(chunks: list[Chunk]) -> None:
        nonlocal held_back
        if not chunks:
            return
        stamp_chunk_metadata(chunks, created_at, extra_metadata)
        state.chunks_created += len(chunks)  # collector is single-threaded — no lock needed
        if held_back is not None:
            link_cross_page(held_back, chunks[0])
            state.chunk_queue.put(held_back)
        for chunk in chunks[:-1]:
            state.chunk_queue.put(chunk)
        held_back = chunks[-1]

    def drain_ready(out_of_order: dict[int, list[Chunk]], next_seq: int) -> int:
        while next_seq in out_of_order:
            emit_group(out_of_order.pop(next_seq))
            next_seq += 1
        return next_seq

    out_of_order: dict[int, list[Chunk]] = {}
    next_seq, workers_done = 0, 0
    while workers_done < worker_count:
        result = done_queue.get()
        if result is SENTINEL:
            workers_done += 1
            continue
        seq, chunks = result
        out_of_order[seq] = chunks
        next_seq = drain_ready(out_of_order, next_seq)
    next_seq = drain_ready(out_of_order, next_seq)  # safety: anything left after the last sentinel
    if held_back is not None:
        state.chunk_queue.put(held_back)  # final group's tail, never linked forward


def run_chunk_stage(
    state: PipelineState, *,
    chunker: ChunkerPort, embedder: EmbeddingPort, file_id: str, extra_metadata: dict | None,
    chunk_size: int, concurrency: int,
) -> None:
    """Stage 2: page_queue → N concurrent chunkers → seq-ordered chunk_queue."""
    # Clamp: 0 workers would make queue.Queue(maxsize=0) unbounded, spawn nothing, and let the
    # collector fall straight through — silently discarding every chunk. Never allow it.
    worker_count = max(1, concurrency)
    group_queue: queue.Queue[PageGroup] = queue.Queue(maxsize=worker_count * 2)  # bounded → backpressure
    done_queue: queue.Queue[ChunkedGroup] = queue.Queue()

    producer = spawn(_produce_page_groups, "ingest-chunk-group",
                     state, group_queue, embedder, chunk_size, worker_count)
    workers = spawn_workers(_chunk_group_worker, worker_count, "ingest-chunk",
                            state, group_queue, done_queue, chunker, file_id)
    try:
        _reorder_and_emit(state, done_queue, worker_count, extra_metadata)
    except Exception as exc:
        state.errors.append(exc)
    finally:
        join_workers([producer, *workers])
        # One sentinel, not one-per-embed-worker: each embed worker re-broadcasts it before
        # exiting, so this stage never needs to know how many workers the embed stage runs.
        state.chunk_queue.put(SENTINEL)
