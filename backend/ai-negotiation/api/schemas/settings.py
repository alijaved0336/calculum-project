from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from api.schemas.auth import _CamelModel


class PromptInstructionSchema(_CamelModel):
    prompt: str
    is_enabled: bool = True
    is_conflicted: bool = False
    author: str | None = None
    created_at: datetime | None = None


class StrategyToggleSchema(_CamelModel):
    strategy: str
    enabled: bool
    locked: bool
    available: bool
    tone: str | None = None
    lock_reason: str | None = None


class KBDocumentSummarySchema(_CamelModel):
    uuid: UUID
    filename: str
    file_type: str | None = None
    status: str
    is_already_uploaded: bool
    chunk_count: int | None = None
    uploaded_by: str | None = None
    updated_at: datetime | None = None


class SettingsPatchRequest(_CamelModel):
    strategies: list[str] | None = None
    global_strategy: list[str] | None = None
    tones: list[str] | None = None
    strategy_tone_map: dict[str, str] | None = None
    prompt_instructions: dict[str, dict[str, Any]] | None = None


class TenantGlobalStrategyPatchRequest(_CamelModel):
    global_strategy: list[str]
    view_data_inputs: bool | None = None


class SessionSettingsSnapshot(_CamelModel):
    strategy_tone_map: dict[str, str] | None = None
    prompt_instructions: dict[str, PromptInstructionSchema] | None = None
    effective_strategies: list[str] = Field(default_factory=list)
    effective_tones: list[str] = Field(default_factory=list)
    can_view_data_inputs: bool = False


class SettingsBundleResponse(_CamelModel):
    tenant_uuid: UUID | None = None
    tenant_name: str | None = None
    tones: list[str] | None = None
    global_tones: list[str] | None = None
    strategies: list[str] | None = None
    global_strategy: list[str] | None = None
    strategy_tone_map: dict[str, str] | None = None
    prompt_instructions: dict[str, PromptInstructionSchema] | None = None
    effective_strategies: list[str] = Field(default_factory=list)
    effective_tones: list[str] = Field(default_factory=list)
    strategy_toggles: list[StrategyToggleSchema] = Field(default_factory=list)
    kb_documents: list[KBDocumentSummarySchema] = Field(default_factory=list)


class TenantGlobalStrategyRowSchema(_CamelModel):
    tenant_uuid: UUID
    tenant_name: str
    global_strategy: list[str] | None = None
    view_data_inputs: bool = False


class TenantGlobalStrategyGridResponse(_CamelModel):
    global_strategies: list[str] | None = None
    tenants: list[TenantGlobalStrategyRowSchema] = Field(default_factory=list)
