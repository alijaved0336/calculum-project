"""Guard branches of ensure_sso_uploader (no database). The real inserts and the
kb_documents foreign key are covered by tests/integration/test_sso_uploader.py."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest

from application import sso_user
from application.sso_user import ensure_sso_uploader
from dependencies import _decode_azure

OID = str(uuid.uuid4())
ADMIN = "global_platform_admin"


def _factory(*, user_exists: bool) -> MagicMock:
    session = AsyncMock()
    found = MagicMock()
    found.scalar_one_or_none.return_value = uuid.uuid4() if user_exists else None
    session.execute.return_value = found
    ctx = MagicMock()
    ctx.__aenter__ = AsyncMock(return_value=session)
    ctx.__aexit__ = AsyncMock(return_value=False)
    factory = MagicMock(return_value=ctx)
    factory.session = session
    return factory


async def _call(factory, **overrides):
    kwargs = dict(user_id=OID, email="a@b.co", display_name="A", role=ADMIN)
    kwargs.update(overrides)
    return await ensure_sso_uploader(factory, **kwargs)


@pytest.mark.parametrize("bad_id", [None, "", "not-a-uuid"])
async def test_non_uuid_user_id_is_skipped(bad_id):
    factory = _factory(user_exists=False)
    assert await _call(factory, user_id=bad_id) is False
    factory.assert_not_called()


async def test_disabled_by_flag(monkeypatch):
    monkeypatch.setattr(sso_user.settings, "sso_auto_provision_users", False)
    factory = _factory(user_exists=False)
    assert await _call(factory) is False
    factory.assert_not_called()


async def test_existing_user_is_left_alone():
    factory = _factory(user_exists=True)
    assert await _call(factory, role="user") is True
    factory.session.commit.assert_not_called()


@pytest.mark.parametrize("role", ["admin", "user", None])
async def test_only_a_platform_admin_is_created(role):
    factory = _factory(user_exists=False)
    assert await _call(factory, role=role) is False
    factory.session.commit.assert_not_called()
    assert factory.session.execute.await_count == 1  # the existence check only


async def test_database_error_is_swallowed():
    factory = _factory(user_exists=False)
    factory.session.execute.side_effect = RuntimeError("db down")
    assert await _call(factory) is False


def test_azure_token_name_claim_becomes_display_name(monkeypatch):
    monkeypatch.setattr(
        "dependencies.verify_azure_token",
        lambda _t: {"oid": OID, "email": "a@b.co", "name": "Ada", "extension_IsSuperAdmin": True},
    )
    user = _decode_azure("token")
    assert (user.user_id, user.display_name, user.role) == (OID, "Ada", ADMIN)
