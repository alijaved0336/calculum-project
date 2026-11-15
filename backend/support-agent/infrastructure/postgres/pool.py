"""Shared asyncpg pool helpers for the three read/write stores in this package.

Cloud Run/Cloud SQL silently drop a connection that's sat idle for a while; asyncpg only
discovers this the next time it tries to use it — surfacing as ``ConnectionDoesNotExistError``
or a bare ``ConnectionResetError`` ("connection was closed in the middle of operation") from
whatever query happened to draw that connection next. This never reproduces against a local
Postgres, which isn't sitting behind that networking.

Mitigated two ways:
- ``create_pool()`` sets ``max_inactive_connection_lifetime`` comfortably under the network's
  idle-kill window, so asyncpg recycles a pooled connection on its own schedule instead of us
  discovering it's dead mid-query.
- ``with_retry()`` wraps a single acquire+use with ONE retry against a fresh connection, for
  the remaining race where a connection dies between the periodic recycle and use. Safe to
  apply to every call site here: each write is either idempotent (UPDATE/DELETE by id) or keyed
  by a client-generated UUID, so retrying after a lost response is a no-op duplicate-key failure
  at worst, never a duplicate row.
"""
from __future__ import annotations

import logging
from typing import Awaitable, Callable, TypeVar

import asyncpg

logger = logging.getLogger(__name__)

T = TypeVar("T")

# Comfortably under Cloud Run / Cloud SQL Auth Proxy's idle-connection window.
_MAX_INACTIVE_CONNECTION_LIFETIME_S = 180.0
_COMMAND_TIMEOUT_S = 10.0

# Errors that mean "this connection was already dead", not "this query is broken" — safe to
# retry against a fresh connection.
_RETRIABLE = (
    asyncpg.exceptions.ConnectionDoesNotExistError,
    asyncpg.exceptions.ConnectionFailureError,
    asyncpg.exceptions.InterfaceError,
    ConnectionResetError,
    OSError,
)


async def create_pool(dsn: str, *, min_size: int = 1, max_size: int = 5, init=None) -> asyncpg.Pool:
    return await asyncpg.create_pool(
        dsn,
        min_size=min_size,
        max_size=max_size,
        init=init,
        max_inactive_connection_lifetime=_MAX_INACTIVE_CONNECTION_LIFETIME_S,
        command_timeout=_COMMAND_TIMEOUT_S,
    )


async def with_retry(pool: asyncpg.Pool, fn: Callable[[asyncpg.Connection], Awaitable[T]]) -> T:
    """Run ``fn(conn)`` against a pooled connection; retry ONCE on a fresh connection if the one
    handed out had already been silently killed by the network while idle."""
    try:
        async with pool.acquire() as conn:
            return await fn(conn)
    except _RETRIABLE:
        logger.warning("db.stale_connection_retry")
        async with pool.acquire() as conn:
            return await fn(conn)
