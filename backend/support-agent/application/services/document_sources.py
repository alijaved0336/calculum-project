from __future__ import annotations

from typing import Iterable

from domain.entities.retrieval_result import RetrievalResult


def build_document_sources(
    document_results: Iterable[RetrievalResult], max_sources: int
) -> list[dict]:
    """Build deduped document citations from the grounding document chunks.

    Groups chunks by their document (``metadata.file_id``), keeping first-seen order
    (i.e. rerank order), unions each document's page numbers, and truncates to
    ``max_sources``. Citation-only: no link is produced — title + page numbers come
    straight from the chunk payload, so no store lookup / URL signing is needed.

    Each source also carries ``is_public`` (from the chunk payload; missing → private),
    so the caller can hide private-document citations from non-admins.

    Returns ``[{document_id, title, page_numbers, is_public}]``.
    """
    by_doc: dict[str, dict] = {}
    for r in document_results:
        file_id = r.metadata.get("file_id")
        if not file_id:
            continue
        entry = by_doc.get(file_id)
        if entry is None:
            entry = {
                "document_id": file_id,
                "title": r.title,
                "page_numbers": set(),
                "is_public": bool(r.metadata.get("is_public")),
            }
            by_doc[file_id] = entry
        pages = r.metadata.get("page_numbers")
        if not pages:
            page = r.metadata.get("page_number")
            pages = [page] if page is not None else []
        entry["page_numbers"].update(pages)

    sources = []
    for entry in list(by_doc.values())[: max(0, max_sources)]:
        sources.append(
            {
                "document_id": entry["document_id"],
                "title": entry["title"],
                "page_numbers": sorted(entry["page_numbers"]),
                "is_public": entry["is_public"],
            }
        )
    return sources


def gate_document_sources(
    sources: Iterable[dict], is_admin: bool, current_public: dict[str, bool]
) -> list[dict]:
    """Filter + refresh citations against each document's CURRENT visibility.

    ``current_public`` maps ``document_id -> is_public`` from the DB column (the source of
    truth). Each returned source's ``is_public`` is refreshed to the current value; a source
    whose id is absent from the map falls back to its own (snapshot) flag. Non-admins receive
    only currently-public documents, so a doc that has since been made private never appears
    as a citation to them — regardless of what the stored message said.
    """
    out: list[dict] = []
    for s in sources:
        pub = bool(current_public.get(s.get("document_id"), s.get("is_public", False)))
        if is_admin or pub:
            out.append({**s, "is_public": pub})
    return out


def hidden_document_sources(sources: Iterable[dict], gated: Iterable[dict]) -> list[dict]:
    """Sources present in ``sources`` but dropped by ``gate_document_sources``.

    Used to know which titles/pages to strip from viewer-facing answer text.
    """
    visible_ids = {s.get("document_id") for s in gated}
    return [s for s in sources if s.get("document_id") not in visible_ids]
