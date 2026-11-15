"""_replace_if_exists must never delete the row currently being ingested
(it's created up-front with the uploader; deleting it then re-inserting via
mark_ingestion_started would violate the NOT NULL uploaded_by_user_uuid FK)."""
import uuid

import pytest

from application.ingest.use_case import IngestDocumentUseCase


class FakePg:
    def __init__(self, existing):
        self._existing = existing
        self.deleted = []

    async def get_uuid_by_filename(self, filename):
        return self._existing

    async def delete_kb_document(self, file_uuid):
        self.deleted.append(file_uuid)


class FakeVectorStore:
    def __init__(self):
        self.deleted = []

    async def delete_by_file_uuid(self, file_uuid):
        self.deleted.append(file_uuid)


def _uc(pg, vs):
    return IngestDocumentUseCase(pipeline=None, job_repo=None, embed_dims=2560,
                                 pg_adapter=pg, vector_store=vs)


@pytest.mark.asyncio
async def test_does_not_delete_current_row():
    fid = uuid.uuid4()
    pg, vs = FakePg(existing=fid), FakeVectorStore()
    await _uc(pg, vs)._replace_if_exists("doc.pdf", str(fid))  # same id → must skip
    assert pg.deleted == [] and vs.deleted == []


@pytest.mark.asyncio
async def test_deletes_a_different_old_row():
    old, current = uuid.uuid4(), uuid.uuid4()
    pg, vs = FakePg(existing=old), FakeVectorStore()
    await _uc(pg, vs)._replace_if_exists("doc.pdf", str(current))  # different id → delete old
    assert pg.deleted == [old]
    assert vs.deleted == [str(old)]
