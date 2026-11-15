import uuid

import pytest

from infrastructure.postgres.models.kb_document import KBDocument

pytestmark = pytest.mark.integration


async def test_video_row_jsonb_roundtrip(pg_session):
    vid = uuid.uuid4()
    row = KBDocument(
        uuid=vid,
        uploaded_by_user_uuid=uuid.uuid4(),  # FK is deferrable; never committed (rollback)
        filename="t.vtt",
        status="Upserted",
        media_type="video",
        title="Auth setup",
        doc_metadata={"gcs_object": "videos/v1.mp4", "duration_ms": 123000, "transcript_format": "vtt"},
    )
    pg_session.add(row)
    await pg_session.flush()
    pg_session.expunge_all()

    got = await pg_session.get(KBDocument, vid)
    assert got.media_type == "video"
    assert got.title == "Auth setup"
    assert got.doc_metadata["transcript_format"] == "vtt"
    assert got.doc_metadata["duration_ms"] == 123000


async def test_media_type_defaults_to_document_on_insert(pg_session):
    did = uuid.uuid4()
    row = KBDocument(uuid=did, uploaded_by_user_uuid=uuid.uuid4(), filename="d.pdf")
    pg_session.add(row)
    await pg_session.flush()
    pg_session.expunge_all()
    got = await pg_session.get(KBDocument, did)
    assert got.media_type == "document"
