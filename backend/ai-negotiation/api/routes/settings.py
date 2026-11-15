
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.mappers.settings import session_settings_snapshot
from api.schemas.auth import AuthenticatedUser
from api.schemas.settings import (
    KBDocumentSummarySchema,
    SettingsBundleResponse,
    SettingsPatchRequest,
    StrategyToggleSchema,
    TenantGlobalStrategyGridResponse,
    TenantGlobalStrategyPatchRequest,
    TenantGlobalStrategyRowSchema,
)
from dependencies import get_current_user_any, get_db_session, get_pg_settings_adapter
from domain.entities.settings import (
    GlobalSettingsPatch,
    SettingsBundle,
    SettingsNotFoundError,
    SettingsValidationError,
    TenantGlobalStrategyGrid,
    TenantSettingsPatch,
)
from domain.ports.settings_port import SettingsPort
from infrastructure.postgres.models.users import User

router = APIRouter(prefix="/settings", tags=["settings"])


def _is_global_admin(user: AuthenticatedUser) -> bool:
    return user.role == "global_platform_admin"


def _is_tenant_admin(user: AuthenticatedUser) -> bool:
    return user.role == "admin"


def _is_tenant_member(user: AuthenticatedUser) -> bool:
    return user.role in ("admin", "user")


def _require_global_admin(user: AuthenticatedUser) -> None:
    if not _is_global_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Global admin access required")


def _require_settings_access(user: AuthenticatedUser) -> None:
    if not _is_global_admin(user) and not _is_tenant_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def _require_tenant_admin(user: AuthenticatedUser) -> str:
    if not _is_tenant_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant admin access required")
    if not user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant admin access required")
    return user.tenant_id


def _require_tenant_member(user: AuthenticatedUser) -> str:
    if not _is_tenant_member(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant access required")
    if not user.tenant_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Tenant access required")
    return user.tenant_id


async def _resolve_tenant_uuid(adapter: SettingsPort, tenant_id: str) -> uuid.UUID:
    resolved = await adapter.resolve_tenant_uuid(tenant_id)
    if resolved is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return resolved


async def _resolve_settings_scope(
    user: AuthenticatedUser,
    adapter: SettingsPort,
    tenant_uuid: uuid.UUID | None,
    *,
    require_admin: bool,
) -> uuid.UUID | None:
    if _is_global_admin(user):
        return tenant_uuid
    tenant_id = _require_tenant_admin(user) if require_admin else _require_tenant_member(user)
    if tenant_uuid is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="tenant_uuid is required",
        )
    allowed = await _resolve_tenant_uuid(adapter, tenant_id)
    if tenant_uuid != allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="tenant_uuid does not match your tenant",
        )
    return tenant_uuid


async def _resolve_actor_display(
    user: AuthenticatedUser,
    session: AsyncSession,
) -> str | None:
    if user.user_id:
        result = await session.execute(
            select(User.display_name, User.email).where(User.uuid == uuid.UUID(user.user_id))
        )
        row = result.one_or_none()
        if row:
            display_name, email = row
            return display_name or email
    return user.email


def _bundle_response(bundle: SettingsBundle) -> SettingsBundleResponse:
    tenant = bundle.tenant_record
    snapshot = session_settings_snapshot(bundle)
    return SettingsBundleResponse(
        tenant_uuid=bundle.tenant_uuid,
        tenant_name=bundle.tenant_name,
        tones=tenant.tones if tenant else bundle.global_record.tones,
        global_tones=bundle.global_record.tones,
        strategies=tenant.strategies if tenant else bundle.global_record.strategies,
        global_strategy=tenant.global_strategy if tenant else bundle.global_record.global_strategy,
        strategy_tone_map=snapshot.strategy_tone_map,
        prompt_instructions=snapshot.prompt_instructions,
        effective_strategies=snapshot.effective_strategies,
        effective_tones=snapshot.effective_tones,
        strategy_toggles=[
            StrategyToggleSchema(
                strategy=t.strategy,
                enabled=t.enabled,
                locked=t.locked,
                available=t.available,
                tone=t.tone,
                lock_reason=t.lock_reason,
            )
            for t in bundle.strategy_toggles
        ],
        kb_documents=[
            KBDocumentSummarySchema(
                uuid=doc.uuid,
                filename=doc.filename,
                file_type=doc.file_type,
                status=doc.status,
                is_already_uploaded=doc.is_already_uploaded,
                chunk_count=doc.chunk_count,
                uploaded_by=doc.uploaded_by,
                updated_at=doc.updated_at,
            )
            for doc in bundle.kb_documents
        ],
    )


def _grid_response(grid: TenantGlobalStrategyGrid) -> TenantGlobalStrategyGridResponse:
    return TenantGlobalStrategyGridResponse(
        global_strategies=grid.global_strategies,
        tenants=[
            TenantGlobalStrategyRowSchema(
                tenant_uuid=row.tenant_uuid,
                tenant_name=row.tenant_name,
                global_strategy=row.global_strategy,
                view_data_inputs=row.view_data_inputs,
            )
            for row in grid.tenants
        ],
    )


def _global_patch(body: SettingsPatchRequest) -> GlobalSettingsPatch:
    if body.global_strategy is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="global_strategy cannot be updated on /settings",
        )
    return GlobalSettingsPatch(
        strategies=body.strategies,
        tones=body.tones,
        strategy_tone_map=body.strategy_tone_map,
        prompt_instructions=body.prompt_instructions,
    )


def _tenant_patch_for_admin(body: SettingsPatchRequest) -> TenantSettingsPatch:
    if body.global_strategy is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Tenant admin cannot update global_strategy",
        )
    return TenantSettingsPatch(
        strategies=body.strategies,
        tones=body.tones,
        strategy_tone_map=body.strategy_tone_map,
        prompt_instructions=body.prompt_instructions,
    )


def _map_settings_errors(exc: Exception) -> None:
    if isinstance(exc, SettingsNotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    if isinstance(exc, SettingsValidationError):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    raise exc


@router.get("", response_model=SettingsBundleResponse)
async def get_settings(
    tenant_uuid: uuid.UUID | None = None,
    tenant_id: str | None = None,
    user: AuthenticatedUser = Depends(get_current_user_any),
    adapter: SettingsPort = Depends(get_pg_settings_adapter),
):
    try:
        # The Ada admin panel identifies tenants by their external slug
        # (tenant_id, e.g. "ai-bot-2-1um3y"), not our internal UUID — resolve
        # it the same way a tenant member's own tenant_id is resolved below.
        if tenant_uuid is None and tenant_id:
            tenant_uuid = await _resolve_tenant_uuid(adapter, tenant_id)
        scope = await _resolve_settings_scope(
            user, adapter, tenant_uuid, require_admin=False
        )
        if scope is None:
            return _bundle_response(await adapter.get_global_bundle())
        # KB documents are global, so tenant admins must receive them too.
        bundle = await adapter.get_tenant_bundle(scope, include_kb_documents=True)
        return _bundle_response(bundle)
    except HTTPException:
        raise
    except Exception as exc:
        _map_settings_errors(exc)


@router.patch("", response_model=SettingsBundleResponse)
async def patch_settings(
    body: SettingsPatchRequest,
    tenant_uuid: uuid.UUID | None = None,
    tenant_id: str | None = None,
    user: AuthenticatedUser = Depends(get_current_user_any),
    adapter: SettingsPort = Depends(get_pg_settings_adapter),
    session: AsyncSession = Depends(get_db_session),
):
    _require_settings_access(user)
    try:
        if tenant_uuid is None and tenant_id:
            tenant_uuid = await _resolve_tenant_uuid(adapter, tenant_id)
        scope = await _resolve_settings_scope(
            user, adapter, tenant_uuid, require_admin=True
        )
        actor_display = (
            await _resolve_actor_display(user, session)
            if body.prompt_instructions is not None
            else None
        )
        if scope is None:
            await adapter.update_global_settings(
                _global_patch(body),
                actor_display=actor_display,
            )
            return _bundle_response(await adapter.get_global_bundle())
        if _is_global_admin(user):
            patch = TenantSettingsPatch(
                strategies=body.strategies,
                tones=body.tones,
                strategy_tone_map=body.strategy_tone_map,
                prompt_instructions=body.prompt_instructions,
                global_strategy=body.global_strategy,
            )
            actor_role = "global_platform_admin"
        else:
            patch = _tenant_patch_for_admin(body)
            actor_role = "admin"
        bundle = await adapter.update_tenant_settings(
            scope,
            patch,
            actor_role=actor_role,
            actor_display=actor_display,
        )
        return _bundle_response(bundle)
    except HTTPException:
        raise
    except Exception as exc:
        _map_settings_errors(exc)


@router.get("/tenants", response_model=TenantGlobalStrategyGridResponse)
async def list_tenant_global_strategies(
    user: AuthenticatedUser = Depends(get_current_user_any),
    adapter: SettingsPort = Depends(get_pg_settings_adapter),
):
    _require_global_admin(user)
    try:
        return _grid_response(await adapter.list_tenant_global_strategies())
    except Exception as exc:
        _map_settings_errors(exc)


@router.patch("/tenants/{tenant_uuid}", response_model=TenantGlobalStrategyRowSchema)
async def patch_tenant_global_strategy(
    tenant_uuid: uuid.UUID,
    body: TenantGlobalStrategyPatchRequest,
    user: AuthenticatedUser = Depends(get_current_user_any),
    adapter: SettingsPort = Depends(get_pg_settings_adapter),
):
    _require_global_admin(user)
    try:
        bundle = await adapter.update_tenant_settings(
            tenant_uuid,
            TenantSettingsPatch(
                global_strategy=body.global_strategy,
                view_data_inputs=body.view_data_inputs,
            ),
            actor_role="global_platform_admin",
        )
        return TenantGlobalStrategyRowSchema(
            tenant_uuid=tenant_uuid,
            tenant_name=bundle.tenant_name or "",
            global_strategy=bundle.tenant_record.global_strategy if bundle.tenant_record else None,
            view_data_inputs=bundle.tenant_record.view_data_inputs if bundle.tenant_record else False,
        )
    except Exception as exc:
        _map_settings_errors(exc)
