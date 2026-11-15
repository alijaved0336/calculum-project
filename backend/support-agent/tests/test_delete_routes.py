import uuid

from fastapi.testclient import TestClient

import api.routes.documents as docs_mod
import api.routes.videos as vids_mod
from api.deps.auth import current_user
from api.main import app
from domain.entities.user import User


class _FakeVectorStore:
    def __init__(self):
        self.deleted = []

    async def delete_by_file(self, file_uuid):
        self.deleted.append(file_uuid)


class _FakeStore:
    def __init__(self, doc):
        self._doc = doc
        self.deleted = []

    async def get_video(self, uid):
        return self._doc

    async def delete_video(self, uid):
        self.deleted.append(uid)
        return True

    # document store mirror
    async def get_document(self, uid):
        return self._doc

    async def delete_document(self, uid):
        self.deleted.append(uid)
        return True


def _auth(user_id="u1"):
    app.dependency_overrides[current_user] = lambda: User(id=user_id, email="x@y.com")


def teardown_function():
    app.dependency_overrides.clear()


# ── videos ──────────────────────────────────────────────────────────────────

def _wire_videos(monkeypatch, doc):
    store, vs, gcs = _FakeStore(doc), _FakeVectorStore(), []
    monkeypatch.setattr(vids_mod, "get_video_store", lambda: store)
    monkeypatch.setattr(vids_mod, "get_vector_store", lambda: vs)
    monkeypatch.setattr(vids_mod, "delete_object", lambda obj: (gcs.append(obj), True)[1])
    return store, vs, gcs


def test_delete_video_cascades(monkeypatch):
    _auth()
    vid = str(uuid.uuid4())
    doc = {"metadata": {"gcs_object": f"videos/{vid}.mp4",
                        "transcript_gcs_object": f"transcripts/{vid}.vtt"}}
    store, vs, gcs = _wire_videos(monkeypatch, doc)

    r = TestClient(app).delete(f"/videos/{vid}")
    assert r.status_code == 200
    assert r.json() == {"deleted": True, "video_id": vid}
    assert vs.deleted == [vid]                                  # Qdrant purged
    assert set(gcs) == {f"videos/{vid}.mp4", f"transcripts/{vid}.vtt"}  # video + transcript
    assert store.deleted == [uuid.UUID(vid)]                    # PG row


def test_delete_video_not_found(monkeypatch):
    _auth()
    vid = str(uuid.uuid4())
    _wire_videos(monkeypatch, None)                             # get_video → None
    r = TestClient(app).delete(f"/videos/{vid}")
    assert r.status_code == 404


def test_delete_video_bad_uuid(monkeypatch):
    _auth()
    _wire_videos(monkeypatch, {"metadata": {}})
    r = TestClient(app).delete("/videos/not-a-uuid")
    assert r.status_code == 422


def test_delete_video_requires_auth(monkeypatch):
    _wire_videos(monkeypatch, {"metadata": {}})
    r = TestClient(app).delete(f"/videos/{uuid.uuid4()}")
    assert r.status_code == 401


# ── documents ───────────────────────────────────────────────────────────────

def _wire_docs(monkeypatch, doc):
    store, vs, gcs = _FakeStore(doc), _FakeVectorStore(), []
    monkeypatch.setattr(docs_mod, "get_document_store", lambda: store)
    monkeypatch.setattr(docs_mod, "get_vector_store", lambda: vs)
    monkeypatch.setattr(docs_mod, "delete_object", lambda obj: (gcs.append(obj), True)[1])
    return store, vs, gcs


def test_delete_document_cascades(monkeypatch):
    _auth()
    did = str(uuid.uuid4())
    doc = {"metadata": {"gcs_object": f"documents/{did}.pdf"}}
    store, vs, gcs = _wire_docs(monkeypatch, doc)

    r = TestClient(app).delete(f"/documents/{did}")
    assert r.status_code == 200
    assert r.json() == {"deleted": True, "document_id": did}
    assert vs.deleted == [did]
    assert gcs == [f"documents/{did}.pdf"]
    assert store.deleted == [uuid.UUID(did)]


def test_delete_document_not_found(monkeypatch):
    _auth()
    _wire_docs(monkeypatch, None)
    r = TestClient(app).delete(f"/documents/{uuid.uuid4()}")
    assert r.status_code == 404
