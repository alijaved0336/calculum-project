"""Read-side Postgres access to the ingestion-owned ``video_kb_documents`` table.

Provides the support video library: paginated list + title search, single row, and
delete-from-list. Uses raw asyncpg over the shared
DB — this table is owned and migrated by the ingestion-support-agent (write side); we
only read it (and remove a tracking row on delete), never run migrations against it.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid as _uuid

from infrastructure.postgres.pool import create_pool, with_retry

logger = logging.getLogger(__name__)

# Columns the library needs (the JSONB "metadata" column is decoded to a dict via a codec).
_COLUMNS = (
    "uuid, status, media_type, title, metadata, chunk_count, "
    "video_status, transcript_status, document_status, error_message, created_at, updated_at"
)


def _row_to_dict(r) -> dict:
    return {
        "video_id": str(r["uuid"]),
        "status": r["status"],
        "media_type": r["media_type"],
        "title": r["title"],
        "metadata": r["metadata"] or {},
        "chunk_count": r["chunk_count"],
        "video_status": r["video_status"],
        "transcript_status": r["transcript_status"],
        "document_status": r["document_status"],
        "error_message": r["error_message"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


async def _init_conn(conn) -> None:
    # Return JSONB as a decoded dict rather than a raw JSON string.
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


class VideoStore:
    """Async asyncpg pool over the shared DB, read-side for video documents."""

    def __init__(self, dsn: str) -> None:
        # asyncpg speaks plain libpq DSNs, not SQLAlchemy's "+asyncpg" dialect prefix.
        self._dsn = dsn.replace("postgresql+asyncpg://", "postgresql://")
        self._pool = None
        self._lock = asyncio.Lock()

    async def _get_pool(self):
        if self._pool is None:
            async with self._lock:
                if self._pool is None:
                    self._pool = await create_pool(self._dsn, init=_init_conn)
                    logger.info("VideoStore asyncpg pool ready.")
        return self._pool

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None

    async def list_videos(self, q: str | None, page: int, page_size: int) -> tuple[list[dict], int]:
        """Paginated list of videos (media_type='video'), newest first, optional title search."""
        page = max(1, page)
        page_size = max(1, min(page_size, 100))
        offset = (page - 1) * page_size

        where = "media_type = 'video'"
        args: list = []
        if q and q.strip():
            args.append(f"%{q.strip()}%")
            where += f" AND title ILIKE ${len(args)}"

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

    async def get_video(self, video_id: _uuid.UUID) -> dict | None:
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.fetchrow(
                f"SELECT {_COLUMNS} FROM video_kb_documents WHERE uuid = $1", video_id
            )

        row = await with_retry(pool, _run)
        return _row_to_dict(row) if row else None

    async def set_chunk_count(self, video_id: _uuid.UUID, count: int) -> None:
        """Overwrite a video's ``chunk_count`` after a per-segment delete recompute.

        Deliberately does NOT touch ``updated_at``: a manual segment prune is not a re-ingest,
        so bumping the "Updated At" the library shows (and the status poller keys off) would
        misrepresent it. Ingestion still owns this column and overwrites it on any re-ingest.
        """
        pool = await self._get_pool()

        async def _run(conn):
            await conn.execute(
                "UPDATE video_kb_documents SET chunk_count = $1 WHERE uuid = $2", count, video_id
            )

        await with_retry(pool, _run)

    async def delete_video(self, video_id: _uuid.UUID) -> bool:
        pool = await self._get_pool()

        async def _run(conn):
            return await conn.execute(
                "DELETE FROM video_kb_documents WHERE uuid = $1", video_id
            )

        status = await with_retry(pool, _run)
        # asyncpg returns a command tag like "DELETE 1"
        return status.rsplit(" ", 1)[-1] != "0"
