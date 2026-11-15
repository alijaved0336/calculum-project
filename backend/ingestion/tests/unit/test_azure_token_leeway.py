from __future__ import annotations

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from infrastructure.auth import jwt_handler


@pytest.fixture
def rsa_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private_key, private_key.public_key()


def _make_token(private_key, *, expired_by: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "user-123",
        "iat": now - expired_by - timedelta(minutes=1),
        "exp": now - expired_by,
    }
    return jwt.encode(payload, private_key, algorithm="RS256")


class _FakeSigningKey:
    def __init__(self, key):
        self.key = key


class _FakeJWKSClient:
    def __init__(self, public_key):
        self._public_key = public_key

    def get_signing_key_from_jwt(self, token):
        return _FakeSigningKey(self._public_key)


@pytest.fixture(autouse=True)
def _patch_jwks_client(monkeypatch, rsa_keypair):
    _, public_key = rsa_keypair
    monkeypatch.setattr(jwt_handler, "_get_jwks_client", lambda: _FakeJWKSClient(public_key))


def test_verify_azure_token_accepts_token_expired_within_leeway_window(monkeypatch, rsa_keypair):
    private_key, _ = rsa_keypair
    monkeypatch.setattr(jwt_handler.settings, "azure_jwt_leeway_hours", 24)
    monkeypatch.setattr(jwt_handler.settings, "azure_b2c_audience", None)
    monkeypatch.setattr(jwt_handler.settings, "azure_b2c_issuer", None)

    token = _make_token(private_key, expired_by=timedelta(minutes=20))

    claims = jwt_handler.verify_azure_token(token)

    assert claims["sub"] == "user-123"


def test_verify_azure_token_still_rejects_token_expired_beyond_leeway_window(monkeypatch, rsa_keypair):
    private_key, _ = rsa_keypair
    monkeypatch.setattr(jwt_handler.settings, "azure_jwt_leeway_hours", 1)
    monkeypatch.setattr(jwt_handler.settings, "azure_b2c_audience", None)
    monkeypatch.setattr(jwt_handler.settings, "azure_b2c_issuer", None)

    token = _make_token(private_key, expired_by=timedelta(hours=2))

    with pytest.raises(jwt.ExpiredSignatureError):
        jwt_handler.verify_azure_token(token)
