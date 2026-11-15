from __future__ import annotations

from datetime import timedelta

import jwt
from jwt import PyJWKClient

from config import settings

_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.azure_jwks_url, cache_keys=True)
    return _jwks_client


def verify_azure_token(token: str) -> dict:
    """Verify an RS256 Azure B2C JWT via JWKS. Returns the decoded payload.

    If AZURE_B2C_ISSUER / AZURE_B2C_AUDIENCE are empty strings, those claims are
    not verified — safe for dev, must be set in prod.
    """
    if not settings.azure_jwks_url:
        raise jwt.PyJWTError("Azure JWKS URL not configured")
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)
    options: dict = {}
    decode_kwargs: dict = {
        "algorithms": ["RS256"],
        "leeway": timedelta(hours=settings.azure_jwt_leeway_hours),
    }
    if settings.azure_b2c_audience:
        decode_kwargs["audience"] = settings.azure_b2c_audience
    else:
        options["verify_aud"] = False
    if settings.azure_b2c_issuer:
        decode_kwargs["issuer"] = settings.azure_b2c_issuer
    else:
        options["verify_iss"] = False
    if options:
        decode_kwargs["options"] = options
    return jwt.decode(token, signing_key.key, **decode_kwargs)
