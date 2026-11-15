"""Downloading a cited document respects its visibility: public → anyone, private → admins."""
import uuid

from fastapi.testclient import TestClient

import api.routes.documents as docs_mod
from api.deps.auth import current_user
from api.main import app
from domain.entities.user import User


class _Store:
    def __init__(self, doc):
        self._doc = doc

    async def get_document(self, uid):
        return self._doc


class _Signer:
    def sign(self, obj):  # noqa: ANN001
        return f"https://signed/{obj}"


def _auth(role=None):
    app.dependency_overrides[current_user] = lambda: User(id="u1", role=role)


def teardown_function():
    app.dependency_overrides.clear()


def _wire(monkeypatch, is_public):
    doc = {"metadata": {"gcs_object": "documents/d.pdf"}, "is_public": is_public, "filename": "d.pdf"}
    monkeypatch.setattr(docs_mod, "get_document_store", lambda: _Store(doc))
    monkeypatch.setattr(docs_mod, "get_signed_url", lambda: _Signer())


def test_private_document_download_hidden_for_plain_user(monkeypatch):
    # A private doc is invisible to a plain user: 404 (not 403), so the response can't
    # even confirm the file exists.
    _auth(role="user")
    _wire(monkeypatch, is_public=False)
    r = TestClient(app).get(f"/documents/{uuid.uuid4()}/download")
    assert r.status_code == 404


def test_private_document_download_ok_for_tenant_admin(monkeypatch):
    # Any admin (tenant admin or global) may download a private doc from the console.
    _auth(role="admin")
    _wire(monkeypatch, is_public=False)
    r = TestClient(app).get(f"/documents/{uuid.uuid4()}/download")
    assert r.status_code == 200
    assert r.json()["download_url"].startswith("https://signed/")


def test_private_document_download_ok_for_global_admin(monkeypatch):
    _auth(role="global_platform_admin")
    _wire(monkeypatch, is_public=False)
    r = TestClient(app).get(f"/documents/{uuid.uuid4()}/download")
    assert r.status_code == 200
    assert r.json()["download_url"].startswith("https://signed/")


def test_public_document_download_ok_for_any_user(monkeypatch):
    _auth(role="user")
    _wire(monkeypatch, is_public=True)
    r = TestClient(app).get(f"/documents/{uuid.uuid4()}/download")
    assert r.status_code == 200


class _ListStore:
    def __init__(self, items):
        self.items = items

    async def list_documents(self, q, page, page_size):
        return self.items, len(self.items)


def test_list_shows_all_documents_including_private(monkeypatch):
    # The admin library lists every doc regardless of visibility or the caller's role.
    items = [
        {"document_id": "d1", "title": "Pub", "is_public": True, "media_type": "document",
         "status": "ready", "filename": "p.pdf", "metadata": {}, "chunk_count": 1,
         "document_status": "Indexed", "created_at": None, "updated_at": None},
        {"document_id": "d2", "title": "Priv", "is_public": False, "media_type": "document",
         "status": "ready", "filename": "q.pdf", "metadata": {}, "chunk_count": 1,
         "document_status": "Indexed", "created_at": None, "updated_at": None},
    ]
    _auth(role="admin")   # non-global admin still sees all rows in the listing
    monkeypatch.setattr(docs_mod, "get_document_store", lambda: _ListStore(items))
    r = TestClient(app).get("/documents")
    assert r.status_code == 200
    assert {d["document_id"] for d in r.json()["items"]} == {"d1", "d2"}
