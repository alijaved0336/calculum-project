from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class AnswerResult:
    answer: str
    video_clips: list[dict] = field(default_factory=list)
    document_sources: list[dict] = field(default_factory=list)
    resolved: bool = True
    sources: list[str] = field(default_factory=list)
    escalated: bool = False
    thread_id: str | None = None
    # Per-intent answer sections: [{topic, text, video_clips, document_sources}]. One entry
    # for a normal single-intent answer; several when a multi-intent prompt was decomposed.
    # ``video_clips``/``document_sources`` above remain the flattened union (back-compat).
    sections: list[dict] = field(default_factory=list)
