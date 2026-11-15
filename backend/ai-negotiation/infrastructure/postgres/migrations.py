from __future__ import annotations

import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.util.exc import CommandError
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


def alembic_config() -> Config:
    root = Path(__file__).resolve().parents[2]
    config = Config(str(root / "alembic.ini"))
    config.set_main_option("script_location", str(root / "migrations"))
    return config


async def upgrade_database(engine: AsyncEngine, revision: str = "head") -> None:
    config = alembic_config()
    async with engine.begin() as connection:
        await connection.run_sync(_upgrade, config, revision)


def _upgrade(connection, config: Config, revision: str) -> None:
    config.attributes["connection"] = connection
    try:
        command.upgrade(config, revision)
    except CommandError as exc:
        msg = str(exc)
        if "Can't locate revision" in msg:
            # Extract the unknown revision ID from the error message
            unknown = msg.split("'")[1] if "'" in msg else "unknown"
            raise RuntimeError(
                f"\n\n"
                f"  DATABASE MIGRATION MISMATCH\n"
                f"  The database is stamped with revision '{unknown}' which does not\n"
                f"  exist in the local migrations history.\n\n"
                f"  This usually means the DB was migrated from a different branch,\n"
                f"  or the migration file was deleted after it was applied.\n\n"
                f"  To fix — choose one:\n"
                f"    1. If the schema is already correct (stamp directly in DB):\n"
                f"         psql -c \"UPDATE alembic_version SET version_num = '<local_head_revision>';\"\n"
                f"       ('uv run alembic stamp head' won't work — it resolves the stale ID first)\n"
                f"    2. If the schema needs to be rebuilt:\n"
                f"         uv run alembic downgrade base && uv run alembic upgrade head\n"
            ) from exc
        raise
