from __future__ import annotations

import json

from config import settings


def storage_client():
    """Build a GCS client from a SA-JSON path, inline SA JSON, or ADC (fallback).

    ADC also picks up GOOGLE_APPLICATION_CREDENTIALS when GCP_SERVICE_ACCOUNT_JSON is empty.
    """
    from google.cloud import storage

    sa = (settings.gcp_service_account_json or "").strip()
    if not sa:
        return storage.Client()
    if sa.startswith("{"):
        return storage.Client.from_service_account_info(json.loads(sa))
    return storage.Client.from_service_account_json(sa)


def read_object(gcs_object: str, bucket: str | None = None) -> bytes:
    """Download an object's bytes from GCS (used to fetch a stored transcript)."""
    name = bucket or settings.gcp_storage_bucket
    return storage_client().bucket(name).blob(gcs_object).download_as_bytes()


def delete_object(gcs_object: str, bucket: str | None = None) -> bool:
    """Delete an object from GCS. Idempotent: returns False (never raises) if it's already gone."""
    from google.cloud.exceptions import NotFound

    name = bucket or settings.gcp_storage_bucket
    try:
        storage_client().bucket(name).blob(gcs_object).delete()
        return True
    except NotFound:
        return False
