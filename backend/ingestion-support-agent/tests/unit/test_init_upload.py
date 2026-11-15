from fastapi.testclient import TestClient

import api.routes.videos as vroutes
from api.deps.auth import User, require_admin
from api.main import app


class FakeKb:
    def __init__(self):
        self.rows = []
        self.status = []

    async def create_video_row(self, vid, title, metadata, uploaded_by=None):
        self.rows.append((str(vid), title, metadata))

    async def set_video_status(self, vid, s, status=None, **e):
        self.status.append(s)


class FakeStore:
    def generate_upload_url(self, object_name, content_type, ttl):
        return f"https://signed/{object_name}"


def _setup(monkeypatch, kb):
    monkeypatch.setattr(vroutes, "get_kb_document_store", lambda: kb)
    monkeypatch.setattr(vroutes, "get_video_store", lambda: FakeStore(), raising=False)
    app.dependency_overrides[require_admin] = lambda: User(id="u", role="admin")


def test_init_upload_ok(monkeypatch):
    kb = FakeKb()
    _setup(monkeypatch, kb)
    try:
        with TestClient(app) as c:
            r = c.post("/videos/init-upload",
                       json={"filename": "My Clip.mp4", "content_type": "video/mp4", "size_bytes": 1000})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 202
    b = r.json()
    assert b["title"] == "My Clip" and b["video_id"]
    assert b["upload_url"].startswith("https://signed/uploads/") and b["upload_url"].endswith(".mp4")
    assert b["events_url"].endswith("/events")
    assert kb.status[-1] == "awaiting_upload"


def test_init_upload_rejects_non_mp4(monkeypatch):
    _setup(monkeypatch, FakeKb())
    try:
        with TestClient(app) as c:
            r = c.post("/videos/init-upload",
                       json={"filename": "a.mov", "content_type": "video/quicktime", "size_bytes": 10})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 422


def test_init_upload_rejects_oversize(monkeypatch):
    _setup(monkeypatch, FakeKb())
    monkeypatch.setattr(vroutes.settings, "max_video_bytes", 3)
    try:
        with TestClient(app) as c:
            r = c.post("/videos/init-upload",
                       json={"filename": "a.mp4", "content_type": "video/mp4", "size_bytes": 9999})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 413
