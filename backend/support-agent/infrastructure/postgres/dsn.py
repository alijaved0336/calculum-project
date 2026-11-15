def sqlalchemy_asyncpg_url(dsn: str) -> str:
    """Normalize a plain ``postgresql://`` DSN to the SQLAlchemy asyncpg form used by
    the Alembic async engine. Idempotent if already prefixed."""
    return "postgresql+asyncpg://" + dsn.removeprefix("postgresql+asyncpg://").removeprefix(
        "postgresql://"
    )
