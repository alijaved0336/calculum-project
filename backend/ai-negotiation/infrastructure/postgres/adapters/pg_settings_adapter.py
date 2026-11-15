from __future__ import annotations

import copy
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from domain.entities.settings import (
    GlobalSettingsPatch,
    KBDocumentSummary,
    SettingsBundle,
    SettingsNotFoundError,
    SettingsRecord,
    SettingsValidationError,
    TenantGlobalStrategyGrid,
    TenantSettingsPatch,
)
from domain.ports.settings_port import SettingsPort
from domain.services.settings_resolver import (
    build_settings_bundle,
    build_tenant_global_strategy_grid,
    validate_tenant_admin_strategies,
)
from infrastructure.postgres.models.enums import StrategyEnum, ToneEnum
from infrastructure.postgres.models.kb_document import KBDocument
from infrastructure.postgres.models.settings import Settings
from infrastructure.postgres.models.tenant import Tenant
from infrastructure.postgres.models.users import User

DEFAULT_PROMPT = """\
Always open with a collaborative, partnership-oriented tone. Reference industry \
benchmarks from indexed documents whenever proposing payment terms.

When the supplier pushes back on a payment-terms extension:
  1. Acknowledge the cash-flow impact explicitly.
  2. Offer SCF as a mitigation before considering a smaller extension.
  3. Never commit to extensions longer than 90 days without flagging for human review.

Keep responses under 180 words. Use bullet points for any proposal with more than two terms.\
"""

DEFAULT_STRATEGIES = [StrategyEnum.term_extension, StrategyEnum.term_extension_scf]

DEFAULT_TONES = [ToneEnum.collaborative, ToneEnum.assertive, ToneEnum.methodical]

DEFAULT_STRATEGY_TONE_MAP = {
    StrategyEnum.term_extension.value: ToneEnum.collaborative.value,
    StrategyEnum.term_extension_scf.value: ToneEnum.collaborative.value,
}


def _default_prompt_instructions() -> dict[str, dict[str, Any]]:
    return {
        "0": {"prompt": DEFAULT_PROMPT, "is_enabled": True, "is_conflicted": False},
    }


def _merge_prompt_instructions(
    existing: dict[str, dict[str, Any]] | None,
    incoming: dict[str, dict[str, Any]],
    actor_display: str | None,
) -> dict[str, dict[str, Any]]:
    existing = existing or {}
    merged: dict[str, dict[str, Any]] = {}
    for key, entry in incoming.items():
        prev = existing.get(key, {})
        merged_entry: dict[str, Any] = {
            "prompt": entry.get("prompt", ""),
            "is_enabled": entry.get("is_enabled", True),
            "is_conflicted": entry.get("is_conflicted", False),
        }
        if key in existing:
            if prev.get("author") is not None:
                merged_entry["author"] = prev["author"]
            if prev.get("created_at") is not None:
                merged_entry["created_at"] = prev["created_at"]
        elif actor_display:
            merged_entry["author"] = actor_display
            merged_entry["created_at"] = datetime.now(UTC).isoformat()
        merged[key] = merged_entry
    return merged


def _enum_list(values: list[StrategyEnum] | None) -> list[str] | None:
    if values is None:
        return None
    return [v.value if hasattr(v, "value") else str(v) for v in values]


def _tone_list(values: list[ToneEnum] | None) -> list[str] | None:
    if values is None:
        return None
    return [v.value if hasattr(v, "value") else str(v) for v in values]


def _to_strategy_enums(values: list[str] | None) -> list[StrategyEnum] | None:
    if values is None:
        return None
    return [StrategyEnum(v) for v in values]


def _to_tone_enums(values: list[str] | None) -> list[ToneEnum] | None:
    if values is None:
        return None
    return [ToneEnum(v) for v in values]


def _record_from_model(row: Settings) -> SettingsRecord:
    return SettingsRecord(
        uuid=row.uuid,
        tenant_uuid=row.tenant_uuid,
        tones=_tone_list(row.tones),
        strategies=_enum_list(row.strategies),
        global_strategy=_enum_list(row.global_strategy),
        view_data_inputs=row.view_data_inputs,
        strategy_tone_map=dict(row.strategy_tone_map) if row.strategy_tone_map else None,
        prompt_instructions=dict(row.prompt_instructions) if row.prompt_instructions else None,
        deleted_at=row.deleted_at,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


class PostgresSettingsAdapter(SettingsPort):
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def resolve_tenant_uuid(self, tenant_id: str) -> uuid.UUID | None:
        result = await self._session.execute(
            select(Tenant.uuid).where(Tenant.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def _load_global_row(self) -> Settings:
        result = await self._session.execute(
            select(Settings).where(
                Settings.tenant_uuid.is_(None),
                Settings.deleted_at.is_(None),
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise SettingsNotFoundError("Global settings not found")
        return row

    async def _load_tenant_row(self, tenant_uuid: uuid.UUID) -> Settings:
        result = await self._session.execute(
            select(Settings).where(
                Settings.tenant_uuid == tenant_uuid,
                Settings.deleted_at.is_(None),
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            raise SettingsNotFoundError(f"Tenant settings not found for {tenant_uuid}")
        return row

    async def _load_kb_documents(self) -> list[KBDocumentSummary]:
        result = await self._session.execute(
            # Keep documents visible even if the uploader was removed or the
            # row predates the current users-table relationship.
            select(KBDocument, User.display_name, User.email)
            .outerjoin(User, KBDocument.uploaded_by_user_uuid == User.uuid)
            .order_by(KBDocument.filename)
        )
        return [
            KBDocumentSummary(
                uuid=doc.uuid,
                filename=doc.filename,
                file_type=doc.file_type,
                status=doc.status,
                is_already_uploaded=doc.is_already_uploaded,
                chunk_count=doc.chunk_count,
                uploaded_by=display_name or email,
                updated_at=doc.updated_at,
            )
            for doc, display_name, email in result.all()
        ]

    async def get_global_settings(self) -> SettingsRecord:
        return _record_from_model(await self._load_global_row())

    async def get_global_bundle(self) -> SettingsBundle:
        global_row = _record_from_model(await self._load_global_row())
        kb_docs = await self._load_kb_documents()
        return build_settings_bundle(global_row, None, kb_documents=kb_docs)

    async def get_tenant_settings(self, tenant_uuid: uuid.UUID) -> SettingsRecord:
        return _record_from_model(await self._load_tenant_row(tenant_uuid))

    async def get_tenant_bundle(
        self,
        tenant_uuid: uuid.UUID,
        *,
        include_kb_documents: bool = False,
    ) -> SettingsBundle:
        global_row = _record_from_model(await self._load_global_row())
        tenant_model = await self._load_tenant_row(tenant_uuid)
        tenant_row = _record_from_model(tenant_model)

        tenant_name: str | None = None
        if tenant_model.tenant_uuid:
            name_result = await self._session.execute(
                select(Tenant.name).where(Tenant.uuid == tenant_model.tenant_uuid)
            )
            tenant_name = name_result.scalar_one_or_none()

        kb_docs = await self._load_kb_documents() if include_kb_documents else []
        return build_settings_bundle(
            global_row,
            tenant_row,
            tenant_uuid=tenant_uuid,
            tenant_name=tenant_name,
            kb_documents=kb_docs,
        )

    async def list_tenant_global_strategies(self) -> TenantGlobalStrategyGrid:
        global_row = _record_from_model(await self._load_global_row())
        result = await self._session.execute(
            select(Settings, Tenant.name)
            .join(Tenant, Settings.tenant_uuid == Tenant.uuid)
            .where(Settings.tenant_uuid.is_not(None), Settings.deleted_at.is_(None))
            .order_by(Tenant.name)
        )
        tenants = [
            (_record_from_model(settings_row), tenant_name)
            for settings_row, tenant_name in result.all()
        ]
        return build_tenant_global_strategy_grid(global_row, tenants)

    async def update_global_settings(
        self,
        patch: GlobalSettingsPatch,
        *,
        actor_display: str | None = None,
    ) -> SettingsRecord:
        row = await self._load_global_row()
        if patch.strategies is not None:
            enums = _to_strategy_enums(patch.strategies)
            row.strategies = enums
            row.global_strategy = enums
        if patch.strategy_tone_map is not None:
            row.strategy_tone_map = patch.strategy_tone_map
        if patch.tones is not None:
            row.tones = _to_tone_enums(patch.tones)
        if patch.prompt_instructions is not None:
            row.prompt_instructions = _merge_prompt_instructions(
                dict(row.prompt_instructions) if row.prompt_instructions else None,
                patch.prompt_instructions,
                actor_display,
            )
        await self._session.flush()
        await self._session.commit()
        return _record_from_model(row)

    async def update_tenant_settings(
        self,
        tenant_uuid: uuid.UUID,
        patch: TenantSettingsPatch,
        *,
        actor_role: str,
        actor_display: str | None = None,
    ) -> SettingsBundle:
        global_row_model = await self._load_global_row()
        global_record = _record_from_model(global_row_model)
        tenant_row = await self._load_tenant_row(tenant_uuid)
        existing_prompts = (
            dict(tenant_row.prompt_instructions) if tenant_row.prompt_instructions else None
        )

        if actor_role == "global_platform_admin":
            if patch.global_strategy is not None:
                tenant_row.global_strategy = _to_strategy_enums(patch.global_strategy)
            if patch.view_data_inputs is not None:
                tenant_row.view_data_inputs = patch.view_data_inputs
            if patch.strategy_tone_map is not None:
                tenant_row.strategy_tone_map = patch.strategy_tone_map
            if patch.prompt_instructions is not None:
                tenant_row.prompt_instructions = _merge_prompt_instructions(
                    existing_prompts,
                    patch.prompt_instructions,
                    actor_display,
                )
        elif actor_role == "admin":
            if patch.global_strategy is not None:
                raise SettingsValidationError("Tenant admin cannot update global_strategy")
            if patch.view_data_inputs is not None:
                raise SettingsValidationError("Tenant admin cannot update view_data_inputs")
            if patch.strategies is not None:
                validate_tenant_admin_strategies(
                    global_record,
                    _record_from_model(tenant_row),
                    patch.strategies,
                )
                tenant_row.strategies = _to_strategy_enums(patch.strategies)
            if patch.tones is not None:
                tenant_row.tones = _to_tone_enums(patch.tones)
            if patch.strategy_tone_map is not None:
                tenant_row.strategy_tone_map = patch.strategy_tone_map
            if patch.prompt_instructions is not None:
                tenant_row.prompt_instructions = _merge_prompt_instructions(
                    existing_prompts,
                    patch.prompt_instructions,
                    actor_display,
                )
        else:
            raise SettingsValidationError("Insufficient permissions to update settings")

        await self._session.flush()
        await self._session.commit()

        name_result = await self._session.execute(
            select(Tenant.name).where(Tenant.uuid == tenant_uuid)
        )
        tenant_name = name_result.scalar_one_or_none()
        return build_settings_bundle(
            global_record,
            _record_from_model(tenant_row),
            tenant_uuid=tenant_uuid,
            tenant_name=tenant_name,
        )

    async def provision_platform_settings(self) -> SettingsRecord:
        existing = await self._session.execute(
            select(Settings).where(Settings.tenant_uuid.is_(None))
        )
        row = existing.scalar_one_or_none()
        if row is not None:
            changed = False
            if not row.tones:
                row.tones = list(DEFAULT_TONES)
                changed = True
            if not row.strategies:
                row.strategies = list(DEFAULT_STRATEGIES)
                changed = True
            if not row.global_strategy:
                row.global_strategy = list(row.strategies or DEFAULT_STRATEGIES)
                changed = True
            if not row.strategy_tone_map:
                row.strategy_tone_map = dict(DEFAULT_STRATEGY_TONE_MAP)
                changed = True
            if not row.prompt_instructions:
                row.prompt_instructions = _default_prompt_instructions()
                changed = True
            if changed:
                await self._session.flush()
            return _record_from_model(row)

        defaults = list(DEFAULT_STRATEGIES)
        row = Settings(
            tenant_uuid=None,
            tones=list(DEFAULT_TONES),
            strategies=defaults,
            global_strategy=defaults,
            strategy_tone_map=dict(DEFAULT_STRATEGY_TONE_MAP),
            prompt_instructions=_default_prompt_instructions(),
        )
        self._session.add(row)
        await self._session.flush()
        return _record_from_model(row)

    async def provision_tenant_settings(self, tenant_uuid: uuid.UUID) -> SettingsRecord:
        existing = await self._session.execute(
            select(Settings).where(Settings.tenant_uuid == tenant_uuid)
        )
        row = existing.scalar_one_or_none()
        if row is not None:
            changed = False
            if not row.tones:
                row.tones = list(DEFAULT_TONES)
                changed = True
            if changed:
                await self._session.flush()
            return _record_from_model(row)

        await self.provision_platform_settings()
        global_row = await self._load_global_row()
        global_strategies = list(global_row.strategies or DEFAULT_STRATEGIES)
        global_cap = list(global_row.global_strategy or global_strategies)
        row = Settings(
            tenant_uuid=tenant_uuid,
            tones=list(global_row.tones or DEFAULT_TONES),
            strategies=global_strategies,
            global_strategy=global_cap,
            strategy_tone_map=copy.deepcopy(global_row.strategy_tone_map)
            or dict(DEFAULT_STRATEGY_TONE_MAP),
            prompt_instructions=copy.deepcopy(global_row.prompt_instructions)
            or _default_prompt_instructions(),
        )
        self._session.add(row)
        await self._session.flush()
        return _record_from_model(row)

    async def backfill_missing_tenant_settings(self) -> int:
        tenants = await self._session.execute(select(Tenant.uuid))
        created = 0
        for (tenant_uuid,) in tenants.all():
            existing = await self._session.execute(
                select(Settings.uuid).where(Settings.tenant_uuid == tenant_uuid)
            )
            if existing.scalar_one_or_none() is None:
                await self.provision_tenant_settings(tenant_uuid)
                created += 1
        return created

    async def get_kb_document_filenames(self, uuids: list[str]) -> dict[str, str]:
        parsed = []
        for u in uuids:
            try:
                parsed.append(uuid.UUID(u))
            except (ValueError, AttributeError):
                pass
        if not parsed:
            return {}
        result = await self._session.execute(
            select(KBDocument.uuid, KBDocument.filename).where(KBDocument.uuid.in_(parsed))
        )
        return {str(row.uuid): row.filename for row in result.all()}
