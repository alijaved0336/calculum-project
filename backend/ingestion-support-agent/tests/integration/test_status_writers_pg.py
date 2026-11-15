import uuid

import pytest
from sqlalchemy import select

from infrastructure.postgres.models.video_kb_document import VideoKBDocument

pytestmark = pytest.mark.integration


async def test_create_video_row_starts_processing(pg_adapter):
    vid = uuid.uuid4()
    await pg_adapter.create_video_row(vid, "T", {"size_bytes": 1}, uploaded_by=uuid.uuid4())
    doc = await pg_adapter.get_kb_document(vid)
    assert doc["video_status"] == "processing"
    assert doc["transcript_status"] is None
    assert doc["status"] == "uploading"


async def test_video_then_transcript_status_transitions(pg_adapter):
    vid = uuid.uuid4()
    await pg_adapter.create_video_row(vid, "T", {"size_bytes": 1}, uploaded_by=uuid.uuid4())

    await pg_adapter.set_video_status(vid, "uploaded", status="uploaded")
    doc = await pg_adapter.get_kb_document(vid)
    assert doc["video_status"] == "uploaded" and doc["status"] == "uploaded"

    await pg_adapter.set_transcript_status(vid, "upserted", status="Upserted", chunk_count=3)
    doc = await pg_adapter.get_kb_document(vid)
    assert doc["transcript_status"] == "upserted"
    assert doc["status"] == "Upserted"
    assert doc["chunk_count"] == 3
    # video_status is untouched by a transcript update
    assert doc["video_status"] == "uploaded"


async def test_set_video_status_records_error(pg_adapter):
    vid = uuid.uuid4()
    await pg_adapter.create_video_row(vid, "T", {"size_bytes": 1}, uploaded_by=uuid.uuid4())
    await pg_adapter.set_video_status(vid, "failed", status="Failed", error_message="boom")
    doc = await pg_adapter.get_kb_document(vid)
    assert doc["video_status"] == "failed" and doc["status"] == "Failed"


async def test_document_row_and_status_transitions(pg_adapter):
    did = uuid.uuid4()
    await pg_adapter.create_document_row(did, "Handbook", {"page_count": 3}, uploaded_by=uuid.uuid4())
    doc = await pg_adapter.get_kb_document(did)
    assert doc["media_type"] == "document"
    assert doc["document_status"] == "processing" and doc["status"] == "uploading"

    await pg_adapter.set_document_status(did, "upserted", status="Upserted", chunk_count=5)
    doc = await pg_adapter.get_kb_document(did)
    assert doc["document_status"] == "upserted"
    assert doc["status"] == "Upserted" and doc["chunk_count"] == 5


async def test_mark_ingestion_started_updates_existing_row_preserves_uploader(pg_adapter):
    vid = uuid.uuid4()
    uploader = uuid.uuid4()
    await pg_adapter.create_video_row(vid, "T", {"size_bytes": 1}, uploaded_by=uploader)

    # Must NOT raise (previously failed NOT NULL on uploaded_by via INSERT ... ON CONFLICT).
    await pg_adapter.mark_ingestion_started(vid, "clip.json", 49251, ".json")

    doc = await pg_adapter.get_kb_document(vid)
    assert doc["status"] == "Processing"

    # Row was UPDATED in place — the uploader is preserved (not recreated / nulled).
    async with pg_adapter._ensure_engine().begin() as conn:
        after = (await conn.execute(
            select(VideoKBDocument.uploaded_by_user_uuid).where(VideoKBDocument.uuid == vid)
        )).scalar()
    assert after == uploader


async def test_mark_ingestion_started_missing_row_is_noop(pg_adapter):
    missing = uuid.uuid4()
    await pg_adapter.mark_ingestion_started(missing, "x.json", 1, ".json")  # no row → no error
    assert await pg_adapter.get_kb_document(missing) is None
