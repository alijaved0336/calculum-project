from __future__ import annotations

import asyncio
import json

import pytest

from agents.graph import build_negotiation_graph
from agents.nodes.summarize import make_summarize_node
from domain.entities.context import SupplierContext
from domain.entities.intent import Intent, IntentClassification
from domain.services.brief_builder import brief_from
from domain.services.supplier_facts import extract_supplier_facts
from infrastructure.intent.llm_intent_classifier import LLMIntentClassifier
from tests.unit.prompt_fixtures import client_sample_facts, sparse_facts
from utils.prompts.supplier_summary import render_supplier_summary
from utils.prompts.summary_money import summary_money


class NoLLM:
    async def complete(self, *args, **kwargs):
        raise AssertionError("Summary tiers must not generate or edit facts")


def state(tier="large", **changes):
    # Target 75 over a 45-day current term → BATNA 60 (75 − 15, clear of 45 + 5).
    facts = client_sample_facts(
        target_term_days=75, opportunity_term_days=None,
        description="Acme supplies industrial components. It serves manufacturers worldwide.",
        address="Berlin, Germany", website="https://example.test", ownership="Public",
        stock_ticker="ACME", entity_type="Corporation",
    )
    brief = brief_from(facts)
    return {"message": "q", "summary_scope": "summary", "summary_tier": tier,
            "context": SupplierContext(supplier_id="s", facts=facts), "brief": brief, **changes}


def test_small_key_facts_show_terms_and_batna_but_not_contact_or_corporate_details():
    result = asyncio.run(make_summarize_node(NoLLM())(state("small")))
    card = result["summary_card"]
    assert card is not None
    assert card["current_term_days"] == 45 and card["target_term_days"] == 75
    assert card["batna_days"] == 60
    assert card["spend_volume"] == 908_000
    assert "industrial components" in (card.get("description") or "")
    # Small card keeps the bar + key facts; large-only fields stay empty.
    assert card["standards"] == []
    assert card["cash_flow_opportunity"] is None
    assert card["probability_of_success"] is None
    assert card["regulatory_cap_days"] is None
    # Financing rate is a card tile, not a body bullet.
    text = result["response"]
    assert "Supplier Financing Rate" not in text
    assert card["supplier_financing_rate"] == 0.0423
    assert "Supplier Company Size" not in text
    assert "buyer leverage" not in text
    for forbidden in ("Overview", "Payment Terms", "Arguments Supporting",
                      "BATNA (Best Alternative", "Address", "Berlin", "Website"):
        assert forbidden not in text
    # Priority may appear in Data Inputs source, but not as a body bullet.
    assert "- **Priority**" not in text
    assert result["source"]["BATNA (days)"]["value"] == 60
    # Nine-box → Priority in Data Inputs (Carlos, 2026-09-15).
    assert result["source"]["Nine-Box Position"]["value"] == 1
    assert result["source"]["Priority"]["value"] == "high"
    assert "nine-box 1" in result["source"]["Priority"]["path"]


def test_small_key_facts_omit_batna_when_there_is_none():
    facts = client_sample_facts(target_term_days=30, current_term_days=15, opportunity_term_days=None)
    brief = brief_from(facts)
    assert brief.batna_floor is None
    result = asyncio.run(make_summarize_node(NoLLM())(state(
        "small",
        brief=brief,
        context=SupplierContext(supplier_id="s", facts=facts),
    )))
    assert result["summary_card"]["batna_days"] is None
    assert "BATNA" not in result["response"]


@pytest.mark.parametrize("requested", [None, "", "medium", "full"])
def test_medium_is_gone_and_anything_but_small_renders_large(requested):
    result = asyncio.run(make_summarize_node(NoLLM())(state(requested)))
    assert result["summary_tier"] == "large"
    assert result["response"] == render_supplier_summary(state()["brief"], "large")
    assert result["summary_card"] is not None


def test_large_card_matches_resolved_terms_and_payload_only_keys():
    card = asyncio.run(make_summarize_node(NoLLM())(state()))["summary_card"]
    assert card["current_term_days"] == 45 and card["target_term_days"] == 75
    assert card["batna_days"] == 60
    for key in ("supplier_leverage", "invoice_impact_percent", "spend_currency",
                "cash_flow_currency", "transaction_currencies"):
        assert key not in card
    # Carlos, 2026-09-17: priority is an intentional key-fact field.
    assert card.get("priority")


def test_large_has_supporting_benchmarks_on_card_and_concise_body():
    result = asyncio.run(make_summarize_node(NoLLM())(state("large")))
    text = result["response"]
    assert "Arguments Supporting Term Extension" in text
    assert "Supplier Financing Rate" not in text
    assert "Supplier Company Size" not in text
    assert "- **Priority**" not in text
    assert "Supplier Standard" in text and "67 days" in text
    for forbidden in ("Overview", "Payment Terms",
                      "BATNA (Best Alternative", "Probability of Success"):
        assert forbidden not in text
    card = result["summary_card"]
    assert card["batna_days"] == 60
    assert any(s["label"] == "Supplier Standard" and s["days"] == 67 for s in card["standards"])
    assert not any(s["label"] == "Industry Region" for s in card["standards"])


@pytest.mark.parametrize("tier", ["small", "large"])
def test_absent_fields_are_left_out_never_placeholdered(tier):
    facts = sparse_facts(target_cash_flow=None, buyer_leverage_level=None, credit_rating=None,
                         company_size=None, is_sme=False)
    text = render_supplier_summary(brief_from(facts), tier)
    for placeholder in ("not provided", "none", "unknown", "not assessed", "on file", "currency"):
        assert placeholder not in text.lower(), placeholder
    assert "USD" not in text
    # Every rendered row carries a value.
    for line in text.splitlines():
        assert not line.rstrip().endswith(":**"), line


@pytest.mark.parametrize("tier", ["small", "large"])
def test_description_lives_on_the_card_not_in_the_body(tier):
    description = state()["brief"].facts.description
    result = asyncio.run(make_summarize_node(NoLLM())(state(tier)))
    assert result["summary_card"]["description"] == description
    assert description not in result["response"]
    assert result["response"].count("industrial components") == 0


@pytest.mark.parametrize("tier", ["small", "large"])
def test_description_is_read_from_the_payload(tier):
    from utils.prompts.supplier_summary import collect_summary_sources
    facts = extract_supplier_facts({"supplier": {"name": "Acme", "description": "Makes parts for trucks."}})
    brief = brief_from(facts)
    from utils.prompts.supplier_summary import build_summary_card
    assert build_summary_card(brief, tier)["description"] == "Makes parts for trucks."
    assert collect_summary_sources(brief, tier)["Description"] == {
        "path": "supplier.description", "value": "Makes parts for trucks.",
    }


@pytest.mark.parametrize("tier", ["small", "large"])
@pytest.mark.parametrize("description", [None, "", "   \n"])
def test_every_tier_silently_skips_a_missing_description(tier, description):
    from utils.prompts.supplier_summary import build_summary_card
    brief = brief_from(client_sample_facts(description=description))
    assert build_summary_card(brief, tier)["description"] is None
    text = render_supplier_summary(brief, tier)
    for filler in ("description", "operates in", "not provided", "Overview"):
        assert filler not in text.lower()


def test_description_is_bounded_and_cannot_inject_markdown():
    from utils.prompts.supplier_summary import build_summary_card
    long = "**Bold** first sentence.\nSecond sentence here. Third sentence dropped. " + "word " * 80
    for tier in ("small", "large"):
        lead = build_summary_card(brief_from(client_sample_facts(description=long)), tier)["description"]
        assert lead == "Bold first sentence. Second sentence here."
    one_run_on = "word " * 80
    lead = build_summary_card(brief_from(client_sample_facts(description=one_run_on)), "large")["description"]
    assert len(lead.split()) == 60 and lead.endswith("…")


@pytest.mark.parametrize("tier", ["small", "large"])
def test_rows_come_only_from_payload_labels(tier):
    """Fields the supplier payload does not carry are never rendered."""
    text = render_supplier_summary(state()["brief"], tier)
    for label in ("Parent company", "Commodity", "Business designations", "Invoice impact",
                  "Entity / ownership / ticker", "Industry / credit"):
        assert label not in text


def test_profile_extraction_reads_only_original_payload_fields():
    facts = extract_supplier_facts({
        "supplier": {"name": "Acme", "description": "Makes parts.", "address": "Berlin",
                     "parentName": "Parent", "currency": "GBP", "url": "example.test",
                     "ownership": "Private", "stockTicker": "ACME", "entityType": "Ltd"},
        "spend": {"commodities": ["Parts"], "transactionCurrencies": ["GBP"]},
    })
    assert facts.description == "Makes parts." and facts.website == "example.test"
    assert facts.source_paths["stock_ticker"] == "supplier.stockTicker"
    for name in ("parent_name", "commodities", "spend_currency", "cash_flow_currency",
                 "transaction_currencies"):
        assert not hasattr(facts, name)


@pytest.mark.parametrize("value,expected", [(56_300_000, "$56.3M"), (908_000, "$908K"), (0, "$0"), (941.73, "$941.73")])
def test_compact_money_uses_dollar_marker(value, expected):
    assert summary_money(value) == expected


@pytest.mark.parametrize("tier", ["small", "large"])
def test_classifier_parses_tiers_and_salvages_them_from_bad_json(tier):
    classifier = LLMIntentClassifier(NoLLM())
    for raw in (
        json.dumps({"intent": Intent.SUMMARIZE_SUPPLIER_POSITION.value, "summary_tier": tier}),
        '{"intent":"summarize_supplier_position","summary_scope":"narrow",'
        f'"summary_tier":"{tier}","reasoning":"bad "quote""}}',
    ):
        result = classifier._parse(raw)
        assert result.summary_tier == tier
        if "bad" in raw:
            assert result.summary_scope == "narrow"


@pytest.mark.parametrize("value", [None, "", "full", 3, "medium", "MEDIUM", "large"])
def test_anything_but_small_classifies_as_large(value):
    assert LLMIntentClassifier._coerce_summary_tier(value) == "large"
    assert LLMIntentClassifier._coerce_summary_tier(" Small ") == "small"


@pytest.mark.asyncio
@pytest.mark.parametrize("tier", ["small", "large"])
async def test_graph_carries_classified_tier_without_retrieval(tier):
    class Classifier:
        async def classify(self, *args, **kwargs):
            return IntentClassification(intent=Intent.SUMMARIZE_SUPPLIER_POSITION,
                                        confidence=.95, summary_tier=tier)
    graph = build_negotiation_graph(Classifier(), NoLLM(), None)
    initial = state()
    initial.pop("summary_tier")
    result = await graph.ainvoke(initial)
    assert result["summary_tier"] == tier
    assert result["response"] == render_supplier_summary(initial["brief"], tier)


def test_large_reflects_override_and_applied_cap():
    brief = brief_from(client_sample_facts(target_term_days=75, opportunity_term_days=None,
                                         batna_override_days=60, regulatory_applied=True,
                                         regulatory_max_term_days=75))
    result = asyncio.run(make_summarize_node(NoLLM())(state(brief=brief)))
    assert result["summary_card"]["batna_days"] == 60
    assert result["summary_card"]["target_term_days"] == 75
    assert result["summary_card"]["regulatory_cap_days"] == 75
    assert "BATNA (Best Alternative" not in result["response"]


def test_narrow_ignores_large_tier_and_has_no_card():
    class LLM:
        async def complete(self, prompt, **kwargs):
            assert "## FACTS" in prompt
            return "Our buyer leverage is low."
    result = asyncio.run(make_summarize_node(LLM())(state("large", summary_scope="narrow")))
    assert result["response"] == "Our buyer leverage is low."
    assert result["summary_card"] is None


def test_narrow_prompt_keeps_the_question_verbatim():
    from utils.prompts.summarize_prompt import build_summarize_narrow_prompt
    brief = state()["brief"]
    prompt = build_summarize_narrow_prompt("Why is the UI showing $908K?", brief.facts, brief=brief)
    assert "Why is the UI showing $908K?" in prompt
    assert "EUR" not in prompt.split("Why is the UI showing $908K?", 1)[1]
