"""Guard branches of ensure_sso_user, which must never raise and must not touch the
database when it cannot (or must not) create a row. The real inserts are covered
by tests/integration/test_sso_user_provisioner.py."""
from __future__ import annotations

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from api.schemas.auth import AuthenticatedUser
from application.services import sso_user_provisioner as mod
from application.services.sso_user_provisioner import ensure_sso_user
from config import Settings
from dependencies import _decode_azure

OID = str(uuid.uuid4())


def _session(*, user_exists: bool = False, tenant_uuid=None) -> AsyncMock:
    """Session whose first scalar lookup is the user check, the next the tenant."""
    session = AsyncMock()
    results = []
    for value in (uuid.uuid4() if user_exists else None, tenant_uuid):
        result = MagicMock()
        result.scalar_one_or_none.return_value = value
        results.append(result)
    session.execute.side_effect = results
    return session


async def _call(session, **overrides):
    kwargs = dict(user_id=OID, email="a@b.co", display_name="A", role="user", tenant_slug="acme")
    kwargs.update(overrides)
    return await ensure_sso_user(session, **kwargs)


@pytest.mark.parametrize("bad_id", [None, "", "not-a-uuid"])
async def test_non_uuid_user_id_is_skipped(bad_id):
    session = _session()
    assert await _call(session, user_id=bad_id) is False
    session.execute.assert_not_called()


@pytest.mark.parametrize("bad_role", [None, "superuser", ""])
async def test_unknown_role_is_skipped(bad_role):
    session = _session()
    assert await _call(session, role=bad_role) is False
    session.execute.assert_not_called()


async def test_disabled_by_flag(monkeypatch):
    monkeypatch.setattr(mod.settings, "sso_auto_provision_users", False)
    session = _session()
    assert await _call(session) is False
    session.execute.assert_not_called()


async def test_existing_user_is_left_alone():
    session = _session(user_exists=True)
    assert await _call(session) is True
    assert session.execute.await_count == 1  # only the existence check
    session.commit.assert_not_called()


async def test_tenant_user_without_a_known_tenant_is_skipped():
    session = _session(tenant_uuid=None)
    assert await _call(session, role="admin", tenant_slug="nope") is False
    assert session.execute.await_count == 2  # user check + tenant lookup, no insert
    session.commit.assert_not_called()


async def test_database_error_is_swallowed_and_rolled_back():
    session = _session(user_exists=False)
    session.execute.side_effect = RuntimeError("db down")
    assert await _call(session, role="global_platform_admin") is False
    session.rollback.assert_awaited_once()


def test_azure_token_name_claim_becomes_display_name(monkeypatch):
    monkeypatch.setattr(
        "dependencies.verify_azure_token",
        lambda _t: {"oid": OID, "email": "a@b.co", "name": "Ada Lovelace"},
    )
    user = _decode_azure("token")
    assert (user.user_id, user.display_name, user.role) == (OID, "Ada Lovelace", "user")


def test_retrieval_probes_require_authentication():
    from api.routes.retrieval import router
    from dependencies import get_vector_store

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[get_vector_store] = lambda: MagicMock()
    response = TestClient(app).post("/retrieval/test", json={"query": "x"})
    assert response.status_code == 401


def test_cors_defaults_preserve_current_behaviour():
    assert Settings(_env_file=None).cors_allow_any_origin is True
    assert Settings(_env_file=None, cors_allow_any_origin=False).cors_allow_any_origin is False
    assert Settings(_env_file=None).sso_auto_provision_users is True
