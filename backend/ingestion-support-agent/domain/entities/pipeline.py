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

    PARSED = "Parsed"
    CHUNKED = "Chunked"
    UPSERTED = "Upserted"
    EMPTY = "Empty"
    FAILED = "Failed"


class VideoStatus(str, Enum):
    """Granular video-upload lifecycle (video_kb_documents.video_status).

    Direct-upload flow: awaiting_upload → uploaded → compressing → ready (or failed).
    Legacy multipart flow reuses processing/compressing/uploading/uploaded.
    """

    AWAITING_UPLOAD = "awaiting_upload"  # signed URL issued; waiting for the client's direct upload
    PROCESSING = "processing"    # accepted / queued (legacy path)
    COMPRESSING = "compressing"  # transcoding (Transcoder API) / ffmpeg
    UPLOADING = "uploading"      # storing to GCS/local (legacy path)
    UPLOADED = "uploaded"        # original stored in the bucket
    READY = "ready"              # compressed output available (terminal, direct-upload flow)
    FAILED = "failed"            # terminal


class TranscriptStatus(str, Enum):
    """Granular transcript-ingest lifecycle (video_kb_documents.transcript_status)."""

    UPLOADING = "uploading"    # transcript received / job accepted
    PROCESSING = "processing"  # parse + chunk + embed
    UPSERTING = "upserting"    # writing chunks to Qdrant
    UPSERTED = "upserted"      # indexed (terminal)
    EMPTY = "empty"            # no chunks produced (terminal)
    FAILED = "failed"          # terminal


class DocumentStatus(str, Enum):
    """Granular document-ingest lifecycle (video_kb_documents.document_status)."""

    UPLOADING = "uploading"    # document received / job accepted
    PROCESSING = "processing"  # parse + chunk + embed
    UPSERTING = "upserting"    # writing chunks to Qdrant
    UPSERTED = "upserted"      # indexed (terminal)
    EMPTY = "empty"            # no chunks produced (terminal)
    FAILED = "failed"          # terminal


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

