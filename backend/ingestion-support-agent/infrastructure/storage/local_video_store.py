from __future__ import annotations

import logging
import shutil
from pathlib import Path

from config import settings
from infrastructure.storage.gcs_video_store import _source_prefix

logger = logging.getLogger(__name__)


class LocalVideoStore:
    """Filesystem fallback for local dev — mirrors GcsVideoStore's interface.

    Stores uploads under ``<local_video_dir>/<folder>/<id>.<ext>`` and returns the same
    relative object name GCS would (``videos/<id>.mp4``, ``transcripts/<id>.vtt``,
    ``documents/<id>.pdf``), so metadata stays identical whether the backend is GCS or local.
    """

    def __init__(self) -> None:
        self._base = Path(settings.local_video_dir)
        self._prefix = (settings.gcp_storage_prefix or "videos").strip("/")

    def object_name(self, video_id: str) -> str:
        return f"{self._prefix}/{video_id}.mp4"

    def upload(self, local_path: str, video_id: str) -> str:
        return self._put(local_path, self.object_name(video_id))

    def upload_source(self, kind: str, local_path: str, file_id: str, ext: str) -> str:
        return self._put(local_path, f"{_source_prefix(kind)}/{file_id}{ext}")

    def _put(self, local_path: str, obj: str) -> str:
        dest = self._base / obj
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(local_path, dest)
        logger.info("local.stored object=%s path=%s", obj, dest)
        return obj

    # ── Signed-URL stubs (dev only; direct-upload isn't meaningful locally) ──────
    def generate_upload_url(self, object_name: str, content_type: str, ttl: int) -> str:
        return f"file://{(self._base / object_name).resolve()}"

    def generate_read_url(self, object_name: str, ttl: int) -> str:
        return f"file://{(self._base / object_name).resolve()}"

    def staging_size(self, object_name: str) -> int | None:
        try:
            return (self._base / object_name).stat().st_size
        except OSError:
            return None

    def copy_to_storage(self, staging_object: str, final_object: str) -> None:
        src = self._base / staging_object
        dest = self._base / final_object
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
        logger.info("local.copied_original src=%s dst=%s", staging_object, final_object)

    def delete(self, object_name: str) -> None:
        try:
            (self._base / object_name).unlink()
        except OSError:
            pass

    # Local mode has no separate buckets — staging lives under the same root.
    delete_staging = delete
