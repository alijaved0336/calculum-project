from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

import api.routes.ingest as ingest_mod
from api.deps.auth import User, require_admin
from api.main import app


@pytest.fixture(autouse=True)
def _as_superadmin():
    # /ingest/video/transcript is superadmin-only; authenticate every request in these tests.
    app.dependency_overrides[require_admin] = lambda: User(id="admin", role="admin")
    yield
    app.dependency_overrides.pop(require_admin, None)


class _FakeUseCase:
    def __init__(self):
        self.created = []
        self.executed = []

    def create_job(self, job_id, file_id, file_path, file_name):
        self.created.append((job_id, file_id, file_name))

    async def execute(self, *args, **kwargs):
        self.executed.append((args, kwargs))


_VALID_VTT = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello\n"


def _patch(monkeypatch, meta):
    async def fake_lookup(video_id):
        return meta

    fake_uc = _FakeUseCase()
    monkeypatch.setattr(ingest_mod, "_lookup_video", fake_lookup)
    monkeypatch.setattr(ingest_mod, "get_video_ingest_use_case", lambda: fake_uc)
    return fake_uc


def test_ingest_video_accepts_valid_transcript(monkeypatch):
    _patch(monkeypatch, {"gcs_object": "videos/v1.mp4", "duration_ms": 60000})
    client = TestClient(app)
    r = client.post(
        "/ingest/video/transcript",
        data={"video_id": str(uuid4()), "title": "Auth setup"},
        files={"transcript": ("t.vtt", _VALID_VTT, "text/vtt")},
    )
    assert r.status_code == 202
    body = r.json()
    assert "job_id" in body and body["status"] == "pending"


def test_ingest_video_rejects_unknown_video(monkeypatch):
    _patch(monkeypatch, None)  # lookup returns None → 404
    client = TestClient(app)
    r = client.post(
        "/ingest/video/transcript",
        data={"video_id": str(uuid4())},
        files={"transcript": ("t.vtt", _VALID_VTT, "text/vtt")},
    )
    assert r.status_code == 404


def test_ingest_video_rejects_bad_transcript(monkeypatch):
    _patch(monkeypatch, {"gcs_object": "videos/v1.mp4", "duration_ms": 60000})
    client = TestClient(app)
    r = client.post(
        "/ingest/video/transcript",
        data={"video_id": str(uuid4())},
        files={"transcript": ("t.txt", "no timestamps here", "text/plain")},
    )
    assert r.status_code == 422
