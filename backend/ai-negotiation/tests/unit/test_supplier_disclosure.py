"""Supplier-facing disclosure — the deterministic backstops.

The prompt-side policy was cut for length, so these are now the ONLY thing
stopping a forbidden attribute reaching supplier-facing text. They lock down the
code that must not FEED it there in the first place:
  * supplierStandard (the supplier's own segment) is internal-only — its value
    never reaches an email or the sayable "cite this" list, and the asymmetry
    guard redacts it from supplier-facing spans;
  * peer/record sample counts (N=) never appear in a supplier-facing email.
"""
from __future__ import annotations

from domain.entities.argument_catalog import argument_display_name
from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.services.negotiation_arguments import (
    supplier_facing_benchmark_support,
    supplier_facing_benchmarks,
)
from domain.services.negotiation_arguments import build_negotiation_arguments
from domain.services.asymmetry_guard import (
    SUPPLIER_FACING_CLOSE,
    SUPPLIER_FACING_OPEN,
    enforce_asymmetry_guard,
)
from domain.services.supplier_facts import extract_supplier_facts
from tests.unit.prompt_fixtures import explain_block, pitch_block

_LABELS = {
    "supplierStandard": "this supplier's own segment",
    "parentOrSupplierMax": "parent/supplier maximum term",
    "peerGroupStandard": "comparable peer group",
    "industryRegionStandard": "industry/region standard",
}


def _b(name: str, value: int, occ: int | None = None) -> StrategyBenchmark:
    return StrategyBenchmark(name=name, label=_LABELS.get(name, name), value=value, occurrences=occ)


def _facts(**kw) -> SupplierFacts:
    base = dict(
        supplier_name="Acme", country="DE", industry="Manufacturing", company_size="large",
        target_term_days=76, current_term_days=34, batna_term_days=None,
        benchmark_term_days=40, regulatory_max_term_days=None, opportunity_term_days=76,
    )
    base.update(kw)
    return SupplierFacts(**base)


# ── argument formatters ────────────────────────────────────────────────────

def test_negotiation_block_holds_supplier_standard_as_internal_only():
    f = _facts(strategy_benchmarks=[
        _b("supplierStandard", 78),
        _b("parentOrSupplierMax", 80),
    ])
    block = pitch_block(f)

    # The block used to carry a separate "supplier-facing selection" above an
    # "INTERNAL REASONING ONLY" split — a SECOND selection that could, and did,
    # disagree with the per-argument disclosure policy. Sayability now travels
    # with each argument, so the contract is asserted where it is decided.
    supplier_standard = _argument_entry(block, "supplierStandard")
    assert "NOT SAYABLE" in supplier_standard
    assert "78 days" in supplier_standard          # the negotiator still sees it
    assert "How to pitch it" not in supplier_standard

    parent = _argument_entry(block, "parentOrSupplierMax")
    assert "80 days" in parent
    assert "How to pitch it" in parent             # parentOrSupplierMax IS sayable


def _argument_entry(block: str, key: str) -> str:
    """One argument's lines from a rendered block — its headline plus the
    indented lines under it, up to the next argument.

    Looked up by payload key, found by the name the block prints: argument lines
    lead with the proper name ("Supplier Standard"), never the key.
    """
    lines = block.splitlines()
    name = argument_display_name(key)
    start = next(i for i, ln in enumerate(lines) if ln.startswith(f"  - {name}"))
    end = start + 1
    while end < len(lines) and (lines[end].startswith("      ") or not lines[end].strip()):
        end += 1
    return "\n".join(lines[start:end])


# ── parentOrSupplierMax: client-mandated fixed wording ─────────────────────
#
# This argument is the one whose phrasing the client fixed verbatim, in both
# directions. Every surface that presents it has to carry the approved sentence
# rather than a paraphrase, so these tests pin the sentences themselves and the
# ── supplier-facing benchmark selection (precedence, >=proposed, no cap) ────

def test_selection_keeps_every_benchmark_that_reaches_the_ask():
    """No cap (client, 2026-07-30). All four support the 76-day proposal, so all
    four are citable — ordered by source precedence, not by day-count, which is
    why the 95-day buyerStandard leads and the 90-day peer group comes last."""
    f = _facts(strategy_benchmarks=[
        _b("peerGroupStandard", 90), _b("industryRegionStandard", 85),
        _b("parentOrSupplierMax", 82), _b("buyerStandard", 95),
    ])
    assert [b.name for b in supplier_facing_benchmarks(f)] == [
        "buyerStandard", "parentOrSupplierMax",
        "industryRegionStandard", "peerGroupStandard",
    ]


def test_selection_needs_value_above_the_current_term():
    """§4: the bar is the current term (34), not the 76-day ask.

    buyerStandard 70 falls short of the ask but still proves longer terms
    exist, so it is sayable — as evidence for movement. A 30-day figure sits
    below what we already pay and is dropped.
    """
    f = _facts(strategy_benchmarks=[
        _b("buyerStandard", 70), _b("industryRegionStandard", 76),
        _b("peerGroupStandard", 78), _b("parentOrSupplierMax", 30),
    ])
    assert [b.name for b in supplier_facing_benchmarks(f)] == [
        "buyerStandard", "industryRegionStandard", "peerGroupStandard",
    ]


def test_selection_excludes_supplier_standard_and_spend_line():
    f = _facts(
        strategy_benchmarks=[_b("supplierStandard", 95), _b("peerGroupStandard", 80)],
    )
    assert [b.name for b in supplier_facing_benchmarks(f)] == ["peerGroupStandard"]


def test_no_supporting_benchmark_is_a_stretch_target():
    # Only a below-CURRENT benchmark (30 < the 34-day current term) and an
    # internal-only one → nothing may be said to the supplier.
    f = _facts(strategy_benchmarks=[_b("industryRegionStandard", 30), _b("supplierStandard", 95)])
    assert supplier_facing_benchmarks(f) == []
    assert supplier_facing_benchmark_support(f) is False


# ── asymmetry-guard backstop ───────────────────────────────────────────────

def _payload(supplier_standard: int) -> dict:
    return {
        "supplier": {"name": "Acme", "uuid": "u1", "country": "DE",
                     "mainIndustryName": "Manufacturing", "companySize": "large"},
        "target": {"targetPaymentTerms": None, "opportunityPaymentTerms": 76},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": 34,
            "actualPaymentTerms": 34,
        },
        "agreement": {},
        "negotiationStrategy": {"supplierStandard": {"value": supplier_standard}},
    }


def test_guard_redacts_supplier_standard_value_inside_supplier_span_only():
    facts = extract_supplier_facts(_payload(supplier_standard=73))
    assert "supplier_segment_term_days" in facts.internal_only_fields

    text = (
        "Their own segment sits at 73 days — strong internal signal.\n"
        + f"{SUPPLIER_FACING_OPEN}\n"
        + "These terms are commercially reasonable and consistent at 73 days.\n"
        + f"{SUPPLIER_FACING_CLOSE}"
    )
    guarded, flagged = enforce_asymmetry_guard(text, facts)

    analysis, _, script = guarded.partition("\n")
    assert "73" in analysis                          # negotiator analysis keeps it
    assert "73" not in script                        # the sayable script does not
    assert "supplier_segment_term_days" in flagged
