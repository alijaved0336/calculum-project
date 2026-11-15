from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class PromptInstructionEntry:
    prompt: str
    is_enabled: bool = True
    is_conflicted: bool = False
    author: str | None = None
    created_at: datetime | None = None


@dataclass(frozen=True)
class SettingsRecord:
    uuid: UUID
    tenant_uuid: UUID | None
    tones: list[str] | None
    strategies: list[str] | None
    global_strategy: list[str] | None
    view_data_inputs: bool
    strategy_tone_map: dict[str, str] | None
    prompt_instructions: dict[str, dict[str, Any]] | None
    deleted_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True)
class StrategyToggle:
    strategy: str
    enabled: bool
    locked: bool
    available: bool
    tone: str | None = None
    lock_reason: str | None = None


@dataclass(frozen=True)
class KBDocumentSummary:
    uuid: UUID
    filename: str
    file_type: str | None
    status: str
    is_already_uploaded: bool
    chunk_count: int | None = None
    uploaded_by: str | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True)
class SettingsBundle:
    global_record: SettingsRecord
    tenant_record: SettingsRecord | None
    tenant_uuid: UUID | None
    tenant_name: str | None
    effective_strategies: list[str]
    available_strategies: list[str]
    effective_tones: list[str]
    strategy_toggles: list[StrategyToggle]
    kb_documents: list[KBDocumentSummary] = field(default_factory=list)


@dataclass(frozen=True)
class TenantGlobalStrategyGridRow:
    tenant_uuid: UUID
    tenant_name: str
    global_strategy: list[str] | None
    view_data_inputs: bool


@dataclass(frozen=True)
class TenantGlobalStrategyGrid:
    global_strategies: list[str] | None
    tenants: list[TenantGlobalStrategyGridRow]


@dataclass
class GlobalSettingsPatch:
    strategies: list[str] | None = None
    tones: list[str] | None = None
    strategy_tone_map: dict[str, str] | None = None
    prompt_instructions: dict[str, dict[str, Any]] | None = None


@dataclass
class TenantSettingsPatch:
    global_strategy: list[str] | None = None
    view_data_inputs: bool | None = None
    strategies: list[str] | None = None
    tones: list[str] | None = None
    strategy_tone_map: dict[str, str] | None = None
    prompt_instructions: dict[str, dict[str, Any]] | None = None


class SettingsNotFoundError(Exception):
    def __init__(self, message: str = "Settings not found") -> None:
        super().__init__(message)


class SettingsValidationError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
