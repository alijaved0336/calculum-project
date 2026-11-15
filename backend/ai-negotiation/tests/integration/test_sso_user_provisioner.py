"""ensure_sso_user against a real, migrated Postgres.

Skipped unless TEST_POSTGRES_DSN points at a throwaway database already at
alembic head (never a shared one: the test inserts and deletes rows).
"""
from __future__ import annotations

import os
import uuid

import pytest
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from application.services.sso_user_provisioner import ensure_sso_user
from infrastructure.postgres.adapters.pg_thread_adapter import PostgresThreadAdapter
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url
from infrastructure.postgres.models import Settings, Tenant, Thread, User

DSN = os.environ.get("TEST_POSTGRES_DSN")
pytestmark = pytest.mark.skipif(not DSN, reason="TEST_POSTGRES_DSN not set")

SLUG = f"sso-test-{uuid.uuid4().hex[:8]}"
SUPPLIER = "67c736b9-75cc-415e-8c8d-23867047b3a5"  # from seeds/seed_dev_tenant.py


@pytest.fixture
async def session():
    engine = create_async_engine(sqlalchemy_asyncpg_url(DSN))
    factory = async_sessionmaker(engine, expire_on_commit=False)
    tenant_uuid = uuid.uuid4()
    async with factory() as s:
        s.add(Tenant(uuid=tenant_uuid, tenant_id=SLUG, name="SSO test", country="US"))
        await s.commit()
    async with factory() as s:
        yield s
    async with factory() as s:
        test_users = select(User.uuid).where(User.tenant_uuid == tenant_uuid)
        await s.execute(delete(Thread).where(Thread.user_uuid.in_(test_users)))
        await s.execute(delete(User).where(User.tenant_uuid == tenant_uuid))
        await s.execute(delete(Settings).where(Settings.tenant_uuid == tenant_uuid))
        await s.execute(delete(Tenant).where(Tenant.uuid == tenant_uuid))
        await s.commit()
    await engine.dispose()


async def _row(session: AsyncSession, user_id: str) -> User | None:
    return (await session.execute(select(User).where(User.uuid == uuid.UUID(user_id)))).scalar_one_or_none()


async def test_tenant_user_is_created_with_settings_and_can_own_a_thread(session):
    oid = str(uuid.uuid4())
    assert await ensure_sso_user(
        session, user_id=oid, email="Ada@Example.com", display_name="Ada", role="user", tenant_slug=SLUG
    )
    row = await _row(session, oid)
    assert (row.email, row.display_name, row.role.value, row.password_hash) == (
        "ada@example.com", "Ada", "user", None,
    )
    tenant_settings = (await session.execute(
        select(Settings).where(Settings.tenant_uuid == row.tenant_uuid)
    )).scalar_one_or_none()
    assert tenant_settings is not None

    thread = await PostgresThreadAdapter(session).create_thread(SUPPLIER, oid, "t")
    assert thread.user_uuid == uuid.UUID(oid)


async def test_second_call_is_a_no_op(session):
    oid = str(uuid.uuid4())
    kwargs = dict(user_id=oid, email="b@example.com", display_name=None, role="user", tenant_slug=SLUG)
    assert await ensure_sso_user(session, **kwargs)
    assert await ensure_sso_user(session, **kwargs)
    count = (await session.execute(select(User).where(User.uuid == uuid.UUID(oid)))).all()
    assert len(count) == 1


async def test_platform_admin_needs_no_tenant(session):
    oid = str(uuid.uuid4())
    assert await ensure_sso_user(
        session, user_id=oid, email=f"{oid}@x.co", display_name=None,
        role="global_platform_admin", tenant_slug=None,
    )
    row = await _row(session, oid)
    assert row.tenant_uuid is None
    await session.execute(delete(User).where(User.uuid == uuid.UUID(oid)))
    await session.commit()


async def test_same_email_in_the_tenant_is_refused_without_raising(session):
    first, second = str(uuid.uuid4()), str(uuid.uuid4())
    common = dict(email="dup@example.com", display_name=None, role="user", tenant_slug=SLUG)
    assert await ensure_sso_user(session, user_id=first, **common)
    assert await ensure_sso_user(session, user_id=second, **common) is False
    assert await _row(session, second) is None


async def test_missing_email_gets_a_placeholder(session):
    oid = str(uuid.uuid4())
    assert await ensure_sso_user(
        session, user_id=oid, email=None, display_name=None, role="user", tenant_slug=SLUG
    )
    assert (await _row(session, oid)).email == f"{oid}@sso.invalid"
