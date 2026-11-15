import json

from api.deps.auth import User, require_admin
from api.main import app
from dependencies import get_progress_broker
from fastapi.testclient import TestClient


def test_document_events_stream():
    app.dependency_overrides[require_admin] = lambda: User(id="u", role="admin")
    broker = get_progress_broker()
    broker.publish("document:d1", {"phase": "document", "status": "uploading"})
    broker.publish("document:d1", {"phase": "document", "status": "processing"})
    broker.publish("document:d1", {"phase": "document", "status": "upserted", "chunk_count": 4}, terminal=True)
    try:
        with TestClient(app) as client:
            with client.stream("GET", "/ingest/document/d1/events") as r:
                frames = [json.loads(l[5:].strip()) for l in r.iter_lines() if l.startswith("data:")]
    finally:
        app.dependency_overrides.clear()
    assert [f["status"] for f in frames] == ["uploading", "processing", "upserted"]


def test_document_events_requires_auth():
    with TestClient(app) as client:
        assert client.get("/ingest/document/d1/events").status_code == 401
