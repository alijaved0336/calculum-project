from __future__ import annotations

import uuid as _uuid

from pydantic import BaseModel, ConfigDict, field_validator
from pydantic.alias_generators import to_camel


class _CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


class LoginRequest(_CamelModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class LoginResponse(_CamelModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_hours: int
    email: str
    scope: str
    user_id: str | None = None
    tenant_id: str | None = None
    role: str | None = None

    @field_validator("user_id")
    @classmethod
    def _must_be_uuid(cls, value: str | None) -> str | None:
        if value is None:
            return value
        _uuid.UUID(value)
        return value


class TenantOption(_CamelModel):
    tenant_uuid: _uuid.UUID
    tenant_id: str
    tenant_name: str
    country: str | None = None


class TenantListResponse(_CamelModel):
    tenants: list[TenantOption]


class AuthenticatedUser(_CamelModel):
    email: str | None = None
    display_name: str | None = None
    scope: str | None = None
    user_id: str | None = None
    tenant_id: str | None = None
    role: str | None = None
