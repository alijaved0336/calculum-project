"""Cascade-delete a library item (video or document) across Qdrant + GCS + Postgres.

Deleting a video also removes its transcript — the transcript is not a separate item: its
chunks live under the same ``file_uuid`` and its file is named in ``metadata.transcript_gcs_object``.

Order is deliberate and safe for a non-transactional, multi-system delete:
  1. Qdrant chunks (the derived index)   — one filtered, idempotent call
  2. GCS blobs named in the row metadata — idempotent, best-effort
  3. Postgres row LAST                    — so a failure in 1/2 leaves the row (with its object
     pointers) intact and the whole delete stays retryable, with no orphaned data.
"""
from __future__ import annotations

import logging
import uuid as _uuid
from collections.abc import Awaitable, Callable

logger = logging.getLogger(__name__)

# GCS object pointers stored on a row's metadata. Video rows carry the video + its transcript;
# document rows carry just the document file — absent keys are skipped.
_GCS_METADATA_KEYS = ("gcs_object", "transcript_gcs_object")


async def cascade_delete_media(
    uid: _uuid.UUID,
    doc: dict,
    *,
    vector_store,
    gcs_delete: Callable[[str], bool],
    delete_row: Callable[[_uuid.UUID], Awaitable[bool]],
) -> dict:
    """Purge a media item's Qdrant chunks + GCS blobs, then its Postgres row.

    ``doc`` is the already-fetched row (so we can read its metadata before deleting it).
    Returns a small summary of what was purged.
    """
    meta = doc.get("metadata") or {}

    # 1) Qdrant — remove all chunks for this id (transcript chunks included, keyed by file_uuid).
    await vector_store.delete_by_file(str(uid))

    # 2) GCS — delete each object the row points at (video + transcript, or the document file).
    gcs_deleted: list[str] = []
    for key in _GCS_METADATA_KEYS:
        obj = meta.get(key)
        if obj and gcs_delete(obj):
            gcs_deleted.append(obj)

    # 3) Postgres — the source-of-truth row, deleted last.
    await delete_row(uid)

    logger.info("media.cascade_deleted uid=%s gcs=%s", uid, gcs_deleted)
    return {"gcs_objects_deleted": gcs_deleted}
