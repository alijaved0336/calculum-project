"""Shared supplier fixtures and a one-call renderer for EVERY intent's prompt.

The prompt layer is being consolidated onto a single brief renderer. What makes
that safe is being able to render every intent from one fixture and assert on
the result, so a block that silently stops reaching an intent fails a test
instead of quietly degrading an answer months later.

Two suppliers, chosen so that between them every bucket and every gate is
exercised:

  * :func:`rich_facts` — every argument bucket non-empty (full support, reserve,
    non-support, unavailable), a spend line with an alias, and all four
    assessments usable. This is the fixture for "does the block carry it".
  * :func:`sparse_facts` — nothing reaches the ask, most sources absent. This is
    the fixture for "does the block say so plainly" — the stretch-target and
    no-data paths, which are the ones that go wrong quietly.
"""
from __future__ import annotations

from typing import Any

from domain.entities.counter_offer import CounterOfferExtraction
from domain.entities.facts import StrategyBenchmark, SupplierFacts
from domain.services.counter_offer_calculator import analyze_counter_offer
from domain.entities.brief import NegotiationBrief
from domain.services.brief_builder import brief_from
from domain.services.opening_strategy_analysis import analyze_opening_strategy
from domain.services.scf_analysis import analyze_scf_viability

# Payload paths for the fixture facts. Real facts carry these from
# `extract_supplier_facts`; the source-attribution collectors skip any field
# missing from the map, so the fixtures provide them or `collect_*_sources`
# silently returns nothing and the sync tests pass vacuously.
_SOURCE_PATHS: dict[str, str] = {
    "target_term_days": "target.targetPaymentTerms",
    "current_term_days": "spend.actualPaymentTerms",
    "batna_term_days": "negotiationStrategy.parentOrSupplierMax.value",
    "benchmark_term_days": "negotiationStrategy.industryRegionStandard.value",
    "opportunity_term_days": "target.opportunityPaymentTerms",
    "regulatory_max_term_days": "negotiationStrategy.regulatoryTerm.value",
    "regulatory_limit_type": "negotiationStrategy.regulatoryTerm.limitType",
    "pay_on_terms_term_days": "negotiationStrategy.payOnTerms.value",
    "buyer_standard_term_days": "negotiationStrategy.buyerStandard.value",
    "buyer_standard_description": "negotiationStrategy.buyerStandard.description",
    "supplier_segment_term_days": "negotiationStrategy.supplierStandard.value",
    "supplier_segment_avg_term_days": "negotiationStrategy.supplierStandard.avg",
    "supplier_segment_q3_term_days": "negotiationStrategy.supplierStandard.q3",
    "supplier_segment_occurrences": "negotiationStrategy.supplierStandard.occurrences",
    "peer_group_term_days": "negotiationStrategy.peerGroupStandard.value",
    "peer_group_avg_term_days": "negotiationStrategy.peerGroupStandard.avg",
    "peer_group_q3_term_days": "negotiationStrategy.peerGroupStandard.q3",
    "peer_group_occurrences": "negotiationStrategy.peerGroupStandard.occurrences",
    "buyer_leverage_level": "supplier.buyerLeverage",
    "success_probability": "target.successProbability",
    "credit_rating": "supplier.creditRating",
    "country_rating": "supplier.countryRating",
    "dso": "supplier.dso",
    "spend_volume": "spend.volume",
    "target_cash_flow": "target.cashFlow",
    "nine_box_term_extension": "supplier.nineBoxTermExtension",
    "supplier_financing_rate": "supplier.financingRate",
    "cost_of_debt_spread": "supplier.costOfDebtSpread",
    "wacc_pre_tax": "supplier.waccPreTax",
    "wacc_after_tax": "supplier.waccAfterTax",
    "scf_rate": "supplier.scfRate",
}


def _facts(**kw: Any) -> SupplierFacts:
    base: dict[str, Any] = dict(
        supplier_name="Acme Industrial GmbH",
        country="DE",
        industry="Manufacturing",
        company_size="large",
        source_paths=dict(_SOURCE_PATHS),
    )
    base.update(kw)
    return SupplierFacts(**base)


def rich_facts(**kw: Any) -> SupplierFacts:
    """A supplier where every bucket and every assessment is populated.

    The benchmark values are picked so the derived floor lands where each bucket
    needs it. Ask 76, current 34; the two benchmarks strictly inside that band
    (60 and 40) average to a floor of 50, which puts peerGroupStandard in
    reserve and industryRegionStandard below the floor. ``supplierStandard`` is
    deliberately absent so ``unavailable`` is non-empty too.
    """
    base: dict[str, Any] = dict(
        target_term_days=76,
        opportunity_term_days=76,
        current_term_days=34,
        batna_term_days=None,
        benchmark_term_days=40,
        regulatory_max_term_days=None,
        strategy_benchmarks=[
            StrategyBenchmark(
                name="buyerStandard", label="company standard", value=80,
                description="Group payment-terms policy",
            ),
            StrategyBenchmark(
                name="parentOrSupplierMax", label="parent/supplier maximum term",
                value=76, applied=True,
            ),
            StrategyBenchmark(
                name="peerGroupStandard", label="comparable peer group", value=60,
                occurrences=14, avg=58.0, q3=64.0,
            ),
            StrategyBenchmark(
                name="industryRegionStandard", label="industry/region standard",
                value=40, occurrences=310, avg=39.0, q3=45.0,
            ),
        ],
        # The spend file beats the ask, and carries the alias it was read off.
        # Assessment inputs: we pay early against the baseline (payOnTerms
        # usable), DSO sits above contractual current (dso leverage usable),
        # the extension is priceable (costImpact), and the relationship is
        # scored (relationship).
        pay_on_terms_term_days=34,
        actual_payment_terms_days=30,
        # Above contractual 34, below the 76-day ask — stepping-stone leverage.
        dso=72,
        supplier_financing_rate=0.08,
        # Undercuts the supplier's own 8% financing, so the SCF programme is
        # viable and the reframe prompt is actually built. The figure only
        # surfaces in a prompt when the turn enables SCF (fail-closed).
        scf_rate=0.031,
        wacc_pre_tax=0.094,
        wacc_after_tax=0.071,
        cost_of_debt_spread=0.021,
        spend_volume=12_400_000.0,
        target_cash_flow=1_430_000.0,
        buyer_leverage_level="high",

        success_probability="high",
        credit_rating="BBB",
        country_rating="AA",
        buyer_standard_term_days=80,
        buyer_standard_description="Group payment-terms policy",
        supplier_segment_term_days=None,
        peer_group_term_days=60,
        peer_group_avg_term_days=58.0,
        peer_group_q3_term_days=64.0,
        peer_group_occurrences=14,
        agreed_terms_with_cash_discounts=34,
    )
    base.update(kw)
    return _facts(**base)


def sparse_facts(**kw: Any) -> SupplierFacts:
    """A supplier where NOTHING reaches the ask — the stretch-target path.

    Only the industry/region benchmark has a value at all, and it sits below the
    current term, so it is the supplier's counter-evidence rather than ours. The
    four other argument-eligible sources report as unavailable.
    """
    base: dict[str, Any] = dict(
        target_term_days=90,
        opportunity_term_days=90,
        current_term_days=60,
        batna_term_days=None,
        benchmark_term_days=45,
        regulatory_max_term_days=60,
        regulatory_enforced=True,
        regulatory_limit_type="MAX",
        strategy_benchmarks=[
            StrategyBenchmark(
                name="industryRegionStandard", label="industry/region standard",
                value=45, occurrences=120,
            ),
        ],
        spend_volume=180_000.0,
        target_cash_flow=14_000.0,
        buyer_leverage_level="low",

        is_sme=True,
        credit_rating="B-",
    )
    base.update(kw)
    return _facts(**base)


def client_sample_facts(**kw: Any) -> SupplierFacts:
    """The supplier from the client's marked-up summary sample (2026-09): Adp,
    Inc. Ask 60 against a 45-day current term, one supporting benchmark (the
    Supplier Standard at 67 with its statistics) and one below the current
    term (Industry Region Standard at 40). The template tests and the summarize eval
    both render this one, so the two can never disagree about the expected
    output."""
    base: dict[str, Any] = dict(
        supplier_name="Adp, Inc",
        country="US",
        industry="Data Processing, Hosting, and Related Services",
        company_size="LARGE",
        credit_rating="AA",
        country_rating="AA+",
        target_term_days=60,
        current_term_days=45,
        batna_term_days=None,
        benchmark_term_days=40,
        regulatory_max_term_days=None,
        spend_volume=908_000.0,
        target_cash_flow=37_000.0,
        nine_box_term_extension=1,  # boxes 1/2/4 → high priority (Carlos, 2026-09-15)
        supplier_financing_rate=0.0423,
        buyer_leverage_level="low",
        success_probability="high",
        supplier_segment_term_days=67,
        supplier_segment_avg_term_days=65.0,
        supplier_segment_q3_term_days=75.0,
        supplier_segment_occurrences=16,
        strategy_benchmarks=[
            StrategyBenchmark(
                name="supplierStandard", label="supplier standard", value=67,
                occurrences=16, avg=65.0, q3=75.0,
            ),
            StrategyBenchmark(
                name="industryRegionStandard", label="industry/region standard",
                value=40, occurrences=200,
            ),
        ],
    )
    base.update(kw)
    return _facts(**base)


def bundle(facts: SupplierFacts) -> NegotiationBrief:
    """The turn's brief, as a node would see it.

    The brief IS the picture now: its two bundles (`arguments`, `strength`)
    carry every judgment a prompt can read.
    """
    return brief_from(facts)


# ── Every intent's prompt, rendered from one fixture ───────────────────────
#
# Keys are the intent names used across the prompt tests. Intents whose prompt
# carries no supplier brief at all (spends → text-to-SQL, apply_override →
# a config write) are deliberately absent: there is no brief contract to hold
# them to.

def build_all_prompts(facts: SupplierFacts) -> dict[str, str]:
    """Render the user-turn prompt for every brief-carrying intent."""
    from utils.prompts.data_question_prompt import build_data_question_prompt
    from utils.prompts.evaluate_counter_offer_prompt import (
        build_counter_offer_response_prompt,
    )
    from utils.prompts.explain_recommendation_prompt import (
        build_explain_recommendation_prompt,
    )
    from utils.prompts.meta_operation_prompt import build_meta_operation_prompt
    from utils.prompts.negotiation_guide_prompt import build_negotiation_guide_prompt
    from utils.prompts.reframe_with_scf_prompt import build_reframe_with_scf_prompt
    from utils.prompts.opening_strategy_prompt import build_opening_strategy_prompt
    from utils.prompts.pushback_prompt import build_pushback_prompt
    from utils.prompts.scenario_prompt import (
        build_economic_profit_response_prompt,
        build_scenario_response_prompt,
    )
    from utils.prompts.summarize_prompt import build_summarize_prompt

    brief = bundle(facts)
    opening = analyze_opening_strategy(facts, brief.arguments)
    extraction = CounterOfferExtraction(counter_type="days_only", counter_term_days=55)
    calc = analyze_counter_offer(extraction, facts, brief.arguments)
    fallback = brief.batna_floor
    msg = "What should I lead with here?"

    prompts = {
        "summarize": build_summarize_prompt(msg, facts, brief=brief),
        "answer_data_question": build_data_question_prompt(
            msg, facts, effective_batna=fallback,
            batna_note=brief.batna_note, brief=brief,
        ),
        "explain_recommendation": build_explain_recommendation_prompt(
            msg, facts, opening, brief=brief
        ),
        "negotiation_guide": build_negotiation_guide_prompt(
            msg, facts, None, brief=brief
        ),
        "opening_strategy": build_opening_strategy_prompt(
            message=msg, facts=facts,
            opening_strategy=opening, tone=None, brief=brief,
        ),
        "pushback": build_pushback_prompt(msg, facts, brief=brief),
        "evaluate_counter_offer": build_counter_offer_response_prompt(
            msg, extraction, calc, facts, brief=brief
        ),
        "scenario": build_scenario_response_prompt(
            msg, facts, _scenario_calculation(), brief=brief
        ),
        "economic_profit": build_economic_profit_response_prompt(
            msg, facts, _economic_profit_analysis(facts), brief=brief
        ),

        "meta_operation": build_meta_operation_prompt(msg, None, brief),
    }

    # The SCF pitch prompt is only ever BUILT for a viable programme — the node
    # returns a canned refusal before reaching it otherwise (see
    # `make_reframe_with_scf_node`), and the block assumes the rates it is
    # explaining exist.
    viability = analyze_scf_viability(facts, brief.arguments)
    if viability.viable:
        prompts["reframe_with_scf"] = build_reframe_with_scf_prompt(
            msg, viability, None, brief=brief
        )
    return prompts


def _economic_profit_analysis(facts):
    """A price-for-terms trade-off on this supplier, as the node would run it.

    Built through the real calculator rather than hand-assembled, so the
    ceiling measures the block that actually ships — scenario lines, the
    break-even and the term-evidence block included.
    """
    from decimal import Decimal

    from domain.entities.economic_profit import (
        CALC_ECONOMIC_PROFIT,
        EconomicProfitScenarioSpec,
    )
    from domain.entities.scenario import ScenarioRequest
    from domain.services.scenario_calculator import run_economic_profit_scenarios

    return run_economic_profit_scenarios(
        facts,
        ScenarioRequest(
            calc_type=CALC_ECONOMIC_PROFIT,
            scenarios=[
                EconomicProfitScenarioSpec(
                    target_term_days=90, price_change=Decimal("0.01")
                )
            ],
        ),
    )


def _scenario_calculation():
    from domain.entities.scenario import ScenarioCalculation

    return ScenarioCalculation(
        calc_type="extension",
        value=1_430_000.0,
        formula="spend_volume x extension_days / 365",
        inputs={"extension_days": 42},
    )



# ── argument-block helpers ─────────────────────────────────────────────────
#
# The four hand-written argument blocks were replaced by one renderer with
# three voices (`utils.prompts.brief.arguments`). These wrap it so a test can
# still ask "what does the drafting surface see for this supplier?" in one call.

def explain_block(facts) -> str:
    """The negotiator-facing voice: every bucket, figures included."""
    from utils.prompts.brief import VOICE_EXPLAIN, render_arguments
    from domain.services.brief_builder import brief_from

    return render_arguments(brief_from(facts), voice=VOICE_EXPLAIN)


def pitch_block(facts) -> str:
    """The drafting voice: supporting arguments with how to say them."""
    from utils.prompts.brief import VOICE_PITCH, render_arguments
    from domain.services.brief_builder import brief_from

    return render_arguments(brief_from(facts), voice=VOICE_PITCH)


def playbook_block(facts) -> str:
    """The playbook voice: the supporting arguments and nothing else."""
    from utils.prompts.brief import VOICE_PLAYBOOK, render_arguments
    from domain.services.brief_builder import brief_from

    return render_arguments(brief_from(facts), voice=VOICE_PLAYBOOK)


# Surfaces that get the success probability on its own, with no FACTS block: they
# explain a calculation or build a financing pitch, and where the position
# stands changes the answer without a whole facts block being needed.
VERDICT_ONLY_INTENTS = frozenset({"scenario", "reframe_with_scf"})

# Surfaces that reason over the supplier's position and therefore must carry the
# full picture — arguments, posture and how likely the ask is to be agreed.
#
# `answer_data_question` is deliberately NOT here. It answers factual questions
# ("what is their DSO?") and its own system prompt says so — "pure information
# retrieval: no negotiation strategy, recommendation, or suggested wording is
# expected". It was nonetheless handed the ranked argument set, two thirds of
# its user turn, telling the model which argument to lead with. It keeps the
# facts — success probability among them; it no longer carries the arguments.
#
# `summarize` is NOT here either, since 2026-09-14. It no longer reasons over
# the brief: the summary is a fixed client template RENDERED from the brief in
# code (`utils.prompts.summary_template`), and the model is handed the finished
# text to smooth. It sees no facts block, no argument buckets and no posture
# judgments — deliberately, because every line the client struck out of the
# old summary was one the prompt had put in front of it.
REASONING_INTENTS = frozenset({
    "explain_recommendation",
    "negotiation_guide",
    "opening_strategy",
    "pushback",
    "evaluate_counter_offer",
})

# The reasoning surfaces that see EVERY argument bucket, not just the supporting
# set. The playbook is deliberately excluded: it produces a standalone document
# the negotiator takes into the room, and it printed every bucket it was shown
# as a "Not used — and why" list. It gets the case FOR the ask alone (see
# `VOICE_PLAYBOOK`); the conversational surfaces keep the counter-evidence,
# because "what about the peer group?" is a question they have to answer.
FULL_BUCKET_INTENTS = REASONING_INTENTS - {"negotiation_guide"}
