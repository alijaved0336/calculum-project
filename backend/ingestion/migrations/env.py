raise SystemExit(
    "\n"
    "  Database migrations are NOT managed in this repo (ingestion-calculum).\n"
    "  The Postgres schema is owned by the AI Negotiation repo.\n\n"
    "  Run Alembic there instead:\n"
    "      cd ../AI%20Negotiation && uv run alembic <command>\n"
)
