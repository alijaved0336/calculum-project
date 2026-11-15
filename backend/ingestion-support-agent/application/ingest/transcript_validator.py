"""Validate and parse timestamped transcript files (VTT / SRT / JSON).

Phase 1 requires transcripts that already carry timestamps (no ASR). This module
is the single source of truth for "is this a valid transcript?" and returns the
parsed cues so the loader (and route) never re-parse. Formats are simple enough
that we parse them directly rather than pulling in webvtt-py/pysrt.
"""
from __future__ import annotations

import json
import re
from collections import namedtuple
from pathlib import Path

from config import settings

Cue = namedtuple("Cue", "start_ms end_ms text")

# Duration tolerance: transcripts may end a beat after the last spoken word.
_DURATION_TOLERANCE_MS = 1000

# HH:MM:SS.mmm (VTT) or HH:MM:SS,mmm (SRT), hours optional.
_TS = re.compile(r"(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})")
_ARROW = re.compile(
    r"(?P<start>(?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*"
    r"(?P<end>(?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})"
)


class TranscriptValidationError(Exception):
    """Raised when a transcript file is missing, malformed, or has no timestamps."""


def _fmt_ms(ms: int) -> str:
    """Render a millisecond offset as a friendly clock (``m:ss`` or ``h:mm:ss``).

    Validation errors are shown to admins in the upload/edit UI, so timings read as
    "2:05", not "125000ms".
    """
    total = max(0, round((ms or 0) / 1000))
    hours, rem = divmod(total, 3600)
    minutes, seconds = divmod(rem, 60)
    if hours:
        return f"{hours}:{minutes:02d}:{seconds:02d}"
    return f"{minutes}:{seconds:02d}"


def _ts_to_ms(ts: str) -> int:
    m = _TS.match(ts.strip())
    if not m:
        raise TranscriptValidationError(f"Invalid timestamp: {ts!r}")
    hours = int(m.group(1) or 0)
    minutes, seconds, millis = int(m.group(2)), int(m.group(3)), int(m.group(4).ljust(3, "0"))
    return ((hours * 60 + minutes) * 60 + seconds) * 1000 + millis


def _parse_vtt_srt(text: str) -> list[Cue]:
    cues: list[Cue] = []
    blocks = re.split(r"\n\s*\n", text.strip())
    for block in blocks:
        arrow = _ARROW.search(block)
        if not arrow:
            continue  # header / index-only / blank block
        start_ms = _ts_to_ms(arrow.group("start"))
        end_ms = _ts_to_ms(arrow.group("end"))
        lines = block.splitlines()
        # Text = every line after the arrow line within the block.
        arrow_line_idx = next(i for i, ln in enumerate(lines) if "-->" in ln)
        content = "\n".join(lines[arrow_line_idx + 1 :]).strip()
        cues.append(Cue(start_ms, end_ms, content))
    return cues


def _clock_to_ms(value: str) -> int:
    """Parse a 'M:SS', 'MM:SS', or 'H:MM:SS[.mmm]' clock string into milliseconds."""
    parts = value.strip().replace(",", ".").split(":")
    if not 1 <= len(parts) <= 3:
        raise ValueError(f"bad clock {value!r}")
    nums = [float(p) for p in parts]
    seconds = nums[-1]
    minutes = nums[-2] if len(nums) >= 2 else 0.0
    hours = nums[-3] if len(nums) >= 3 else 0.0
    return int(round((hours * 3600 + minutes * 60 + seconds) * 1000))


def _cue_ms(seg: dict, which: str) -> int:
    """Resolve a cue's start/end in ms, accepting *_ms, *_seconds, or a clock/number field."""
    if seg.get(f"{which}_ms") is not None:
        return int(seg[f"{which}_ms"])
    if seg.get(f"{which}_seconds") is not None:
        return int(round(float(seg[f"{which}_seconds"]) * 1000))
    value = seg.get(which)
    if isinstance(value, bool) or value is None:
        raise ValueError(f"missing {which}")
    if isinstance(value, (int, float)):  # seconds
        return int(round(float(value) * 1000))
    if isinstance(value, str):
        return _clock_to_ms(value) if ":" in value else int(round(float(value) * 1000))
    raise ValueError(f"unparseable {which}: {value!r}")


def _parse_json(text: str) -> list[Cue]:
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise TranscriptValidationError(f"Invalid JSON transcript: {exc}") from exc

    if isinstance(data, dict):
        items = data.get("segments") or data.get("cues") or data.get("results")
        if items is None:
            raise TranscriptValidationError("JSON transcript must contain a 'segments' (or 'cues') list.")
    else:
        items = data
    if not isinstance(items, list):
        raise TranscriptValidationError("JSON transcript must be a list (or have a 'segments' list).")

    cues: list[Cue] = []
    for it in items:
        if not isinstance(it, dict):
            raise TranscriptValidationError("Each JSON cue must be an object.")
        try:
            start = _cue_ms(it, "start")
            end = _cue_ms(it, "end")
        except (KeyError, TypeError, ValueError) as exc:
            raise TranscriptValidationError(
                "Each JSON cue needs timing via start_ms/end_ms, start_seconds/end_seconds, "
                "or start/end (seconds or M:SS)."
            ) from exc
        cues.append(Cue(start, end, str(it.get("text", "")).strip()))
    return cues


def validate_transcript(path: Path, video_duration_ms: int | None) -> list[Cue]:
    """Parse + validate a transcript file, returning its cues.

    Raises TranscriptValidationError on: unknown extension, unparseable content,
    zero cues, non-monotonic / negative / end<start timestamps, or cues that run
    past the referenced video's duration (+tolerance).
    """
    path = Path(path)
    ext = path.suffix.lower()
    if ext not in settings.allowed_transcript_ext:
        raise TranscriptValidationError(
            f"Unsupported transcript type {ext!r}; allowed: {settings.allowed_transcript_ext}"
        )
    text = path.read_text(encoding="utf-8")
    cues = _parse_json(text) if ext == ".json" else _parse_vtt_srt(text)

    if not cues:
        raise TranscriptValidationError(
            "This file has no timestamped cues. Upload a .vtt, .srt, or timestamped .json transcript."
        )

    prev_end = -1
    for cue in cues:
        if cue.start_ms < 0 or cue.end_ms < cue.start_ms:
            raise TranscriptValidationError(
                f"A cue has invalid timing (starts at {_fmt_ms(cue.start_ms)}, ends at "
                f"{_fmt_ms(cue.end_ms)}). Each cue must start before it ends."
            )
        if cue.start_ms < prev_end - _DURATION_TOLERANCE_MS:
            raise TranscriptValidationError(
                "The transcript's cues are out of order — timestamps must move forward from "
                "start to end."
            )
        prev_end = cue.end_ms

    if not any(c.text.strip() for c in cues):
        raise TranscriptValidationError("The transcript has timestamps but no text.")

    if video_duration_ms is not None:
        max_end = max(c.end_ms for c in cues)
        if max_end > video_duration_ms + _DURATION_TOLERANCE_MS:
            raise TranscriptValidationError(
                f"This transcript runs to {_fmt_ms(max_end)}, but the video is only "
                f"{_fmt_ms(video_duration_ms)} long. Please upload the transcript that matches "
                "this video."
            )
    return cues
