import time

import jwt
import pytest
from fastapi import HTTPException
from starlette.requests import Request

import api.deps.auth as auth_mod
from api.deps.auth import current_user

SECRET = "test-secret"


@pytest.fixture(autouse=True)
def _set_secret(monkeypatch):
    monkeypatch.setattr(auth_mod.settings, "jwt_secret", SECRET)
    monkeypatch.setattr(auth_mod.settings, "azure_auth_cookie_name", "__Secure-auth_session-token")


def _token(claims, secret=SECRET):
    return jwt.encode(claims, secret, algorithm="HS256")


def _bearer_request(token: str, scheme: str = "Bearer") -> Request:
    """Minimal Starlette Request with an Authorization header."""
    return Request({
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [(b"authorization", f"{scheme} {token}".encode())],
    })


def _empty_request() -> Request:
    """Request with no auth credentials."""
    return Request({
        "type": "http",
        "method": "GET",
        "path": "/",
        "query_string": b"",
        "headers": [],
    })


async def test_valid_token_returns_user():
    tok = _token({"sub": "u1", "role": "admin", "tenant_id": "t1", "exp": int(time.time()) + 3600})
    user = await current_user(_bearer_request(tok))
    assert user.id == "u1"
    assert user.role == "admin"
    assert user.tenant_id == "t1"


async def test_missing_credentials_raises_401():
    with pytest.raises(HTTPException) as exc:
        await current_user(_empty_request())
    assert exc.value.status_code == 401


async def test_wrong_scheme_raises_401():
    tok = _token({"sub": "u1", "exp": int(time.time()) + 3600})
    with pytest.raises(HTTPException) as exc:
        await current_user(_bearer_request(tok, scheme="Basic"))
    assert exc.value.status_code == 401


async def test_tampered_token_raises_401():
    tok = _token({"sub": "u1", "exp": int(time.time()) + 3600}, secret="wrong-secret")
    with pytest.raises(HTTPException) as exc:
        await current_user(_bearer_request(tok))
    assert exc.value.status_code == 401


async def test_expired_token_raises_401():
    tok = _token({"sub": "u1", "exp": int(time.time()) - 10})
    with pytest.raises(HTTPException) as exc:
        await current_user(_bearer_request(tok))
    assert exc.value.status_code == 401


async def test_token_without_sub_raises_401():
    tok = _token({"role": "user", "exp": int(time.time()) + 3600})
    with pytest.raises(HTTPException) as exc:
        await current_user(_bearer_request(tok))
    assert exc.value.status_code == 401


# ── Azure B2C claim mapping (_decode_azure) ──────────────────────────────────

def _decode_azure_with_payload(monkeypatch, payload: dict):
    monkeypatch.setattr(auth_mod, "verify_azure_token", lambda token: payload)
    return auth_mod._decode_azure("irrelevant-token")


def test_azure_claims_email_from_email_field(monkeypatch):
    user = _decode_azure_with_payload(monkeypatch, {"oid": "u1", "email": "a@b.com"})
    assert user.email == "a@b.com"


def test_azure_claims_email_from_emails_list(monkeypatch):
    user = _decode_azure_with_payload(monkeypatch, {"oid": "u1", "emails": ["a@b.com", "c@d.com"]})
    assert user.email == "a@b.com"


def test_azure_claims_email_absent_is_none(monkeypatch):
    user = _decode_azure_with_payload(monkeypatch, {"oid": "u1"})
    assert user.email is None


def test_azure_claims_scope_from_scp(monkeypatch):
    user = _decode_azure_with_payload(monkeypatch, {"oid": "u1", "scp": "read write"})
    assert user.scope == "read write"


def test_azure_claims_super_admin_maps_to_global_platform_admin(monkeypatch):
    user = _decode_azure_with_payload(
        monkeypatch, {"oid": "u1", "extension_IsSuperAdmin": True, "extension_Roles": ""}
    )
    assert user.role == "global_platform_admin"
    assert user.is_global_admin


def test_azure_claims_super_admin_takes_priority_over_company_admin_role(monkeypatch):
    user = _decode_azure_with_payload(
        monkeypatch,
        {"oid": "u1", "extension_IsSuperAdmin": True, "extension_Roles": "ROLE_COMPANY_ADMIN"},
    )
    assert user.role == "global_platform_admin"


def test_azure_claims_company_admin_role_unchanged(monkeypatch):
    user = _decode_azure_with_payload(
        monkeypatch, {"oid": "u1", "extension_Roles": "ROLE_COMPANY_ADMIN"}
    )
    assert user.role == "admin"


def test_azure_claims_default_role_is_user(monkeypatch):
    user = _decode_azure_with_payload(monkeypatch, {"oid": "u1"})
    assert user.role == "user"
