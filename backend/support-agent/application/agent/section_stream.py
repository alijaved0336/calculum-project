"""Split a streamed multi-section answer into per-section text as it arrives.

The answer LLM emits ``@@S{i}@@`` (1-based) before each sub-question's section (see
``utils/prompts/sectioned_answer_prompt``). Tokens arrive in arbitrary chunks that can split a
marker across boundaries, so :class:`SectionSplitter` buffers just enough to detect a marker,
routes text to the current section, and holds back any trailing partial marker until the next
chunk resolves it (same idea as the ``<think>`` filter in ``infrastructure/llm/llm_client``).
"""
from __future__ import annotations

import re

_MARKER = re.compile(r"@@S(\d+)@@")
# Longest trailing run that could still grow into a full ``@@S<digits>@@`` marker.
_PARTIAL = re.compile(r"@+(S\d*@?)?$")


def _partial_marker_len(buf: str) -> int:
    match = _PARTIAL.search(buf)
    return len(match.group(0)) if match else 0


class SectionSplitter:
    """Feed streamed tokens; get back ``(section_index, text)`` pieces (0-based index).

    Starts in section 0, so any text before the first ``@@S1@@`` marker (or the whole answer
    if the model forgets the markers) still lands in section 0 rather than being dropped.
    ``flush()`` releases the final section's tail.
    """

    def __init__(self) -> None:
        self._buf = ""
        self._section = 0

    def feed(self, chunk: str) -> list[tuple[int, str]]:
        self._buf += chunk
        out: list[tuple[int, str]] = []
        while True:
            m = _MARKER.search(self._buf)
            if not m:
                break
            before = self._buf[: m.start()]
            if before:
                out.append((self._section, before))
            self._section = int(m.group(1)) - 1  # 1-based marker → 0-based section
            self._buf = self._buf[m.end():]
        keep = _partial_marker_len(self._buf)
        emit = self._buf[: len(self._buf) - keep]
        self._buf = self._buf[len(self._buf) - keep:]
        if emit:
            out.append((self._section, emit))
        return out

    def flush(self) -> list[tuple[int, str]]:
        out: list[tuple[int, str]] = []
        if self._buf:
            out.append((self._section, self._buf))
        self._buf = ""
        return out
