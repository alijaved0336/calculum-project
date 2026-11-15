def sqlalchemy_asyncpg_url(dsn: str) -> str:
    return "postgresql+asyncpg://" + dsn.removeprefix("postgresql://")
