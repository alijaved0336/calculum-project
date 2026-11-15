"""Alembic environment — scoped to THIS repo's own chat tables only.

Migrations are hand-written (``target_metadata = None`` — no ORM/autogenerate; the repo
stays asyncpg-only). A dedicated ``version_table`` isolates this repo's migration state
from the shared ``alembic_version`` table (AI Negotiation) and ``ingestion_alembic_version``
(ingestion) in the same DB, so this lineage has its own head that never conflicts with theirs.
Async engine, DSN from settings.
"""
from __future__ import annotations

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from config import settings
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url

config = context.config
target_metadata = None  # hand-written migrations only

# Our own version-tracking table, so this repo's migration state is fully isolated from the
# shared ``alembic_version`` (AI Negotiation) and ``ingestion_alembic_version`` lineages.
VERSION_TABLE = "support_alembic_version"


def do_run_migrations(connection) -> None:
    context.configure(
        connection=connection, target_metadata=target_metadata, version_table=VERSION_TABLE
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    section = config.get_section(config.config_ini_section, {})
    section["sqlalchemy.url"] = sqlalchemy_asyncpg_url(settings.postgres_dsn)
    connectable = async_engine_from_config(section, prefix="sqlalchemy.", poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_offline() -> None:
    context.configure(
        url=sqlalchemy_asyncpg_url(settings.postgres_dsn),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        version_table=VERSION_TABLE,
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
elif config.attributes.get("connection") is not None:
    do_run_migrations(config.attributes["connection"])
else:
    import asyncio

    asyncio.run(run_migrations_online())
