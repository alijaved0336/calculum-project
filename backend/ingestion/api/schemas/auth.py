from __future__ import annotations
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AuthenticatedUser(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)

    email: str | None = None
    display_name: str | None = None
    scope: str | None = None
    user_id: str | None = None
    tenant_id: str | None = None
    role: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
