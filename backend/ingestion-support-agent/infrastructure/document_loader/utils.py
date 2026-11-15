from __future__ import annotations
import re
from typing import Any
from domain.entities.ingestion import Page

_PSEUDO_PAGE_CHARS = 3000
_DENSE_WS = re.compile(r"\s{3,}")


def looks_like_table_generic(text: str) -> bool:
    lines = [ln for ln in text.splitlines() if ln.strip()]
    if len(lines) < 2:
        return False

    pipe_lines = sum(1 for ln in lines if ln.count("|") >= 2)
    if pipe_lines / len(lines) >= 0.5:
        return True

    tab_lines = [ln for ln in lines if "\t" in ln]
    if len(tab_lines) >= 3:
        col_counts = [len(ln.split("\t")) for ln in tab_lines[:10]]
        if len(set(col_counts)) <= 2 and col_counts[0] >= 2:
            return True
    return False



def split_pseudo_pages(text: str, source_file: str, extra_meta: dict[str, Any]) -> list[Page]:
    if not text.strip():
        return []
    pages: list[Page] = []
    for i, start in enumerate(range(0, len(text), _PSEUDO_PAGE_CHARS), start=1):
        chunk_text = text[start : start + _PSEUDO_PAGE_CHARS]
        if not chunk_text.strip():
            continue
        pages.append(
            Page(
                page_number=i,
                content=chunk_text,
                has_table=looks_like_table_generic(chunk_text),
                source_file=source_file,
                metadata={**extra_meta, "page_number": i},
            )
        )
    return pages
