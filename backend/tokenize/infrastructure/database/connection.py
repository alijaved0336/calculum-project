from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from config import settings
import infrastructure.postgres.models  # noqa: F401 — registers User + Tenant with the mapper


def _build_dsn() -> str:
    raw = settings.postgres_dsn or (
        f"postgresql+asyncpg://{settings.postgres_user}:{settings.postgres_password}"
        f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
    )
    # normalize plain postgresql:// or postgres:// to always use asyncpg driver
    for prefix in ("postgresql://", "postgres://"):
        if raw.startswith(prefix):
            return "postgresql+asyncpg://" + raw[len(prefix):]
    return raw


_engine = create_async_engine(_build_dsn(), echo=False)
AsyncSessionLocal = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
