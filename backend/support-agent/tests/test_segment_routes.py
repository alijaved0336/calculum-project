"""Route tests for the per-video segment manager (GET list, DELETE one)."""
import uuid

from fastapi.testclient import TestClient

import api.routes.videos as vids_mod
from api.deps.auth import current_user
from api.main import app
from domain.entities.retrieval_result import RetrievalResult
from domain.entities.user import GLOBAL_PLATFORM_ADMIN_ROLE, User


def _seg(pid, vid, start_ms, text="hello"):
    return RetrievalResult.from_payload(
        pid, 0.0,
        {"text": text, "file_uuid": vid,
         "metadata": {"file_id": vid, "video_id": vid, "start_ms": start_ms,
                      "end_ms": (start_ms or 0) + 1000, "chunk_type": "transcript",
                      "page_numbers": [1]}},
    )


class _FakeVectorStore:
    def __init__(self, segments=None, by_id=None, count=0):
        self._segments = segments or []
        self._by_id = by_id or {}
        self._count = count
        self.deleted = []

    async def scroll_by_file(self, file_uuid):
        return list(self._segments)

    async def fetch_by_ids(self, ids):
        return [self._by_id[i] for i in ids if i in self._by_id]

    async def delete_by_ids(self, ids):
        self.deleted.extend(ids)
        return len(ids)

    async def count_by_file(self, file_uuid):
        return self._count


class _FakeVideoStore:
    def __init__(self, doc):
        self._doc = doc
        self.set_counts = []

    async def get_video(self, uid):
        return self._doc

    async def set_chunk_count(self, uid, count):
        self.set_counts.append((uid, count))


class _Signer:
    def sign(self, gcs_object):
        return f"https://signed/{gcs_object}"


def _admin():
    app.dependency_overrides[current_user] = lambda: User(
        id="admin", role=GLOBAL_PLATFORM_ADMIN_ROLE, email="a@b.com"
    )


def _plain_user():
    app.dependency_overrides[current_user] = lambda: User(id="u", role="user", email="u@b.com")


def teardown_function():
    app.dependency_overrides.clear()


def _wire(monkeypatch, doc, vs):
    store = _FakeVideoStore(doc)
    monkeypatch.setattr(vids_mod, "get_video_store", lambda: store)
    monkeypatch.setattr(vids_mod, "get_vector_store", lambda: vs)
    monkeypatch.setattr(vids_mod, "get_signed_url", lambda: _Signer())
    return store


# ── GET /videos/{id}/segments ────────────────────────────────────────────────

def test_list_segments_sorted_and_signed(monkeypatch):
    _admin()
    vid = str(uuid.uuid4())
    doc = {"title": "Intro", "metadata": {"gcs_object": f"videos/{vid}.mp4", "duration_ms": 9000}}
    vs = _FakeVectorStore(segments=[_seg("a", vid, 2000), _seg("b", vid, None), _seg("c", vid, 0)])
    _wire(monkeypatch, doc, vs)

    r = TestClient(app).get(f"/videos/{vid}/segments")
    assert r.status_code == 200
    body = r.json()
    assert body["video_url"] == f"https://signed/videos/{vid}.mp4"
    assert body["duration_ms"] == 9000 and body["total"] == 3
    # start_ms asc, null last
    assert [s["id"] for s in body["segments"]] == ["c", "a", "b"]
    assert body["segments"][0]["page_numbers"] == [1]


def test_list_segments_no_gcs_object_returns_null_url(monkeypatch):
    _admin()
    vid = str(uuid.uuid4())
    _wire(monkeypatch, {"title": "x", "metadata": {}}, _FakeVectorStore(segments=[_seg("a", vid, 0)]))
    r = TestClient(app).get(f"/videos/{vid}/segments")
    assert r.status_code == 200 and r.json()["video_url"] is None


def test_list_segments_requires_global_admin(monkeypatch):
    _plain_user()
    _wire(monkeypatch, {"metadata": {}}, _FakeVectorStore())
    r = TestClient(app).get(f"/videos/{uuid.uuid4()}/segments")
    assert r.status_code == 403


def test_list_segments_video_not_found(monkeypatch):
    _admin()
    _wire(monkeypatch, None, _FakeVectorStore())
    r = TestClient(app).get(f"/videos/{uuid.uuid4()}/segments")
    assert r.status_code == 404


def test_list_segments_bad_uuid(monkeypatch):
    _admin()
    _wire(monkeypatch, {"metadata": {}}, _FakeVectorStore())
    r = TestClient(app).get("/videos/not-a-uuid/segments")
    assert r.status_code == 422


# ── DELETE /videos/{id}/segments/{segment_id} ────────────────────────────────

def test_delete_segment_happy_path(monkeypatch):
    _admin()
    vid = str(uuid.uuid4())
    vs = _FakeVectorStore(by_id={"seg1": _seg("seg1", vid, 0)}, count=4)
    store = _wire(monkeypatch, {"metadata": {}}, vs)

    r = TestClient(app).delete(f"/videos/{vid}/segments/seg1")
    assert r.status_code == 200
    assert r.json() == {"video_id": vid, "segment_id": "seg1", "deleted": True, "chunk_count": 4}
    assert vs.deleted == ["seg1"]
    assert store.set_counts == [(uuid.UUID(vid), 4)]


def test_delete_segment_not_found(monkeypatch):
    _admin()
    vid = str(uuid.uuid4())
    vs = _FakeVectorStore(by_id={}, count=0)   # fetch_by_ids returns nothing
    store = _wire(monkeypatch, {"metadata": {}}, vs)
    r = TestClient(app).delete(f"/videos/{vid}/segments/ghost")
    assert r.status_code == 404
    assert vs.deleted == [] and store.set_counts == []


def test_delete_segment_cross_video_forbidden(monkeypatch):
    _admin()
    vid = str(uuid.uuid4())
    other = str(uuid.uuid4())
    vs = _FakeVectorStore(by_id={"seg1": _seg("seg1", other, 0)}, count=0)  # belongs elsewhere
    store = _wire(monkeypatch, {"metadata": {}}, vs)
    r = TestClient(app).delete(f"/videos/{vid}/segments/seg1")
    assert r.status_code == 403
    assert vs.deleted == [] and store.set_counts == []


def test_delete_segment_requires_global_admin(monkeypatch):
    _plain_user()
    _wire(monkeypatch, {"metadata": {}}, _FakeVectorStore())
    r = TestClient(app).delete(f"/videos/{uuid.uuid4()}/segments/seg1")
    assert r.status_code == 403


def test_delete_segment_requires_auth(monkeypatch):
    _wire(monkeypatch, {"metadata": {}}, _FakeVectorStore())
    r = TestClient(app).delete(f"/videos/{uuid.uuid4()}/segments/seg1")
    assert r.status_code == 401
