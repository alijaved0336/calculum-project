import asyncio

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from application.services.settings_provisioner import SettingsProvisioner
from config import settings
from infrastructure.postgres.adapters.pg_settings_adapter import PostgresSettingsAdapter
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url


async def backfill() -> None:
    engine = create_async_engine(sqlalchemy_asyncpg_url(settings.postgres_dsn))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            port = PostgresSettingsAdapter(session=session)
            provisioner = SettingsProvisioner(port)
            await provisioner.provision_platform()
            created = await provisioner.backfill_tenants()

    await engine.dispose()
    print(f"Backfill complete: {created} tenant settings row(s) created")


if __name__ == "__main__":
    asyncio.run(backfill())
