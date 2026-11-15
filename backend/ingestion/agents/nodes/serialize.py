from __future__ import annotations
import hashlib
from langchain_core.documents import Document
from domain.entities import (
    BuyingEntity, BuyingEntityUltimateParent, EntityType,
    Spend, SpendFileVersion, Supplier, SupplierUltimateParent, Tenant,
)
from infrastructure.chunking.entity_serializer import EntitySerializer

_serializer = EntitySerializer()

_ENTITY_TYPE_MAP = {
    Tenant: EntityType.TENANT,
    SpendFileVersion: EntityType.SPEND_FILE_VERSION,
    Spend: EntityType.SPEND,
    Supplier: EntityType.SUPPLIER,
    SupplierUltimateParent: EntityType.SUPPLIER_ULTIMATE_PARENT,
    BuyingEntity: EntityType.BUYING_ENTITY,
    BuyingEntityUltimateParent: EntityType.BUYING_ENTITY_ULTIMATE_PARENT,
}

def _uuid_of(e):
    for attr in ("spend_uuid", "uuid"):
        if hasattr(e, attr): return getattr(e, attr)
    return ""

def _name_of(e):
    for attr in ("alias", "name", "tenant_id"):
        if hasattr(e, attr):
            val = getattr(e, attr)
            if val: return val
    return ""

def _tenant_id_of(e):
    from domain.entities import Tenant
    if isinstance(e, Tenant): return e.tenant_id
    return getattr(e, "tenant_id", "")

def _sfv_uuid_of(e):
    from domain.entities import Tenant, SpendFileVersion, Spend
    if isinstance(e, (Tenant, SpendFileVersion)): return ""
    if isinstance(e, Spend): return e.spend_file_version_uuid
    return getattr(e, "spend_file_version_uuid", "")


def entity_to_document(entity: object) -> Document:
    text = _serializer.serialize(entity)
    entity_type = _ENTITY_TYPE_MAP.get(type(entity))
    return Document(
        page_content=text,
        metadata={
            "source": "api",
            "entity_type": entity_type.value if entity_type else None,
            "entity_uuid": _uuid_of(entity),
            "entity_name": _name_of(entity),
            "tenant_id": _tenant_id_of(entity),
            "sfv_uuid": _sfv_uuid_of(entity),
            "ada_updated_at": getattr(entity, "ada_updated_at", ""),
        },
    )

def make_chunk_id(metadata: dict, chunk_index: int) -> str:
    key = f"{metadata.get('tenant_id','')}:{metadata.get('entity_type','')}:{metadata.get('entity_uuid','')}:{chunk_index}"
    return hashlib.md5(key.encode()).hexdigest()
