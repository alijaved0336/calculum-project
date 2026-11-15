from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from domain.ports.settings_port import SettingsPort
from infrastructure.postgres.adapters.pg_settings_adapter import PostgresSettingsAdapter


class SettingsProvisioner:
    def __init__(self, port: SettingsPort) -> None:
        self._port = port

    async def provision_platform(self):
        return await self._port.provision_platform_settings()

    async def provision_tenant(self, tenant_uuid: uuid.UUID):
        return await self._port.provision_tenant_settings(tenant_uuid)

    async def backfill_tenants(self) -> int:
        return await self._port.backfill_missing_tenant_settings()

    async def provision_for_user(
        self,
        *,
        tenant_uuid: uuid.UUID | None,
        role: str,
    ) -> None:
        """Ensure settings exist when a user is created.

        Settings are per-tenant (not per-user). Tenant users share one settings row;
        creating a user ensures the global row and their tenant row exist with defaults.
        """
        await self.provision_platform()
        if role == "global_platform_admin":
            return
        if tenant_uuid is None:
            raise ValueError("Tenant admin/user must have tenant_uuid")
        await self.provision_tenant(tenant_uuid)


async def provision_settings_for_user(
    session: AsyncSession,
    *,
    tenant_uuid: uuid.UUID | None,
    role: str,
) -> None:
    port = PostgresSettingsAdapter(session=session)
    await SettingsProvisioner(port).provision_for_user(tenant_uuid=tenant_uuid, role=role)


async def provision_all(session: AsyncSession) -> None:
    port = PostgresSettingsAdapter(session=session)
    provisioner = SettingsProvisioner(port)
    await provisioner.provision_platform()
    await provisioner.backfill_tenants()
