"""Fixtures for integration tests that hit a real local Postgres.

Uses TEST_DATABASE_DSN if set, else the local dev DB. Each test runs inside a
transaction that is rolled back, so the DB is never mutated. The schema is assumed
already migrated (alembic upgrade head) by the AI Negotiation repo, which owns it.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager

import pytest_asyncio
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

LOCAL_DSN = os.getenv(
    "TEST_DATABASE_DSN",
    "postgresql+asyncpg://calculum:calculum@127.0.0.1:5432/calculum",
)


@pytest_asyncio.fixture
async def pg_session():
    engine = create_async_engine(LOCAL_DSN)
    conn = await engine.connect()
    trans = await conn.begin()
    session = async_sessionmaker(bind=conn, expire_on_commit=False)()
    try:
        yield session
    finally:
        await session.close()
        await trans.rollback()
        await conn.close()
        await engine.dispose()


class _ConnEngineShim:
    """Makes ``adapter._ensure_engine().begin()/connect()`` reuse one test connection.

    The KBDocument mixin runs writes via ``engine.begin()`` on pooled connections.
    To keep a test rolled back, we bind those calls to the fixture's single
    connection and wrap each ``begin()`` in a SAVEPOINT so nothing is committed —
    the outer transaction is rolled back at teardown.
    """

    def __init__(self, conn) -> None:
        self._conn = conn

    def begin(self):
        conn = self._conn

        @asynccontextmanager
        async def _cm():
            async with conn.begin_nested():
                yield conn

        return _cm()

    def connect(self):
        conn = self._conn

        @asynccontextmanager
        async def _cm():
            yield conn

        return _cm()


@pytest_asyncio.fixture
async def pg_adapter():
    """A real PostgresAdapter whose reads/writes run on one rolled-back connection."""
    from infrastructure.postgres.postgres_adapter import PostgresAdapter

    engine = create_async_engine(LOCAL_DSN)
    conn = await engine.connect()
    trans = await conn.begin()

    adapter = PostgresAdapter(LOCAL_DSN)  # not connect()-ed; we bind it to `conn`
    adapter._engine = object()  # non-None so _ensure_engine() guard passes
    adapter._session_factory = async_sessionmaker(bind=conn, expire_on_commit=False)
    adapter._ensure_engine = lambda: _ConnEngineShim(conn)  # type: ignore[method-assign]
    try:
        yield adapter
    finally:
        await trans.rollback()
        await conn.close()
        await engine.dispose()


@pytest_asyncio.fixture
async def qdrant_mem():
    """Real Qdrant engine in-process (no Docker), with our collections created."""
    from qdrant_client import AsyncQdrantClient

    from infrastructure.vector_store.collections import ensure_collections

    client = AsyncQdrantClient(location=":memory:")
    await ensure_collections(client)
    try:
        yield client
    finally:
        await client.close()
