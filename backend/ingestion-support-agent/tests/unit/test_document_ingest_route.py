import api.routes.ingest as ingest_routes
from api.deps.auth import User, require_admin
from api.main import app
from fastapi.testclient import TestClient


class FakeKbStore:
    async def create_document_row(self, *a, **k):
        pass


class FakeUseCase:
    def create_job(self, *a, **k):
        pass

    async def execute(self, *a, **k):
        pass


def _client(monkeypatch):
    monkeypatch.setattr(ingest_routes, "get_kb_document_store", lambda: FakeKbStore())
    monkeypatch.setattr(ingest_routes, "get_document_ingest_use_case", lambda: FakeUseCase())
    app.dependency_overrides[require_admin] = lambda: User(id="u", role="admin")
    return app


def test_ingest_document_accepts_pdf(monkeypatch):
    _client(monkeypatch)
    try:
        with TestClient(app) as client:
            r = client.post(
                "/ingest/document",
                files={"file": ("handbook.txt", b"hello policy doc", "text/plain")},
                data={"title": "Handbook"},
            )
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 202
    body = r.json()
    assert body["job_id"] and body["file_id"] and body["status"] == "pending"


def test_ingest_document_rejects_unsupported_type(monkeypatch):
    _client(monkeypatch)
    try:
        with TestClient(app) as client:
            r = client.post(
                "/ingest/document",
                files={"file": ("x.xyz", b"data", "application/octet-stream")},
            )
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 422


_DOC_ID = "11111111-1111-1111-1111-111111111111"


def _patch_client(monkeypatch, store, vec):
    monkeypatch.setattr(ingest_routes, "get_kb_document_store", lambda: store)
    monkeypatch.setattr(ingest_routes, "get_document_vector_store", lambda: vec)
    app.dependency_overrides[require_admin] = lambda: User(id="u", role="admin")


def test_patch_visibility_writes_payload_before_db(monkeypatch):
    """Toggling visibility must flip the chunk payload (what citation gating reads) BEFORE
    the DB column, and report success only after both succeed."""
    order = []

    class Store:
        async def get_kb_document(self, uid):
            return {"media_type": "document", "is_public": False, "title": "T"}

        async def update_kb_document(self, uid, **k):
            order.append(("db", k))

    class Vec:
        async def set_metadata_fields(self, fid, fields):
            order.append(("qdrant", fields))

    _patch_client(monkeypatch, Store(), Vec())
    try:
        with TestClient(app) as client:
            r = client.patch(f"/ingest/document/{_DOC_ID}", data={"is_public": "true"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 200
    assert r.json()["updated"] == ["visibility"]
    assert [step for step, _ in order] == ["qdrant", "db"]        # payload first
    assert order[0][1] == {"is_public": True}
    assert order[1][1] == {"is_public": True}


def test_patch_visibility_qdrant_failure_aborts_before_db(monkeypatch):
    """If the payload write fails, the DB column must NOT be flipped — both stores stay on
    the old value so a private doc is never left citable and an identical retry re-converges."""
    db_calls = []

    class Store:
        async def get_kb_document(self, uid):
            return {"media_type": "document", "is_public": False, "title": "T"}

        async def update_kb_document(self, uid, **k):
            db_calls.append(k)

    class Vec:
        async def set_metadata_fields(self, fid, fields):
            raise RuntimeError("qdrant unavailable")

    _patch_client(monkeypatch, Store(), Vec())
    try:
        with TestClient(app) as client:
            r = client.patch(f"/ingest/document/{_DOC_ID}", data={"is_public": "true"})
    finally:
        app.dependency_overrides.clear()

    assert r.status_code == 502
    assert db_calls == []   # DB never flipped → no divergence
