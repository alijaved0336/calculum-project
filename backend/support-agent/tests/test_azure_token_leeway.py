import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

import infrastructure.auth.jwt_handler as jwt_handler_mod
from infrastructure.auth.jwt_handler import verify_azure_token

_PRIVATE_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
_PUBLIC_KEY = _PRIVATE_KEY.public_key()


class _FakeSigningKey:
    def __init__(self, key):
        self.key = key


class _FakeJWKSClient:
    def get_signing_key_from_jwt(self, token):
        return _FakeSigningKey(_PUBLIC_KEY)


@pytest.fixture(autouse=True)
def _fake_jwks(monkeypatch):
    monkeypatch.setattr(jwt_handler_mod.settings, "azure_jwks_url", "https://example.com/jwks")
    monkeypatch.setattr(jwt_handler_mod.settings, "azure_b2c_issuer", "")
    monkeypatch.setattr(jwt_handler_mod.settings, "azure_b2c_audience", "")
    monkeypatch.setattr(jwt_handler_mod, "_get_jwks_client", lambda: _FakeJWKSClient())


def _token(exp_offset_seconds: int) -> str:
    claims = {"sub": "u1", "exp": int(time.time()) + exp_offset_seconds}
    return jwt.encode(claims, _PRIVATE_KEY, algorithm="RS256")


def test_verify_azure_token_accepts_token_expired_within_leeway_window(monkeypatch):
    monkeypatch.setattr(jwt_handler_mod.settings, "azure_jwt_leeway_hours", 1)
    tok = _token(exp_offset_seconds=-30 * 60)  # expired 30 min ago, leeway is 1h
    payload = verify_azure_token(tok)
    assert payload["sub"] == "u1"


def test_verify_azure_token_still_rejects_token_expired_beyond_leeway_window(monkeypatch):
    monkeypatch.setattr(jwt_handler_mod.settings, "azure_jwt_leeway_hours", 1)
    tok = _token(exp_offset_seconds=-2 * 3600)  # expired 2h ago, beyond the 1h leeway
    with pytest.raises(jwt.ExpiredSignatureError):
        verify_azure_token(tok)
