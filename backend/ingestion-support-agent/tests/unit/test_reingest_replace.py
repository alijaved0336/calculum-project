"""Re-ingest == replace. Re-uploading a transcript/document for the same file_id:
- purges the file_id's existing Qdrant points BEFORE re-upserting (no stale/duplicate chunks), and
- deletes the orphaned old GCS source object when the new extension changes the object name,
while keeping file_uuid (= file_id) unchanged.
"""
import uuid

import pytest

from application.ingest.use_case import IngestDocumentUseCase


class FakeStore:
    def __init__(self):
        self.uploaded = []
        self.deleted = []

    def upload_source(self, kind, local_path, file_id, ext):
        self.uploaded.append((kind, file_id, ext))
        return f"{'documents' if kind == 'document' else 'transcripts'}/{file_id}{ext}"

    def delete(self, object_name):
        self.deleted.append(object_name)


class FakePg:
    def __init__(self, prior_metadata=None):
        self._prior = prior_metadata or {}
        self.merged = []

    async def get_document_metadata(self, file_uuid):
        return dict(self._prior)

    async def merge_document_metadata(self, file_uuid, patch):
        self.merged.append(patch)


class FakeVectorStore:
    def __init__(self):
        self.deleted = []

    async def delete_by_file_uuid(self, file_uuid):
        self.deleted.append(file_uuid)


class FakeJobs:
    def update_status(self, *a, **k):
        pass

    def remove(self, *a, **k):
        pass


def _uc(pg=None, store=None, vector_store=None, phase="transcript"):
    return IngestDocumentUseCase(
        pipeline=None, job_repo=FakeJobs(), embed_dims=2560,
        pg_adapter=pg, vector_store=vector_store, store=store, phase=phase,
    )


# ── 1. purge old vectors first (delete-then-replace), file_uuid stable ────────

@pytest.mark.asyncio
async def test_purge_existing_chunks_deletes_by_file_uuid():
    vs = FakeVectorStore()
    await _uc(vector_store=vs)._purge_existing_chunks("vid-1")
    assert vs.deleted == ["vid-1"]


@pytest.mark.asyncio
async def test_purge_no_vector_store_is_noop():
    await _uc(vector_store=None)._purge_existing_chunks("vid-1")  # must not raise


# ── 2. orphaned old source object deleted only when the name (extension) changes ─

@pytest.mark.asyncio
async def test_store_source_deletes_orphaned_old_transcript_on_ext_change():
    vid = str(uuid.uuid4())
    pg = FakePg(prior_metadata={"transcript_gcs_object": f"transcripts/{vid}.vtt"})
    store = FakeStore()
    await _uc(pg=pg, store=store, phase="transcript")._store_source(vid, "/tmp/new.srt", "new.srt")

    assert store.uploaded == [("transcript", vid, ".srt")]
    assert store.deleted == [f"transcripts/{vid}.vtt"]              # old object purged
    assert {"transcript_gcs_object": f"transcripts/{vid}.srt", "transcript_filename": "new.srt"} in pg.merged


@pytest.mark.asyncio
async def test_store_source_no_delete_when_same_object():
    vid = str(uuid.uuid4())
    pg = FakePg(prior_metadata={"transcript_gcs_object": f"transcripts/{vid}.vtt"})
    store = FakeStore()
    await _uc(pg=pg, store=store, phase="transcript")._store_source(vid, "/tmp/new.vtt", "new.vtt")
    assert store.deleted == []                                     # same name → overwrite, nothing orphaned


@pytest.mark.asyncio
async def test_store_source_first_ingest_no_prior_no_delete():
    vid = str(uuid.uuid4())
    pg = FakePg(prior_metadata={})                                 # nothing stored yet
    store = FakeStore()
    await _uc(pg=pg, store=store, phase="transcript")._store_source(vid, "/tmp/a.vtt", "a.vtt")
    assert store.deleted == []


@pytest.mark.asyncio
async def test_store_source_document_replaces_old_object():
    did = str(uuid.uuid4())
    pg = FakePg(prior_metadata={"gcs_object": f"documents/{did}.pdf"})
    store = FakeStore()
    await _uc(pg=pg, store=store, phase="document")._store_source(did, "/tmp/new.docx", "new.docx")
    assert store.deleted == [f"documents/{did}.pdf"]
    assert {"gcs_object": f"documents/{did}.docx"} in pg.merged
