from domain.entities.pipeline import DocumentStatus, TranscriptStatus, VideoStatus
from infrastructure.postgres.models.video_kb_document import VideoKBDocument


def test_status_columns_on_owned_table():
    cols = VideoKBDocument.__table__.columns.keys()
    assert "video_status" in cols and "transcript_status" in cols and "document_status" in cols


def test_status_enum_values():
    assert VideoStatus.PROCESSING == "processing"
    assert [s.value for s in VideoStatus] == [
        "awaiting_upload", "processing", "compressing", "uploading", "uploaded", "ready", "failed",
    ]
    assert [s.value for s in TranscriptStatus] == [
        "uploading",
        "processing",
        "upserting",
        "upserted",
        "empty",
        "failed",
    ]
    assert [s.value for s in DocumentStatus] == [
        "uploading",
        "processing",
        "upserting",
        "upserted",
        "empty",
        "failed",
    ]
