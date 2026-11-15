import pytest
from fastapi.testclient import TestClient

from application.videos.upload_use_case import VideoUploadUseCase
from infrastructure.session.progress_broker import ProgressBroker


class FakeGcs:
    def upload(self, path, vid):
        return f"videos/{vid}.mp4"


class FakeKb:
    def __init__(self):
        self.status = []  # (video_status, coarse_status)
        self.merged = None

    async def set_video_status(self, vid, video_status, status=None, **extra):
        self.status.append((video_status, status))

    async def merge_document_metadata(self, vid, patch):
        self.merged = patch


@pytest.mark.asyncio
async def test_execute_publishes_processing_uploading_uploaded(tmp_path, monkeypatch):
    import application.videos.upload_use_case as m

    monkeypatch.setattr(m, "compress_video", lambda p: (p, 100, 40))
    monkeypatch.setattr(m, "probe_duration_ms", lambda p: 4000)
    src = tmp_path / "v.mp4"
    src.write_bytes(b"x" * 10)

    broker, kb = ProgressBroker(), FakeKb()
    uc = VideoUploadUseCase(FakeGcs(), kb, broker)
    vid = "11111111-1111-1111-1111-111111111111"
    await uc.execute(vid, str(src), 100, "v.mp4", "T", "u")

    events = [e async for e in broker.subscribe(f"video:{vid}")]
    assert [e["status"] for e in events] == ["processing", "compressing", "uploading", "uploaded"]
    assert events[-1]["size_before"] == 100 and events[-1]["size_after"] == 40
    assert kb.status[-1] == ("uploaded", "uploaded")
    assert kb.merged["gcs_object"] == f"videos/{vid}.mp4"
    assert kb.merged["duration_ms"] == 4000
    assert not src.exists()  # background use case owns temp cleanup


@pytest.mark.asyncio
async def test_execute_failure_publishes_failed(tmp_path, monkeypatch):
    import application.videos.upload_use_case as m

    monkeypatch.setattr(m, "compress_video", lambda p: (p, 100, 40))
    monkeypatch.setattr(m, "probe_duration_ms", lambda p: 4000)
    src = tmp_path / "v.mp4"
    src.write_bytes(b"x")

    class BoomGcs:
        def upload(self, p, v):
            raise RuntimeError("gcs down")

    broker, kb = ProgressBroker(), FakeKb()
    uc = VideoUploadUseCase(BoomGcs(), kb, broker)
    vid = "22222222-2222-2222-2222-222222222222"
    await uc.execute(vid, str(src), 100, "v.mp4", "T", "u")  # must not raise

    events = [e async for e in broker.subscribe(f"video:{vid}")]
    assert events[-1]["status"] == "failed"
    assert kb.status[-1] == ("failed", "Failed")
    assert not src.exists()


def _client_with_fakes(monkeypatch):
    import api.routes.videos as vroutes
    from api.deps.auth import User, require_admin
    from api.main import app

    class FakeKbStore:
        async def create_video_row(self, *a, **k):
            pass

    class FakeUC:
        async def execute(self, *a, **k):
            pass

    monkeypatch.setattr(vroutes, "get_kb_document_store", lambda: FakeKbStore())
    monkeypatch.setattr(vroutes, "get_video_upload_use_case", lambda: FakeUC())
    app.dependency_overrides[require_admin] = lambda: User(id="u", role="admin")
    return app


def test_post_video_returns_202_with_events_url(monkeypatch):
    app = _client_with_fakes(monkeypatch)
    try:
        with TestClient(app) as client:
            r = client.post("/videos", files={"video": ("v.mp4", b"data", "video/mp4")})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 202
    body = r.json()
    assert body["status"] == "processing" and body["video_id"]
    assert body["events_url"] == f"/videos/{body['video_id']}/events"


def test_post_video_rejects_non_mp4(monkeypatch):
    app = _client_with_fakes(monkeypatch)
    try:
        with TestClient(app) as client:
            r = client.post("/videos", files={"video": ("v.mov", b"data", "video/quicktime")})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 422


def test_post_video_rejects_oversized(monkeypatch):
    import api.routes.videos as vroutes

    app = _client_with_fakes(monkeypatch)
    monkeypatch.setattr(vroutes.settings, "max_video_bytes", 3)
    try:
        with TestClient(app) as client:
            r = client.post("/videos", files={"video": ("v.mp4", b"toolong", "video/mp4")})
    finally:
        app.dependency_overrides.clear()
    assert r.status_code == 413
