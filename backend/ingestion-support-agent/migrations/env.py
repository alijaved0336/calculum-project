"""Alembic environment — scoped to this repo's own tables only.

``target_metadata`` is ``IngestionBase.metadata``, which contains only
``video_kb_documents``. Alembic here can therefore never autogenerate or drop the
shared AI-Negotiation schema (``kb_documents``, ``users``, …). Async engine, DSN from
settings.
"""
from __future__ import annotations

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from config import settings
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url
from infrastructure.postgres.models.ingestion_base import IngestionBase
import infrastructure.postgres.models.video_kb_document  # noqa: F401 — register the table

config = context.config
target_metadata = IngestionBase.metadata


# Our own version-tracking table, so this repo's migration state is fully isolated from
# the shared ``alembic_version`` table that the AI Negotiation repo manages in the same DB.
VERSION_TABLE = "ingestion_alembic_version"


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
