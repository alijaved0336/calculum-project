"""Unit tests for the video-replace transcript-fit guard.

When only the video is swapped (no new transcript staged), the existing transcript is
kept — so once the new clip's duration is known, `_validate_kept_transcript` must fail the
row if that clip is too short for the kept transcript, and otherwise leave it alone.
"""
from __future__ import annotations

import uuid as _uuid
from pathlib import Path

import pytest

import api.routes.videos as videos
from domain.entities.pipeline import VideoStatus

# 3-second video vs a transcript whose last cue ends at 5:00 → mismatch.
_LONG_VTT = "WEBVTT\n\n00:04:50.000 --> 00:05:00.000\nThanks for watching.\n"
# A cue that fits comfortably inside a 3-second clip.
_SHORT_VTT = "WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nHi.\n"


class _FakeKB:
    def __init__(self, doc: dict) -> None:
        self.doc = doc
        self.failed_with: str | None = None

    async def get_kb_document(self, uid):  # noqa: ANN001
        return self.doc

    async def set_video_status(self, uid, video_status, status=None, error_message=None, **extra):  # noqa: ANN001
        if video_status == VideoStatus.FAILED.value:
            self.failed_with = error_message


class _FakeStore:
    def __init__(self, vtt: str) -> None:
        self._vtt = vtt

    def download_to(self, obj: str, path: str) -> None:
        Path(path).write_text(self._vtt, encoding="utf-8")


def _wire(monkeypatch, doc: dict, vtt: str) -> _FakeKB:
    kb = _FakeKB(doc)
    monkeypatch.setattr(videos, "get_kb_document_store", lambda: kb)
    monkeypatch.setattr(videos, "get_video_store", lambda: _FakeStore(vtt))
    return kb


def _doc(**meta) -> dict:
    return {"metadata": {"transcript_gcs_object": "transcripts/x.vtt", **meta}, "chunk_count": 5}


@pytest.mark.asyncio
async def test_fails_when_new_video_shorter_than_kept_transcript(monkeypatch):
    kb = _wire(monkeypatch, _doc(), _LONG_VTT)
    failed = await videos._validate_kept_transcript(_uuid.uuid4(), 3000)  # new clip = 3s
    assert failed is True
    assert kb.failed_with and "0:03" in kb.failed_with and "5:00" in kb.failed_with


@pytest.mark.asyncio
async def test_passes_when_transcript_fits(monkeypatch):
    kb = _wire(monkeypatch, _doc(), _SHORT_VTT)
    failed = await videos._validate_kept_transcript(_uuid.uuid4(), 3000)
    assert failed is False
    assert kb.failed_with is None


@pytest.mark.asyncio
async def test_skips_when_fresh_transcript_staged(monkeypatch):
    # A staged transcript means the chain step re-indexes its own transcript → don't touch.
    kb = _wire(monkeypatch, _doc(staged_transcript="transcripts/new.vtt"), _LONG_VTT)
    failed = await videos._validate_kept_transcript(_uuid.uuid4(), 3000)
    assert failed is False
    assert kb.failed_with is None


@pytest.mark.asyncio
async def test_skips_when_no_existing_transcript(monkeypatch):
    kb = _wire(monkeypatch, {"metadata": {}, "chunk_count": 0}, _LONG_VTT)
    failed = await videos._validate_kept_transcript(_uuid.uuid4(), 3000)
    assert failed is False


@pytest.mark.asyncio
async def test_skips_when_duration_unknown(monkeypatch):
    kb = _wire(monkeypatch, _doc(), _LONG_VTT)
    failed = await videos._validate_kept_transcript(_uuid.uuid4(), None)
    assert failed is False
