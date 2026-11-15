"""Create the `users` row an SSO (Azure B2C / Ada) uploader needs.

`kb_documents.uploaded_by_user_uuid` is a NOT NULL foreign key to `users.uuid`. An
Ada user has no row, so the tracking insert failed (logged as a warning only):
vectors reached Qdrant but no `kb_documents` row was ever written. This creates
the row, keyed on the token's `oid` with no password.

Only a global_platform_admin can be provisioned: `users` requires a tenant for
every other role, and an upload carries none. Anyone else still needs a row
created ahead of time. Never raises.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from config import settings
from infrastructure.postgres.models import User
from infrastructure.postgres.models.enums import UserRoleEnum

logger = logging.getLogger(__name__)


async def ensure_sso_uploader(
    session_factory,
    *,
    user_id: str | None,
    email: str | None,
    display_name: str | None,
    role: str | None,
) -> bool:
    """True when `users` has a row for ``user_id`` afterwards."""
    if not settings.sso_auto_provision_users:
        return False
    try:
        user_uuid = uuid.UUID(str(user_id))
    except (ValueError, TypeError):
        return False

    try:
        async with session_factory() as session:
            exists = await session.execute(select(User.uuid).where(User.uuid == user_uuid))
            if exists.scalar_one_or_none() is not None:
                return True
            if role != UserRoleEnum.global_platform_admin.value:
                logger.warning(
                    "sso_user: uploader %s (role=%s) has no users row and only a platform "
                    "admin can be created automatically — its kb_documents row will be skipped",
                    user_uuid, role,
                )
                return False
            await session.execute(
                pg_insert(User)
                .values(
                    uuid=user_uuid,
                    email=(email or f"{user_uuid}@sso.invalid").strip().lower()[:160],
                    display_name=(display_name or "").strip()[:120] or None,
                    password_hash=None,
                    role=UserRoleEnum.global_platform_admin,
                    tenant_uuid=None,
                )
                .on_conflict_do_nothing()
            )
            await session.commit()
            exists = await session.execute(select(User.uuid).where(User.uuid == user_uuid))
            created = exists.scalar_one_or_none() is not None
            if created:
                logger.info("sso_user: created platform admin %s", user_uuid)
            else:
                logger.warning("sso_user: %s not created — email %r already in use", user_uuid, email)
            return created
    except Exception:
        logger.exception("sso_user: provisioning failed for user=%s", user_uuid)
        return False
