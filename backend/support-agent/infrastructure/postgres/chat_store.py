"""Read/write Postgres access to this repo's own chat tables (support_threads,
support_messages) on the shared DB. Raw asyncpg, same pool style as VideoStore. These
tables are OWNED and migrated by this service (isolated ``support_alembic_version``
lineage) — unlike video_store/document_store which only read ingestion-owned tables.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid as _uuid

from infrastructure.postgres.pool import create_pool, with_retry

logger = logging.getLogger(__name__)


def _thread_row(r) -> dict:
    out = {
        "thread_id": str(r["uuid"]),
        "user_uuid": str(r["user_uuid"]) if "user_uuid" in r else None,
        "title": r["title"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }
    if "message_count" in r:
        out["message_count"] = int(r["message_count"] or 0)
    return out


def _message_row(r) -> dict:
    return {
        "message_id": str(r["uuid"]),
        "thread_id": str(r["thread_uuid"]),
        "role": r["role"],
        "content": r["content"] or "",
        "metadata": r["metadata"] or {},
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


async def _init_conn(conn) -> None:
    # Round-trip JSONB as a Python dict (encode on insert, decode on read).
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


def _as_uuid(value) -> _uuid.UUID:
    return value if isinstance(value, _uuid.UUID) else _uuid.UUID(str(value))


class ChatStore:
    """Async asyncpg pool over the shared DB for support chat threads + messages."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")
        self._pool = None
        self._lock = asyncio.Lock()

    async def _get_pool(self):
        if self._pool is None:
            async with self._lock:
                if self._pool is None:
                    self._pool = await create_pool(self._dsn, init=_init_conn)
                    logger.info("ChatStore asyncpg pool ready.")
        return self._pool

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def create_thread(self, user_uuid, title: str | None) -> dict:
        tid = _uuid.uuid4()
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetchrow(
                "INSERT INTO support_threads (uuid, user_uuid, title) VALUES ($1, $2, $3) "
                "RETURNING uuid, user_uuid, title, created_at, updated_at",
                tid,
                _as_uuid(user_uuid),
                title,
            )

        row = await with_retry(pool, _run)
        return _thread_row(row)

    async def get_user_contact(self, user_uuid) -> dict | None:
        """Look up display name + email in the shared ``users`` table (None if missing/deleted)."""
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetchrow(
                "SELECT email, display_name FROM users WHERE uuid = $1 AND deleted_at IS NULL",
                _as_uuid(user_uuid),
            )

        row = await with_retry(pool, _run)
        return {"email": row["email"], "name": row["display_name"]} if row else None

    async def get_thread(self, thread_uuid) -> dict | None:
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetchrow(
                "SELECT uuid, user_uuid, title, created_at, updated_at "
                "FROM support_threads WHERE uuid = $1",
                _as_uuid(thread_uuid),
            )

        row = await with_retry(pool, _run)
        return _thread_row(row) if row else None

    async def list_threads(self, user_uuid, page: int, page_size: int) -> tuple[list[dict], int]:
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size
        uid = _as_uuid(user_uuid)

        list_sql = (
            "SELECT t.uuid, t.user_uuid, t.title, t.created_at, t.updated_at, "
            "count(m.uuid) AS message_count "
            "FROM support_threads t LEFT JOIN support_messages m ON m.thread_uuid = t.uuid "
            "WHERE t.user_uuid = $1 GROUP BY t.uuid "
            "ORDER BY t.updated_at DESC LIMIT $2 OFFSET $3"
        )
        pool = await self._get_pool()

        async def _run(conn):
            total = await conn.fetchval(
                "SELECT count(*) FROM support_threads WHERE user_uuid = $1", uid
            )
            rows = await conn.fetch(list_sql, uid, page_size, offset)
            return rows, total

        rows, total = await with_retry(pool, _run)
        return [_thread_row(r) for r in rows], int(total or 0)

    async def get_messages(self, thread_uuid, limit: int = 200) -> list[dict]:
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetch(
                "SELECT uuid, thread_uuid, role, content, metadata, created_at "
                "FROM support_messages WHERE thread_uuid = $1 ORDER BY created_at ASC LIMIT $2",
                _as_uuid(thread_uuid),
                limit,
            )

        rows = await with_retry(pool, _run)
        return [_message_row(r) for r in rows]

    async def get_recent_messages(self, thread_uuid, limit: int) -> list[dict]:
        """Most-recent ``limit`` messages, returned oldest-first (conversation memory)."""
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetch(
                "SELECT uuid, thread_uuid, role, content, metadata, created_at "
                "FROM support_messages WHERE thread_uuid = $1 ORDER BY created_at DESC LIMIT $2",
                _as_uuid(thread_uuid),
                limit,
            )

        rows = await with_retry(pool, _run)
        return [_message_row(r) for r in reversed(rows)]

    async def save_message(self, thread_uuid, role: str, content: str, metadata: dict | None = None) -> dict:
        mid = _uuid.uuid4()
        tid = _as_uuid(thread_uuid)
        pool = await self._get_pool()

        async def _run(conn):
            async with conn.transaction():
                row = await conn.fetchrow(
                    "INSERT INTO support_messages (uuid, thread_uuid, role, content, metadata) "
                    "VALUES ($1, $2, $3, $4, $5) "
                    "RETURNING uuid, thread_uuid, role, content, metadata, created_at",
                    mid,
                    tid,
                    role,
                    content,
                    metadata,
                )
                # Bump the parent thread so list_threads orders by last activity.
                await conn.execute(
                    "UPDATE support_threads SET updated_at = now() WHERE uuid = $1", tid
                )
            return row

        row = await with_retry(pool, _run)
        return _message_row(row)

    async def rename_thread(self, thread_uuid, title: str) -> bool:
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.execute(
                "UPDATE support_threads SET title = $2, updated_at = now() WHERE uuid = $1",
                _as_uuid(thread_uuid),
                title,
            )

        status = await with_retry(pool, _run)
        return status.rsplit(" ", 1)[-1] != "0"

    async def delete_thread(self, thread_uuid) -> bool:
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.execute(
                "DELETE FROM support_threads WHERE uuid = $1", _as_uuid(thread_uuid)
            )

        status = await with_retry(pool, _run)
        return status.rsplit(" ", 1)[-1] != "0"
