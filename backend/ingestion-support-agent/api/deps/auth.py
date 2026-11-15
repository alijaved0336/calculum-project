"""JWT auth — three/four-priority chain covering standalone (HS256) and Ada Bot / Azure B2C (RS256).

HTTP priority (current_user dep):
  1. Cookie __Secure-auth_session-token → RS256
  2. Header X-Ada-Session               → parse → RS256
  3. Header Authorization: Bearer       → HS256

WebSocket priority (get_ws_user helper):
  1. Cookie __Secure-auth_session-token → RS256
  2. Header X-Ada-Session               → parse → RS256
  3. Header Authorization: Bearer       → RS256 first, fallback HS256
  4. ?token= query param                → HS256 (browsers can't set custom WS headers)
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from fastapi import Depends, HTTPException, Request, WebSocket, status

from config import settings


class JWTError(Exception):
    pass


def _b64url_decode(segment: str) -> bytes:
    return base64.urlsafe_b64decode(segment + "=" * (-len(segment) % 4))


def decode_hs256(token: str, secret: str) -> dict:
    """Verify an HS256 JWT signature + expiry and return its payload."""
    try:
        header_b64, payload_b64, sig_b64 = token.split(".")
    except ValueError as exc:
        raise JWTError("malformed token") from exc

    header = json.loads(_b64url_decode(header_b64))
    if header.get("alg") != "HS256":
        raise JWTError("unsupported alg")  # reject none/RS256 → no alg confusion

    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, _b64url_decode(sig_b64)):
        raise JWTError("bad signature")

    payload = json.loads(_b64url_decode(payload_b64))
    exp = payload.get("exp")
    if exp is not None and time.time() > float(exp):
        raise JWTError("expired")
    return payload


@dataclass
class User:
    id: str
    role: str | None = None
    tenant_id: str | None = None


_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or missing authentication token.",
    headers={"WWW-Authenticate": "Bearer"},
)


def _parse_cookie_string(header: str) -> str | None:
    """Extract the Azure B2C token from a raw cookie string forwarded in X-Ada-Session."""
    target = settings.azure_auth_cookie_name
    for part in header.split(";"):
        name, _, value = part.strip().partition("=")
        if name.strip() == target:
            return value.strip() or None
    return None


def _user_from_azure(claims: dict) -> User:
    user_id = claims.get("oid") or claims.get("sub")
    if not user_id:
        raise JWTError("no user id in azure claims")
    roles_raw = claims.get("extension_Roles") or ""
    if claims.get("extension_IsSuperAdmin") is True:
        role = "global_platform_admin"
    elif "ROLE_COMPANY_ADMIN" in roles_raw:
        role = "admin"
    else:
        role = "user"
    return User(id=user_id, role=role, tenant_id=None)


def _try_azure(token: str) -> User | None:
    """Attempt RS256 verification. Returns User on success, None if unconfigured or invalid."""
    if not settings.azure_jwks_url:
        return None
    try:
        from infrastructure.auth.jwt_handler import verify_azure_token
        return _user_from_azure(verify_azure_token(token))
    except Exception:  # noqa: BLE001
        return None


def _try_hs256(token: str) -> User | None:
    """Attempt HS256 verification. Returns User on success, None on any failure."""
    try:
        payload = decode_hs256(token, settings.jwt_secret)
    except JWTError:
        return None
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        return None
    return User(id=user_id, role=payload.get("role"), tenant_id=payload.get("tenant_id"))


async def current_user(request: Request) -> User:
    """Resolve authenticated user via the 3-priority HTTP chain. Raises 401 on failure."""
    # 1. Cookie — HttpOnly __Secure-auth_session-token (same-domain / Vite proxy dev)
    cookie_token = request.cookies.get(settings.azure_auth_cookie_name)
    if cookie_token:
        user = _try_azure(cookie_token)
        if user:
            return user

    # 2. X-Ada-Session header — Ada iframe postMessage path
    ada_header = request.headers.get("x-ada-session")
    if ada_header:
        ada_token = _parse_cookie_string(ada_header)
        if ada_token:
            user = _try_azure(ada_token)
            if user:
                return user

    # 3. Authorization: Bearer → HS256 (standalone / calculum-tokenize)
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        bearer_token = auth_header[7:].strip()
        if bearer_token:
            user = _try_hs256(bearer_token)
            if user:
                return user

    raise _UNAUTHORIZED


async def get_ws_user(ws: WebSocket, token: str | None = None) -> User:
    """Resolve authenticated user via the 4-priority WebSocket chain. Raises 401 on failure."""
    # 1. Cookie — HttpOnly __Secure-auth_session-token
    cookie_token = ws.cookies.get(settings.azure_auth_cookie_name)
    if cookie_token:
        user = _try_azure(cookie_token)
        if user:
            return user

    # 2. X-Ada-Session header — Ada iframe postMessage path
    ada_header = ws.headers.get("x-ada-session")
    if ada_header:
        ada_token = _parse_cookie_string(ada_header)
        if ada_token:
            user = _try_azure(ada_token)
            if user:
                return user

    # 3. Authorization: Bearer → RS256 first, fallback HS256
    auth_header = ws.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        bearer_token = auth_header[7:].strip()
        if bearer_token:
            user = _try_azure(bearer_token) or _try_hs256(bearer_token)
            if user:
                return user

    # 4. ?token= query param → HS256 (standalone frontend)
    if token:
        user = _try_hs256(token)
        if user:
            return user

    raise _UNAUTHORIZED


async def require_admin(user: User = Depends(current_user)) -> User:
    """Allow only superadmin roles (global_platform_admin / admin); else 403."""
    if user.role not in settings.ingestion_admin_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Video upload and transcript ingestion require a superadmin role.",
        )
    return user
