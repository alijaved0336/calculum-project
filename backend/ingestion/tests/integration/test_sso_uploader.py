"""ensure_sso_uploader against a real Postgres already at AI Negotiation's alembic head.

Skipped unless TEST_POSTGRES_DSN points at a throwaway database: it inserts and
deletes rows. Proves the point of the feature: kb_documents accepts an SSO
uploader only once a `users` row exists.
"""
from __future__ import annotations

import os
import uuid

import pytest
from sqlalchemy import delete, select

from application.sso_user import ensure_sso_uploader
from infrastructure.postgres import PostgresAdapter
from infrastructure.postgres.models import KBDocument, User

DSN = os.environ.get("TEST_POSTGRES_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="TEST_POSTGRES_DSN not set")


@pytest.fixture
async def pg():
    adapter = PostgresAdapter(DSN, pool_size=2, max_overflow=0, echo=False, connect_timeout=10.0)
    await adapter.connect()
    created: list[uuid.UUID] = []
    yield adapter, created
    async with adapter.sessionmaker()() as s:
        await s.execute(delete(KBDocument).where(KBDocument.uploaded_by_user_uuid.in_(created)))
        await s.execute(delete(User).where(User.uuid.in_(created)))
        await s.commit()
    await adapter.close()


async def test_kb_document_insert_fails_without_a_row_and_works_after_provisioning(pg):
    adapter, created = pg
    oid = uuid.uuid4()
    created.append(oid)
    file_uuid = uuid.uuid4()

    with pytest.raises(Exception, match="foreign key|violates"):
        await adapter.mark_ingestion_started(file_uuid, "a.pdf", oid)

    assert await ensure_sso_uploader(
        adapter.sessionmaker(), user_id=str(oid), email="Ada@Example.com",
        display_name="Ada", role="global_platform_admin",
    )
    await adapter.mark_ingestion_started(file_uuid, "a.pdf", oid)

    async with adapter.sessionmaker()() as s:
        user = (await s.execute(select(User).where(User.uuid == oid))).scalar_one()
        doc = (await s.execute(select(KBDocument).where(KBDocument.uuid == file_uuid))).scalar_one()
    assert (user.email, user.role.value, user.tenant_uuid, user.password_hash) == (
        "ada@example.com", "global_platform_admin", None, None,
    )
    assert doc.uploaded_by_user_uuid == oid


async def test_a_tenant_role_without_a_row_is_not_created(pg):
    adapter, created = pg
    oid = uuid.uuid4()
    created.append(oid)
    assert await ensure_sso_uploader(
        adapter.sessionmaker(), user_id=str(oid), email="x@example.com",
        display_name=None, role="admin",
    ) is False
    async with adapter.sessionmaker()() as s:
        assert (await s.execute(select(User).where(User.uuid == oid))).scalar_one_or_none() is None
