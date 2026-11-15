import infrastructure.storage.gcs_client as gcs


class _FakeBlob:
    def __init__(self, name, on_delete):
        self.name = name
        self._on_delete = on_delete

    def delete(self):
        self._on_delete(self.name)


class _FakeBucket:
    def __init__(self, name, deleted, raise_missing):
        self._deleted = deleted
        self._raise_missing = raise_missing

    def blob(self, object_name):
        def _on_delete(n):
            if self._raise_missing:
                from google.cloud.exceptions import NotFound
                raise NotFound(f"{n} missing")
            self._deleted.append(n)
        return _FakeBlob(object_name, _on_delete)


class _FakeClient:
    def __init__(self, deleted, raise_missing):
        self._deleted = deleted
        self._raise_missing = raise_missing

    def bucket(self, name):
        return _FakeBucket(name, self._deleted, self._raise_missing)


def test_delete_object_deletes_and_returns_true(monkeypatch):
    deleted = []
    monkeypatch.setattr(gcs, "storage_client", lambda: _FakeClient(deleted, raise_missing=False))
    assert gcs.delete_object("videos/v1.mp4") is True
    assert deleted == ["videos/v1.mp4"]


def test_delete_object_missing_is_swallowed(monkeypatch):
    monkeypatch.setattr(gcs, "storage_client", lambda: _FakeClient([], raise_missing=True))
    assert gcs.delete_object("videos/gone.mp4") is False
