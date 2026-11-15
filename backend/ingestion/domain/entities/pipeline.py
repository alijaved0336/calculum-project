from __future__ import annotations
import uuid as _uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class EntityType(str, Enum):
    TENANT = "tenant"
    SPEND_FILE_VERSION = "spend_file_version"
    SPEND = "spend"
    SUPPLIER = "supplier"
    SUPPLIER_ULTIMATE_PARENT = "supplier_ultimate_parent"
    BUYING_ENTITY = "buying_entity"
    BUYING_ENTITY_ULTIMATE_PARENT = "buying_entity_ultimate_parent"


class KBDocumentStatus(str, Enum):
    """KB-document tracking statuses, one per ingestion pipeline phase."""

    PROCESSING = "Processing"
    PARSED = "Parsed"
    CHUNKED = "Chunked"
    UPSERTED = "Upserted"
    EMPTY = "Empty"
    FAILED = "Failed"


class AdabotIngestionLogStatus(str, Enum):
    """Lifecycle of one scheduler-triggered Adabot ingestion."""

    PROCESSING = "Processing"
    COMPLETED = "Completed"


class FileIngestStatus(str, Enum):
    """Public, frontend-facing ingestion lifecycle statuses streamed over SSE."""

    UPLOADED = "uploaded"
    PARSING = "parsing"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    INDEXING = "indexing"
    COMPLETED = "completed"
    DUPLICATED = "duplicated"
    FAILED = "failed"

    @property
    def is_terminal(self) -> bool:
        return self in (
            FileIngestStatus.COMPLETED,
            FileIngestStatus.DUPLICATED,
            FileIngestStatus.FAILED,
        )


class FeedName(str, Enum):
    TENANTS = "tenants"
    SPEND_FILE_VERSIONS = "spend_file_versions"
    SPENDS = "spends"
    SUPPLIERS = "suppliers"
    SUPPLIER_ULTIMATE_PARENTS = "supplier_ultimate_parents"
    BUYING_ENTITIES = "buying_entities"
    BUYING_ENTITY_ULTIMATE_PARENTS = "buying_entity_ultimate_parents"

@dataclass
class SyncCursor:
    feed: FeedName
    updated_after: Optional[str] = None


@dataclass
class DocumentChunk:
    content: str
    metadata: dict = field(default_factory=dict)
    chunk_id: str = field(default_factory=lambda: str(_uuid.uuid4()))
