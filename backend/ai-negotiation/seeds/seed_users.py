import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from config import settings
from infrastructure.auth.password import hash_password
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url
from sqlalchemy.dialects.postgresql import insert as pg_insert

from application.services.settings_provisioner import provision_settings_for_user
from infrastructure.postgres.models import Tenant, User
from infrastructure.postgres.models.enums import UserRoleEnum

TENANT_UUID = uuid.UUID("4a9f1e22-7b3c-4f01-a0d4-5e8c1b2f9a01")


async def seed() -> None:
    engine = create_async_engine(sqlalchemy_asyncpg_url(settings.postgres_dsn))
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            await session.execute(delete(User))
            await session.execute(
                pg_insert(Tenant).values(
                    uuid=TENANT_UUID,
                    tenant_id="calculum",
                    name="Calculum",
                    country="UK",
                    ada_updated_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                ).on_conflict_do_nothing(index_elements=["uuid"])
            )
            users = [
                User(
                    email="admin@calculum.ai",
                    display_name="Admin",
                    password_hash=hash_password(settings.seed_admin_password),
                    role=UserRoleEnum.admin,
                    tenant_uuid=TENANT_UUID,
                ),
                User(
                    email="user@calculum.ai",
                    display_name="User",
                    password_hash=hash_password(settings.seed_user_password),
                    role=UserRoleEnum.user,
                    tenant_uuid=TENANT_UUID,
                ),
                User(
                    email="global@calculum.com",
                    display_name="Global User",
                    password_hash=hash_password(settings.seed_global_user_password),
                    role=UserRoleEnum.global_platform_admin,
                    tenant_uuid=None,
                ),
            ]
            session.add_all(users)
            await session.flush()
            for user in users:
                await provision_settings_for_user(
                    session,
                    tenant_uuid=user.tenant_uuid,
                    role=user.role.value,
                )

    await engine.dispose()
    print("Seeded: 2 tenant users, 1 platform admin (+ settings provisioned)")


if __name__ == "__main__":
    asyncio.run(seed())
