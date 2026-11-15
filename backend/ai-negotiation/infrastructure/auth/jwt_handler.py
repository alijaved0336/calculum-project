from __future__ import annotations
import jwt
from jwt import PyJWKClient
from datetime import datetime, timedelta, timezone
from config import settings


def sign_auth_token(
    *,
    email: str,
    scope: str,
    user_id: str | None = None,
    role: str | None = None,
    tenant_id: str | None = None,
) -> str:
    payload = {
        "token_type": "auth",
        "email": email,
        "scope": scope,
        "user_id": user_id,
        "role": role,
        "tenant_id": tenant_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=settings.jwt_expiry_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.ALGORITHM)


def verify_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[settings.ALGORITHM])


# ── Azure B2C / RS256 ─────────────────────────────────────────────────────────
# PyJWKClient fetches the public key set once and caches it; re-fetches on
# unknown kid so key rotation is handled automatically without a restart.

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not settings.azure_jwks_url:
            raise RuntimeError("AZURE_JWKS_URL is not configured")
        _jwks_client = PyJWKClient(settings.azure_jwks_url, cache_keys=True)
    return _jwks_client


def verify_azure_token(token: str) -> dict:
    """Validate an Azure B2C RS256 JWT using the public JWKS endpoint.

    Returns the decoded claims dict.  Raises jwt.PyJWTError subclasses on any
    failure (expired, bad signature, wrong issuer, wrong audience, etc.) so
    callers can map them to HTTP 401 uniformly.
    """
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)

    audience = settings.azure_b2c_audience or None
    issuer   = settings.azure_b2c_issuer   or None

    options = {
        "verify_aud": bool(audience),
        "verify_iss": bool(issuer),
    }
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=audience,
        issuer=issuer,
        options=options,
        leeway=timedelta(hours=settings.azure_jwt_leeway_hours),
    )
