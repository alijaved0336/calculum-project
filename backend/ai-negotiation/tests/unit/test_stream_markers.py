"""The live token stream must never show the supplier-facing markers.

`complete(stream_to_client=True)` forwards tokens to the client as they arrive,
but keeps the raw draft (markers included) for the asymmetry guard. The markers
can arrive split across tokens, so `_drain_markers` buffers a trailing partial
until it either completes (and is stripped) or diverges (and is emitted).
"""
from __future__ import annotations

from infrastructure.llm.llm_client import _drain_markers
from domain.services.asymmetry_guard import (
    SUPPLIER_FACING_CLOSE,
    SUPPLIER_FACING_OPEN,
)


def _stream(tokens: list[str]) -> str:
    """Replay the streaming loop from `complete()` over `tokens`."""
    buf = ""
    out: list[str] = []
    for tok in tokens:
        buf += tok
        emit, buf = _drain_markers(buf, flush=False)
        out.append(emit)
    emit, _ = _drain_markers(buf, flush=True)
    out.append(emit)
    return "".join(out)


def test_markers_arriving_whole_are_stripped():
    tokens = ["Here's the read.\n", SUPPLIER_FACING_OPEN, "Move to 76 days.", SUPPLIER_FACING_CLOSE, "\nFallback."]
    out = _stream(tokens)
    assert SUPPLIER_FACING_OPEN not in out
    assert SUPPLIER_FACING_CLOSE not in out
    assert "Here's the read." in out
    assert "Move to 76 days." in out
    assert "Fallback." in out


def test_markers_split_across_tokens_are_stripped():
    # The delimiter is fragmented the way a tokenizer would emit it.
    tokens = ["analysis ", "[[SUPP", "LIER_FAC", "ING]]", "say this", "[[/SUPPLIER", "_FACING", "]]", " done"]
    out = _stream(tokens)
    assert SUPPLIER_FACING_OPEN not in out
    assert SUPPLIER_FACING_CLOSE not in out
    assert out == "analysis say this done"


def test_bracketed_text_that_is_not_a_marker_survives():
    out = _stream(["see [[note]] and ", "[[x]] here"])
    assert out == "see [[note]] and [[x]] here"


def test_stream_content_matches_marker_stripped_draft():
    # What the client sees == the full draft with only the markers removed.
    draft = f"read\n{SUPPLIER_FACING_OPEN}say 76 days{SUPPLIER_FACING_CLOSE}\ntail"
    # Feed one char at a time — the worst case for cross-token splitting.
    out = _stream(list(draft))
    assert out == "read\nsay 76 days\ntail"
