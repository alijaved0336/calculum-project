"""
Postgres-backed cursor store.

Persists one row per feed in ``feed_sync_state``. Survives restarts and is
shared across instances, unlike the previous file-based store.
"""

from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import ProgrammingError

from domain.entities import FeedName, SyncCursor
from domain.ports import CursorStorePort
from infrastructure.postgres import models as orm
from infrastructure.postgres.postgres_adapter import PostgresAdapter

logger = logging.getLogger(__name__)

# PostgreSQL SQLSTATE for "undefined_table".
_UNDEFINED_TABLE = "42P01"


def _is_missing_table(exc: ProgrammingError) -> bool:
    return getattr(exc.orig, "sqlstate", None) == _UNDEFINED_TABLE


class PostgresCursorStore(CursorStorePort):
    def __init__(self, pg: PostgresAdapter) -> None:
        self._pg = pg

    async def load(self, feed: FeedName) -> SyncCursor:
        stmt = select(orm.FeedSyncState.updated_after).where(
            orm.FeedSyncState.feed == feed.value
        )
        try:
            async with self._pg.engine.connect() as conn:
                updated_after = (await conn.execute(stmt)).scalar_one_or_none()
        except ProgrammingError as exc:
            if not _is_missing_table(exc):
                raise
            logger.warning(
                "feed_sync_state table missing; %s starts from initial load.", feed.value
            )
            return SyncCursor(feed=feed, updated_after=None)
        return SyncCursor(
            feed=feed,
            updated_after=updated_after.isoformat() if updated_after else None,
        )

    async def save(self, cursor: SyncCursor) -> None:
        updated_after = (
            datetime.fromisoformat(cursor.updated_after)
            if cursor.updated_after is not None
            else None
        )
        stmt = (
            pg_insert(orm.FeedSyncState)
            .values(feed=cursor.feed.value, updated_after=updated_after)
            .on_conflict_do_update(
                index_elements=[orm.FeedSyncState.feed],
                set_={"updated_after": updated_after},
            )
        )
        try:
            async with self._pg.engine.begin() as conn:
                await conn.execute(stmt)
        except ProgrammingError as exc:
            if not _is_missing_table(exc):
                raise
            logger.warning(
                "feed_sync_state table missing; cursor for %s not persisted.",
                cursor.feed.value,
            )
            return
        logger.debug("Saved cursor for %s: %s", cursor.feed.value, cursor.updated_after)

    async def load_all(self) -> dict[FeedName, SyncCursor]:
        stmt = select(orm.FeedSyncState.feed, orm.FeedSyncState.updated_after)
        try:
            async with self._pg.engine.connect() as conn:
                rows = (await conn.execute(stmt)).all()
        except ProgrammingError as exc:
            if not _is_missing_table(exc):
                raise
            logger.warning(
                "feed_sync_state table missing; all feeds start from initial load."
            )
            rows = []
        stored = {feed: updated_after for feed, updated_after in rows}
        return {
            feed: SyncCursor(
                feed=feed,
                updated_after=(ts.isoformat() if (ts := stored.get(feed.value)) else None),
            )
            for feed in FeedName
        }
