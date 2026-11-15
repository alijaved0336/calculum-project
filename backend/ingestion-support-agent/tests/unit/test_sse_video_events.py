import json

from fastapi.testclient import TestClient

from api.deps.auth import User, require_admin
from api.main import app
from dependencies import get_progress_broker


def _data_frames(raw_lines):
    return [json.loads(line[5:].strip()) for line in raw_lines if line.startswith("data:")]


def test_video_events_stream_replays_and_closes():
    app.dependency_overrides[require_admin] = lambda: User(id="u", role="admin")
    broker = get_progress_broker()
    broker.publish("video:v1", {"phase": "video", "status": "processing"})
    broker.publish("video:v1", {"phase": "video", "status": "uploading"})
    broker.publish("video:v1", {"phase": "video", "status": "uploaded"}, terminal=True)
    try:
        with TestClient(app) as client:
            with client.stream("GET", "/videos/v1/events") as r:
                frames = _data_frames(r.iter_lines())
    finally:
        app.dependency_overrides.clear()
    assert [f["status"] for f in frames] == ["processing", "uploading", "uploaded"]


def test_video_events_requires_auth():
    with TestClient(app) as client:
        assert client.get("/videos/v1/events").status_code == 401
