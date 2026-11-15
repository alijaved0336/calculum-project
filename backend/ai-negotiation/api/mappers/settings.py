from __future__ import annotations

from typing import Any

from api.schemas.settings import PromptInstructionSchema, SessionSettingsSnapshot
from domain.entities.settings import SettingsBundle


def prompt_instruction_map(
    raw: dict[str, dict[str, Any]] | None,
) -> dict[str, PromptInstructionSchema] | None:
    if raw is None:
        return None
    return {
        key: PromptInstructionSchema(
            prompt=entry.get("prompt", ""),
            is_enabled=entry.get("is_enabled", True),
            is_conflicted=entry.get("is_conflicted", False),
        )
        for key, entry in raw.items()
    }


def session_settings_snapshot(
    bundle: SettingsBundle,
    *,
    can_view_data_inputs: bool = False,
) -> SessionSettingsSnapshot:
    tenant = bundle.tenant_record
    return SessionSettingsSnapshot(
        strategy_tone_map=(
            tenant.strategy_tone_map if tenant else bundle.global_record.strategy_tone_map
        ),
        prompt_instructions=prompt_instruction_map(
            tenant.prompt_instructions if tenant else bundle.global_record.prompt_instructions
        ),
        effective_strategies=bundle.effective_strategies,
        effective_tones=bundle.effective_tones,
        can_view_data_inputs=can_view_data_inputs,
    )
