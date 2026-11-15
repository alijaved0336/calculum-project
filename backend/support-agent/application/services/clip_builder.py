from __future__ import annotations

from typing import Callable, Iterable

from domain.entities.retrieval_result import RetrievalResult


def build_clip_records(video_results: Iterable[RetrievalResult]) -> list[dict]:
    """Build the DURABLE clip records — no signed URL, just the refs needed to (re)sign
    later: ``{video_id, title, start_ms, end_ms, gcs_object}``.

    ``video_results`` may span SEVERAL videos (a multi-intent answer references more than
    one). Chunks are grouped by ``video_id`` — one merged clip per video spanning
    ``[min(start_ms), max(end_ms)]`` over that video's chunks — preserving first-seen (rank)
    order. So a single clip never mixes files, but the answer can carry many clips. Returns
    ``[]`` when there is no usable video chunk. Persisted to chat history so replay can mint
    a fresh signed URL (the signed URL itself expires — see gcs_video_url).
    """
    by_video: dict[str, list[RetrievalResult]] = {}
    order: list[str] = []
    for r in video_results:
        if not r.gcs_object or not r.video_id:
            continue
        if r.video_id not in by_video:
            by_video[r.video_id] = []
            order.append(r.video_id)
        by_video[r.video_id].append(r)

    records: list[dict] = []
    for video_id in order:
        chunks = by_video[video_id]
        primary = chunks[0]
        starts = [c.start_ms for c in chunks if c.start_ms is not None]
        ends = [c.end_ms for c in chunks if c.end_ms is not None]
        records.append(
            {
                "video_id": video_id,
                "title": primary.title,
                "start_ms": min(starts) if starts else primary.start_ms,
                "end_ms": max(ends) if ends else primary.end_ms,
                "gcs_object": primary.gcs_object,
            }
        )
    return records


def video_chunk_ranges(video_results: Iterable[RetrievalResult]) -> dict[str, list[tuple[int, int]]]:
    """Per ``video_id``, the ``[start_ms, end_ms]`` span of each retrieved chunk (first-seen order).

    Used by answer↔clip reconciliation to decide which video a cited ``[MM:SS]`` belongs to —
    a cited moment is attributed to the video whose chunk range contains it. Unlike
    ``build_clip_records`` (which merges to one min–max span per video), this keeps the DISCRETE
    per-chunk ranges so distinct moments in the same video stay separable.
    """
    ranges: dict[str, list[tuple[int, int]]] = {}
    for r in video_results:
        if not r.video_id or r.start_ms is None:
            continue
        end = r.end_ms if r.end_ms is not None else r.start_ms
        ranges.setdefault(r.video_id, []).append((r.start_ms, end))
    return ranges


def sign_clips(records: Iterable[dict], signer: Callable[[str], str]) -> list[dict]:
    """Turn durable clip records into client-facing clips: replace ``gcs_object`` with a
    freshly-signed full-video ``video_url``. Records without ``gcs_object`` are skipped.

    Works both for a live turn and for re-signing clips loaded from chat history.
    """
    clips: list[dict] = []
    for r in records:
        gcs_object = r.get("gcs_object")
        if not gcs_object:
            continue
        clip = {
            "video_id": r.get("video_id"),
            "title": r.get("title"),
            "start_ms": r.get("start_ms"),
            "end_ms": r.get("end_ms"),
            "duration_ms": r.get("duration_ms"),  # full video length (for the card badge)
            "video_url": signer(gcs_object),
        }
        # The exact cited moments for THIS video (backend-matched + overlap-merged), when the
        # reconciliation step has attached them. Carried through signing / history re-signing.
        if r.get("cited_ranges") is not None:
            clip["cited_ranges"] = r["cited_ranges"]
        clips.append(clip)
    return clips


def build_video_clips(
    video_results: Iterable[RetrievalResult], signer: Callable[[str], str]
) -> list[dict]:
    """Convenience for the live turn: durable records → signed client clips."""
    return sign_clips(build_clip_records(video_results), signer)
