from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from api.schemas.auth import LoginRequest, LoginResponse
from dependencies import get_pg_adapter
from infrastructure.auth.jwt_handler import sign_auth_token
from infrastructure.auth.password import verify_password
from infrastructure.postgres.models.users import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, pg=Depends(get_pg_adapter)) -> LoginResponse:
    async with pg.sessionmaker() as session:
        result = await session.execute(
            select(User).where(User.email == body.email, User.deleted_at.is_(None))
        )
        user = result.scalar_one_or_none()

    if not user or not user.password_hash:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = sign_auth_token(
        email=user.email,
        user_id=str(user.uuid),
        tenant_id=str(user.tenant_uuid) if user.tenant_uuid else None,
        role=user.role.value,
    )
    return LoginResponse(access_token=token, token_type="bearer")
