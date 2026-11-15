from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class TenantMembership(BaseModel):
    tenant_id: str
    role: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_memberships: list[TenantMembership]
