from __future__ import annotations

from datetime import timedelta

from config import settings


class GcsSignedUrl:
    """Generate short-lived signed URLs for full videos in GCS (no trimming)."""

    def __init__(self, bucket: str | None = None, ttl_seconds: int | None = None) -> None:
        self._bucket_name = bucket or settings.gcp_storage_bucket
        self._ttl = ttl_seconds if ttl_seconds is not None else settings.video_signed_url_ttl_seconds

    def sign(self, gcs_object: str) -> str:
        from infrastructure.storage.gcs_client import storage_client

        blob = storage_client().bucket(self._bucket_name).blob(gcs_object)
        return blob.generate_signed_url(
            version="v4", expiration=timedelta(seconds=self._ttl), method="GET"
        )
