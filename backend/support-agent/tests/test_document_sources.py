from application.services.document_sources import build_document_sources, gate_document_sources
from domain.entities.retrieval_result import RetrievalResult


def test_carries_is_public_from_chunk_and_defaults_private():
    pub = RetrievalResult(id="a", score=0.9, text="x", source_type="document", title="Pub",
                          metadata={"file_id": "d1", "title": "Pub", "is_public": True})
    priv = RetrievalResult(id="b", score=0.8, text="y", source_type="document", title="Priv",
                           metadata={"file_id": "d2", "title": "Priv"})  # no flag → private
    out = build_document_sources([pub, priv], max_sources=5)
    flags = {s["document_id"]: s["is_public"] for s in out}
    assert flags == {"d1": True, "d2": False}


def test_gate_uses_current_visibility_not_snapshot():
    # The stored snapshot says both are public, but the DB now says d2 is private. A
    # non-admin must see only d1; the admin sees both — and both flags are refreshed to
    # the current value.
    sources = [
        {"document_id": "d1", "title": "Pub", "page_numbers": [], "is_public": True},
        {"document_id": "d2", "title": "WasPublic", "page_numbers": [], "is_public": True},
    ]
    now = {"d1": True, "d2": False}
    assert [s["document_id"] for s in gate_document_sources(sources, True, now)] == ["d1", "d2"]
    non_admin = gate_document_sources(sources, False, now)
    assert [s["document_id"] for s in non_admin] == ["d1"]
    # snapshot said public, current says private → refreshed to False and dropped for non-admin
    assert [s["document_id"] for s in gate_document_sources(sources, True, now) if not s["is_public"]] == ["d2"]


def test_gate_falls_back_to_snapshot_when_id_absent():
    # No current-visibility entry (e.g. DB lookup unavailable) → use the source's own flag.
    sources = [
        {"document_id": "d1", "title": "Pub", "page_numbers": [], "is_public": True},
        {"document_id": "d2", "title": "Priv", "page_numbers": [], "is_public": False},
    ]
    assert [s["document_id"] for s in gate_document_sources(sources, False, {})] == ["d1"]


def _doc(id, file_id, title, pages=None, page=None):
    meta = {"file_id": file_id, "chunk_source": "document", "title": title}
    if pages is not None:
        meta["page_numbers"] = pages
    if page is not None:
        meta["page_number"] = page
    return RetrievalResult(
        id=id, score=0.9, text="...", source_type="document", title=title, metadata=meta
    )


def test_dedupes_by_document_and_unions_pages():
    results = [
        _doc("c1", "d1", "Billing Guide", pages=[1, 2]),
        _doc("c2", "d1", "Billing Guide", pages=[2, 3]),  # same doc → merged
        _doc("c3", "d2", "SSO Setup", pages=[7]),
    ]
    out = build_document_sources(results, max_sources=3)
    assert out == [
        {"document_id": "d1", "title": "Billing Guide", "page_numbers": [1, 2, 3], "is_public": False},
        {"document_id": "d2", "title": "SSO Setup", "page_numbers": [7], "is_public": False},
    ]


def test_caps_at_max_sources_in_rank_order():
    results = [_doc(f"c{i}", f"d{i}", f"Doc {i}", pages=[i]) for i in range(1, 5)]
    out = build_document_sources(results, max_sources=2)
    assert [s["document_id"] for s in out] == ["d1", "d2"]


def test_falls_back_to_page_number_when_no_page_numbers():
    out = build_document_sources([_doc("c1", "d1", "Doc", page=5)], max_sources=3)
    assert out[0]["page_numbers"] == [5]


def test_missing_pages_yields_empty_list():
    out = build_document_sources([_doc("c1", "d1", "Doc")], max_sources=3)
    assert out[0]["page_numbers"] == []


def test_empty_input():
    assert build_document_sources([], max_sources=3) == []
