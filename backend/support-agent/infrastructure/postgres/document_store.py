"""Read-side Postgres access to the ingestion-owned ``video_kb_documents`` rows that are
general documents (``media_type='document'``).

Provides the support document library: paginated list + name/title search, single row,
and delete-from-list. Uses raw asyncpg (same style as :class:`VideoStore`) over the shared
DB — this table is owned and migrated by the ingestion-support-agent (write side); we only
read it (and remove a tracking row on delete), never run migrations against it.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid as _uuid
from typing import Iterable

from infrastructure.postgres.pool import create_pool, with_retry

logger = logging.getLogger(__name__)

_COLUMNS = (
    "uuid, status, media_type, title, filename, metadata, chunk_count, "
    "document_status, is_public, created_at, updated_at"
)


def _row_to_dict(r) -> dict:
    meta = r["metadata"] or {}
    return {
        "document_id": str(r["uuid"]),
        "status": r["status"],
        "media_type": r["media_type"],
        "title": r["title"],
        "filename": (meta.get("filename") or r["filename"]),
        "metadata": meta,
        "chunk_count": r["chunk_count"],
        "document_status": r["document_status"],
        "is_public": bool(r["is_public"]),
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


async def _init_conn(conn) -> None:
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


class DocumentStore:
    """Async asyncpg pool over the shared DB, read-side for general documents."""

    def __init__(self, dsn: str) -> None:
        self._dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")
        self._pool = None
        self._lock = asyncio.Lock()

    async def _get_pool(self):
        if self._pool is None:
            async with self._lock:
                if self._pool is None:
                    self._pool = await create_pool(self._dsn, init=_init_conn)
                    logger.info("DocumentStore asyncpg pool ready.")
        return self._pool

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def list_documents(self, q: str | None, page: int, page_size: int) -> tuple[list[dict], int]:
        """Paginated list of documents (media_type='document'), newest first, optional name/title search.

        Lists ALL documents (public and private) — the admin document library shows the full
        set. Per-document access is still enforced where it matters: download is gated, and
        chat citations hide private docs from non-global-admins.
        """
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size

        where = "media_type = 'document'"
        args: list = []
        if q and q.strip():
            args.append(f"%{q.strip()}%")
            # search across the display title and the stored filename
            where += f" AND (title ILIKE ${len(args)} OR filename ILIKE ${len(args)})"

        list_sql = (
            f"SELECT {_COLUMNS} FROM video_kb_documents WHERE {where} "
            f"ORDER BY created_at DESC LIMIT ${len(args) + 1} OFFSET ${len(args) + 2}"
        )
        count_sql = f"SELECT count(*) FROM video_kb_documents WHERE {where}"

        pool = await self._get_pool()

        async def _run(conn):
            total = await conn.fetchval(count_sql, *args)
            rows = await conn.fetch(list_sql, *args, page_size, offset)
            return rows, total

        rows, total = await with_retry(pool, _run)
        return [_row_to_dict(r) for r in rows], int(total or 0)

    async def get_document(self, document_id: _uuid.UUID) -> dict | None:
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetchrow(
                f"SELECT {_COLUMNS} FROM video_kb_documents "
                "WHERE uuid = $1 AND media_type = 'document'",
                document_id,
            )

        row = await with_retry(pool, _run)
        return _row_to_dict(row) if row else None

    async def public_flags(self, document_ids: Iterable) -> dict[str, bool]:
        """Current ``is_public`` for each document_id (the DB column is the source of truth).

        Used to gate citations against a document's CURRENT visibility rather than the
        possibly-stale snapshot persisted in a chat message. Unknown/invalid ids are omitted.
        """
        uuids = []
        for d in document_ids:
            try:
                uuids.append(d if isinstance(d, _uuid.UUID) else _uuid.UUID(str(d)))
            except (ValueError, TypeError):
                continue
        if not uuids:
            return {}
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetch(
                "SELECT uuid, is_public FROM video_kb_documents "
                "WHERE media_type = 'document' AND uuid = ANY($1::uuid[])",
                uuids,
            )

        rows = await with_retry(pool, _run)
        return {str(r["uuid"]): bool(r["is_public"]) for r in rows}

    async def video_durations(self, video_ids: Iterable) -> dict[str, int]:
        """Full-video ``duration_ms`` per video_id (from the row's metadata), so a clip card can
        show the whole video's length rather than the retrieved-segment span. Missing/invalid
        ids or durations are omitted."""
        uuids = []
        for d in video_ids:
            try:
                uuids.append(d if isinstance(d, _uuid.UUID) else _uuid.UUID(str(d)))
            except (ValueError, TypeError):
                continue
        if not uuids:
            return {}
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetch(
                "SELECT uuid, metadata FROM video_kb_documents "
                "WHERE media_type = 'video' AND uuid = ANY($1::uuid[])",
                uuids,
            )

        rows = await with_retry(pool, _run)
        out: dict[str, int] = {}
        for r in rows:
            dur = (r["metadata"] or {}).get("duration_ms")
            if isinstance(dur, (int, float)):
                out[str(r["uuid"])] = int(dur)
        return out

    async def delete_document(self, document_id: _uuid.UUID) -> bool:
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.execute(
                "DELETE FROM video_kb_documents WHERE uuid = $1 AND media_type = 'document'",
                document_id,
            )

        status = await with_retry(pool, _run)
        return status.rsplit(" ", 1)[-1] != "0"
