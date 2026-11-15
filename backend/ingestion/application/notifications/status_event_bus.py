"""In-process Server-Sent-Events broker for document-status updates.

Runtime state bag (asyncio queues + lock) → lives in ``application/`` per the
hexagonal rules, and implements the domain ``DocumentStatusStream``. The ingestion
use case publishes through the port; the SSE route subscribes to the same
singleton. Single-process only — swap for a Redis-backed broker to scale out.
"""
from __future__ import annotations

import asyncio
import logging
from collections import OrderedDict
from typing import Any, AsyncIterator

from domain.entities.pipeline import FileIngestStatus
from domain.ports.document_status_stream import DocumentStatusStream

logger = logging.getLogger(__name__)

_CLOSE = object()        # sentinel: terminal reached, end the stream
HEARTBEAT = object()     # sentinel: idle keep-alive ping
_TERMINAL = frozenset(s.value for s in FileIngestStatus if s.is_terminal)


def _offer(queue: asyncio.Queue, item: Any) -> bool:
    """Non-blocking put; on a full queue evict the oldest event to make room.

    Returns False when an eviction happened. Evict-oldest (not plain drop) so the
    terminal ``_CLOSE`` always lands and a backed-up stream still ends.
    """
    try:
        queue.put_nowait(item)
        return True
    except asyncio.QueueFull:
        try:
            queue.get_nowait()
        except asyncio.QueueEmpty:
            pass
        queue.put_nowait(item)
        return False


class StatusEventBus(DocumentStatusStream):
    def __init__(self, idle_timeout: float, max_cached: int, max_queue: int) -> None:
        self._idle_timeout = idle_timeout   # seconds between heartbeats on an idle stream
        self._max_cached = max_cached       # retained last-events; bounds memory for unsubscribed files
        self._max_queue = max_queue         # per-subscriber backlog cap; bounds a dead/slow client
        self._subscribers: dict[str, set[asyncio.Queue]] = {}
        self._last: OrderedDict[str, dict] = OrderedDict()
        self._lock = asyncio.Lock()

    async def publish_document_status(self, file_uuid: str, status: str, **extra: Any) -> None:
        key = str(file_uuid)
        event = {"file_uuid": key, "status": status, **extra}
        terminal = status in _TERMINAL
        async with self._lock:
            self._last[key] = event
            self._last.move_to_end(key)
            if len(self._last) > self._max_cached:
                self._last.popitem(last=False)
            queues = list(self._subscribers.get(key, ()))
        for q in queues:
            if not _offer(q, event):
                logger.warning("sse.queue_full file_uuid=%s status=%s dropped_oldest", key, status)
            if terminal:
                _offer(q, _CLOSE)
        logger.info("sse.published file_uuid=%s status=%s subscribers=%d", key, status, len(queues))

    async def subscribe(self, file_uuid: str) -> AsyncIterator[dict | object]:
        key = str(file_uuid)
        queue: asyncio.Queue = asyncio.Queue(maxsize=self._max_queue)
        async with self._lock:
            self._subscribers.setdefault(key, set()).add(queue)
            last = self._last.get(key)
        try:
            if last is not None:
                yield last
                if last["status"] in _TERMINAL:
                    return
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), self._idle_timeout)
                except asyncio.TimeoutError:
                    yield HEARTBEAT
                    continue
                if item is _CLOSE:
                    return
                yield item
        finally:
            await self._unsubscribe(key, queue)

    async def _unsubscribe(self, key: str, queue: asyncio.Queue) -> None:
        async with self._lock:
            subs = self._subscribers.get(key)
            if not subs:
                return
            subs.discard(queue)
            if not subs:
                self._subscribers.pop(key, None)