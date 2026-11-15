import pytest

from application.ingest.transcript_validator import (
    TranscriptValidationError,
    validate_transcript,
)


def _write(tmp_path, name, body):
    p = tmp_path / name
    p.write_text(body, encoding="utf-8")
    return p


def test_valid_vtt_returns_cues(tmp_path):
    p = _write(tmp_path, "t.vtt", "WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello\n")
    cues = validate_transcript(p, video_duration_ms=5000)
    assert cues[0].start_ms == 1000
    assert cues[0].end_ms == 3000
    assert cues[0].text == "Hello"


def test_valid_srt_returns_cues(tmp_path):
    p = _write(tmp_path, "t.srt", "1\n00:00:01,000 --> 00:00:02,500\nWorld\n")
    cues = validate_transcript(p, video_duration_ms=5000)
    assert cues[0].start_ms == 1000
    assert cues[0].end_ms == 2500
    assert cues[0].text == "World"


def test_valid_json_returns_cues(tmp_path):
    p = _write(tmp_path, "t.json", '[{"start_ms": 1000, "end_ms": 2000, "text": "Hi"}]')
    cues = validate_transcript(p, video_duration_ms=5000)
    assert cues[0].start_ms == 1000 and cues[0].end_ms == 2000 and cues[0].text == "Hi"


def test_valid_json_segments_with_seconds(tmp_path):
    body = (
        '{"segments": ['
        '{"start":"0:11","end":"0:18","start_seconds":11,"end_seconds":18,"text":"one"},'
        '{"start":"1:07","end":"1:16","start_seconds":67,"end_seconds":76,"text":"two"}'
        ']}'
    )
    cues = validate_transcript(_write(tmp_path, "t.json", body), video_duration_ms=80000)
    assert [(c.start_ms, c.end_ms) for c in cues] == [(11000, 18000), (67000, 76000)]


def test_valid_json_segments_with_clock_strings_only(tmp_path):
    body = '{"segments": [{"start":"0:05","end":"1:07","text":"hi"}]}'  # M:SS strings, no *_seconds
    cues = validate_transcript(_write(tmp_path, "t.json", body), video_duration_ms=80000)
    assert cues[0].start_ms == 5000 and cues[0].end_ms == 67000


def test_rejects_unknown_extension(tmp_path):
    p = _write(tmp_path, "t.txt", "hello")
    with pytest.raises(TranscriptValidationError):
        validate_transcript(p, None)


def test_rejects_empty_transcript(tmp_path):
    p = _write(tmp_path, "t.vtt", "WEBVTT\n\n")
    with pytest.raises(TranscriptValidationError):
        validate_transcript(p, None)


def test_rejects_when_beyond_video_duration(tmp_path):
    p = _write(tmp_path, "t.vtt", "WEBVTT\n\n00:00:10.000 --> 00:00:12.000\nLate\n")
    with pytest.raises(TranscriptValidationError):
        validate_transcript(p, video_duration_ms=5000)


def test_rejects_end_before_start(tmp_path):
    p = _write(tmp_path, "t.vtt", "WEBVTT\n\n00:00:03.000 --> 00:00:01.000\nBad\n")
    with pytest.raises(TranscriptValidationError):
        validate_transcript(p, None)
