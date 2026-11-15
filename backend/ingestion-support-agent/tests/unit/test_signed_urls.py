"""Signed-URL helpers: the GCS store mints V4 upload/read URLs for a given object;
the local store returns a dev stub so local mode needs no GCS."""
from infrastructure.storage.local_video_store import LocalVideoStore


def test_local_store_upload_url_stub(tmp_path, monkeypatch):
    from config import settings
    monkeypatch.setattr(settings, "local_video_dir", str(tmp_path))
    url = LocalVideoStore().generate_upload_url("uploads/vid1.mp4", "video/mp4", 3600)
    assert "uploads/vid1.mp4" in url


def test_gcs_store_upload_url_targets_upload_bucket(monkeypatch):
    import infrastructure.storage.gcs_video_store as m
    from config import settings

    monkeypatch.setattr(settings, "gcp_storage_bucket", "final-bucket")
    monkeypatch.setattr(settings, "gcp_upload_bucket", "upload-bucket")

    captured = {}

    class FakeBlob:
        def generate_signed_url(self, **kw):
            captured.update(kw)
            return "https://signed.example/upload"

    class FakeBucket:
        def blob(self, name):
            captured["object"] = name
            return FakeBlob()

    class FakeClient:
        def bucket(self, name):
            captured["bucket"] = name
            return FakeBucket()

    monkeypatch.setattr(m, "_storage_client", lambda: FakeClient())
    url = m.GcsVideoStore().generate_upload_url("uploads/v1.mp4", "video/mp4", 900)
    assert url == "https://signed.example/upload"
    assert captured["bucket"] == "upload-bucket"  # originals go to the upload bucket
    assert captured["object"] == "uploads/v1.mp4"
    assert captured["version"] == "v4" and captured["method"] == "PUT"
    assert captured["content_type"] == "video/mp4"


def test_gcs_store_delete_staging_targets_upload_bucket(monkeypatch):
    import infrastructure.storage.gcs_video_store as m
    from config import settings

    monkeypatch.setattr(settings, "gcp_storage_bucket", "final-bucket")
    monkeypatch.setattr(settings, "gcp_upload_bucket", "upload-bucket")
    seen = {}

    class FakeBlob:
        def delete(self):
            seen["deleted"] = True

    class FakeBucket:
        def blob(self, name):
            seen["object"] = name
            return FakeBlob()

    monkeypatch.setattr(m, "_storage_client",
                        lambda: type("C", (), {"bucket": lambda s, n: (seen.__setitem__("bucket", n), FakeBucket())[1]})())
    m.GcsVideoStore().delete_staging("uploads/v1.mp4")
    assert seen["bucket"] == "upload-bucket" and seen["object"] == "uploads/v1.mp4" and seen["deleted"]


def test_gcs_store_read_url_is_get(monkeypatch):
    import infrastructure.storage.gcs_video_store as m

    class FakeBlob:
        def generate_signed_url(self, **kw):
            assert kw["method"] == "GET" and kw["version"] == "v4"
            return "https://signed.example/read"

    class FakeBucket:
        def blob(self, name):
            return FakeBlob()

    monkeypatch.setattr(m, "_storage_client", lambda: type("C", (), {"bucket": lambda s, n: FakeBucket()})())
    assert m.GcsVideoStore().generate_read_url("videos/v1.mp4", 600) == "https://signed.example/read"
