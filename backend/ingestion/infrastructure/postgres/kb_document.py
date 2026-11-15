"""KB-document tracking operations for ``PostgresAdapter``.

Split out as a mixin to keep the adapter focused. Relies on the host adapter
providing ``_ensure_engine()`` and ``sessionmaker()``; implements the
``KBDocumentStorePort`` contract.
"""
from __future__ import annotations
import logging
import uuid as _uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from domain.entities.pipeline import KBDocumentStatus
from infrastructure.postgres import models as orm

logger = logging.getLogger(__name__)


class KBDocumentMixin:
    """KB-document reads/writes used by the ingestion pipeline tracking."""

    @staticmethod
    def _to_strategy_enums(strategies: list[str] | None) -> list | None:
        if not strategies:
            return None
        return [orm.StrategyEnum(s.replace("-", "_")) for s in strategies]

    async def get_uuid_by_filename(self, filename: str) -> _uuid.UUID | None:
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(orm.KBDocument.uuid)
                .where(orm.KBDocument.filename == filename)
                .order_by(orm.KBDocument.created_at.desc())
                .limit(1)
            )
            return result.scalar()

    async def get_uuid_by_checksum(self, checksum: str) -> _uuid.UUID | None:
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(orm.KBDocument.uuid)
                .where(orm.KBDocument.checksum == checksum)
                .where(orm.KBDocument.status == KBDocumentStatus.UPSERTED)
                .order_by(orm.KBDocument.created_at.desc())
                .limit(1)
            )
            return result.scalar()

    async def delete_kb_document(self, file_uuid: _uuid.UUID) -> None:
        async with self._ensure_engine().begin() as conn:
            await conn.execute(delete(orm.KBDocument).where(orm.KBDocument.uuid == file_uuid))
        logger.info("kb_document.deleted file_uuid=%s", file_uuid)

    async def get_document_status(self, file_uuid: _uuid.UUID) -> str | None:
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(orm.KBDocument.status).where(orm.KBDocument.uuid == file_uuid)
            )
            return result.scalar()

    async def kb_document_exists(self, file_uuid: _uuid.UUID) -> bool:
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(orm.KBDocument.uuid).where(orm.KBDocument.uuid == file_uuid)
            )
            return result.scalar() is not None

    async def update_kb_document(self, file_uuid: _uuid.UUID, **fields: Any) -> None:
        async with self._ensure_engine().begin() as conn:
            await conn.execute(
                update(orm.KBDocument).where(orm.KBDocument.uuid == file_uuid).values(**fields)
            )

    async def mark_ingestion_started(
        self,
        file_uuid: _uuid.UUID,
        filename: str,
        uploaded_by_user_uuid: _uuid.UUID,
        file_size: int | None = None,
        file_type: str | None = None,
        playbook_strategies: list[str] | None = None,
        checksum: str | None = None,
    ) -> None:
        now = datetime.now(timezone.utc)
        strategies = self._to_strategy_enums(playbook_strategies)
        async with self._ensure_engine().begin() as conn:
            stmt = pg_insert(orm.KBDocument).values(
                uuid=file_uuid, filename=filename, file_size_bytes=file_size,
                file_type=file_type, status=KBDocumentStatus.PROCESSING, checksum=checksum,
                uploaded_by_user_uuid=uploaded_by_user_uuid,
                playbook_strategies=strategies, updated_at=now, created_at=now,
            ).on_conflict_do_update(
                index_elements=[orm.KBDocument.uuid],
                set_={
                    "status": KBDocumentStatus.PROCESSING, "filename": filename,
                    "file_size_bytes": file_size, "file_type": file_type,
                    "playbook_strategies": strategies, "error_message": None,
                    "checksum": checksum, "updated_at": now,
                },
            )
            await conn.execute(stmt)
        logger.info("kb_document.ingestion_started file_uuid=%s type=%s strategies=%s",
                    file_uuid, file_type, strategies)

    async def update_tracking(self, file_uuid: _uuid.UUID, status: str, **extra: Any) -> None:
        status = getattr(status, "value", status)  # str-Enum renders as 'Class.NAME' under %s
        now = datetime.now(timezone.utc)
        async with self._ensure_engine().begin() as conn:
            stmt = (
                update(orm.KBDocument).where(orm.KBDocument.uuid == file_uuid)
                .values(status=status, updated_at=now, **extra)
                .returning(orm.KBDocument.uuid)
            )
            if not (await conn.execute(stmt)).fetchone():
                logger.info("kb_document.tracking_ignored file_uuid=%s status=%s", file_uuid, status)
                return
        logger.info("kb_document.tracking_update file_uuid=%s status=%s", file_uuid, status)
