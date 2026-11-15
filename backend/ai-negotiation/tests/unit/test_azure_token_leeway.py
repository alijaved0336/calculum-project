"""Unit tests for the configurable leeway on Azure B2C token expiry validation
(infrastructure.auth.jwt_handler.verify_azure_token)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import jwt as pyjwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from infrastructure.auth import jwt_handler


def _rsa_keypair():
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    return private_pem, private_key.public_key()


def _make_token(private_pem: bytes, *, exp: datetime) -> str:
    payload = {"oid": "user-1", "email": "u@example.com", "exp": exp}
    return pyjwt.encode(payload, private_pem, algorithm="RS256")


def _patch_jwks(monkeypatch, public_key) -> None:
    fake_client = SimpleNamespace(get_signing_key_from_jwt=lambda token: SimpleNamespace(key=public_key))
    monkeypatch.setattr(jwt_handler, "_jwks_client", fake_client)
    monkeypatch.setattr(jwt_handler.settings, "azure_b2c_audience", "")
    monkeypatch.setattr(jwt_handler.settings, "azure_b2c_issuer", "")


def test_verify_azure_token_accepts_token_expired_within_leeway_window(monkeypatch):
    private_pem, public_key = _rsa_keypair()
    _patch_jwks(monkeypatch, public_key)
    monkeypatch.setattr(jwt_handler.settings, "azure_jwt_leeway_hours", 2)
    token = _make_token(private_pem, exp=datetime.now(timezone.utc) - timedelta(minutes=90))

    claims = jwt_handler.verify_azure_token(token)

    assert claims["oid"] == "user-1"


def test_verify_azure_token_still_rejects_token_expired_beyond_leeway_window(monkeypatch):
    private_pem, public_key = _rsa_keypair()
    _patch_jwks(monkeypatch, public_key)
    monkeypatch.setattr(jwt_handler.settings, "azure_jwt_leeway_hours", 2)
    token = _make_token(private_pem, exp=datetime.now(timezone.utc) - timedelta(hours=3))

    with pytest.raises(pyjwt.ExpiredSignatureError):
        jwt_handler.verify_azure_token(token)
