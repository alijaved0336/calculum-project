from abc import ABC, abstractmethod

from domain.entities.api_entities import (
    BuyingEntity,
    BuyingEntityUltimateParent,
    Spend,
    SpendFileVersion,
    Supplier,
    SupplierUltimateParent,
    Tenant,
)


class RelationalStorePort(ABC):
    @abstractmethod
    async def connect(self) -> None: ...

    @abstractmethod
    async def close(self) -> None: ...

    @abstractmethod
    async def upsert_tenant(self, entity: Tenant) -> None: ...

    @abstractmethod
    async def upsert_tenants_batch(self, entities: list[Tenant]) -> None: ...

    @abstractmethod
    async def upsert_spend_file_version(self, entity: SpendFileVersion) -> None: ...

    @abstractmethod
    async def upsert_spend_file_versions_batch(self, entities: list[SpendFileVersion]) -> None: ...

    @abstractmethod
    async def upsert_supplier_ultimate_parent(self, entity: SupplierUltimateParent) -> None: ...

    @abstractmethod
    async def upsert_supplier_ultimate_parents_batch(self, entities: list[SupplierUltimateParent]) -> None: ...

    @abstractmethod
    async def upsert_supplier(self, entity: Supplier) -> None: ...

    @abstractmethod
    async def upsert_suppliers_batch(self, entities: list[Supplier]) -> None: ...

    @abstractmethod
    async def upsert_buying_entity_ultimate_parent(self, entity: BuyingEntityUltimateParent) -> None: ...

    @abstractmethod
    async def upsert_buying_entity_ultimate_parents_batch(self, entities: list[BuyingEntityUltimateParent]) -> None: ...

    @abstractmethod
    async def upsert_buying_entity(self, entity: BuyingEntity) -> None: ...

    @abstractmethod
    async def upsert_buying_entities_batch(self, entities: list[BuyingEntity]) -> None: ...

    @abstractmethod
    async def upsert_spend(self, entity: Spend) -> None: ...

    @abstractmethod
    async def upsert_spends_batch(self, entities: list[Spend]) -> None: ...
