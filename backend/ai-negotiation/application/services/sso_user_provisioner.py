"""Create the `users` row an SSO (Azure B2C / Ada) user needs.

`threads.user_uuid` is a NOT NULL foreign key to `users.uuid`. Standalone-login
users have a row; Ada users authenticate by cookie and never did, so their
thread insert failed at commit, `ensure_thread` swallowed it, and the chat ran on
in-memory history with nothing persisted. This creates the row on first use,
keyed on the token's `oid` and with no password, so such a user can never log in
through `/auth/login`.

Never raises: a provisioning problem must not take chat down. A False return
means the row could not be ensured and the caller carries on as before.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from application.services.settings_provisioner import provision_settings_for_user
from config import settings
from infrastructure.postgres.models import Tenant, User
from infrastructure.postgres.models.enums import UserRoleEnum

logger = logging.getLogger(__name__)


async def _user_exists(session: AsyncSession, user_uuid: uuid.UUID) -> bool:
    row = await session.execute(select(User.uuid).where(User.uuid == user_uuid))
    return row.scalar_one_or_none() is not None


async def _tenant_uuid(session: AsyncSession, tenant_slug: str | None) -> uuid.UUID | None:
    if not tenant_slug:
        return None
    row = await session.execute(select(Tenant.uuid).where(Tenant.tenant_id == tenant_slug))
    return row.scalar_one_or_none()


async def ensure_sso_user(
    session: AsyncSession,
    *,
    user_id: str | None,
    email: str | None,
    display_name: str | None,
    role: str | None,
    tenant_slug: str | None,
) -> bool:
    """Make sure `users` has a row for ``user_id``. True when one exists afterwards.

    A platform admin needs no tenant. An admin/user must be tied to one (the
    table's check constraint), taken from ``tenant_slug`` since an Ada token does
    not carry our tenant. The row records who first used the product; access
    decisions still come from the token, never from this row.
    """
    if not settings.sso_auto_provision_users:
        return False
    try:
        user_uuid = uuid.UUID(str(user_id))
        role_enum = UserRoleEnum(role)
    except (ValueError, TypeError):
        return False

    try:
        if await _user_exists(session, user_uuid):
            return True

        tenant_uuid = None
        if role_enum is not UserRoleEnum.global_platform_admin:
            tenant_uuid = await _tenant_uuid(session, tenant_slug)
            if tenant_uuid is None:
                logger.warning(
                    "sso_user: cannot create user=%s role=%s — tenant %r not found",
                    user_uuid, role_enum.value, tenant_slug,
                )
                return False

        await session.execute(
            pg_insert(User)
            .values(
                uuid=user_uuid,
                email=(email or f"{user_uuid}@sso.invalid").strip().lower()[:160],
                display_name=(display_name or "").strip()[:120] or None,
                password_hash=None,
                role=role_enum,
                tenant_uuid=tenant_uuid,
            )
            # No conflict target: also absorbs a clash on the (tenant, email)
            # unique index, and a concurrent first request for the same user.
            .on_conflict_do_nothing()
        )
        await provision_settings_for_user(
            session, tenant_uuid=tenant_uuid, role=role_enum.value
        )
        await session.commit()

        if not await _user_exists(session, user_uuid):
            logger.warning(
                "sso_user: user=%s not created — another account already uses "
                "email %r in this tenant",
                user_uuid, email,
            )
            return False
        logger.info("sso_user: created user=%s role=%s", user_uuid, role_enum.value)
        return True
    except Exception:
        await session.rollback()
        logger.exception("sso_user: provisioning failed for user=%s", user_uuid)
        return False
