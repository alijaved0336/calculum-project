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

from sqlalchemy import and_, delete, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from config import settings as _settings
from infrastructure.postgres.models.video_kb_document import VideoKBDocument

logger = logging.getLogger(__name__)


class KBDocumentMixin:
    """KB-document reads/writes used by the ingestion pipeline tracking."""

    async def get_uuid_by_filename(self, filename: str) -> _uuid.UUID | None:
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(VideoKBDocument.uuid)
                .where(VideoKBDocument.filename == filename)
                .order_by(VideoKBDocument.created_at.desc())
                .limit(1)
            )
            return result.scalar()

    async def delete_kb_document(self, file_uuid: _uuid.UUID) -> None:
        async with self._ensure_engine().begin() as conn:
            await conn.execute(delete(VideoKBDocument).where(VideoKBDocument.uuid == file_uuid))
        logger.info("kb_document.deleted file_uuid=%s", file_uuid)

    async def get_document_status(self, file_uuid: _uuid.UUID) -> str | None:
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(VideoKBDocument.status).where(VideoKBDocument.uuid == file_uuid)
            )
            return result.scalar()

    async def get_kb_document(self, file_uuid: _uuid.UUID) -> dict | None:
        """Return a video's status row (or None) for GET /videos/{id}."""
        async with self.sessionmaker()() as session:
            row = (
                await session.execute(
                    select(
                        VideoKBDocument.uuid,
                        VideoKBDocument.status,
                        VideoKBDocument.media_type,
                        VideoKBDocument.title,
                        VideoKBDocument.doc_metadata,
                        VideoKBDocument.chunk_count,
                        VideoKBDocument.created_at,
                        VideoKBDocument.updated_at,
                        VideoKBDocument.video_status,
                        VideoKBDocument.transcript_status,
                        VideoKBDocument.document_status,
                        VideoKBDocument.is_public,
                    ).where(VideoKBDocument.uuid == file_uuid)
                )
            ).first()
        if row is None:
            return None
        return {
            "video_id": str(row[0]),
            "status": row[1],
            "media_type": row[2],
            "title": row[3],
            "metadata": row[4] or {},
            "chunk_count": row[5],
            "created_at": row[6].isoformat() if row[6] else None,
            "updated_at": row[7].isoformat() if row[7] else None,
            "video_status": row[8],
            "transcript_status": row[9],
            "document_status": row[10],
            "is_public": bool(row[11]),
        }

    async def get_document_metadata(self, file_uuid: _uuid.UUID) -> dict | None:
        """Return the JSONB ``metadata`` for a kb_document (None if the row is absent).

        Used by video ingestion to read the already-uploaded video's ``gcs_object``
        and ``duration_ms`` (written by the support-agent ``/videos`` endpoint).
        """
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(VideoKBDocument.doc_metadata).where(VideoKBDocument.uuid == file_uuid)
            )
            row = result.first()
            return (row[0] or {}) if row is not None else None

    async def merge_document_metadata(self, file_uuid: _uuid.UUID, patch: dict) -> None:
        """Shallow-merge ``patch`` into the JSONB ``metadata`` without clobbering it."""
        async with self._ensure_engine().begin() as conn:
            current = (
                await conn.execute(
                    select(VideoKBDocument.doc_metadata).where(VideoKBDocument.uuid == file_uuid)
                )
            ).scalar() or {}
            merged = {**current, **patch}
            await conn.execute(
                update(VideoKBDocument)
                .where(VideoKBDocument.uuid == file_uuid)
                .values(doc_metadata=merged)
            )

    async def create_video_row(
        self, video_id: _uuid.UUID, title: str | None, metadata: dict, uploaded_by: str | None = None
    ) -> None:
        """Create/refresh the kb_documents row for an uploaded video (status 'uploading').

        ``uploaded_by`` is the authenticated uploader's id (JWT ``sub``); falls back to
        settings.uploaded_by. Must reference an existing users row (FK).
        """
        now = datetime.now(timezone.utc)
        raw_uploader = uploaded_by or _settings.uploaded_by or None
        uploader = (
            raw_uploader if isinstance(raw_uploader, _uuid.UUID)
            else _uuid.UUID(str(raw_uploader)) if raw_uploader else None
        )
        async with self._ensure_engine().begin() as conn:
            stmt = pg_insert(VideoKBDocument).values(
                uuid=video_id,
                uploaded_by_user_uuid=uploader,
                filename=metadata.get("gcs_object", f"{video_id}.mp4"),
                media_type="video",
                title=title,
                doc_metadata=metadata,
                status="uploading",
                video_status="processing",
                created_at=now,
                updated_at=now,
            ).on_conflict_do_update(
                index_elements=[VideoKBDocument.uuid],
                set_={
                    # Column objects as keys — doc_metadata maps to the DB column "metadata".
                    VideoKBDocument.media_type: "video",
                    VideoKBDocument.title: title,
                    VideoKBDocument.doc_metadata: metadata,
                    VideoKBDocument.status: "uploading",
                    VideoKBDocument.video_status: "processing",
                    VideoKBDocument.updated_at: now,
                },
            )
            await conn.execute(stmt)
        logger.info("kb_document.video_row_created video_id=%s", video_id)

    async def create_document_row(
        self, file_id: _uuid.UUID, title: str | None, metadata: dict,
        uploaded_by: str | None = None, is_public: bool = False,
    ) -> None:
        """Create/refresh the row for a general document upload (media_type 'document')."""
        now = datetime.now(timezone.utc)
        raw_uploader = uploaded_by or _settings.uploaded_by or None
        uploader = (
            raw_uploader if isinstance(raw_uploader, _uuid.UUID)
            else _uuid.UUID(str(raw_uploader)) if raw_uploader else None
        )
        async with self._ensure_engine().begin() as conn:
            stmt = pg_insert(VideoKBDocument).values(
                uuid=file_id,
                uploaded_by_user_uuid=uploader,
                filename=(title or str(file_id)),
                media_type="document",
                title=title,
                is_public=is_public,
                doc_metadata=metadata,
                status="uploading",
                document_status="processing",
                created_at=now,
                updated_at=now,
            ).on_conflict_do_update(
                index_elements=[VideoKBDocument.uuid],
                set_={
                    VideoKBDocument.media_type: "document",
                    VideoKBDocument.title: title,
                    VideoKBDocument.is_public: is_public,
                    VideoKBDocument.doc_metadata: metadata,
                    VideoKBDocument.status: "uploading",
                    VideoKBDocument.document_status: "processing",
                    VideoKBDocument.updated_at: now,
                },
            )
            await conn.execute(stmt)
        logger.info("kb_document.document_row_created file_id=%s is_public=%s", file_id, is_public)

    async def set_video_status(
        self, file_uuid: _uuid.UUID, video_status: str, status: str | None = None, **extra: Any
    ) -> None:
        """Update the granular ``video_status`` (+ optional coarse ``status``) in one UPDATE.

        ``**extra`` passes through other columns (e.g. ``error_message``, ``chunk_count``).
        """
        await self._set_status(file_uuid, video_status=video_status, status=status, **extra)

    async def set_transcript_status(
        self, file_uuid: _uuid.UUID, transcript_status: str, status: str | None = None, **extra: Any
    ) -> None:
        """Update the granular ``transcript_status`` (+ optional coarse ``status``) in one UPDATE."""
        await self._set_status(file_uuid, transcript_status=transcript_status, status=status, **extra)

    async def set_document_status(
        self, file_uuid: _uuid.UUID, document_status: str, status: str | None = None, **extra: Any
    ) -> None:
        """Update the granular ``document_status`` (+ optional coarse ``status``) in one UPDATE."""
        await self._set_status(file_uuid, document_status=document_status, status=status, **extra)

    async def _set_status(self, file_uuid: _uuid.UUID, status: str | None = None, **fields: Any) -> None:
        now = datetime.now(timezone.utc)
        values = {k: v for k, v in fields.items() if v is not None}
        if status is not None:
            values["status"] = status
        values["updated_at"] = now
        async with self._ensure_engine().begin() as conn:
            await conn.execute(
                update(VideoKBDocument).where(VideoKBDocument.uuid == file_uuid).values(**values)
            )
        logger.info("kb_document.status_update file_uuid=%s %s", file_uuid,
                    {k: v for k, v in values.items() if k != "updated_at"})

    async def kb_document_exists(self, file_uuid: _uuid.UUID) -> bool:
        async with self.sessionmaker()() as session:
            result = await session.execute(
                select(VideoKBDocument.uuid).where(VideoKBDocument.uuid == file_uuid)
            )
            return result.scalar() is not None

    async def update_kb_document(self, file_uuid: _uuid.UUID, **fields: Any) -> None:
        async with self._ensure_engine().begin() as conn:
            await conn.execute(
                update(VideoKBDocument).where(VideoKBDocument.uuid == file_uuid).values(**fields)
            )

    async def mark_ingestion_started(
        self,
        file_uuid: _uuid.UUID,
        filename: str,
        file_size: int | None = None,
        file_type: str | None = None,
        playbook_strategies: list[str] | None = None,  # accepted for signature compat; unused here
    ) -> None:
        now = datetime.now(timezone.utc)
        # Ingest always runs against an EXISTING row (uploader was set at upload time by
        # create_video_row/create_document_row). UPDATE its start bookkeeping in place — never INSERT.
        # An INSERT/ON CONFLICT would carry a null uploader, and PostgreSQL checks the NOT NULL
        # constraint on the proposed tuple BEFORE conflict arbitration, so it would fail even though
        # the row exists. UPDATE never touches uploaded_by_user_uuid, so it's preserved.
        async with self._ensure_engine().begin() as conn:
            stmt = (
                update(VideoKBDocument)
                .where(VideoKBDocument.uuid == file_uuid)
                .values(
                    status="Processing", filename=filename, file_size_bytes=file_size,
                    file_type=file_type, error_message=None, updated_at=now,
                )
                .returning(VideoKBDocument.uuid)
            )
            if (await conn.execute(stmt)).fetchone() is None:
                logger.warning(
                    "kb_document.mark_started_no_row file_uuid=%s (expected an existing row)", file_uuid
                )
                return
        logger.info("kb_document.ingestion_started file_uuid=%s type=%s", file_uuid, file_type)

    async def update_tracking(self, file_uuid: _uuid.UUID, status: str, **extra: Any) -> None:
        now = datetime.now(timezone.utc)
        where = (
            VideoKBDocument.uuid == file_uuid
            if status == "Deleted"
            else and_(VideoKBDocument.uuid == file_uuid, VideoKBDocument.status != "Deleted")
        )
        async with self._ensure_engine().begin() as conn:
            stmt = (
                update(VideoKBDocument).where(where)
                .values(status=status, updated_at=now, **extra)
                .returning(VideoKBDocument.uuid)
            )
            if not (await conn.execute(stmt)).fetchone():
                logger.info("kb_document.tracking_ignored file_uuid=%s status=%s", file_uuid, status)
                return
        logger.info("kb_document.tracking_update file_uuid=%s status=%s", file_uuid, status)
