from application.services.clip_builder import (
    build_clip_records,
    build_video_clips,
    sign_clips,
)
from domain.entities.retrieval_result import RetrievalResult


def _r(id, video_id, start, end, gcs, title="T"):
    return RetrievalResult(
        id=id, score=0.9, text="...", video_id=video_id,
        start_ms=start, end_ms=end, gcs_object=gcs, title=title,
    )


def test_build_clip_records_are_durable_no_url():
    # merged span, carries gcs_object, NO signed video_url (safe to persist to history).
    records = build_clip_records([
        _r("c1", "v1", 1000, 3000, "videos/v1.mp4"),
        _r("c2", "v1", 3000, 5000, "videos/v1.mp4"),
    ])
    assert records == [
        {"video_id": "v1", "title": "T", "start_ms": 1000, "end_ms": 5000, "gcs_object": "videos/v1.mp4"}
    ]
    assert "video_url" not in records[0]


def test_sign_clips_replaces_gcs_object_with_fresh_url():
    records = [{"video_id": "v1", "title": "T", "start_ms": 1000, "end_ms": 5000, "gcs_object": "videos/v1.mp4"}]
    clips = sign_clips(records, signer=lambda o: f"https://signed/{o}")
    assert clips == [
        {"video_id": "v1", "title": "T", "start_ms": 1000, "end_ms": 5000, "duration_ms": None, "video_url": "https://signed/videos/v1.mp4"}
    ]
    assert "gcs_object" not in clips[0]


def test_sign_clips_skips_records_without_gcs():
    assert sign_clips([{"video_id": "v1"}], signer=lambda o: o) == []


def test_build_clips_single_chunk_signs_full_video_url():
    clips = build_video_clips([_r("c1", "v1", 1000, 3000, "videos/v1.mp4")],
                              signer=lambda o: f"https://signed/{o}")
    assert clips == [
        {
            "video_id": "v1",
            "title": "T",
            "start_ms": 1000,
            "end_ms": 3000,
            "duration_ms": None,
            "video_url": "https://signed/videos/v1.mp4",
        }
    ]


def test_build_clip_records_one_clip_per_distinct_video():
    # Chunks spanning two videos → two clips, one merged per video, in first-seen order.
    records = build_clip_records([
        _r("a1", "vA", 1000, 3000, "videos/a.mp4", title="Filters"),
        _r("b1", "vB", 5000, 7000, "videos/b.mp4", title="Tones"),
        _r("a2", "vA", 3000, 6000, "videos/a.mp4", title="Filters"),
    ])
    assert [r["video_id"] for r in records] == ["vA", "vB"]
    a = next(r for r in records if r["video_id"] == "vA")
    assert (a["start_ms"], a["end_ms"]) == (1000, 6000)   # merged over vA's chunks
    b = next(r for r in records if r["video_id"] == "vB")
    assert (b["start_ms"], b["end_ms"]) == (5000, 7000)


def test_build_clips_merges_same_video_into_one_clip():
    # All results belong to the same (primary) video → one merged clip spanning
    # min(start)..max(end), so the frontend seeks/pauses one coherent segment.
    results = [
        _r("c1", "v1", 1000, 3000, "videos/v1.mp4"),
        _r("c2", "v1", 3000, 5000, "videos/v1.mp4"),
    ]
    clips = build_video_clips(results, signer=lambda o: f"https://signed/{o}")
    assert clips == [
        {
            "video_id": "v1",
            "title": "T",
            "start_ms": 1000,
            "end_ms": 5000,
            "duration_ms": None,
            "video_url": "https://signed/videos/v1.mp4",
        }
    ]


def test_build_clips_skips_when_no_gcs_object():
    assert build_video_clips([_r("c1", "v1", 1000, 3000, None)], signer=lambda o: o) == []


def test_build_clips_empty_input():
    assert build_video_clips([], signer=lambda o: o) == []
