"""Every upload 202 returns `title` = the uploaded file's original filename."""
from fastapi.testclient import TestClient

import api.routes.ingest as ingest_routes
import api.routes.videos as video_routes
from api.deps.auth import User, require_admin
from api.main import app


class _FakeKb:
    async def create_video_row(self, *a, **k):
        pass

    async def create_document_row(self, *a, **k):
        pass

    async def get_document_metadata(self, *a, **k):
        return {"duration_ms": 100000, "gcs_object": "videos/v.mp4"}


class _FakeUC:
    def create_job(self, *a, **k):
        pass

    async def execute(self, *a, **k):
        pass


def _override(monkeypatch):
    for mod in (ingest_routes, video_routes):
        monkeypatch.setattr(mod, "get_kb_document_store", lambda: _FakeKb(), raising=False)
    monkeypatch.setattr(ingest_routes, "get_document_ingest_use_case", lambda: _FakeUC())
    monkeypatch.setattr(ingest_routes, "get_video_ingest_use_case", lambda: _FakeUC())
    monkeypatch.setattr(video_routes, "get_video_upload_use_case", lambda: _FakeUC())
    app.dependency_overrides[require_admin] = lambda: User(id="u", role="admin")


def test_video_response_title(monkeypatch):
    _override(monkeypatch)
    try:
        with TestClient(app) as c:
            r = c.post("/videos", files={"video": ("how-to.mp4", b"data", "video/mp4")})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 202 and r.json()["title"] == "how-to"


def test_document_response_title(monkeypatch):
    _override(monkeypatch)
    try:
        with TestClient(app) as c:
            r = c.post("/ingest/document", files={"file": ("handbook.pdf", b"%PDF", "application/pdf")})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 202 and r.json()["title"] == "handbook"


def test_transcript_response_title(monkeypatch):
    _override(monkeypatch)
    vtt = b"WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi\n"
    try:
        with TestClient(app) as c:
            r = c.post(
                "/ingest/video/transcript",
                files={"transcript": ("clip.vtt", vtt, "text/vtt")},
                data={"video_id": "11111111-1111-1111-1111-111111111111"},
            )
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 202 and r.json()["title"] == "clip"
