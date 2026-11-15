from infrastructure.postgres.models.ingestion_base import IngestionBase
from infrastructure.postgres.models.video_kb_document import VideoKBDocument


def test_table_name():
    assert VideoKBDocument.__tablename__ == "video_kb_documents"


def test_has_all_columns():
    cols = set(VideoKBDocument.__table__.columns.keys())
    expected = {
        "uuid", "uploaded_by_user_uuid", "filename", "file_type", "file_size_bytes",
        "page_count", "storage_url", "media_type", "title", "status",
        "video_status", "transcript_status", "document_status", "error_message",
        "is_already_uploaded", "chunk_count", "metadata", "created_at", "updated_at",
    }
    assert expected <= cols, f"missing: {expected - cols}"


def test_fk_to_users():
    fks = list(VideoKBDocument.__table__.c.uploaded_by_user_uuid.foreign_keys)
    assert any(fk.target_fullname == "users.uuid" for fk in fks)


def test_isolated_metadata_holds_only_our_table():
    # Alembic targets IngestionBase.metadata; it must never see shared tables.
    assert set(IngestionBase.metadata.tables.keys()) == {"video_kb_documents"}
