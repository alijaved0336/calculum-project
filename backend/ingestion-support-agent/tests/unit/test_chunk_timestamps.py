from application.ingest.utils import stamp_chunk_metadata
from domain.entities.ingestion import Chunk, ChunkType, Page
from infrastructure.chunking.ingestion_chunker import IngestionChunkerAdapter


def _page(n, text, start, end):
    return Page(
        page_number=n,
        content=text,
        has_table=False,
        source_file="v.vtt",
        metadata={"start_ms": start, "end_ms": end},
    )


def _word_len(text):
    """Token stand-in for tests: count words so chunk sizes are easy to reason about."""
    return len(text.split())


def _four_cues():
    return [
        _page(1, "alpha beta gamma", 0, 3000),
        _page(2, "delta epsilon zeta", 3000, 6000),
        _page(3, "eta theta iota", 6000, 9000),
        _page(4, "kappa lambda mu", 9000, 12000),
    ]


def test_chunk_pages_carry_span_min_max():
    chunker = IngestionChunkerAdapter(strategy="recursive")
    pages = [_page(1, "Hello there.", 1000, 2000), _page(2, "Second cue here.", 2000, 3500)]
    chunks = chunker.chunk_pages(pages, file_id="v1")
    assert chunks
    assert chunks[0].metadata["start_ms"] == 1000
    assert chunks[0].metadata["end_ms"] == 3500


def test_cue_chunks_carry_local_span_not_group_envelope():
    """Each chunk's span brackets only the cues it contains — never the whole group.

    Reproduces the reported bug: previously every sub-chunk of a group inherited the
    group-wide min/max (e.g. 215000/432000) regardless of its actual text.
    """
    # Huge time window so the token cap is what forces the split here.
    chunker = IngestionChunkerAdapter(
        strategy="recursive", chunk_size=6, chunk_overlap=0, transcript_chunk_ms=10**9,
        transcript_overlap_cues=0, min_chunk_size=1, length_function=_word_len,
    )
    chunks = chunker.chunk_pages(_four_cues(), file_id="v1")

    assert len(chunks) >= 2
    for c in chunks:
        assert c.metadata["start_ms"] <= c.metadata["end_ms"]
    spans = [(c.metadata["start_ms"], c.metadata["end_ms"]) for c in chunks]
    # No chunk carries the whole-transcript envelope (0..12000).
    assert (0, 12000) not in spans
    # Coverage starts at the first cue and ends at the last, at cue boundaries.
    assert chunks[0].metadata["start_ms"] == 0
    assert chunks[-1].metadata["end_ms"] == 12000
    # Without overlap the spans are disjoint and monotonic.
    for a, b in zip(chunks, chunks[1:]):
        assert b.metadata["start_ms"] >= a.metadata["end_ms"]


def test_cue_chunks_bounded_by_time_window():
    """Chunks are bounded by the wall-clock window even when tokens are far under the cap —
    so a retrieved clip's start/end stays tight (~window) instead of spanning minutes."""
    chunker = IngestionChunkerAdapter(
        strategy="recursive", chunk_size=10**6, transcript_chunk_ms=6000,
        transcript_overlap_cues=0, min_chunk_size=1, length_function=_word_len,
    )
    chunks = chunker.chunk_pages(_four_cues(), file_id="v1")  # four 3s cues, 12s total

    assert len(chunks) == 2  # ~6s windows, not one 12s chunk
    for c in chunks:
        assert c.metadata["end_ms"] - c.metadata["start_ms"] <= 6000


def test_cue_chunks_overlap_share_boundary_cue():
    """With overlap on, adjacent chunks share their boundary cue and their time spans
    overlap by that cue — timing stays exact (spans are honest, just not disjoint)."""
    chunker = IngestionChunkerAdapter(
        strategy="recursive", chunk_size=6, chunk_overlap=0, transcript_chunk_ms=10**9,
        transcript_overlap_cues=1, min_chunk_size=1, length_function=_word_len,
    )
    chunks = chunker.chunk_pages(_four_cues(), file_id="v1")

    assert len(chunks) >= 2
    # Adjacent chunks overlap in time by the shared cue.
    for a, b in zip(chunks, chunks[1:]):
        assert b.metadata["start_ms"] <= a.metadata["end_ms"]
    # The shared boundary cue's text appears in both neighbours.
    assert "delta epsilon zeta" in chunks[0].text
    assert "delta epsilon zeta" in chunks[1].text


def test_stamp_merges_video_id_and_title():
    c = Chunk(
        id="x", text="t", page_numbers=[1], chunk_type=ChunkType.RECURSIVE, file_id="v1", metadata={}
    )
    stamp_chunk_metadata([c], created_at="now", extra_metadata={"video_id": "v1", "title": "T"})
    assert c.metadata["video_id"] == "v1"
    assert c.metadata["title"] == "T"
    assert c.metadata["created_at"] == "now"
