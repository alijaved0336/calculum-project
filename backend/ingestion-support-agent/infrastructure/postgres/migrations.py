from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


async def upgrade_database(engine: AsyncEngine, revision: str = "head") -> None:
    """Failsafe no-op. Migrations are no longer managed in this repo.

    The Alembic setup moved to the **AI Negotiation** repo, which owns the
    shared Postgres schema. This function keeps its signature so existing
    callers (startup, seed/test scripts) don't break, but only warns instead
    of migrating.
    """
    logger.warning(
        "\n\n"
        "  DATABASE MIGRATIONS ARE NOT MANAGED IN THIS REPO (ingestion-calculum).\n"
        "  The Postgres schema is owned by the AI Negotiation repo.\n"
        "  Apply migrations there before running this service:\n\n"
        "      cd ../AI%20Negotiation && alembic upgrade head\n\n"
        "  Skipping migrate here.\n"
    )
