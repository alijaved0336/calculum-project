from pathlib import Path

from infrastructure.storage.local_video_store import LocalVideoStore


def test_local_store_copies_file_and_returns_object_name(tmp_path, monkeypatch):
    import config

    monkeypatch.setattr(config.settings, "local_video_dir", str(tmp_path))
    monkeypatch.setattr(config.settings, "gcp_storage_prefix", "videos")

    src = tmp_path / "in.mp4"
    src.write_bytes(b"\x00\x00\x00\x18ftypmp42")

    store = LocalVideoStore()
    obj = store.upload(str(src), "abc-123")

    assert obj == "videos/abc-123.mp4"
    assert (tmp_path / "videos" / "abc-123.mp4").read_bytes() == b"\x00\x00\x00\x18ftypmp42"
