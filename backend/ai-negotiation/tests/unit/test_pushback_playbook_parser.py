"""Parsing the client's pushback playbook back out of knowledge-base chunks."""
from __future__ import annotations

import dataclasses
from types import SimpleNamespace

from domain.entities.retrieval_result import RetrievalResult
from domain.services.objection_scan import scan_likely_objections
from domain.services.pushback_playbook_parser import (
    MIN_CHUNK_OVERLAP,
    category_key,
    clean_extracted_text,
    parse_pushback_categories,
    stitch_chunks,
)
from tests.unit.prompt_fixtures import rich_facts
from tests.unit.pushback_kb_fixture import FILE_ID, FILENAME, fixture_chunks, fixture_kb


def _chunk(id_: str, text: str, *, prev=None, next_=None, pages=(1,)) -> RetrievalResult:
    return RetrievalResult(
        id=id_, score=0.0, text=text, file_id="f", chunk_type="recursive",
        page_numbers=list(pages), prev_id=prev, next_id=next_, metadata={},
    )


# ── cleaning and stitching ─────────────────────────────────────────────────


def test_extraction_glyphs_become_plain_punctuation():
    raw = "Proposed Term] days via Supply Chain Finance SCF “yesˮ weʼre SMEFriendly"
    assert clean_extracted_text(raw) == (
        "[Proposed Term] days via Supply Chain Finance (SCF) \"yes\" we're SME-Friendly"
    )


def test_chunks_are_stitched_in_chain_order_without_their_overlap():
    text, spans = stitch_chunks(fixture_chunks())  # the fixture lists them reversed
    assert text.count("13.S Supplier Pushback Argument") == 1
    assert text.count("15.B.SCF Non-Recourse") == 1
    assert text.index("4 Inventory") < text.index("13 Raw") < text.index("16 Cost of Factoring")
    assert [s.chunk.id for s in spans] == ["chunk-0", "chunk-1", "chunk-2"]
    # Spans overlap exactly where the chunks did.
    assert spans[1].start < spans[0].end


def test_a_coincidental_one_character_overlap_is_not_removed():
    # A page footer "1" ending one chunk, "1.S Supplier…" starting the next.
    text, _ = stitch_chunks([
        _chunk("a", "Currency Position\n1", next_="b"),
        _chunk("b", "1.S Supplier Pushback Argument", prev="a"),
    ])
    assert text == "Currency Position\n1\n1.S Supplier Pushback Argument"
    assert MIN_CHUNK_OVERLAP > 1


def test_a_broken_chain_keeps_the_orphan_chunk():
    text, spans = stitch_chunks([
        _chunk("a", "first", next_="missing"),
        _chunk("c", "orphan", prev="gone", pages=(5,)),
    ])
    assert "first" in text and "orphan" in text
    assert len(spans) == 2


# ── parsing ────────────────────────────────────────────────────────────────


def test_every_category_in_the_slice_is_parsed_whole():
    kb = fixture_kb()
    assert list(kb) == ["inventory", "raw_material_volatility", "dso", "cost_of_factoring"]
    dso = kb["dso"]
    assert dso.number == 15
    assert dso.name == "DSO (Days Sales Outstanding)"  # lost "(" restored
    assert dso.supplier_arg.startswith("Our KPIs and financial targets are tied to our DSO")
    assert [a.name for a in dso.counter_args] == ["Early Payments", "Non-Recourse Receivables Purchase"]
    assert dso.counter_args[1].script.startswith("We can implement Non-Recourse Supply Chain Finance")
    assert "(SCF)" in dso.counter_args[1].strategy
    # Split across two chunks, and cited from both.
    assert dso.chunk_ids == ("chunk-1", "chunk-2")
    assert dso.page_numbers == (9, 10, 11)
    assert dso.file_id == FILE_ID and dso.filename == FILENAME


def test_strategy_and_script_are_separated_and_unquoted():
    arg = fixture_kb()["inventory"].counter_args[0]
    assert arg.name == "Total Cost of Ownership"
    assert arg.strategy.startswith("Acknowledge the cost of the cash gap")
    assert "The Argument" not in arg.strategy
    assert arg.script.startswith("We recognize the financing burden")
    assert arg.script.endswith("support your business.")  # wrapped lines joined


def test_description_tags_page_numbers_and_footnotes():
    kb = fixture_kb()
    assert kb["inventory"].tags == ("Inventory", "Finished Goods", "Pre-Fund Raw Material", "Warehouse")
    assert kb["inventory"].description.startswith("The supplier is highlighting a liquidity gap")
    assert kb["dso"].tags == ()
    factoring = kb["cost_of_factoring"]
    # The bare "10" page line inside the category is dropped; the glued
    # footnote marker after the closing quote is stripped.
    assert "10" not in factoring.supplier_arg.split()
    assert factoring.supplier_arg.endswith("increases our financing cost.")
    assert "[X]%" in factoring.counter_args[0].script


def test_a_bare_argument_label_and_a_glued_title_are_handled():
    text = (
        "26 Slippery Slope\n"
        "Supplier fears every customer will follow.\n"
        "26.S Supplier Pushback Argument\n"
        "26.S.1 \"If we give you this, everyone will ask.\"\n"
        "26.B Buyer Counter Arguments\n"
        "26.B.1 Policy-Driven Change\n"
        "Explain the change is structural.\n"
        "Argument:\n"
        "\"This is a one-time global transformation.\"\n"
        "26.B.SCF Supply Chain Finance (SCF) Use SCF to keep them paid early while terms stay at [Proposed Term] days\n"
        "The Argument: \"Our SCF program gets you paid early.\"\n"
    )
    [category] = parse_pushback_categories(text)
    first, scf = category.counter_args
    assert first.script == "This is a one-time global transformation."
    assert scf.name == "Supply Chain Finance (SCF)"
    assert scf.strategy.startswith("Use SCF to keep them paid early")
    assert scf.script == "Our SCF program gets you paid early."


def test_body_text_starting_with_a_number_does_not_open_a_category():
    text = (
        "7 Bank Covenant\n"
        "7.S Supplier Pushback Argument\n"
        "7.S.1 \"Our bank limits our receivables.\"\n"
        "7.B Buyer Counter Arguments\n"
        "7.B.1 Interest Rate Offset\n"
        "30 days of extra float is worth more than the covenant headroom.\n"
        "The Argument: \"We can share the benefit.\"\n"
    )
    [category] = parse_pushback_categories(text)
    assert category.key == "bank_covenant"
    assert "30 days of extra float" in category.counter_args[0].strategy


def test_a_reused_name_keeps_its_number():
    block = (
        "{n} Integrity\n{n}.S Supplier Pushback Argument\n{n}.S.1 \"x\"\n"
        "{n}.B Buyer Counter Arguments\n{n}.B.1 T\nThe Argument: \"y\"\n"
    )
    categories = parse_pushback_categories(block.format(n=38) + block.format(n=46))
    assert [c.key for c in categories] == ["integrity_38", "integrity_46"]


def test_category_keys_are_slugs_of_the_names():
    assert category_key("R&D Reinvestment Cycle") == "r_and_d_reinvestment_cycle"
    assert category_key("Tier 2 Supplier Pressure") == "tier_2_supplier_pressure"
    assert category_key("DSO (Days Sales Outstanding)") == "dso"
    assert category_key("Public Sector/Grant Restrictions") == "public_sector_grant_restrictions"


# The first 18 category names of the client's pushback playbook, as the live
# knowledge base holds them (2026-09-24). The objection scan refers to
# categories by key; a key that is not the slug of a real name silently never
# renders.
_CLIENT_CATEGORY_NAMES = (
    "Currency Effect", "Supplier Market Share", "Inflation", "Inventory",
    "Erosion of Margins", "Late Payments", "Bank Covenant", "Cross-Border Fees",
    "Reciprocity Demand", "Tier 2 Supplier Pressure", "Social Responsibility",
    "Operational Risk", "Raw Material Volatility", "Alternative Customer",
    "DSO (Days Sales Outstanding)", "Cost of Factoring",
    "Production Capacity Priority", "R&D Reinvestment Cycle",
)


def test_every_key_the_objection_scan_emits_names_a_client_category():
    every_signal = SimpleNamespace(
        payment_reliability=SimpleNamespace(
            status="behind_terms", actual_payment_days=50, pay_on_terms_term_days=34
        ),
        cost_impact=SimpleNamespace(status="material", cost_impact_percent=3.1),
        financial_sensitivity=SimpleNamespace(level="high"),
        leverage=SimpleNamespace(posture="supplier_favored"),
    )
    emitted: set[str] = set()
    for industry in ("Food Distribution", "Industrial Manufacturing", "Software"):
        facts = dataclasses.replace(
            rich_facts(), current_term_days=30, target_term_days=90, dso=30,
            industry=industry, credit_rating="BB", country_rating="B", is_sme=True,
        )
        emitted |= {o.kb_key for o in scan_likely_objections(facts, every_signal)}
    known = {category_key(name) for name in _CLIENT_CATEGORY_NAMES}
    assert len(emitted) >= 12
    assert emitted <= known, emitted - known
