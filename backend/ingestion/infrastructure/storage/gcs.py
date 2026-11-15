from __future__ import annotations

from google.cloud import storage

from domain.ports.storage import StoragePort


class GCSStorage(StoragePort):
    """Google Cloud Storage-backed document storage."""

    def __init__(self, bucket: str, credentials_path: str | None = None) -> None:
        client = (
            storage.Client.from_service_account_json(credentials_path)
            if credentials_path
            else storage.Client()
        )
        self._bucket = client.bucket(bucket)

    def upload(self, key: str, data: bytes, content_type: str | None = None) -> None:
        self._bucket.blob(key).upload_from_string(data, content_type=content_type)

    def download(self, key: str) -> bytes:
        return self._bucket.blob(key).download_as_bytes()

    def delete(self, file_id: str) -> int:
        blobs = list(self._bucket.list_blobs(prefix=f"{file_id}/"))
        for blob in blobs:
            blob.delete()
        return len(blobs)
