import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from application.services.settings_provisioner import provision_all
from config import settings
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url


async def seed() -> None:
    engine = create_async_engine(sqlalchemy_asyncpg_url(settings.postgres_dsn))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            await provision_all(session)

    await engine.dispose()
    print("Seeded: platform settings + tenant settings backfill")


if __name__ == "__main__":
    asyncio.run(seed())
