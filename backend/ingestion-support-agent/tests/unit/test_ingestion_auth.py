import base64
import hashlib
import hmac
import json
import time
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

import api.deps.auth as auth
from api.deps.auth import (
    JWTError,
    User,
    _parse_cookie_string,
    current_user,
    decode_hs256,
    get_ws_user,
    require_admin,
)

SECRET = "test-secret"
COOKIE_NAME = "__Secure-auth_session-token"


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def make_token(role="admin", sub="u1", exp_delta=3600, alg="HS256", secret=SECRET):
    header = _b64(json.dumps({"alg": alg, "typ": "JWT"}).encode())
    payload = _b64(json.dumps({"sub": sub, "role": role, "exp": int(time.time()) + exp_delta}).encode())
    sig = _b64(hmac.new(secret.encode(), f"{header}.{payload}".encode(), hashlib.sha256).digest())
    return f"{header}.{payload}.{sig}"


@pytest.fixture(autouse=True)
def _patch_settings(monkeypatch):
    monkeypatch.setattr(auth.settings, "jwt_secret", SECRET)
    monkeypatch.setattr(auth.settings, "azure_auth_cookie_name", COOKIE_NAME)
    monkeypatch.setattr(auth.settings, "azure_jwks_url", "")  # Azure disabled by default


def _req(bearer=None, cookie=None, ada=None):
    """Build a minimal Request-like object for current_user tests."""
    headers: dict[str, str] = {}
    cookies: dict[str, str] = {}
    if bearer:
        headers["authorization"] = f"Bearer {bearer}"
    if cookie:
        cookies[COOKIE_NAME] = cookie
    if ada:
        headers["x-ada-session"] = ada

    class _FakeReq:
        pass

    r = _FakeReq()
    r.headers = headers
    r.cookies = cookies
    return r


def _ws(bearer=None, cookie=None, ada=None):
    """Build a minimal WebSocket-like object for get_ws_user tests."""
    return _req(bearer=bearer, cookie=cookie, ada=ada)


# ── decode_hs256 ────────────────────────────────────────────────────────────

def test_decode_valid():
    assert decode_hs256(make_token(role="admin"), SECRET)["role"] == "admin"


def test_decode_rejects_bad_signature():
    with pytest.raises(JWTError):
        decode_hs256(make_token(secret="wrong"), SECRET)


def test_decode_rejects_expired():
    with pytest.raises(JWTError):
        decode_hs256(make_token(exp_delta=-10), SECRET)


def test_decode_rejects_alg_none():
    with pytest.raises(JWTError):
        decode_hs256(make_token(alg="none"), SECRET)


# ── _parse_cookie_string ────────────────────────────────────────────────────

def test_parse_cookie_string_found(monkeypatch):
    monkeypatch.setattr(auth.settings, "azure_auth_cookie_name", COOKIE_NAME)
    raw = f"other=abc; {COOKIE_NAME}=eyJtoken; path=/"
    assert _parse_cookie_string(raw) == "eyJtoken"


def test_parse_cookie_string_not_found(monkeypatch):
    monkeypatch.setattr(auth.settings, "azure_auth_cookie_name", COOKIE_NAME)
    assert _parse_cookie_string("other=abc; another=xyz") is None


# ── current_user — HS256 Bearer path ───────────────────────────────────────

async def test_current_user_ok():
    u = await current_user(_req(bearer=make_token(role="global_platform_admin")))
    assert u.id == "u1" and u.role == "global_platform_admin"


async def test_current_user_missing_header_401():
    with pytest.raises(HTTPException) as exc:
        await current_user(_req())
    assert exc.value.status_code == 401


async def test_current_user_bad_signature_401():
    with pytest.raises(HTTPException) as exc:
        await current_user(_req(bearer=make_token(secret="wrong")))
    assert exc.value.status_code == 401


# ── current_user — Azure cookie path ───────────────────────────────────────

async def test_current_user_azure_cookie(monkeypatch):
    monkeypatch.setattr(auth.settings, "azure_jwks_url", "https://fake.jwks/keys")
    fake_claims = {"oid": "azure-user-1", "extension_Roles": "ROLE_COMPANY_ADMIN"}
    with patch("infrastructure.auth.jwt_handler.verify_azure_token", return_value=fake_claims):
        u = await current_user(_req(cookie="fake-azure-token"))
    assert u.id == "azure-user-1" and u.role == "admin" and u.tenant_id is None


async def test_current_user_azure_ada_header(monkeypatch):
    monkeypatch.setattr(auth.settings, "azure_jwks_url", "https://fake.jwks/keys")
    fake_claims = {"oid": "azure-user-2", "extension_Roles": ""}
    ada_value = f"other=x; {COOKIE_NAME}=fake-azure-token"
    with patch("infrastructure.auth.jwt_handler.verify_azure_token", return_value=fake_claims):
        u = await current_user(_req(ada=ada_value))
    assert u.id == "azure-user-2" and u.role == "user"


async def test_current_user_azure_disabled_falls_through_to_hs256(monkeypatch):
    # azure_jwks_url is "" (from autouse fixture) → _try_azure returns None → HS256 succeeds
    u = await current_user(_req(bearer=make_token(role="admin")))
    assert u.id == "u1" and u.role == "admin"


async def test_current_user_azure_role_mapping(monkeypatch):
    monkeypatch.setattr(auth.settings, "azure_jwks_url", "https://fake.jwks/keys")
    non_admin_claims = {"sub": "u-sub", "extension_Roles": "ROLE_VIEWER"}
    with patch("infrastructure.auth.jwt_handler.verify_azure_token", return_value=non_admin_claims):
        u = await current_user(_req(cookie="fake-token"))
    assert u.role == "user"


# ── get_ws_user — token query param (HS256) path ───────────────────────────

async def test_get_ws_user_token_param_hs256():
    tok = make_token(role="admin")
    u = await get_ws_user(_ws(), token=tok)
    assert u.id == "u1" and u.role == "admin"


async def test_get_ws_user_bearer_hs256_fallback():
    tok = make_token(role="global_platform_admin")
    # Azure disabled → bearer falls back to HS256
    u = await get_ws_user(_ws(bearer=tok))
    assert u.id == "u1" and u.role == "global_platform_admin"


async def test_get_ws_user_no_token_401():
    with pytest.raises(HTTPException) as exc:
        await get_ws_user(_ws())
    assert exc.value.status_code == 401


async def test_get_ws_user_azure_cookie(monkeypatch):
    monkeypatch.setattr(auth.settings, "azure_jwks_url", "https://fake.jwks/keys")
    fake_claims = {"oid": "ws-user-1", "extension_Roles": "ROLE_COMPANY_ADMIN"}
    with patch("infrastructure.auth.jwt_handler.verify_azure_token", return_value=fake_claims):
        u = await get_ws_user(_ws(cookie="fake-azure-token"))
    assert u.id == "ws-user-1" and u.role == "admin"


# ── require_admin ───────────────────────────────────────────────────────────

async def test_require_admin_allows_admin():
    assert (await require_admin(User(id="u1", role="admin"))).role == "admin"


async def test_require_admin_allows_global_platform_admin():
    assert (await require_admin(User(id="u1", role="global_platform_admin"))).id == "u1"


async def test_require_admin_rejects_user_403():
    with pytest.raises(HTTPException) as exc:
        await require_admin(User(id="u1", role="user"))
    assert exc.value.status_code == 403


async def test_require_admin_rejects_no_role_403():
    with pytest.raises(HTTPException) as exc:
        await require_admin(User(id="u1", role=None))
    assert exc.value.status_code == 403
