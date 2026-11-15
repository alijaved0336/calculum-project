from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.schemas.auth import AuthenticatedUser, LoginRequest, LoginResponse
from config import settings
from dependencies import get_current_user_any
from infrastructure.auth.jwt_handler import sign_auth_token
from infrastructure.auth.password import verify_password
from infrastructure.database.connection import get_db_session
from infrastructure.postgres.models import User
from infrastructure.postgres.models.tenant import Tenant

router = APIRouter(prefix="/auth", tags=["auth"])

_INVALID = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db_session, use_cache=False),
) -> LoginResponse:
    """Standalone-frontend login — returns an HS256 Bearer token.

    Ada Bot users authenticate via the __Secure-auth_session-token cookie and
    never touch this endpoint.  This is only for the standalone frontend where
    users have an account in our own User table.
    """
    result = await db.execute(
        select(User, Tenant)
        .outerjoin(Tenant, User.tenant_uuid == Tenant.uuid)
        .where(User.email == body.email, User.deleted_at.is_(None))
    )
    row = result.one_or_none()

    if not row:
        raise _INVALID
    user, tenant = row
    if not user.password_hash or not verify_password(body.password, user.password_hash):
        raise _INVALID

    tenant_id = tenant.tenant_id if tenant else None

    token = sign_auth_token(
        email=user.email,
        scope="negotiation",
        user_id=str(user.uuid),
        role=user.role.value,
        tenant_id=tenant_id,
    )

    return LoginResponse(
        access_token=token,
        expires_in_hours=settings.jwt_expiry_hours,
        email=user.email,
        scope="negotiation",
        user_id=str(user.uuid),
        tenant_id=tenant_id,
        role=user.role.value,
    )


@router.get("/me", response_model=AuthenticatedUser)
async def me(
    current_user: AuthenticatedUser = Depends(get_current_user_any),
) -> AuthenticatedUser:
    """Returns the authenticated user's claims.

    Accepts either the Ada cookie (RS256) or a Bearer token (HS256).
    Useful for the standalone frontend to validate a stored token and hydrate
    the user context on page refresh.
    """
    return current_user
