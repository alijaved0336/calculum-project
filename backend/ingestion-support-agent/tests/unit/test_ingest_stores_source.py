"""The ingest use case archives the source file to GCS (background, fail-fast):
document → documents/<id>.<ext> + metadata.gcs_object; transcript → transcripts/<id>.<ext> +
metadata.transcript_gcs_object. If storage fails, the job fails and nothing is upserted."""
import uuid

import pytest

from application.ingest.use_case import IngestDocumentUseCase


class FakeStore:
    def __init__(self, fail=False):
        self.fail = fail
        self.calls = []

    def upload_source(self, kind, local_path, file_id, ext):
        self.calls.append((kind, file_id, ext))
        if self.fail:
            raise RuntimeError("gcs down")
        return f"{'documents' if kind == 'document' else 'transcripts'}/{file_id}{ext}"


class FakePg:
    def __init__(self):
        self.merged = []
        self.status = []

    async def get_uuid_by_filename(self, filename):
        return None

    async def mark_ingestion_started(self, *a, **k):
        pass

    async def merge_document_metadata(self, file_uuid, patch):
        self.merged.append(patch)

    async def set_document_status(self, vid, s, status=None, **e):
        self.status.append(s)

    async def set_transcript_status(self, vid, s, status=None, **e):
        self.status.append(s)

    async def update_tracking(self, *a, **k):
        pass


class FakeJobs:
    def update_status(self, *a, **k):
        pass

    def remove(self, *a, **k):
        pass


def _uc(pg, store, phase):
    return IngestDocumentUseCase(
        pipeline=None, job_repo=FakeJobs(), embed_dims=2560,
        pg_adapter=pg, vector_store=None, store=store, phase=phase,
    )


@pytest.mark.asyncio
async def test_store_source_document_merges_gcs_object():
    pg, store = FakePg(), FakeStore()
    fid = str(uuid.uuid4())
    await _uc(pg, store, "document")._store_source(fid, "/tmp/x.pdf", "handbook.pdf")
    assert store.calls == [("document", fid, ".pdf")]
    assert {"gcs_object": f"documents/{fid}.pdf"} in pg.merged


@pytest.mark.asyncio
async def test_store_source_transcript_merges_transcript_object():
    pg, store = FakePg(), FakeStore()
    vid = str(uuid.uuid4())
    await _uc(pg, store, "transcript")._store_source(vid, "/tmp/c.vtt", "clip.vtt")
    assert store.calls == [("transcript", vid, ".vtt")]
    assert any(m.get("transcript_gcs_object") == f"transcripts/{vid}.vtt" for m in pg.merged)


@pytest.mark.asyncio
async def test_store_source_failure_propagates():
    pg, store = FakePg(), FakeStore(fail=True)
    with pytest.raises(RuntimeError):
        await _uc(pg, store, "document")._store_source(str(uuid.uuid4()), "/tmp/x.pdf", "x.pdf")
