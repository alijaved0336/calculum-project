import base64
import json
import uuid

from fastapi.testclient import TestClient

import api.routes.videos as vroutes
from api.main import app


class FakeKb:
    def __init__(self, status="compressing"):
        self._status = status
        self.set_calls = []
        self.merged = []

    async def get_kb_document(self, uid):
        return {"video_id": str(uid), "video_status": self._status}

    async def set_video_status(self, uid, s, status=None, **e):
        self.set_calls.append(s)
        self._status = s

    async def merge_document_metadata(self, uid, patch):
        self.merged.append(patch)


class FakeStore:
    def __init__(self):
        self.deleted = []

    def delete_staging(self, object_name):
        self.deleted.append(object_name)


def _job_body(video_id, state):
    data = base64.b64encode(json.dumps(
        {"name": "projects/p/locations/us/jobs/j1", "state": state, "labels": {"video_id": video_id}}
    ).encode()).decode()
    return {"message": {"data": data}, "subscription": "s"}


def _setup(monkeypatch, kb, store):
    monkeypatch.setattr(vroutes, "get_kb_document_store", lambda: kb)
    monkeypatch.setattr(vroutes, "get_video_store", lambda: store, raising=False)
    monkeypatch.setattr(vroutes, "verify_pubsub_push", lambda req: None)
    monkeypatch.setattr(vroutes, "_probe_duration_best_effort", lambda obj: 4000, raising=False)


def test_success_marks_ready_and_deletes_staging(monkeypatch):
    kb, store = FakeKb("compressing"), FakeStore()
    _setup(monkeypatch, kb, store)
    vid = str(uuid.uuid4())
    with TestClient(app) as c:
        r = c.post("/videos/transcoder-notification", json=_job_body(vid, "SUCCEEDED"))
    assert r.status_code == 204
    assert kb.set_calls[-1] == "ready"
    assert any(m.get("gcs_object") == f"videos/{vid}.mp4" and m.get("duration_ms") == 4000 for m in kb.merged)
    assert store.deleted == [f"uploads/{vid}.mp4"]


def test_success_real_transcoder_nested_job_shape(monkeypatch):
    """Real Transcoder messages nest under `job` and carry NO labels — must fetch the job."""
    kb, store = FakeKb("compressing"), FakeStore()
    _setup(monkeypatch, kb, store)
    vid = str(uuid.uuid4())

    class _State:
        name = "SUCCEEDED"

    class FakeJob:
        labels = {"video_id": vid}
        state = _State()

    monkeypatch.setattr(vroutes, "get_job", lambda name: FakeJob(), raising=False)
    data = base64.b64encode(json.dumps(
        {"job": {"name": "projects/p/locations/us/jobs/jX", "state": "SUCCEEDED"}}
    ).encode()).decode()
    with TestClient(app) as c:
        r = c.post("/videos/transcoder-notification", json={"message": {"data": data}})
    assert r.status_code == 204
    assert kb.set_calls[-1] == "ready"
    assert store.deleted == [f"uploads/{vid}.mp4"]


def test_failure_marks_failed(monkeypatch):
    kb, store = FakeKb("compressing"), FakeStore()
    _setup(monkeypatch, kb, store)
    vid = str(uuid.uuid4())
    with TestClient(app) as c:
        r = c.post("/videos/transcoder-notification", json=_job_body(vid, "FAILED"))
    assert r.status_code == 204 and kb.set_calls[-1] == "failed" and store.deleted == []


def test_idempotent_when_already_ready(monkeypatch):
    kb, store = FakeKb("ready"), FakeStore()
    _setup(monkeypatch, kb, store)
    vid = str(uuid.uuid4())
    with TestClient(app) as c:
        r = c.post("/videos/transcoder-notification", json=_job_body(vid, "SUCCEEDED"))
    assert r.status_code == 204 and kb.set_calls == []
