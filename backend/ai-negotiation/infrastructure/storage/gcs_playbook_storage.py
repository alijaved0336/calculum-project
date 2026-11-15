from __future__ import annotations

import asyncio
import json
from datetime import timedelta
from functools import lru_cache

from google.api_core.exceptions import GoogleAPIError
from google.auth.exceptions import GoogleAuthError
from google.cloud import storage
from google.oauth2 import service_account

from config import settings


class PlaybookStorageConfigurationError(RuntimeError):
    """Raised when GCS playbook storage is not configured."""


class PlaybookStorageError(RuntimeError):
    """Raised when a GCS playbook operation fails."""


class GCSPlaybookStorage:
    def __init__(
        self,
        *,
        client: storage.Client,
        bucket_name: str,
        prefix: str = "playbooks",
        timeout: int = 60,
        signed_url_ttl_seconds: int = 900,
    ) -> None:
        self._bucket = client.bucket(bucket_name)
        self._prefix = prefix.strip("/")
        self._timeout = timeout
        self._signed_url_ttl_seconds = signed_url_ttl_seconds

    def object_name(self, owner_id: str, playbook_id: str) -> str:
        parts = [part for part in (self._prefix, owner_id, f"{playbook_id}.pdf") if part]
        return "/".join(parts)

    async def upload_pdf(self, object_name: str, pdf: bytes) -> None:
        def _upload() -> None:
            blob = self._bucket.blob(object_name)
            blob.upload_from_string(
                pdf,
                content_type="application/pdf",
                timeout=self._timeout,
                checksum="auto",
            )

        try:
            await asyncio.to_thread(_upload)
        except (GoogleAPIError, GoogleAuthError) as exc:
            raise PlaybookStorageError("Failed to upload playbook PDF to GCS") from exc

    async def create_download_url(
        self,
        object_name: str,
        *,
        filename: str,
    ) -> str:
        def _sign() -> str:
            return self._bucket.blob(object_name).generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=self._signed_url_ttl_seconds),
                method="GET",
                response_type="application/pdf",
                response_disposition=f'attachment; filename="{filename}"',
            )

        try:
            return await asyncio.to_thread(_sign)
        except (
            GoogleAPIError,
            GoogleAuthError,
            AttributeError,
            TypeError,
            ValueError,
        ) as exc:
            raise PlaybookStorageError(
                "Failed to create a signed playbook download URL"
            ) from exc


def _build_credentials() -> service_account.Credentials | None:
    if not settings.gcp_service_account_json:
        return None

    try:
        service_account_info = json.loads(settings.gcp_service_account_json)
    except json.JSONDecodeError as exc:
        raise PlaybookStorageConfigurationError(
            "GCP_SERVICE_ACCOUNT_JSON must be the complete service-account "
            "key as one valid JSON value, not Python dictionary syntax"
        ) from exc

    private_key = service_account_info.get("private_key")
    if isinstance(private_key, str):
        service_account_info["private_key"] = private_key.replace("\\n", "\n")

    try:
        return service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
    except (TypeError, ValueError) as exc:
        raise PlaybookStorageConfigurationError(
            "GCP_SERVICE_ACCOUNT_JSON does not contain a valid service-account key"
        ) from exc


def is_playbook_storage_enabled() -> bool:
    return bool(settings.gcp_storage_bucket) and settings.gcp_playbook_storage_enabled


@lru_cache(maxsize=1)
def get_playbook_storage() -> GCSPlaybookStorage:
    if not is_playbook_storage_enabled():
        raise PlaybookStorageConfigurationError("Playbook GCS storage is disabled")

    if not settings.gcp_storage_bucket:
        raise PlaybookStorageConfigurationError("GCP_STORAGE_BUCKET is required")

    credentials = _build_credentials()
    try:
        client = storage.Client(
            project=settings.gcp_project_id or None,
            credentials=credentials,
        )
    except Exception as exc:
        raise PlaybookStorageConfigurationError(
            "Could not initialize Google Cloud Storage credentials"
        ) from exc

    return GCSPlaybookStorage(
        client=client,
        bucket_name=settings.gcp_storage_bucket,
        prefix=settings.gcp_storage_prefix,
        timeout=settings.gcp_storage_timeout_seconds,
        signed_url_ttl_seconds=settings.gcp_signed_url_ttl_seconds,
    )
