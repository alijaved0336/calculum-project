"""Adabot-ingestion lifecycle tracking for ``PostgresAdapter``.

The ``AdabotIngestionLog`` ORM model and its Alembic migration belong to the
AI Negotiation shared-schema repository.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from domain.entities import AdabotIngestionLogStatus
from infrastructure.postgres import models as orm

logger = logging.getLogger(__name__)


class AdabotIngestionLogMixin:
    async def get_adabot_ingestion_logs(self, limit: int, offset: int) -> tuple[list[dict[str, Any]], int]:
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(
                    orm.AdabotIngestionLog.uuid,
                    orm.AdabotIngestionLog.status,
                    orm.AdabotIngestionLog.started_at,
                    orm.AdabotIngestionLog.completed_at,
                    orm.AdabotIngestionLog.logs,
                ).order_by(orm.AdabotIngestionLog.started_at.desc()).limit(limit).offset(offset)
            )
            total = await session.scalar(select(func.count()).select_from(orm.AdabotIngestionLog))
            return [dict(row) for row in result.mappings().all()], total or 0

    async def mark_adabot_ingestion_started(self, log_uuid: uuid.UUID) -> None:
        now = datetime.now(timezone.utc)
        async with self._ensure_engine().begin() as conn:
            await conn.execute(pg_insert(orm.AdabotIngestionLog).values(
                uuid=log_uuid,
                status=AdabotIngestionLogStatus.PROCESSING.value,
                started_at=now,
                logs={"error_logs": {}, "metrics": {}},
                created_at=now,
                updated_at=now,
            ))
        logger.info("adabot_ingestion.started log_uuid=%s", log_uuid)

    async def update_adabot_ingestion_tracking(
        self, log_uuid: uuid.UUID, status: str, **extra: Any
    ) -> None:
        status = getattr(status, "value", status)
        now = datetime.now(timezone.utc)
        async with self._ensure_engine().begin() as conn:
            stmt = (
                update(orm.AdabotIngestionLog)
                .where(orm.AdabotIngestionLog.uuid == log_uuid)
                .values(status=status, completed_at=now, updated_at=now, **extra)
                .returning(orm.AdabotIngestionLog.uuid)
            )
            if not (await conn.execute(stmt)).fetchone():
                logger.info("adabot_ingestion.tracking_ignored log_uuid=%s status=%s", log_uuid, status)
                return
        logger.info("adabot_ingestion.tracking_updated log_uuid=%s status=%s", log_uuid, status)
