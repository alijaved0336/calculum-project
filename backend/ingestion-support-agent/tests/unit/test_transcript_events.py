import json
import uuid

import pytest
from fastapi.testclient import TestClient

from application.ingest.use_case import IngestDocumentUseCase
from infrastructure.session.progress_broker import ProgressBroker


class FakePg:
    def __init__(self):
        self.tracking = []
        self.tstatus = []
        self.merged = []

    async def update_tracking(self, file_uuid, status, **extra):
        self.tracking.append((str(file_uuid), status, extra))

    async def merge_document_metadata(self, file_uuid, patch):
        self.merged.append((str(file_uuid), patch))

    async def set_transcript_status(self, file_uuid, transcript_status, status=None, **extra):
        self.tstatus.append(transcript_status)


class FakeJobs:
    def update_status(self, job_id, status, **extra):
        pass

    def remove(self, job_id):
        pass


def _uc(pg, broker):
    return IngestDocumentUseCase(
        pipeline=None, job_repo=FakeJobs(), embed_dims=2560,
        pg_adapter=pg, vector_store=None, broker=broker,
    )


@pytest.mark.asyncio
async def test_finalize_emits_upserted_and_sets_transcript_status():
    pg, broker = FakePg(), ProgressBroker()
    vid = str(uuid.uuid4())
    await _uc(pg, broker)._finalize("job1", vid, "t.vtt", 5, extra_metadata={"transcript_format": "vtt"})
    events = [e async for e in broker.subscribe(f"transcript:{vid}")]
    assert events[-1]["status"] == "upserted"
    assert events[-1]["chunk_count"] == 5
    assert "upserted" in pg.tstatus


@pytest.mark.asyncio
async def test_finalize_empty_emits_empty():
    pg, broker = FakePg(), ProgressBroker()
    vid = str(uuid.uuid4())
    await _uc(pg, broker)._finalize("job1", vid, "t.vtt", 0, extra_metadata=None)
    events = [e async for e in broker.subscribe(f"transcript:{vid}")]
    assert events[-1]["status"] == "empty"
    assert "empty" in pg.tstatus


@pytest.mark.asyncio
async def test_fail_emits_failed():
    pg, broker = FakePg(), ProgressBroker()
    vid = str(uuid.uuid4())
    await _uc(pg, broker)._fail("job1", vid, RuntimeError("boom"))
    events = [e async for e in broker.subscribe(f"transcript:{vid}")]
    assert events[-1]["status"] == "failed"
    assert "failed" in pg.tstatus


def test_transcript_events_route_streams():
    from api.deps.auth import User, require_admin
    from api.main import app
    from dependencies import get_progress_broker

    app.dependency_overrides[require_admin] = lambda: User(id="u", role="admin")
    broker = get_progress_broker()
    broker.publish("transcript:tv1", {"phase": "transcript", "status": "uploading"})
    broker.publish("transcript:tv1", {"phase": "transcript", "status": "upserted"}, terminal=True)
    try:
        with TestClient(app) as client:
            with client.stream("GET", "/ingest/video/tv1/events") as r:
                frames = [json.loads(l[5:].strip()) for l in r.iter_lines() if l.startswith("data:")]
    finally:
        app.dependency_overrides.clear()
    assert [f["status"] for f in frames] == ["uploading", "upserted"]


def test_transcript_events_requires_auth():
    from api.main import app

    with TestClient(app) as client:
        assert client.get("/ingest/video/tv1/events").status_code == 401
