"""Azure B2C JWT verification via RS256 + JWKS."""
from __future__ import annotations

from datetime import timedelta

import jwt
from jwt import PyJWKClient

from config import settings

# Module-level client so the JWKS endpoint isn't refetched on every request.
# PyJWKClient already caches signing keys internally.
_jwks_client: PyJWKClient | None = None


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = PyJWKClient(settings.azure_jwks_url, cache_keys=True)
    return _jwks_client


def verify_azure_token(token: str) -> dict:
    """Verify an RS256 Azure B2C JWT and return its claims.

    Fetches the signing key from AZURE_JWKS_URL. Issuer/audience are only
    checked when the corresponding env vars are set (leave empty in dev).
    Raises jwt.PyJWTError (or a subclass) on any failure.
    """
    client = _get_jwks_client()
    signing_key = client.get_signing_key_from_jwt(token)

    options: dict[str, bool] = {}
    kwargs: dict = {
        "algorithms": ["RS256"],
        "key": signing_key.key,
        "options": options,
        "leeway": timedelta(hours=settings.azure_jwt_leeway_hours),
    }

    if settings.azure_b2c_issuer:
        kwargs["issuer"] = settings.azure_b2c_issuer
    else:
        options["verify_iss"] = False

    if settings.azure_b2c_audience:
        kwargs["audience"] = settings.azure_b2c_audience
    else:
        options["verify_aud"] = False

    return jwt.decode(token, **kwargs)
