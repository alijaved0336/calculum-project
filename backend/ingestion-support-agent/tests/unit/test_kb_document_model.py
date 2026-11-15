from infrastructure.postgres.models.kb_document import KBDocument


def test_kb_document_has_video_fields():
    cols = KBDocument.__table__.columns.keys()
    assert "media_type" in cols
    assert "title" in cols
    assert "metadata" in cols


def test_media_type_defaults_to_document():
    assert KBDocument.__table__.columns["media_type"].default.arg == "document"
