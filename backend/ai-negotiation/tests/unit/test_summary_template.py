"""The supplier-position summary is a fixed template, rendered in code.

The client marked the old summary up line by line (2026-09): kept Overview,
Probability of Success with its three signals, Arguments Supporting Term
Extension and BATNA; struck Falls short, No data on, Stakes, Read, the country
rating and every internal note. These tests pin that shape — and pin that it
comes out of `render_summary_skeleton` identically every time, with no model
in the loop.
"""
from __future__ import annotations

import asyncio
from typing import Any

import pytest

from agents.nodes.summarize import make_summarize_node
from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.services.brief_builder import brief_from
from domain.services.negotiation_arguments import benchmark_detail
from tests.unit.prompt_fixtures import client_sample_facts, rich_facts, sparse_facts
from utils.prompts.summarize_prompt import (
    BRIEFING_HEADING,
    build_summarize_prompt,
    collect_summarize_sources,
    summarize_system_prompt,
)
from utils.prompts.summary_template import (
    BANNED_PHRASES,
    LABEL_ARGUMENTS,
    LABEL_BATNA,
    country_flag,
    missing_summary_labels,
    render_summary_skeleton,
    summary_draft_problems,
)


_client_facts = client_sample_facts


# ── The client's sample, line by line ──────────────────────────────────────


@pytest.fixture
def client_summary() -> str:
    return render_summary_skeleton(brief_from(_client_facts()))


def test_overview_line_matches_the_client_sample(client_summary):
    assert "**Overview**" in client_summary
    assert (
        "**Supplier**: Adp, Inc 🇺🇸, **Industry**: Data Processing, Hosting, and "
        "Related Services, **Credit Rating**: AA" in client_summary
    )
    # The country rating and the company size were struck from this line.
    assert "AA+" not in client_summary
    assert "Company Size:** Large" not in client_summary.split("Probability")[0]


def test_payment_terms_line_carries_current_and_target_without_batna(client_summary):
    # Target 60 → BATNA 45; 45 < 45 + 5 → No BATNA, so the payment line omits it.
    assert "**Payment Terms**:" in client_summary
    assert "Current: **45 days**" in client_summary
    assert "Target: **60 days**" in client_summary
    assert "→ **Target**" not in client_summary
    assert "BATNA:" not in client_summary.split("\n\n")[0]


def test_money_line_is_compact_with_dollar_marker(client_summary):
    assert "**Spend Volume**: **$908K** → **Cash Flow Opportunity**: **$37K**" in client_summary
    assert "USD" not in client_summary


def test_probability_block_has_the_three_signals(client_summary):
    assert "**Probability of Success**: High" in client_summary
    assert "• **Buyer Leverage**: Low" in client_summary
    assert (
        "• **Supplier Company Size**: Large (supplier financing rate: **4.23%**)."
        in client_summary
    )
    assert "• **Priority**: High priority (**$908K** spend), but limited buyer leverage." in client_summary


def test_supplier_standard_argument_uses_the_approved_sentence(client_summary):
    assert (
        "- **Supplier Standard**: **67 days** → Represents payment terms the supplier "
        "accepts on average across its customer base and 75 days by top 3rd-quartile "
        "clients (n=16 occurrences in Calculum's database)." in client_summary
    )


def test_below_current_benchmarks_are_not_listed(client_summary):
    """Industry Region Standard at 40 days sits below the 45-day current term — the
    client struck it, and it is the supplier's evidence, never ours."""
    assert "Industry Region Standard" not in client_summary
    assert "40 days" not in client_summary


def test_batna_section_is_left_out_when_there_is_no_batna(client_summary):
    # Target 60 → 45; 45 < 45 + 5 → No BATNA. The summary shows nothing in its
    # place: no section heading, no "No BATNA" line.
    assert LABEL_BATNA not in client_summary
    assert "BATNA" not in client_summary


def test_batna_section_states_only_the_floor():
    # Target 75 → 60; 60 >= 45 + 5 → BATNA 60.
    brief = brief_from(_client_facts(target_term_days=75, opportunity_term_days=None))
    assert brief.batna_floor == 60
    text = render_summary_skeleton(brief)
    assert f"**{LABEL_BATNA}**" in text
    assert "• BATNA is **60 days**" in text
    assert "25%" not in text and "target − 15" not in text


def test_the_struck_sections_never_render(client_summary):
    for phrase in BANNED_PHRASES:
        assert phrase.lower() not in client_summary.lower(), phrase


def test_rendering_is_deterministic():
    brief = brief_from(_client_facts())
    assert render_summary_skeleton(brief) == render_summary_skeleton(brief)


# ── Every data state ───────────────────────────────────────────────────────


def test_no_supporting_benchmark_leaves_the_section_out():
    text = render_summary_skeleton(brief_from(sparse_facts()))
    assert LABEL_ARGUMENTS not in text
    assert "No benchmark" not in text and "stretch ask" not in text


def test_missing_probability_and_leverage_are_left_out_not_placeholdered():
    text = render_summary_skeleton(brief_from(sparse_facts()))
    assert "Probability of Success" not in text
    assert "Not provided" not in text
    # sparse has buyer_leverage_level="low"; drop it and the line goes too.
    text = render_summary_skeleton(brief_from(sparse_facts(buyer_leverage_level=None)))
    assert "Buyer Leverage" not in text
    assert "Not provided" not in text


def test_missing_financing_rate_is_not_mentioned_on_the_size_line():
    text = render_summary_skeleton(brief_from(sparse_facts()))
    assert "unknown" not in text and "on file" not in text


def test_missing_company_size_leaves_the_size_line_out():
    text = render_summary_skeleton(brief_from(sparse_facts(company_size=None)))
    assert "Company Size" not in text
    assert "not provided" not in text.lower()


def test_floor_below_contractual_plus_five_is_no_batna():
    # 55 − 15 = 40; 40 < 50 + 5 → No BATNA, and the section is left out.
    facts = _client_facts(target_term_days=55, current_term_days=50, opportunity_term_days=None)
    brief = brief_from(facts)
    assert brief.batna_floor is None
    text = render_summary_skeleton(brief)
    assert LABEL_BATNA not in text
    assert "No BATNA" not in text


def test_no_floor_when_batna_is_too_close_to_contractual():
    facts = _client_facts(target_term_days=30, current_term_days=15, opportunity_term_days=None)
    brief = brief_from(facts)
    assert brief.batna_floor is None
    text = render_summary_skeleton(brief)
    assert LABEL_BATNA not in text
    assert "BATNA" not in text


def test_regulatory_cap_applied_is_shown():
    facts = _client_facts(regulatory_max_term_days=60, regulatory_applied=True, regulatory_enforced=True)
    text = render_summary_skeleton(brief_from(facts))
    assert "**Regulatory Cap**: 60 days (enforced by law) - the target is capped to this limit." in text


def test_stretch_target_with_some_support_is_flagged():
    """rich: benchmarks above the 34-day current term, but the ask is 76 and
    the peer group only reaches 60 — say so, without a 'Falls short' list."""
    facts = rich_facts(strategy_benchmarks=[
        StrategyBenchmark(name="peerGroupStandard", label="peer", value=60,
                          occurrences=14, avg=58.0, q3=64.0),
    ])
    text = render_summary_skeleton(brief_from(facts))
    assert "**Peer Group Standard**: **60 days** →" in text
    assert "top 3rd-quartile clients accept 64 days (n=14 occurrences" in text
    assert "None of these reaches the 76-day target" in text


def test_no_supplier_loaded_renders_nothing():
    assert render_summary_skeleton(None) == ""


def test_country_flag_accepts_iso_and_names():
    assert country_flag("US") == "🇺🇸"
    assert country_flag("Netherlands") == "🇳🇱"
    assert country_flag("nowhere") == ""
    assert country_flag(None) == ""


def test_benchmark_detail_carries_the_statistics():
    b = StrategyBenchmark(name="supplierStandard", label="s", value=67, occurrences=16, avg=65.0, q3=75.0)
    assert benchmark_detail(b) == "67 days (avg 65, top quartile 75, n=16)"
    assert benchmark_detail(StrategyBenchmark(name="x", label="x", value=40)) == "40 days"


# ── The validator ──────────────────────────────────────────────────────────


def test_a_faithful_draft_passes(client_summary):
    assert summary_draft_problems(client_summary, client_summary) == []
    lead = "Our leverage is low, but the ask is likely to land.\n\n" + client_summary
    assert summary_draft_problems(lead, client_summary) == []


def test_unbolded_labels_still_count(client_summary):
    assert summary_draft_problems(client_summary.replace("**", ""), client_summary) == []


def test_a_dropped_label_is_reported(client_summary):
    draft = client_summary.replace("**Buyer Leverage**: Low", "")
    assert missing_summary_labels(draft, client_summary) == ["Buyer Leverage"]
    assert any("Buyer Leverage" in p for p in summary_draft_problems(draft, client_summary))


def test_a_changed_or_added_figure_is_reported(client_summary):
    draft = client_summary.replace("60 days", "65 days").replace("60-day", "65-day")
    problems = summary_draft_problems(draft, client_summary)
    assert any("'60 days' from the briefing is missing" in p for p in problems)
    assert any("'65 days' is not in the briefing" in p for p in problems)


def test_a_struck_section_coming_back_is_reported(client_summary):
    draft = client_summary + "\n\n**No data on**: Peer Group Standard"
    assert any("No data on" in p for p in summary_draft_problems(draft, client_summary))


def test_an_empty_draft_is_reported(client_summary):
    assert summary_draft_problems("", client_summary) == ["The draft is empty."]


# ── The prompt ─────────────────────────────────────────────────────────────


def test_prompt_carries_the_briefing_and_nothing_of_the_old_blocks():
    facts = _client_facts()
    prompt = build_summarize_prompt("Summarize supplier position", facts, brief=brief_from(facts))
    assert BRIEFING_HEADING in prompt
    assert "**Overview**" in prompt
    for old in ("## FACTS", "## NEGOTIATION ARGUMENTS", "## ANALYSIS", "USE TO JUSTIFY THE ASK"):
        assert old not in prompt


def test_system_prompt_forbids_rebuilding_the_shape():
    assert "The briefing is ALREADY WRITTEN" in summarize_system_prompt
    assert "Never add a figure" in summarize_system_prompt
    assert "LEAD LINE" in summarize_system_prompt


def test_sources_attribute_only_what_the_summary_renders():
    brief = brief_from(_client_facts())
    sources = collect_summarize_sources(brief)
    labels = set(sources)
    assert any("Supplier" in label or "Name" in label for label in labels)
    assert not any("Country Rating" in label for label in labels)
    text = render_summary_skeleton(brief)
    for label, entry in sources.items():
        value = entry["value"]
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            forms = {str(value), str(int(value)) if float(value).is_integer() else "", f"{value * 100:.2f}%"}
            assert any(f and f in text for f in forms) or "$" in text, label


# ── The node ───────────────────────────────────────────────────────────────


class _FakeLLM:
    def __init__(self, outputs: list[str]) -> None:
        self.outputs = list(outputs)
        self.calls: list[dict[str, Any]] = []

    async def complete(self, prompt: str, **kwargs) -> str:
        self.calls.append({"prompt": prompt, **kwargs})
        return self.outputs.pop(0)


def _state(**kw) -> dict[str, Any]:
    brief = brief_from(_client_facts())
    return {
        "message": "Summarize supplier position",
        "context": type("Ctx", (), {"facts": brief.facts, "raw": {}})(),
        "brief": brief,
        "summary_tier": "large",
        **kw,
    }


def test_large_node_returns_the_concise_companion_without_model_edits(client_summary):
    from utils.prompts.supplier_summary import render_supplier_summary
    llm = _FakeLLM(["An invented rating and 99 days."])
    result = asyncio.run(make_summarize_node(llm)(_state()))
    assert llm.calls == []
    assert result["response"] == render_supplier_summary(result["brief"] if "brief" in result else _state()["brief"], "large")
    # Companion keeps size / relationship; card owns overview / BATNA.
    assert "Supplier Company Size" in result["response"]
    assert "Priority" in result["response"]
    assert "Overview" not in result["response"]
    assert "BATNA (Best Alternative" not in result["response"]
    assert result["source"]
    # Target 60 over a 45-day current term → No BATNA (45 < 45 + 5).
    assert result["summary_card"]["batna_days"] is None
    assert "errors" not in result


def test_large_tier_is_independent_of_generic_response_length(client_summary):
    from utils.prompts.supplier_summary import render_supplier_summary
    llm = _FakeLLM([])
    state = _state(response_mode="quick")
    result = asyncio.run(make_summarize_node(llm)(state))
    assert result["response"] == render_supplier_summary(state["brief"], "large")
    assert llm.calls == []
