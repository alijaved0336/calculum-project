from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
from jwt import PyJWKClient

from config import settings

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        if not settings.azure_jwks_url:
            raise RuntimeError("AZURE_JWKS_URL is not configured")
        _jwks_client = PyJWKClient(settings.azure_jwks_url, cache_keys=True)
    return _jwks_client


def sign_auth_token(*, email: str, user_id: str, tenant_id: str | None, role: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "email": email,
        "sub": user_id,
        "user_id": user_id,
        "tenant_id": tenant_id,
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=settings.jwt_expiry_hours),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])


def verify_azure_token(token: str) -> dict:
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    decode_opts: dict = {}
    if not settings.azure_b2c_audience:
        decode_opts["verify_aud"] = False
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        audience=settings.azure_b2c_audience or None,
        issuer=settings.azure_b2c_issuer or None,
        options=decode_opts,
        leeway=timedelta(hours=settings.azure_jwt_leeway_hours),
    )
