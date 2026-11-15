import base64
import json
import uuid

from fastapi.testclient import TestClient

import api.routes.videos as vroutes
from api.main import app


class FakeKb:
    def __init__(self, status="awaiting_upload"):
        self._status = status
        self.set_calls = []

    async def get_kb_document(self, uid):
        return {"video_id": str(uid), "video_status": self._status}

    async def set_video_status(self, uid, s, status=None, **e):
        self.set_calls.append(s)
        self._status = s

    async def merge_document_metadata(self, uid, patch):
        pass


def _push_body(object_name):
    data = base64.b64encode(json.dumps({"name": object_name, "bucket": "b"}).encode()).decode()
    return {"message": {"data": data, "attributes": {"objectId": object_name}}, "subscription": "s"}


class FakeStore:
    def __init__(self, size):
        self._size = size
        self.copied = []
        self.deleted = []

    def staging_size(self, object_name):
        return self._size

    def copy_to_storage(self, staging, final):
        self.copied.append((staging, final))

    def delete_staging(self, object_name):
        self.deleted.append(object_name)


def _setup(monkeypatch, kb, jobs, store_size=10 * 1024 * 1024 * 1024):
    monkeypatch.setattr(vroutes, "get_kb_document_store", lambda: kb)
    monkeypatch.setattr(vroutes, "verify_pubsub_push", lambda req: None)  # skip OIDC in tests
    monkeypatch.setattr(vroutes, "submit_compress_job",
                        lambda **k: (jobs.append(k), "job1")[1], raising=False)
    # Default: huge staged file so the size-gate always chooses to compress.
    store = FakeStore(store_size)
    monkeypatch.setattr(vroutes, "get_video_store", lambda: store, raising=False)
    monkeypatch.setattr(vroutes, "_probe_duration_best_effort", lambda obj: 4000, raising=False)
    return store


def test_notification_marks_uploaded_and_submits_job(monkeypatch):
    kb, jobs = FakeKb("awaiting_upload"), []
    _setup(monkeypatch, kb, jobs)
    monkeypatch.setattr(vroutes.settings, "video_compress_enabled", True)  # this test exercises the compress path
    monkeypatch.setattr(vroutes.settings, "gcp_storage_bucket", "final-bucket")
    monkeypatch.setattr(vroutes.settings, "gcp_upload_bucket", "upload-bucket")
    vid = str(uuid.uuid4())
    with TestClient(app) as c:
        r = c.post("/videos/gcs-notification", json=_push_body(f"uploads/{vid}.mp4"))
    assert r.status_code == 204
    assert kb.set_calls == ["uploaded", "compressing"]
    assert jobs and jobs[0]["video_id"] == vid
    # input reads the ORIGINAL from the upload bucket; output writes the compressed to the storage bucket
    assert jobs[0]["input_uri"] == f"gs://upload-bucket/uploads/{vid}.mp4"
    assert jobs[0]["output_dir"] == "gs://final-bucket/videos/"


def test_small_file_skips_compression_and_stores_original(monkeypatch):
    kb, jobs = FakeKb("awaiting_upload"), []
    store = _setup(monkeypatch, kb, jobs, store_size=1 * 1024 * 1024)  # 1 MB < threshold
    monkeypatch.setattr(vroutes.settings, "video_compress_min_bytes", 50 * 1024 * 1024)
    vid = str(uuid.uuid4())
    with TestClient(app) as c:
        r = c.post("/videos/gcs-notification", json=_push_body(f"uploads/{vid}.mp4"))
    assert r.status_code == 204
    # no transcode job; original copied straight into the storage bucket, then marked ready
    assert jobs == []
    assert kb.set_calls == ["uploaded", "ready"]
    assert store.copied == [(f"uploads/{vid}.mp4", f"videos/{vid}.mp4")]
    assert store.deleted == [f"uploads/{vid}.mp4"]


def test_compression_disabled_stores_original_regardless_of_size(monkeypatch):
    # Large staged file, but compression disabled → size gate is never consulted; the
    # original is copied straight to videos/ and marked ready. No Transcoder job.
    kb, jobs = FakeKb("awaiting_upload"), []
    store = _setup(monkeypatch, kb, jobs, store_size=10 * 1024 * 1024 * 1024)  # 10 GB
    monkeypatch.setattr(vroutes.settings, "video_compress_enabled", False)
    vid = str(uuid.uuid4())
    with TestClient(app) as c:
        r = c.post("/videos/gcs-notification", json=_push_body(f"uploads/{vid}.mp4"))
    assert r.status_code == 204
    assert jobs == []
    assert kb.set_calls == ["uploaded", "ready"]
    assert store.copied == [(f"uploads/{vid}.mp4", f"videos/{vid}.mp4")]
    assert store.deleted == [f"uploads/{vid}.mp4"]


def test_notification_idempotent_when_past_uploaded(monkeypatch):
    kb, jobs = FakeKb("compressing"), []
    _setup(monkeypatch, kb, jobs)
    vid = str(uuid.uuid4())
    with TestClient(app) as c:
        r = c.post("/videos/gcs-notification", json=_push_body(f"uploads/{vid}.mp4"))
    assert r.status_code == 204 and kb.set_calls == [] and jobs == []


def test_notification_ignores_non_uploads_object(monkeypatch):
    kb, jobs = FakeKb(), []
    _setup(monkeypatch, kb, jobs)
    with TestClient(app) as c:
        r = c.post("/videos/gcs-notification", json=_push_body("videos/abc.mp4"))
    assert r.status_code == 204 and jobs == []


def test_notification_unverified_rejected(monkeypatch):
    kb, jobs = FakeKb(), []
    monkeypatch.setattr(vroutes, "get_kb_document_store", lambda: kb)

    def _boom(req):
        from fastapi import HTTPException
        raise HTTPException(401, "unverified")

    monkeypatch.setattr(vroutes, "verify_pubsub_push", _boom)
    with TestClient(app) as c:
        r = c.post("/videos/gcs-notification", json=_push_body("uploads/x.mp4"))
    assert r.status_code == 401
