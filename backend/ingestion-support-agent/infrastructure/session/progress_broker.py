"""In-process pub/sub for streaming status events to SSE clients.

Background work (video upload, transcript ingest) ``publish()`` status transitions
keyed by a stream id (e.g. ``"video:<id>"``); an SSE endpoint ``subscribe()``s and
forwards them. Each stream keeps a small replay buffer so a subscriber that connects
*after* a fast job already finished still receives the full sequence — this avoids the
subscribe-after-publish race. A ``terminal`` event closes the stream.

Single-process only (like ``InMemoryIngestionJobStore``): events are held in memory, so
SSE works when the client reaches the same instance. A Redis-backed broker would be the
cross-instance upgrade. Publishes happen from the async event loop, so plain asyncio
structures suffice — no thread bridging.
"""
from __future__ import annotations

import asyncio
from collections import OrderedDict
from typing import AsyncIterator

_SENTINEL = object()  # pushed to live queues to end iteration on a terminal event


class _Stream:
    __slots__ = ("buffer", "queues", "closed")

    def __init__(self) -> None:
        self.buffer: list[dict] = []
        self.queues: set[asyncio.Queue] = set()
        self.closed: bool = False


class ProgressBroker:
    """Fan-out event bus with per-stream replay buffers, capped to avoid unbounded growth."""

    def __init__(self, max_streams: int = 1024) -> None:
        self._streams: "OrderedDict[str, _Stream]" = OrderedDict()
        self._max_streams = max_streams

    def _get(self, stream_id: str) -> _Stream:
        stream = self._streams.get(stream_id)
        if stream is None:
            stream = _Stream()
            self._streams[stream_id] = stream
            self._streams.move_to_end(stream_id)
            while len(self._streams) > self._max_streams:
                self._streams.popitem(last=False)  # drop oldest
        return stream

    def publish(self, stream_id: str, event: dict, terminal: bool = False) -> None:
        """Record ``event`` for ``stream_id`` and fan it out to live subscribers."""
        stream = self._get(stream_id)
        if stream.closed:
            return
        stream.buffer.append(event)
        for q in stream.queues:
            q.put_nowait(event)
        if terminal:
            stream.closed = True
            for q in stream.queues:
                q.put_nowait(_SENTINEL)

    async def subscribe(self, stream_id: str) -> AsyncIterator[dict]:
        """Yield buffered events, then live events until the stream terminates."""
        stream = self._get(stream_id)
        # Replay everything already published (snapshot the length up front).
        replayed = len(stream.buffer)
        for event in stream.buffer[:replayed]:
            yield event
        if stream.closed:
            return

        queue: asyncio.Queue = asyncio.Queue()
        # Catch up on anything published between the snapshot and attaching the queue.
        for event in stream.buffer[replayed:]:
            queue.put_nowait(event)
        if stream.closed:  # terminal slipped in during catch-up
            return
        stream.queues.add(queue)
        try:
            while True:
                item = await queue.get()
                if item is _SENTINEL:
                    return
                yield item
        finally:
            stream.queues.discard(queue)
