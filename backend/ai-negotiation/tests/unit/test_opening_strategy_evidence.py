"""Section 1's figures, and where each one is allowed to come from.

The client reviewed a generated opening strategy and rewrote section 1 into a
statement of evidence: the target, the benchmark that set it, the benchmarks
that reinforce it with their occurrence counts, and a market-evidence sentence
naming the supplier — "Adp, Inc is already accepting on average 67 days from
other customers and 79 days from the top 3rd quartile clients".

Two of those figures — the average and the quartile — existed on
`facts.strategy_benchmarks` and reached no opening-strategy prompt at all, so
that sentence could not be written whatever the prompt asked for. The block
under test is what supplies them, and the thing it has to get right is not the
numbers but WHOSE they are: the same three statistics mean "this supplier's own
customers" on one source and "comparable suppliers" on the next.
"""
from __future__ import annotations

import pytest

from domain.services.negotiation_arguments import analyze_supplier
from domain.services.opening_strategy_analysis import analyze_opening_strategy
from domain.services.supplier_facts import extract_supplier_facts
from utils.prompts.opening_strategy_prompt import benchmark_evidence_block


def _facts(strategy: dict | None = None, target: int = 60, current: int = 45):
    return extract_supplier_facts({
        "supplier": {
            "name": "Adp, Inc",
            "country": "United States",
            "mainIndustryName": "Data Processing Services",
        },
        "target": {"targetPaymentTerms": target},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": current,
            "actualPaymentTerms": current,
        },
        "negotiationStrategy": strategy if strategy is not None else {
            "supplierStandard": {"value": 67, "occurrences": 16, "avg": 67, "q3": 79},
            "peerGroupStandard": {
                "value": 60, "applied": True, "occurrences": 40, "avg": 58, "q3": 64,
            },
        },
    })


def _block(facts=None) -> str:
    facts = facts or _facts()
    return benchmark_evidence_block(
        facts, analyze_opening_strategy(facts, analyze_supplier(facts))
    )


# ── The figures the client's section 1 states ──────────────────────────────


def test_every_supporting_benchmark_arrives_with_its_day_figure():
    block = _block()
    assert "- Supplier Standard — 67 days" in block
    assert "- Peer Group Standard — 60 days" in block


def test_the_occurrence_count_is_worded_the_way_the_client_states_it():
    """"n=16" is a payload notation. The client writes it out."""
    block = _block()
    assert "backed by 16 occurrences in the Calculum database" in block
    assert "n=16" not in block


def test_the_market_evidence_sentence_names_the_supplier_for_its_own_standard():
    """Supplier Standard is what THIS supplier accepts from its own customers —
    the one source the sentence may name the supplier in."""
    assert (
        "market evidence: Adp, Inc is already accepting on average 67 days from "
        "its other customers, and 79 days from its top-quartile customers"
    ) in _block()


def test_a_peer_benchmarks_average_is_never_claimed_about_this_supplier():
    """Same three statistics, a different subject. Said about the supplier, the
    peer average is a claim about them that is simply untrue."""
    block = _block()
    assert "comparable suppliers average 58 days, with the top quartile at 64 days" in block
    assert "Adp, Inc is already accepting on average 58" not in block


def test_an_industry_benchmark_is_attributed_to_the_industry():
    facts = _facts({
        "industryRegionStandard": {"value": 61, "occurrences": 119, "avg": 61, "q3": 87},
    })
    assert "the industry and region average 61 days, with the top quartile at 87 days" in _block(facts)


def test_industry_value_only_still_states_the_average():
    # Real Calculum payloads: industryRegionStandard is {value, applied} only.
    facts = _facts({"industryRegionStandard": {"value": 95, "applied": True}})
    assert "the industry and region average 95 days" in _block(facts)
    assert "top quartile" not in _block(facts)


def test_a_source_with_no_statistics_states_none():
    facts = _facts({"parentOrSupplierMax": {"value": 76}})
    block = _block(facts)
    assert "- Parent / Supplier Max — 76 days" in block
    assert "market evidence" not in block
    assert "occurrences" not in block


def test_a_missing_quartile_drops_only_the_quartile_clause():
    facts = _facts({"supplierStandard": {"value": 67, "occurrences": 16, "avg": 67}})
    block = _block(facts)
    assert "on average 67 days from its other customers" in block
    assert "top-quartile" not in block


def test_day_figures_are_written_as_days_not_floats():
    facts = _facts({"peerGroupStandard": {"value": 60.0, "avg": 58.0, "q3": 64.0}})
    block = _block(facts)
    assert "60 days" in block and "60.0" not in block
    assert "average 58 days" in block and "58.0" not in block


# ── Which benchmark section 1 leads with ───────────────────────────────────


def test_the_applied_benchmark_is_marked_as_the_one_to_lead_with():
    """The target was derived from it, which is why it leads even though the
    client's SOURCE order puts Supplier Standard above Peer Group Standard."""
    block = _block()
    lead = [line for line in block.splitlines() if "[APPLIED" in line]
    assert len(lead) == 1
    assert lead[0].startswith("- Peer Group Standard — 60 days")


def test_the_block_states_that_it_does_not_re_rank_the_arguments():
    """Two blocks listing the same arguments under two different rankings is a
    bug this brief has had before."""
    block = _block()
    assert "never re-ranks" in block
    assert "SOURCE order" in block


def test_the_list_is_in_source_order_whatever_the_day_figures_are():
    block = _block()
    names = [line for line in block.splitlines() if line.startswith("- ")]
    assert names[0].startswith("- Supplier Standard")
    assert names[1].startswith("- Peer Group Standard")


def test_no_applied_benchmark_says_so_rather_than_leaving_it_open():
    facts = _facts({"supplierStandard": {"value": 67, "occurrences": 16, "avg": 67}})
    block = _block(facts)
    assert "[APPLIED" not in block
    assert "No benchmark is marked APPLIED" in block


# ── What section 3 may not carry ───────────────────────────────────────────


def test_the_block_says_the_sayable_section_takes_no_sample_sizes():
    block = _block()
    assert "Section 3 is said to the supplier" in block
    assert "never a sample size, an occurrence count or a quartile" in block


# ── Nothing to say means no block ──────────────────────────────────────────


@pytest.mark.parametrize(
    "strategy",
    [
        {},
        # Below the current term: not an argument, so not evidence either.
        {"industryRegionStandard": {"value": 30, "occurrences": 9, "avg": 30}},
    ],
)
def test_no_supporting_benchmark_means_no_block_at_all(strategy):
    """An empty heading is an invitation to fill it."""
    assert _block(_facts(strategy)) == ""
