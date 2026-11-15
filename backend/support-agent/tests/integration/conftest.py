"""Integration fixtures — a real Postgres with this repo's migrations applied.

Uses TEST_DATABASE_DSN if set, else spins up a throwaway Postgres via testcontainers.
Applies `alembic upgrade head` (isolated support_alembic_version lineage) once, then
yields a ChatStore bound to it.
"""
from __future__ import annotations

import os

import pytest
import pytest_asyncio


@pytest.fixture(scope="session")
def pg_dsn():
    dsn = os.getenv("TEST_DATABASE_DSN")
    if dsn:
        yield dsn.replace("postgresql+asyncpg://", "postgresql://")
        return
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:15") as pg:
        # get_connection_url() → postgresql+psycopg2://...; strip the driver for asyncpg.
        yield pg.get_connection_url().replace("+psycopg2", "")


@pytest.fixture(scope="session")
def _migrated(pg_dsn):
    from alembic import command
    from alembic.config import Config

    from config import settings

    # env.py reads settings.postgres_dsn at runtime, so point it at the test DB.
    settings.postgres_dsn = pg_dsn
    command.upgrade(Config("alembic.ini"), "head")
    return pg_dsn


@pytest_asyncio.fixture
async def chat_store(_migrated):
    from infrastructure.postgres.chat_store import ChatStore

    store = ChatStore(_migrated)
    try:
        yield store
    finally:
        await store.close()
