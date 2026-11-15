from abc import ABC, abstractmethod
from typing import Any


class SupplierDataPort(ABC):
    """Contract for fetching supplier profiles and risk data."""

    @abstractmethod
    async def get_supplier(self, supplier_id: str) -> dict[str, Any] | None:
        """Fetch a single supplier's profile and risk data by ID."""
        ...

    @abstractmethod
    async def list_suppliers(
        self,
        tenant_id: str,
        limit: int = 200,
        offset: int = 0,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        """Return a paginated list of the caller's suppliers."""
        ...

    @abstractmethod
    async def get_supplier_context(
        self, supplier_uuid: str, tenant_id: str
    ) -> dict[str, Any]:
        """Return the full supplier context dict for a given supplier and tenant."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Return True if the upstream supplier data source is reachable."""
        ...
