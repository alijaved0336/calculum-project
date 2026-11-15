from api.schemas.documents import DocumentRow
from api.schemas.videos import VideoRow


def test_video_ingested_true_when_chunks_present():
    row = VideoRow(video_id="v1", status="uploaded", media_type="video", chunk_count=42)
    assert row.ingested is True
    assert row.model_dump()["ingested"] is True


def test_video_not_ingested_when_no_chunks():
    assert VideoRow(video_id="v1", status="ready", media_type="video", chunk_count=0).ingested is False
    assert VideoRow(video_id="v1", status="ready", media_type="video").ingested is False  # None


def test_document_ingested_flag():
    assert DocumentRow(document_id="d1", status="upserted", media_type="document", chunk_count=3).ingested is True
    assert DocumentRow(document_id="d1", status="processing", media_type="document").ingested is False
