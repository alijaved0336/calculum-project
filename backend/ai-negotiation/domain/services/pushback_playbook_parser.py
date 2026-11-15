"""Rebuild the client's pushback categories from knowledge-base chunks.

The knowledge base stores the client's Negotiation Playbook PDF as ~2,000-char
recursive chunks, so one pushback category is routinely split across two or
three chunks — the supplier's argument in one, the buyer counters in the next.
Retrieved raw, a chunk hands the model half a category and the tail of the one
before. This module turns the document back into whole categories:

  1. :func:`clean_extracted_text` — undo the PDF extraction's private-use
     glyphs (``\\ue083Proposed Term]`` → ``[Proposed Term]``) and typographic
     quotes. The mapping is 1:1 per character, so chunk offsets survive it.
  2. :func:`stitch_chunks` — walk each file's ``prev_id``/``next_id`` chain
     and join the chunks, dropping the text consecutive chunks share (the
     splitter overlaps them by a few hundred characters).
  3. :func:`parse_pushback_categories` — split on the document's own numbering:
     ``N Name`` / ``Tags:`` / ``N.S.k`` (supplier argument) / ``N.B.x Title``
     (counter) / ``The Argument:`` (script).

Pure functions over :class:`RetrievalResult` — no I/O, so the parser is tested
against real extracted text without a vector store.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, replace

from domain.entities.pushback import CounterArgument, PushbackCategory
from domain.entities.retrieval_result import RetrievalResult

# The PDF extraction maps some punctuation into the Unicode private-use area.
# Read off the live KB by context: "\ue083Proposed Term]", "\ue083X\ue084%",
# "Supply Chain Finance \ue081SCF\ue082", "SME\ue088Friendly", "10%\ue08912%",
# "90\ue09d day", "\ue0a336% APR\ue082", "\ue0978 weeks" / "\ue09826 weeks".
_GLYPHS = str.maketrans({
    "\ue081": "(",
    "\ue082": ")",
    "\ue083": "[",
    "\ue084": "]",
    "\ue088": "-",
    "\ue089": "-",
    "\ue09d": "-",
    "\ue0a3": "(",
    "\ue097": "<",
    "\ue098": ">",
    "\u02ee": '"',  # modifier double apostrophe, used as a closing quote
    "\u201c": '"',
    "\u201d": '"',
    "\u02bc": "'",  # modifier apostrophe
    "\u2019": "'",
})

# Below this, a "shared" boundary is coincidence — a page-footer "1" at the end
# of one chunk against "1.S Supplier…" at the start of the next.
MIN_CHUNK_OVERLAP = 20
_MAX_CHUNK_OVERLAP = 1_000

_PAGE_NUMBER_LINE = re.compile(r"^\s*\d{1,3}\s*$")
_SUPPLIER_SECTION = re.compile(r"^(\d{1,2})\.S\s+Supplier\b", re.IGNORECASE)
_SUPPLIER_ARG = re.compile(r"^(\d{1,2})\.S\.\d+\s*(.*)$")
_COUNTER_SECTION = re.compile(r"^(\d{1,2})\.B\s+Buyer\b", re.IGNORECASE)
_COUNTER_TITLE = re.compile(r"^(\d{1,2})\.B\.(\w+)\s+(.+)$")
_TAGS = re.compile(r"^(?:Tags|Keywords)\s*:\s*(.*)$", re.IGNORECASE)
# "The Argument:" in most categories, a bare "Argument:" in a few.
_ARGUMENT_LABEL = re.compile(r"(?:The )?Argument\s*:")
_MAX_TITLE_CHARS = 60
_GLUED_TITLE = re.compile(r"^(.{3,60}?\))\s+([A-Z].*)$")
_QUOTES ="\"'\u201c\u201d "


def clean_extracted_text(text: str) -> str:
    """Map the extraction's private-use glyphs and curly quotes to plain ASCII."""
    return (text or "").translate(_GLYPHS)


@dataclass(frozen=True)
class ChunkSpan:
    """Where one chunk's text sits inside the stitched document."""

    chunk: RetrievalResult
    start: int
    end: int


def stitch_chunks(chunks: list[RetrievalResult]) -> tuple[str, list[ChunkSpan]]:
    """Join ONE file's chunks in document order, with the shared overlaps removed.

    Order comes from the ``prev_id``/``next_id`` chain. A chunk the chain never
    reaches (a broken link) is appended afterwards in page order rather than
    dropped — a category parsed out of place beats a category lost.
    """
    by_id = {c.id: c for c in chunks}
    ordered: list[RetrievalResult] = []
    seen: set[str] = set()
    heads = [c for c in chunks if not c.prev_id or c.prev_id not in by_id]
    for head in sorted(heads, key=_page_key):
        current: RetrievalResult | None = head
        while current is not None and current.id not in seen:
            seen.add(current.id)
            ordered.append(current)
            current = by_id.get(current.next_id or "")
    ordered += sorted((c for c in chunks if c.id not in seen), key=_page_key)

    text = ""
    spans: list[ChunkSpan] = []
    for chunk in ordered:
        piece = clean_extracted_text(chunk.text)
        overlap = _overlap(text, piece)
        if overlap:
            start = len(text) - overlap
            text += piece[overlap:]
        else:
            if text and not text.endswith("\n"):
                text += "\n"
            start = len(text)
            text += piece
        spans.append(ChunkSpan(chunk, start, len(text)))
    return text, spans


def _page_key(chunk: RetrievalResult) -> tuple[int, str]:
    return (min(chunk.page_numbers) if chunk.page_numbers else 0, chunk.id)


def _overlap(previous: str, piece: str) -> int:
    """Length of the longest prefix of ``piece`` that ``previous`` ends with."""
    longest = min(len(previous), len(piece), _MAX_CHUNK_OVERLAP)
    for size in range(longest, MIN_CHUNK_OVERLAP - 1, -1):
        if previous.endswith(piece[:size]):
            return size
    return 0


@dataclass(frozen=True)
class _Line:
    text: str
    start: int


def parse_pushback_categories(
    text: str,
    spans: list[ChunkSpan] | None = None,
    *,
    file_id: str = "",
    filename: str | None = None,
) -> list[PushbackCategory]:
    """Every pushback category in a stitched document, in document order.

    A category is anchored on its ``N.S Supplier Pushback Argument`` line; its
    heading is the last ``N Name`` line before that anchor. Anchoring on the
    supplier section rather than on ``N Name`` alone is what keeps body text
    that happens to start with a number ("30 days is …") from opening a
    category. Page-number lines are dropped wherever they fall.
    """
    lines = _lines(text)
    anchors = [i for i, line in enumerate(lines) if _SUPPLIER_SECTION.match(line.text)]

    starts: list[tuple[int, int]] = []  # (heading line index, number)
    floor = 0
    for anchor in anchors:
        number = int(_SUPPLIER_SECTION.match(lines[anchor].text).group(1))
        heading = _heading_before(lines, anchor, floor, number)
        if heading is None or (starts and starts[-1][1] == number):
            # No heading, or a second supplier section of the same category.
            continue
        starts.append((heading, number))
        floor = anchor + 1

    categories: list[PushbackCategory] = []
    for index, (heading, number) in enumerate(starts):
        end = starts[index + 1][0] if index + 1 < len(starts) else len(lines)
        block = lines[heading:end]
        start_offset = block[0].start
        end_offset = lines[end].start if end < len(lines) else len(text)
        covering = [
            s for s in spans or [] if s.start < end_offset and s.end > start_offset
        ]
        category = _parse_category(block, number)
        if category is None:
            continue
        categories.append(PushbackCategory(
            key="",  # assigned below, once duplicates are known
            number=number,
            name=category["name"],
            description=category["description"],
            tags=category["tags"],
            supplier_args=category["supplier_args"],
            counter_args=category["counter_args"],
            file_id=file_id,
            filename=filename,
            chunk_ids=tuple(s.chunk.id for s in covering),
            page_numbers=tuple(sorted({p for s in covering for p in s.chunk.page_numbers})),
            text="\n".join(line.text for line in block),
        ))
    return _with_unique_keys(categories)


def _lines(text: str) -> list[_Line]:
    out: list[_Line] = []
    offset = 0
    for raw in text.split("\n"):
        stripped = raw.strip()
        if stripped and not _PAGE_NUMBER_LINE.match(stripped):
            out.append(_Line(stripped, offset))
        offset += len(raw) + 1
    return out


def _heading_before(lines: list[_Line], anchor: int, floor: int, number: int) -> int | None:
    pattern = re.compile(rf"^{number}\s+(\S.*)$")
    for i in range(anchor - 1, floor - 1, -1):
        if pattern.match(lines[i].text):
            return i
    return None


def _parse_category(block: list[_Line], number: int) -> dict | None:
    name = _clean_name(re.match(rf"^{number}\s+(.*)$", block[0].text).group(1))
    description: list[str] = []
    tags: list[str] = []
    supplier_args: list[list[str]] = []
    counters: list[tuple[str, list[str]]] = []
    section = "description"

    for line in block[1:]:
        text = line.text
        if (m := _TAGS.match(text)) and section == "description":
            section = "tags"
            tags.append(m.group(1))
        elif _SUPPLIER_SECTION.match(text):
            section = "supplier"
        elif (m := _SUPPLIER_ARG.match(text)) and int(m.group(1)) == number:
            section = "supplier"
            supplier_args.append([m.group(2)])
        elif _COUNTER_SECTION.match(text):
            section = "counters"
        elif (m := _COUNTER_TITLE.match(text)) and int(m.group(1)) == number:
            section = "counters"
            counters.append((m.group(3).strip(), []))
        elif section == "description":
            description.append(text)
        elif section == "tags":
            tags.append(text)
        elif section == "supplier" and supplier_args:
            supplier_args[-1].append(text)
        elif section == "counters" and counters:
            counters[-1][1].append(text)

    if not supplier_args and not counters:
        return None
    return {
        "name": name,
        "description": " ".join(description),
        "tags": tuple(
            t.strip() for t in re.split(r"[,\n]", ", ".join(tags)) if t.strip()
        ),
        "supplier_args": tuple(
            arg for arg in (_unquote(" ".join(parts)) for parts in supplier_args) if arg
        ),
        "counter_args": tuple(_counter(title, body) for title, body in counters),
    }


def _counter(title: str, body: list[str]) -> CounterArgument:
    joined = " ".join(body)
    # A title the extraction glued to its own label ("Rate Arbitrage The
    # Argument: …") keeps the label out of the name.
    title_split = _ARGUMENT_LABEL.split(title, maxsplit=1)
    if len(title_split) == 2:
        title, joined = title_split[0], f"The Argument: {title_split[1]} {joined}"
    # A title glued to the first sentence of its strategy: "Supply Chain
    # Finance (SCF) Use SCF to ensure …".
    if len(title) > _MAX_TITLE_CHARS and (glued := _GLUED_TITLE.match(title)):
        title, joined = glued.group(1), f"{glued.group(2)} {joined}"
    parts = _ARGUMENT_LABEL.split(joined, maxsplit=1)
    strategy = parts[0].strip()
    script = _unquote(parts[1]) if len(parts) == 2 else ""
    return CounterArgument(name=_clean_name(title), strategy=strategy, script=script)


def _clean_name(name: str) -> str:
    name = re.sub(r"\s+", " ", name).strip().rstrip(".")
    # A heading whose opening parenthesis was lost: "DSO Days Sales Outstanding)".
    if name.count(")") > name.count("("):
        name = re.sub(r"\s(\S[^()]*\))$", r" (\1", name)
    return name


def _unquote(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    # A trailing footnote marker the extraction glued on: `…time."1`.
    text = re.sub(r'(["\'])\d{1,2}$', r"\1", text)
    return text.strip(_QUOTES)


def category_key(name: str) -> str:
    """Stable slug for a category name: "R&D Reinvestment Cycle" → "r_and_d_reinvestment_cycle"."""
    name = re.sub(r"\([^)]*\)", " ", name).replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def _with_unique_keys(categories: list[PushbackCategory]) -> list[PushbackCategory]:
    """Assign keys; a name the document reuses ("Integrity") keeps its number."""
    counts: dict[str, int] = {}
    for category in categories:
        key = category_key(category.name)
        counts[key] = counts.get(key, 0) + 1
    out: list[PushbackCategory] = []
    for category in categories:
        key = category_key(category.name) or f"category_{category.number}"
        if counts.get(key, 0) > 1:
            key = f"{key}_{category.number}"
        out.append(replace(category, key=key))
    return out
