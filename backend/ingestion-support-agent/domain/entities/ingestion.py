from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any


@dataclass(frozen=True)
class Page:
    page_number: int
    content: str
    has_table: bool
    source_file: str
    metadata: dict[str, Any]


class ChunkType(StrEnum):
    HYBRID = "hybrid"
    RECURSIVE = "recursive"


@dataclass
class Chunk:
    id: str
    text: str
    page_numbers: list[int]
    chunk_type: ChunkType
    file_id: str
    metadata: dict[str, Any]
    embedding: list[float] | None = None
    prev_id: str | None = None
    next_id: str | None = None
    token_count: int | None = None  # cached token count, computed lazily when batching


class PlaybookStrategyType(StrEnum):
    TERM_EXTENSION = "term_extension"
    TERM_EXTENSION_SCF = "term_extension_scf"


class JobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class IngestionJob:
    job_id: str
    file_id: str
    file_path: str
    file_name: str
    status: JobStatus
    created_at: datetime
    chunks_written: int | None = None
    error: str | None = None
