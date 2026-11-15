from __future__ import annotations
import threading
from typing import Callable

from application.ingest.utils import SENTINEL

# Shared thread-pool primitives for the chunk and embed stages. Both fan work out to
# N daemon threads that drain a queue until they see one SENTINEL each.


def spawn(target: Callable, name: str, *args) -> threading.Thread:
    """Start one named daemon thread running target(*args)."""
    thread = threading.Thread(target=target, args=args, name=name, daemon=True)
    thread.start()
    return thread


def spawn_workers(target: Callable, count: int, name: str, *args) -> list[threading.Thread]:
    """Start `count` daemon threads all running target(*args), named <name>-0..<name>-N."""
    return [spawn(target, f"{name}-{i}", *args) for i in range(count)]


def join_workers(threads: list[threading.Thread]) -> None:
    """Block until every worker thread has exited."""
    for thread in threads:
        thread.join()


def fan_out_sentinels(target_queue, count: int) -> None:
    """One SENTINEL per consumer, so each worker sees exactly one stop signal."""
    for _ in range(count):
        target_queue.put(SENTINEL)
