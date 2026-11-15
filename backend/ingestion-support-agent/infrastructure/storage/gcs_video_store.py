from __future__ import annotations

import json
import logging
import os
import shutil
import subprocess
import tempfile

from config import settings

logger = logging.getLogger(__name__)


def _storage_client():
    """Build a GCS client from a SA-JSON path, inline SA JSON, or ADC (fallback)."""
    from google.cloud import storage

    sa = (settings.gcp_service_account_json or "").strip()
    if not sa:
        return storage.Client(project=settings.gcp_project_id or None)
    if sa.startswith("{"):
        info = json.loads(sa)
        return storage.Client.from_service_account_info(info)
    # otherwise treat it as a path to a key file
    return storage.Client.from_service_account_json(sa)


def _media_binaries() -> tuple[str | None, str | None]:
    """Locate (ffmpeg, ffprobe): system PATH first, else pip-installed static-ffmpeg."""
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if ffmpeg and ffprobe:
        return ffmpeg, ffprobe
    try:
        from static_ffmpeg import run  # bundled static binaries (downloaded on first use)

        s_ffmpeg, s_ffprobe = run.get_or_fetch_platform_executables_else_raise()
        return ffmpeg or s_ffmpeg, ffprobe or s_ffprobe
    except Exception as exc:
        logger.warning("static-ffmpeg unavailable (%s)", exc)
        return ffmpeg, ffprobe


def _ffprobe_path() -> str | None:
    """Locate ffprobe: system PATH first, else the pip-installed static-ffmpeg binary."""
    return _media_binaries()[1]


def compress_video(src_path: str) -> tuple[str, int, int]:
    """Re-encode a video to a smaller, web-friendly MP4 (H.264/AAC, +faststart).

    Returns ``(path, size_before, size_after)``. On any failure (ffmpeg missing,
    encode error, or a result that isn't actually smaller) it falls back to the
    original file so the upload still proceeds — ``path == src_path`` in that case.
    """
    size_before = os.path.getsize(src_path)
    if not settings.video_compress_enabled:
        logger.info("videos.compress skipped (disabled) size=%d bytes", size_before)
        return src_path, size_before, size_before

    ffmpeg, _ = _media_binaries()
    if not ffmpeg:
        logger.warning("ffmpeg not found (system or static-ffmpeg); uploading original")
        return src_path, size_before, size_before

    dst = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name
    try:
        subprocess.run(
            [
                ffmpeg, "-y", "-i", src_path,
                "-c:v", "libx264",
                "-crf", str(settings.video_compress_crf),
                "-preset", settings.video_compress_preset,
                # Only downscale sources taller than the cap; -2 keeps width even + aspect ratio.
                "-vf", f"scale=-2:'min({settings.video_target_height},ih)'",
                "-pix_fmt", "yuv420p",  # broad browser/QuickTime compatibility
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",  # web-friendly: moov atom up front for instant start
                dst,
            ],
            check=True, capture_output=True,
        )
        size_after = os.path.getsize(dst)
    except Exception as exc:
        logger.warning("ffmpeg compression failed (%s); uploading original", exc)
        _safe_unlink(dst)
        return src_path, size_before, size_before

    if size_after <= 0 or size_after >= size_before:
        # Re-encode didn't help (already-compressed / tiny file) — keep the original.
        logger.info(
            "videos.compress no gain size_before=%d size_after=%d; uploading original",
            size_before, size_after,
        )
        _safe_unlink(dst)
        return src_path, size_before, size_before

    return dst, size_before, size_after


def _safe_unlink(path: str) -> None:
    try:
        os.unlink(path)
    except OSError:
        pass


def probe_duration_ms(path: str) -> int | None:
    """Return video duration in ms via ffprobe, or None if unavailable/fails."""
    ffprobe = _ffprobe_path()
    if not ffprobe:
        logger.warning("ffprobe not found (system or static-ffmpeg); duration_ms=None")
        return None
    try:
        out = subprocess.run(
            [ffprobe, "-v", "quiet", "-print_format", "json", "-show_entries",
             "format=duration", path],
            check=True, capture_output=True, text=True,
        ).stdout
        return int(float(json.loads(out)["format"]["duration"]) * 1000)
    except Exception as exc:
        logger.warning("ffprobe failed (%s); duration_ms=None", exc)
        return None


_CONTENT_TYPES = {
    ".vtt": "text/vtt",
    ".srt": "application/x-subrip",
    ".json": "application/json",
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".mp4": "video/mp4",
}


def _content_type(ext: str) -> str:
    """MIME type for a file extension; falls back to octet-stream."""
    return _CONTENT_TYPES.get(ext.lower(), "application/octet-stream")


def _source_prefix(kind: str) -> str:
    """Bucket folder for a stored source file: 'transcript' | 'document'."""
    if kind == "transcript":
        return settings.gcp_transcript_prefix.strip("/")
    if kind == "document":
        return settings.gcp_document_prefix.strip("/")
    raise ValueError(f"unknown storage kind {kind!r}")


class GcsVideoStore:
    """Store uploaded media in gs://<bucket>/<folder>/<id>.<ext> (videos/transcripts/documents)."""

    def __init__(self) -> None:
        self._bucket_name = settings.gcp_storage_bucket   # compressed videos + transcripts + documents
        self._upload_bucket = settings.upload_bucket      # direct-uploaded originals (transient)
        self._prefix = settings.gcp_storage_prefix.strip("/")

    def object_name(self, video_id: str) -> str:
        return f"{self._prefix}/{video_id}.mp4"

    def upload(self, local_path: str, video_id: str) -> str:
        """Upload a video and return the gs object path (videos/<id>.mp4)."""
        gcs_object = self.object_name(video_id)
        self._put(local_path, gcs_object, "video/mp4")
        logger.info("gcs.video_uploaded object=%s", gcs_object)
        return gcs_object

    def upload_source(self, kind: str, local_path: str, file_id: str, ext: str) -> str:
        """Archive a transcript/document to <folder>/<file_id><ext>; return the object path."""
        gcs_object = f"{_source_prefix(kind)}/{file_id}{ext}"
        self._put(local_path, gcs_object, _content_type(ext))
        logger.info("gcs.source_uploaded kind=%s object=%s", kind, gcs_object)
        return gcs_object

    # ── Signed URLs (direct browser upload / read) ──────────────────────────────
    def generate_upload_url(self, object_name: str, content_type: str, ttl: int) -> str:
        """V4 signed PUT URL to upload the ORIGINAL straight to the upload bucket."""
        return self._sign(self._upload_bucket, object_name, "PUT", ttl, content_type=content_type)

    def generate_read_url(self, object_name: str, ttl: int) -> str:
        """V4 signed GET URL for the compressed video in the storage bucket (ffprobe / serving)."""
        return self._sign(self._bucket_name, object_name, "GET", ttl)

    def staging_size(self, object_name: str) -> int | None:
        """Actual byte size of a staged original in the upload bucket (None if it's gone)."""
        blob = _storage_client().bucket(self._upload_bucket).get_blob(object_name)
        return blob.size if blob is not None else None

    def copy_to_storage(self, staging_object: str, final_object: str) -> None:
        """Server-side copy a staged original into the storage bucket (no re-encode).

        Uses ``rewrite`` so it works across buckets and streams large objects server-side.
        """
        client = _storage_client()
        src = client.bucket(self._upload_bucket).blob(staging_object)
        dst = client.bucket(self._bucket_name).blob(final_object)
        token = None
        while True:
            token, _, _ = dst.rewrite(src, token=token)
            if token is None:
                break
        logger.info("gcs.copied_original src=%s dst=%s", staging_object, final_object)

    def download_to(self, object_name: str, local_path: str) -> None:
        """Download an object from the storage bucket to a local file.

        Used to pull a transcript that was staged at init-upload time back onto disk so
        the ingest pipeline (which works on local paths) can process it. The Pub/Sub
        webhook that triggers this can land on a different instance than the one that
        staged it, which is why the transcript lives in the bucket and not on local disk.
        """
        blob = _storage_client().bucket(self._bucket_name).blob(object_name)
        blob.download_to_filename(local_path)
        logger.info("gcs.downloaded object=%s -> %s", object_name, local_path)

    def delete(self, object_name: str) -> None:
        """Delete an object from the storage bucket."""
        self._delete(self._bucket_name, object_name)

    def delete_staging(self, object_name: str) -> None:
        """Delete a direct-uploaded original from the upload bucket (no permanent replica)."""
        self._delete(self._upload_bucket, object_name)

    def _sign(
        self, bucket: str, object_name: str, method: str, ttl: int, content_type: str | None = None
    ) -> str:
        from datetime import timedelta

        blob = _storage_client().bucket(bucket).blob(object_name)
        kwargs: dict = {"version": "v4", "expiration": timedelta(seconds=ttl), "method": method}
        if content_type is not None:
            kwargs["content_type"] = content_type
        # Under ADC (no SA key) signing requires an explicit signer identity + IAM SignBlob.
        if settings.gcp_signing_service_account:
            kwargs["service_account_email"] = settings.gcp_signing_service_account
        return blob.generate_signed_url(**kwargs)

    def _delete(self, bucket: str, object_name: str) -> None:
        _storage_client().bucket(bucket).blob(object_name).delete()
        logger.info("gcs.deleted bucket=%s object=%s", bucket, object_name)

    def _put(self, local_path: str, gcs_object: str, content_type: str) -> None:
        bucket = _storage_client().bucket(self._bucket_name)
        blob = bucket.blob(gcs_object)
        blob.upload_from_filename(
            local_path, content_type=content_type, timeout=settings.gcp_storage_timeout_seconds
        )
