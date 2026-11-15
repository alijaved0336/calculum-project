"""Parse a stored transcript (VTT / SRT / JSON) into player cues {t, text}.

`t` is the cue start time in **seconds** (the player seeks with it). Mirrors the
formats the ingestion service accepts.
"""
from __future__ import annotations

import json
import re

_TS = re.compile(r"(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})")
_ARROW = re.compile(
    r"(?P<start>(?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*"
    r"(?P<end>(?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})"
)


def _ts_to_sec(ts: str) -> float:
    m = _TS.match(ts.strip())
    if not m:
        return 0.0
    hours = int(m.group(1) or 0)
    minutes, seconds, millis = int(m.group(2)), int(m.group(3)), int(m.group(4).ljust(3, "0"))
    return ((hours * 60 + minutes) * 60 + seconds) + millis / 1000.0


def _parse_vtt_srt(text: str) -> list[dict]:
    cues: list[dict] = []
    for block in re.split(r"\n\s*\n", text.strip()):
        arrow = _ARROW.search(block)
        if not arrow:
            continue
        lines = block.splitlines()
        arrow_idx = next(i for i, ln in enumerate(lines) if "-->" in ln)
        content = "\n".join(lines[arrow_idx + 1 :]).strip()
        cues.append({"t": _ts_to_sec(arrow.group("start")), "text": content})
    return cues


def _clock_to_sec(value: str) -> float:
    parts = value.strip().replace(",", ".").split(":")
    nums = [float(p) for p in parts]
    seconds = nums[-1]
    minutes = nums[-2] if len(nums) >= 2 else 0.0
    hours = nums[-3] if len(nums) >= 3 else 0.0
    return hours * 3600 + minutes * 60 + seconds


def _cue_start_sec(seg: dict) -> float:
    if seg.get("start_ms") is not None:
        return float(seg["start_ms"]) / 1000.0
    if seg.get("start_seconds") is not None:
        return float(seg["start_seconds"])
    v = seg.get("start") or seg.get("t") or seg.get("time") or 0
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        return _clock_to_sec(v) if ":" in v else float(v)
    return 0.0


def _parse_json(text: str) -> list[dict]:
    data = json.loads(text)
    items = (data.get("segments") or data.get("cues") or data.get("results")) if isinstance(data, dict) else data
    if not isinstance(items, list):
        return []
    return [
        {"t": _cue_start_sec(it), "text": str(it.get("text", "")).strip()}
        for it in items
        if isinstance(it, dict)
    ]


def parse_transcript(filename: str, text: str) -> list[dict]:
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    cues = _parse_json(text) if ext == "json" else _parse_vtt_srt(text)
    return [c for c in cues if c.get("text")]
