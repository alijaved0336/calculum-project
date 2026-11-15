from __future__ import annotations

from abc import ABC, abstractmethod
from uuid import UUID

from domain.entities.settings import (
    GlobalSettingsPatch,
    SettingsBundle,
    SettingsRecord,
    TenantGlobalStrategyGrid,
    TenantSettingsPatch,
)


class SettingsPort(ABC):

    @abstractmethod
    async def resolve_tenant_uuid(self, tenant_id: str) -> UUID | None:
        """Resolve tenant slug (tenant_id) to tenants.uuid."""
        ...

    @abstractmethod
    async def get_global_settings(self) -> SettingsRecord:
        ...

    @abstractmethod
    async def get_global_bundle(self) -> SettingsBundle:
        ...

    @abstractmethod
    async def get_tenant_settings(self, tenant_uuid: UUID) -> SettingsRecord:
        ...

    @abstractmethod
    async def get_tenant_bundle(
        self,
        tenant_uuid: UUID,
        *,
        include_kb_documents: bool = False,
    ) -> SettingsBundle:
        ...

    @abstractmethod
    async def list_tenant_global_strategies(self) -> TenantGlobalStrategyGrid:
        ...

    @abstractmethod
    async def update_global_settings(
        self,
        patch: GlobalSettingsPatch,
        *,
        actor_display: str | None = None,
    ) -> SettingsRecord:
        ...

    @abstractmethod
    async def update_tenant_settings(
        self,
        tenant_uuid: UUID,
        patch: TenantSettingsPatch,
        *,
        actor_role: str,
        actor_display: str | None = None,
    ) -> SettingsBundle:
        ...

    @abstractmethod
    async def provision_platform_settings(self) -> SettingsRecord:
        ...

    @abstractmethod
    async def provision_tenant_settings(self, tenant_uuid: UUID) -> SettingsRecord:
        ...

    @abstractmethod
    async def backfill_missing_tenant_settings(self) -> int:
        """Provision settings for tenants missing a row. Returns count created."""
        ...

    @abstractmethod
    async def get_kb_document_filenames(self, uuids: list[str]) -> dict[str, str]:
        """Return {str(uuid): filename} for the given kb_documents UUIDs."""
        ...
