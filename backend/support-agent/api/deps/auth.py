from __future__ import annotations

import jwt
from fastapi import HTTPException, Request, status
from fastapi.security import HTTPBearer
from starlette.websockets import WebSocket

from config import settings
from domain.entities.user import GLOBAL_PLATFORM_ADMIN_ROLE, User
from infrastructure.auth.jwt_handler import verify_azure_token

# Renders an "Authorize" button in Swagger (/docs). auto_error=False so a
# missing/invalid credential yields 401 (not 403).
_bearer_scheme = HTTPBearer(auto_error=False, description="calculum-tokenize or Azure B2C JWT")

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or missing authentication token.",
    headers={"WWW-Authenticate": "Bearer"},
)


# ── helpers ──────────────────────────────────────────────────────────────────

def _parse_cookie_string(cookie_header: str, name: str) -> str | None:
    """Extract a named value from a raw cookie string (e.g. an X-Ada-Session header)."""
    for part in cookie_header.split(";"):
        k, _, v = part.strip().partition("=")
        if k.strip() == name:
            return v.strip() or None
    return None


def _decode_azure(token: str) -> User:
    """Decode + validate an RS256 Azure B2C JWT. Returns a User or raises 401."""
    try:
        payload = verify_azure_token(token)
    except jwt.PyJWTError as exc:
        raise _UNAUTHORIZED from exc
    user_id = payload.get("oid") or payload.get("sub")
    if not user_id:
        raise _UNAUTHORIZED
    roles_str = payload.get("extension_Roles") or ""
    if payload.get("extension_IsSuperAdmin"):
        role = GLOBAL_PLATFORM_ADMIN_ROLE
    elif "ROLE_COMPANY_ADMIN" in roles_str:
        role = "admin"
    else:
        role = "user"
    email = payload.get("email") or next(iter(payload.get("emails") or []), None)
    name = (
        payload.get("name")
        or " ".join(p for p in (payload.get("given_name"), payload.get("family_name")) if p)
        or None
    )
    # tenant_id is intentionally None on the RS256 path — tid is the Azure AD
    # GUID, not the app tenant. The body supplies tenant_id on routes that need it.
    return User(id=user_id, role=role, tenant_id=None, email=email, name=name, scope=payload.get("scp"))


def _decode(token: str) -> User:
    """Decode + validate an HS256 calculum-tokenize JWT. Returns a User or raises 401."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise _UNAUTHORIZED from exc
    user_id = payload.get("sub") or payload.get("user_id")
    if not user_id:
        raise _UNAUTHORIZED
    return User(
        id=user_id,
        role=payload.get("role"),
        tenant_id=payload.get("tenant_id"),
    )


# ── HTTP auth dependency ──────────────────────────────────────────────────────

async def get_current_user_any(request: Request) -> User:
    """Three-priority auth chain for HTTP endpoints:

    1. Cookie  __Secure-auth_session-token  → RS256 Azure B2C
    2. Header  X-Ada-Session                → parse cookie string → RS256 Azure B2C
    3. Header  Authorization: Bearer        → HS256 calculum-tokenize
    """
    # 1. Direct HttpOnly cookie set by the Ada/B2C shell
    cookie_token = request.cookies.get(settings.azure_auth_cookie_name)
    if cookie_token:
        return _decode_azure(cookie_token)

    # 2. X-Ada-Session: full raw cookie string forwarded by the Ada iframe
    ada_session = request.headers.get("x-ada-session")
    if ada_session:
        parsed = _parse_cookie_string(ada_session, settings.azure_auth_cookie_name)
        if parsed:
            return _decode_azure(parsed)

    # 3. Standard Bearer token (HS256)
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        if token:
            return _decode(token)

    raise _UNAUTHORIZED


async def current_user(request: Request) -> User:
    """FastAPI dependency: validate via the three-priority auth chain.

    Use as ``user: User = Depends(current_user)`` on any route.
    """
    return await get_current_user_any(request)


# ── WebSocket auth ────────────────────────────────────────────────────────────

def get_ws_user(ws: WebSocket, token: str | None) -> User:
    """Auth resolution for WebSocket connections (browsers can't send custom headers):

    1. Cookie  __Secure-auth_session-token  → RS256 Azure B2C
    2. Header  X-Ada-Session                → parse → RS256 Azure B2C
    3. Header  Authorization: Bearer        → RS256 Azure B2C (parent app proxy path)
                                              falls back to HS256 calculum-tokenize
    4. Query   ?token=<jwt>                 → HS256 calculum-tokenize (standalone)
    """
    # 1. HttpOnly cookie (same-domain / Vite proxy rewrites it in dev)
    cookie_token = ws.cookies.get(settings.azure_auth_cookie_name)
    if cookie_token:
        return _decode_azure(cookie_token)

    # 2. X-Ada-Session forwarded by the Ada shell via postMessage
    ada_session = ws.headers.get("x-ada-session")
    if ada_session:
        parsed = _parse_cookie_string(ada_session, settings.azure_auth_cookie_name)
        if parsed:
            return _decode_azure(parsed)

    # 3. Authorization: Bearer — nginx/proxy injects this for the parent app. Browsers
    #    can't set custom WS headers, but the reverse proxy forwards the header it already
    #    attaches to HTTP requests on the same connection. Try RS256 first (Azure B2C /
    #    parent app), fall back to HS256 (calculum-tokenize) so a single header covers both.
    auth_header = ws.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        bearer_token = auth_header[7:].strip()
        if bearer_token:
            try:
                return _decode_azure(bearer_token)
            except Exception:
                return _decode(bearer_token)

    # 4. ?token= query param (HS256) — standalone frontend
    if token:
        return _decode(token)

    raise _UNAUTHORIZED
