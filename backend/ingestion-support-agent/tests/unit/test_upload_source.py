from pathlib import Path

from config import settings
from infrastructure.storage.local_video_store import LocalVideoStore


def test_upload_source_transcript(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "local_video_dir", str(tmp_path))
    src = tmp_path / "clip.vtt"
    src.write_text("WEBVTT\n\n")
    obj = LocalVideoStore().upload_source("transcript", str(src), "vid1", ".vtt")
    assert obj == "transcripts/vid1.vtt"
    assert (tmp_path / "transcripts" / "vid1.vtt").exists()


def test_upload_source_document(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "local_video_dir", str(tmp_path))
    src = tmp_path / "handbook.pdf"
    src.write_bytes(b"%PDF-1.4 ...")
    obj = LocalVideoStore().upload_source("document", str(src), "doc9", ".pdf")
    assert obj == "documents/doc9.pdf"
    assert (tmp_path / "documents" / "doc9.pdf").exists()


def test_content_type_helper():
    from infrastructure.storage.gcs_video_store import _content_type

    assert _content_type(".vtt") == "text/vtt"
    assert _content_type(".json") == "application/json"
    assert _content_type(".pdf") == "application/pdf"
    assert _content_type(".unknown") == "application/octet-stream"
