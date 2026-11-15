import uuid

import pytest

from application.ingest.use_case import IngestDocumentUseCase
from domain.entities.pipeline import KBDocumentStatus


class FakePg:
    def __init__(self):
        self.tracking = []
        self.merged = []

    async def update_tracking(self, file_uuid, status, **extra):
        self.tracking.append((str(file_uuid), status, extra))

    async def merge_document_metadata(self, file_uuid, patch):
        self.merged.append((str(file_uuid), patch))


class FakeJobs:
    def __init__(self):
        self.status = []

    def update_status(self, job_id, status, **extra):
        self.status.append((job_id, status, extra))


def _use_case(pg):
    return IngestDocumentUseCase(
        pipeline=None, job_repo=FakeJobs(), embed_dims=2560, pg_adapter=pg, vector_store=None
    )


@pytest.mark.asyncio
async def test_finalize_marks_upserted_and_merges_transcript_format():
    pg = FakePg()
    uc = _use_case(pg)
    vid = str(uuid.uuid4())
    await uc._finalize("job1", vid, "t.vtt", 5, extra_metadata={"transcript_format": "vtt"})
    assert any(s == KBDocumentStatus.UPSERTED for (_id, s, _e) in pg.tracking)
    assert pg.merged == [(vid, {"transcript_format": "vtt"})]


@pytest.mark.asyncio
async def test_finalize_without_transcript_format_does_not_merge():
    pg = FakePg()
    uc = _use_case(pg)
    vid = str(uuid.uuid4())
    await uc._finalize("job1", vid, "doc.pdf", 3, extra_metadata=None)
    assert pg.merged == []
