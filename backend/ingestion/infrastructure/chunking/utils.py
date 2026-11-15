from __future__ import annotations
import hashlib
import uuid
from domain.entities.ingestion import Chunk


def stable_chunk_id(file_id: str, page_numbers: list[int], text: str) -> str:
    """Deterministic UUID derived from file, page range, and first 64 chars of text."""
    page_range = "-".join(str(p) for p in page_numbers)
    raw = f"{file_id}:{page_range}:{text[:64]}"
    return str(uuid.UUID(hex=hashlib.sha256(raw.encode()).hexdigest()[:32]))


def link_sequential(chunks: list[Chunk]) -> None:
    """Wire prev_id/next_id on each chunk in list order (in-place)."""
    for i, chunk in enumerate(chunks):
        if i > 0:
            chunk.prev_id = chunks[i - 1].id
        if i < len(chunks) - 1:
            chunk.next_id = chunks[i + 1].id


def make_chunk(proto: Chunk, text: str) -> Chunk:
    """Clone proto with new text and a recomputed stable ID."""
    return Chunk(id=stable_chunk_id(proto.file_id, proto.page_numbers, text), text=text,
                 page_numbers=proto.page_numbers, chunk_type=proto.chunk_type,
                 file_id=proto.file_id, metadata=proto.metadata)


def merge_small_chunks(chunks: list[Chunk], min_chunk_size: int, size_fn=None) -> list[Chunk]:
    """Merge chunks ≤ min_chunk_size forward into the next; fold a small tail backward.
    size_fn measures text size in tokens — falls back to len() (chars) when None."""
    if len(chunks) <= 1:
        return chunks
    measure, out, carry = size_fn or len, [], ""
    for chunk in chunks:
        text = (carry + "\n\n" + chunk.text).strip() if carry else chunk.text
        if measure(text) <= min_chunk_size:
            carry = text
        else:
            out.append(make_chunk(chunk, text))
            carry = ""
    if carry:
        if out:
            out[-1] = make_chunk(out[-1], out[-1].text + "\n\n" + carry)
        else:
            out.append(make_chunk(chunks[-1], carry))
    return out
