from __future__ import annotations
import asyncio
import collections
import hashlib
import logging
import os
import queue
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from domain.entities.ingestion import Chunk

logger = logging.getLogger(__name__)

SENTINEL = None  # end-of-stream marker placed on a queue when a stage is done


@dataclass
class PipelineState:
    """Per-run state shared across the parse/chunk/embed threads of one document."""

    page_queue: queue.Queue = field(default_factory=queue.Queue)    # parse → chunk stage
    chunk_queue: queue.Queue = field(default_factory=queue.Queue)   # chunk → embed stage
    errors: list[BaseException] = field(default_factory=list)
    upsert_pending: list = field(default_factory=list)
    pages_parsed: int = 0
    chunks_created: int = 0
    chunks_written: int = 0
    parse_seconds: float = 0.0
    chunk_seconds: float = 0.0
    embed_seconds: float = 0.0
    _counter_lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)
    _upsert_lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)
    _batch_lock: threading.Lock = field(default_factory=threading.Lock, init=False, repr=False)
    _overflow: collections.deque = field(default_factory=collections.deque, init=False, repr=False)

    def add_timing(self, attr: str, delta: float) -> None:
        with self._counter_lock:
            setattr(self, attr, getattr(self, attr) + delta)

    def write_chunks(self, count: int) -> None:
        with self._counter_lock:
            self.chunks_written += count

    def extend_pending(self, chunks: list) -> None:
        with self._upsert_lock:
            self.upsert_pending.extend(chunks)

    def take_pending(self, size: int | None = None) -> list:
        with self._upsert_lock:
            if size is None:
                tail, self.upsert_pending = self.upsert_pending, []
                return tail
            if len(self.upsert_pending) < size:
                return []
            batch, self.upsert_pending = self.upsert_pending[:size], self.upsert_pending[size:]
            return batch


@contextmanager
def timed(state: PipelineState, attr: str):
    """Accumulate wall time of the wrapped block onto state.<attr> under the counter lock."""
    t = time.perf_counter()
    try:
        yield
    finally:
        state.add_timing(attr, time.perf_counter() - t)


async def join_thread(main_loop: asyncio.AbstractEventLoop, thread: threading.Thread) -> None:
    """Await a worker thread without blocking the async event loop."""
    await main_loop.run_in_executor(None, thread.join)


def link_cross_page(last_chunk: Chunk, first_chunk: Chunk) -> None:
    """Link the last chunk of one page to the first chunk of the next."""
    last_chunk.next_id = first_chunk.id
    first_chunk.prev_id = last_chunk.id


def stamp_chunk_metadata(chunks: list[Chunk], created_at: str, extra_metadata: dict | None) -> None:
    """Stamp shared metadata onto every chunk in place."""
    for chunk in chunks:
        chunk.metadata["created_at"] = created_at
        if extra_metadata:
            chunk.metadata.update(extra_metadata)


def chunk_token_count(chunk: Chunk, count_tokens: Callable[[str], int]) -> int:
    """Token count for a chunk, computed once and cached on the chunk."""
    if chunk.token_count is None:
        chunk.token_count = count_tokens(chunk.text)
    return chunk.token_count


def collect_token_batch(
    chunk_queue: queue.Queue,
    first_chunk: Chunk,
    count_tokens: Callable[[str], int],
    max_tokens: int,
) -> tuple[list[Chunk], Chunk | None]:
    """Pack chunks into a token-capped batch; return batch + any overflow chunk."""
    batch = [first_chunk]
    tokens = chunk_token_count(first_chunk, count_tokens)
    while True:
        try:
            next_chunk = chunk_queue.get_nowait()
        except queue.Empty:
            return batch, None
        if next_chunk is None:
            chunk_queue.put(None)
            return batch, None
        next_tokens = chunk_token_count(next_chunk, count_tokens)
        if tokens + next_tokens > max_tokens:
            return batch, next_chunk
        batch.append(next_chunk)
        tokens += next_tokens


def file_metadata(file_path: str, file_name: str) -> tuple[int | None, str | None]:
    """Return (size_bytes, lowercased suffix) for a file path."""
    try:
        size: int | None = os.path.getsize(file_path)
    except OSError:
        size = None
    ftype = Path(file_name).suffix.lower() if file_name else None
    return size, ftype


def file_checksum(file_path: str) -> str | None:
    """SHA-256 hex digest of a file's contents, streamed; None on read error."""
    h = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for block in iter(lambda: f.read(1 << 20), b""):
                h.update(block)
    except OSError as exc:
        logger.warning("file_checksum.read_failed path=%s error=%s", file_path, exc)
        return None
    return h.hexdigest()

def format_error(exc: BaseException) -> str:
    """Compact error string: 'Type: message', or just 'Type' when blank."""
    return f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__


def cleanup_temp(path: str) -> None:
    try:
        os.unlink(path)
    except OSError:
        pass
