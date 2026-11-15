from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from domain.ports.thread_port import ThreadPort
from infrastructure.postgres.models.message import Message as Message
from infrastructure.postgres.models.enums import MessageRoleEnum, ToneEnum
from infrastructure.postgres.models.message import Message
from infrastructure.postgres.models.thread import Thread
from infrastructure.postgres.models.thread_playbook import ThreadPlaybook
from infrastructure.postgres.models.thread_summary import ThreadSummary


class PostgresThreadAdapter(ThreadPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_thread(
        self,
        supplier_id: str,
        user_id: str,
        title: str,
        tone: str | None = None,
    ) -> Thread:
        tone_val: ToneEnum | None = ToneEnum(tone) if tone and tone in ToneEnum._value2member_map_ else None
        thread = Thread(
            supplier_uuid=uuid.UUID(supplier_id),
            user_uuid=uuid.UUID(user_id),
            title=title,
            tone=tone_val,
        )
        self._session.add(thread)
        await self._session.commit()
        await self._session.refresh(thread)
        return thread

    async def get_threads_by_supplier(
        self, supplier_id: str, limit: int = 50
    ) -> list[tuple[Thread, int, ThreadSummary | None]]:
        stmt = (
            select(Thread, func.count(Message.uuid).label("msg_count"))
            .outerjoin(Message, Message.thread_uuid == Thread.uuid)
            .where(Thread.supplier_uuid == uuid.UUID(supplier_id))
            .group_by(Thread.uuid)
            .order_by(desc(Thread.updated_at))
            .limit(limit)
        )
        rows = (await self._session.execute(stmt)).all()
        if not rows:
            return []

        thread_ids = [row.Thread.uuid for row in rows]
        summaries_stmt = (
            select(ThreadSummary)
            .where(ThreadSummary.thread_uuid.in_(thread_ids))
            .order_by(ThreadSummary.thread_uuid, desc(ThreadSummary.created_at))
        )
        all_summaries = (await self._session.execute(summaries_stmt)).scalars().all()
        latest: dict[uuid.UUID, ThreadSummary] = {}
        for s in all_summaries:
            if s.thread_uuid not in latest:
                latest[s.thread_uuid] = s

        return [(row.Thread, row.msg_count, latest.get(row.Thread.uuid)) for row in rows]

    async def get_messages(self, thread_id: str, limit: int = 200) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.thread_uuid == uuid.UUID(thread_id))
            .order_by(Message.created_at)
            .limit(limit)
        )
        return list((await self._session.execute(stmt)).scalars().all())

    async def get_recent_messages(self, thread_id: str, limit: int = 10) -> list[Message]:
        stmt = (
            select(Message)
            .where(Message.thread_uuid == uuid.UUID(thread_id))
            .order_by(desc(Message.created_at))
            .limit(limit)
        )
        rows = list((await self._session.execute(stmt)).scalars().all())
        return list(reversed(rows))

    async def get_latest_summary(self, thread_id: str) -> ThreadSummary | None:
        stmt = (
            select(ThreadSummary)
            .where(ThreadSummary.thread_uuid == uuid.UUID(thread_id))
            .order_by(desc(ThreadSummary.created_at))
            .limit(1)
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_thread(self, thread_id: str) -> Thread | None:
        return await self._session.get(Thread, uuid.UUID(thread_id))

    async def save_message(
        self,
        thread_id: str,
        role: str,
        content: str,
        tokens_in: int | None = None,
        tokens_out: int | None = None,
        source: dict | None = None,
        rag_sources: list[dict] | None = None,
    ) -> Message:
        msg = Message(
            thread_uuid=uuid.UUID(thread_id),
            role=MessageRoleEnum(role),
            content=content,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            source=source,
            rag_sources=rag_sources,
        )
        self._session.add(msg)
        thread = await self._session.get(Thread, uuid.UUID(thread_id))
        if thread:
            thread.updated_at = datetime.now(timezone.utc)
        await self._session.commit()
        await self._session.refresh(msg)
        return msg

    async def edit_message(
        self,
        thread_id: str,
        message_id: str,
        updated_content: str,
    ) -> list[Message]:
        message = await self._session.get(Message, uuid.UUID(message_id))
        if message is None or message.thread_uuid != uuid.UUID(thread_id):
            raise ValueError(f"Message {message_id} not found in thread {thread_id}")

        message.content = updated_content
        message.updated_at = datetime.now(timezone.utc)
        await self._session.flush()

        await self._session.execute(
            delete(Message).where(
                Message.thread_uuid == uuid.UUID(thread_id),
                Message.created_at > message.created_at,
            ).execution_options(synchronize_session=False)
        )
        await self._session.commit()
        await self._session.refresh(message)

        return await self.get_messages(thread_id)

    async def update_thread(
        self,
        thread_id: str,
        title: str | None = None,
        pinned: bool | None = None,
        reaction: bool | None = None,
    ) -> Thread:
        thread = await self._session.get(Thread, uuid.UUID(thread_id))
        if thread is None:
            raise ValueError(f"Thread {thread_id} not found")
        if title is not None:
            thread.title = title
        if pinned is not None:
            thread.pinned = pinned
        if reaction is not None:
            thread.reaction = reaction
        thread.updated_at = datetime.now(timezone.utc)
        await self._session.commit()
        await self._session.refresh(thread)
        return thread

    async def delete_thread(self, thread_id: str) -> None:
        thread_uuid = uuid.UUID(thread_id)
        thread = await self._session.get(Thread, thread_uuid)
        if thread is None:
            raise ValueError(f"Thread {thread_id} not found")

        await self._session.execute(
            delete(ThreadPlaybook).where(ThreadPlaybook.thread_uuid == thread_uuid)
        )
        await self._session.execute(
            delete(Message).where(Message.thread_uuid == thread_uuid)
        )
        await self._session.execute(
            delete(ThreadSummary).where(ThreadSummary.thread_uuid == thread_uuid)
        )
        await self._session.delete(thread)
        await self._session.commit()

    async def insert_thread_summary(
        self,
        thread_id: str,
        content: str,
        token_count: int | None = None,
        thread_name: str | None = None,
    ) -> ThreadSummary:
        summary = ThreadSummary(
            thread_uuid=uuid.UUID(thread_id),
            content=content,
            token_count=token_count,
            thread_name=thread_name,
        )
        self._session.add(summary)
        await self._session.commit()
        await self._session.refresh(summary)
        return summary

    async def set_thread_pinned(self, thread_id: str, pinned: bool) -> Thread | None:
        thread = await self._session.get(Thread, uuid.UUID(thread_id))
        if thread is None:
            return None
        thread.pinned = pinned
        thread.updated_at = datetime.now(timezone.utc)
        await self._session.commit()
        await self._session.refresh(thread)
        return thread

