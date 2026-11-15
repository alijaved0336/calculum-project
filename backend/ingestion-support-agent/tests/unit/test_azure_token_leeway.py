"""Ada session cookie carries a short-lived JWT (exp = standard OIDC access-token
lifetime) even though Ada treats the parent login as good for ~24h behind a silent
refresh this service doesn't run. AZURE_JWT_LEEWAY_HOURS lets verify_azure_token
accept a token up to N hours past its own exp claim.

Real self-signed RS256 tokens; only the JWKS network call is faked.
"""
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

import infrastructure.auth.jwt_handler as jwt_handler
from config import settings

_private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _make_token(exp_delta_seconds: int) -> str:
    payload = {"sub": "u1", "exp": int(time.time()) + exp_delta_seconds}
    return jwt.encode(payload, _private_key, algorithm="RS256")


class _FakeSigningKey:
    def __init__(self, key):
        self.key = key


class _FakeJWKSClient:
    def get_signing_key_from_jwt(self, token):
        return _FakeSigningKey(_private_key.public_key())


@pytest.fixture(autouse=True)
def _patch_jwks_client(monkeypatch):
    monkeypatch.setattr(jwt_handler, "_get_jwks_client", lambda: _FakeJWKSClient())
    monkeypatch.setattr(settings, "azure_b2c_issuer", "")
    monkeypatch.setattr(settings, "azure_b2c_audience", "")


def test_verify_azure_token_accepts_token_expired_within_leeway_window(monkeypatch):
    monkeypatch.setattr(settings, "azure_jwt_leeway_hours", 24)
    token = _make_token(exp_delta_seconds=-60 * 60)  # expired 1h ago

    claims = jwt_handler.verify_azure_token(token)

    assert claims["sub"] == "u1"


def test_verify_azure_token_still_rejects_token_expired_beyond_leeway_window(monkeypatch):
    monkeypatch.setattr(settings, "azure_jwt_leeway_hours", 24)
    token = _make_token(exp_delta_seconds=-25 * 60 * 60)  # expired 25h ago

    with pytest.raises(jwt.PyJWTError):
        jwt_handler.verify_azure_token(token)
