from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.schemas.auth import LoginRequest, LoginResponse, TenantMembership
from infrastructure.auth.jwt_handler import sign_auth_token
from infrastructure.auth.password import verify_password
from infrastructure.database.connection import get_db
from infrastructure.postgres.models.users import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .where(User.email == body.email, User.deleted_at.is_(None))
        .options(selectinload(User.tenant))
    )
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid credentials")

    tenant_id = user.tenant.tenant_id if user.tenant else None

    token = sign_auth_token(
        user_id=str(user.id),
        tenant_id=tenant_id,
        role=user.role.value,
    )

    memberships = (
        [TenantMembership(tenant_id=tenant_id, role=user.role.value)]
        if tenant_id
        else []
    )

    return LoginResponse(access_token=token, tenant_memberships=memberships)
