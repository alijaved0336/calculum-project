"""The shape of the economic-profit answer the negotiator reads.

The arithmetic sections are written in code, so they can be asserted as the
ANSWER rather than as a prompt the model may or may not follow. What is being
pinned here is not house style: it is that the scenario's resolved inputs and
both legs of the calculation are on the negotiator's screen. A scenario that
silently ran on the wrong baseline is indistinguishable from a correct one
unless the answer says which spend and which terms it used, and a +$3.3K net
of two six-figure legs is unreadable without the legs.
"""
from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

import pytest

from agents.nodes.scenario import make_scenario_node
from domain.entities.economic_profit import (
    CALC_BREAK_EVEN_PRICE,
    CALC_ECONOMIC_PROFIT,
    CALC_ECONOMIC_PROFIT_COMPARE,
    EconomicProfitAnalysis,
    EconomicProfitScenarioResult,
    EconomicProfitScenarioSpec,
)
from domain.entities.facts import SupplierFacts
from domain.entities.scenario import ScenarioRequest
from domain.services.context_builder import build_supplier_context
from domain.services.economic_profit import calculate_economic_profit
from domain.services.scenario_calculator import run_economic_profit_scenarios
from utils.prompts.scenario_prompt import (
    ECONOMIC_PROFIT_ANSWER_HEADINGS,
    render_economic_profit_answer,
)


def _facts(
    spend_volume: float | None = 12_000_000.0,
    current_term_days: int | None = 60,
) -> SupplierFacts:
    return SupplierFacts(
        supplier_name="Acme",
        country="DE",
        industry="Manufacturing",
        company_size="large",
        target_term_days=90,
        current_term_days=current_term_days,
        batna_term_days=None,
        benchmark_term_days=None,
        regulatory_max_term_days=None,
        spend_volume=spend_volume,
    )


def _analysis(calc_type: str = CALC_ECONOMIC_PROFIT, **spec) -> EconomicProfitAnalysis:
    return run_economic_profit_scenarios(
        _facts(),
        ScenarioRequest(calc_type=calc_type, scenarios=[EconomicProfitScenarioSpec(**spec)]),
    )


@pytest.fixture(scope="module")
def workbook_answer() -> str:
    """The client's case: $12M, 60 → 90 days, +1%."""
    return render_economic_profit_answer(
        run_economic_profit_scenarios(
            _facts(),
            ScenarioRequest(
                calc_type=CALC_ECONOMIC_PROFIT,
                scenarios=[
                    EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))
                ],
            ),
        )
    )


# ---------------------------------------------------------------------------
# Everything the negotiator needs in order to check the scenario
# ---------------------------------------------------------------------------

class TestTheAnswerShowsItsWork:
    def test_the_resolved_inputs_are_stated_before_any_result(self, workbook_answer):
        """The point of this section: a wrong input is caught by reading, not
        by trusting the total."""
        scenario, _rest = workbook_answer.split("**Price Impact**", 1)
        assert "Annual spend: $12.00M" in scenario
        assert "Terms: 60 → 90 days (+30 days)" in scenario
        assert "Price change: +1%" in scenario
        assert "Tax rate: 35%" in scenario
        assert "Buyer WACC: 8%" in scenario

    def test_the_price_leg_is_shown_as_the_multiplication_it_is(self, workbook_answer):
        assert "Gross price increase: $12.00M × 1% = $120.0K (a cost to us)" in workbook_answer
        assert "After-tax impact: -$120.0K × (1 - 35%) = -$78.0K" in workbook_answer

    def test_the_working_capital_leg_shows_both_accounts_payable_figures(
        self, workbook_answer
    ):
        assert "Current AP: $12.00M / 365 × 60 = $1.97M" in workbook_answer
        assert "Proposed AP: $12.12M / 365 × 90 = $2.99M" in workbook_answer
        assert "Cash-flow impact: $2.99M - $1.97M = +$1.02M" in workbook_answer
        assert "Value at 8% WACC: +$1.02M × 8% = +$81.3K" in workbook_answer

    def test_the_proposed_ap_is_visibly_built_on_the_adjusted_spend(self, workbook_answer):
        """$12.12M, not $12.00M, in the proposed-AP division — the price change
        feeds the working-capital leg too, and an answer that showed $12.00M
        there would be showing a calculation we do not run."""
        assert "Proposed AP: $12.12M" in workbook_answer
        assert "Proposed AP: $12.00M" not in workbook_answer

    def test_the_cash_swing_is_labelled_so_it_cannot_be_read_as_profit(
        self, workbook_answer
    ):
        """+$1.02M is the biggest number in the answer and is NOT the gain."""
        assert "+$1.02M (working capital, not profit)" in workbook_answer

    def test_the_net_is_the_two_legs_added_in_front_of_the_negotiator(
        self, workbook_answer
    ):
        economic_profit = workbook_answer.split("**Economic Profit**", 1)[1]
        assert "Working-capital value: +$81.3K" in economic_profit
        assert "After-tax price impact: -$78.0K" in economic_profit
        assert "**Net Economic Profit: +$3.3K**" in economic_profit

    def test_the_break_even_is_named_with_the_term_it_belongs_to(self, workbook_answer):
        assert "Break-even price change for the 90-day move: +1.04%" in workbook_answer
        assert "Proposed price change: +1%" in workbook_answer

    def test_the_gross_price_increase_is_never_netted_against_the_cash_swing(
        self, workbook_answer
    ):
        """The error the client called out: $1.02M - $120K. Neither that figure
        (~$896K) nor the gross subtraction appears anywhere."""
        assert "$895.9K" not in workbook_answer
        assert "$120.0K" in workbook_answer  # gross, but only inside the price leg
        price_leg = workbook_answer.split("**Price Impact**", 1)[1].split("**Payment-Term")[0]
        assert "$120.0K" in price_leg
        assert "$120.0K" not in workbook_answer.split("**Payment-Term Value**", 1)[1]


class TestTheShape:
    def test_it_is_a_handful_of_short_labelled_sections(self, workbook_answer):
        headings = [
            line for line in workbook_answer.splitlines()
            if line.strip() in ECONOMIC_PROFIT_ANSWER_HEADINGS
        ]
        assert headings == [
            "**Scenario**",
            "**Price Impact**",
            "**Payment-Term Value**",
            "**Economic Profit**",
            "**Break-Even**",
        ]
        # Bullets, not paragraphs: every non-heading, non-blank line is one.
        body = [
            line for line in workbook_answer.splitlines()
            if line.strip() and line.strip() not in ECONOMIC_PROFIT_ANSWER_HEADINGS
        ]
        assert all(line.startswith("- ") for line in body)
        assert len(body) <= 16

    def test_no_internal_names_or_raw_payload_reach_the_negotiator(self, workbook_answer):
        for internal in (
            "economic_profit", "volume_adjustment", "adjusted_annual_spend",
            "current_ap", "proposed_ap", "cash_flow_impact", "price_change_pct",
            "value_of_invested_capital", "contract_terms", "target_terms",
            "spend_volume", "calc_type", "financially_positive", "{", "}",
        ):
            assert internal not in workbook_answer

    def test_a_failed_calculation_renders_nothing_rather_than_a_skeleton(self):
        analysis = run_economic_profit_scenarios(
            _facts(spend_volume=None),
            ScenarioRequest(
                calc_type=CALC_ECONOMIC_PROFIT,
                scenarios=[EconomicProfitScenarioSpec(target_term_days=90)],
            ),
        )
        assert render_economic_profit_answer(analysis) == ""


class TestSigns:
    def test_a_price_increase_reads_as_a_cost_and_a_discount_as_a_gain(self):
        discount = render_economic_profit_answer(
            EconomicProfitAnalysis(
                calc_type=CALC_ECONOMIC_PROFIT,
                scenarios=[
                    EconomicProfitScenarioResult(
                        label="x",
                        result=calculate_economic_profit(
                            Decimal("12000000"), 60, 90, Decimal("-0.01")
                        ),
                    )
                ],
            )
        )
        assert "Price change: -1%" in discount
        assert "Gross price reduction: $12.00M × 1% = $120.0K (a gain to us)" in discount
        assert "After-tax impact: +$120.0K × (1 - 35%) = +$78.0K" in discount
        # The reduced spend flows into the proposed AP, so the term leg shrinks.
        assert "Proposed AP: $11.88M" in discount

    def test_every_impact_figure_carries_its_direction(self, workbook_answer):
        for line in workbook_answer.splitlines():
            if line.startswith(("- After-tax impact:", "- Cash-flow impact:", "- Value at")):
                assert "=" in line and ("+$" in line.split("=")[1] or "-$" in line.split("=")[1])

    def test_a_term_move_at_an_unchanged_price_says_so_plainly(self):
        answer = render_economic_profit_answer(
            _analysis(target_term_days=90, price_change=Decimal("0"))
        )
        assert "Price change: 0%" in answer
        assert "- No price change, so no P&L impact" in answer


class TestOtherCalcTypes:
    def test_a_comparison_gives_each_scenario_its_own_block_and_a_verdict(self):
        analysis = run_economic_profit_scenarios(
            _facts(),
            ScenarioRequest(
                calc_type=CALC_ECONOMIC_PROFIT_COMPARE,
                scenarios=[
                    EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01")),
                    EconomicProfitScenarioSpec(target_term_days=75, price_change=Decimal("0")),
                ],
            ),
        )
        answer = render_economic_profit_answer(analysis)
        # The shared baseline once, the terms and prices per scenario.
        assert "Annual spend: $12.00M" in answer
        assert "Current terms: 60 days" in answer
        assert "**90 days at +1% price**" in answer
        assert "**75 days at no price change**" in answer
        assert answer.count("**Net Economic Profit:") == 2
        assert "in favour of" in answer

    def test_a_break_even_question_still_shows_the_scenario_behind_the_percentage(self):
        """The whole answer to "how much can we absorb?" is one number, and a
        bare number is unverifiable — the term move it belongs to and the legs
        that cancel at that price are what make it checkable."""
        analysis = run_economic_profit_scenarios(
            _facts(),
            ScenarioRequest(
                calc_type=CALC_BREAK_EVEN_PRICE,
                scenarios=[EconomicProfitScenarioSpec(target_term_days=90)],
            ),
        )
        answer = render_economic_profit_answer(analysis)
        assert "Break-even price change for the 90-day move: +1.04%" in answer
        assert "Terms: 60 → 90 days (+30 days)" in answer

    def test_no_break_even_section_where_there_is_no_term_move_to_absorb_it(self):
        """A price-only scenario has no term move, so there is no break-even to
        report and no section for it."""
        answer = render_economic_profit_answer(
            _analysis(price_change=Decimal("0.01"))
        )
        assert "**Break-Even**" not in answer
        assert "Terms: 60 days (unchanged)" in answer


# ---------------------------------------------------------------------------
# Through the node: what actually gets sent
# ---------------------------------------------------------------------------

class _ScriptedLLM:
    def __init__(self, *responses: str) -> None:
        self._responses = list(responses)
        self.prompts: list[str] = []

    async def complete(self, prompt: str, **kwargs: Any) -> str:
        self.prompts.append(prompt)
        return self._responses.pop(0) if self._responses else "drafted"


def _payload(spend: float, current_term: int) -> dict[str, Any]:
    return {
        "supplier": {
            "name": "Acme", "uuid": "u1", "country": "US",
            "mainIndustryName": "Manufacturing", "companySize": "LARGE",
            "spendVolume": spend,
        },
        "target": {"targetPaymentTerms": 90, "opportunityPaymentTerms": 90},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": current_term,
            "actualPaymentTerms": current_term,
        },
        "agreement": {},
        "negotiationStrategy": {"industryRegionStandard": {"value": 70}},
    }


async def _answer(
    message: str, scenarios: list[dict], draft: str, *,
    spend: float = 88_000_000.0, current_term: int = 30, language: str | None = None,
) -> str:
    llm = _ScriptedLLM(
        json.dumps({"calc_type": CALC_ECONOMIC_PROFIT, "scenarios": scenarios}), draft
    )
    state = {
        "session_id": "s1",
        "message": message,
        "context": build_supplier_context(_payload(spend, current_term)),
        "response_language": language,
    }
    return (await make_scenario_node(llm)(state))["response"]


class TestTheComposedAnswer:
    async def test_the_sections_are_sent_with_the_models_interpretation_after_them(self):
        answer = await _answer(
            "What is 60 to 90 days at +1% worth on $12M?",
            [{
                "target_term_days": 90, "current_term_days": 60,
                "annual_spend": 12_000_000, "price_change": 0.01,
            }],
            "**Interpretation**\nFinancially positive, but close to the 1.04% break-even.",
        )
        assert answer.startswith("**Scenario**")
        assert "**Net Economic Profit: +$3.3K**" in answer
        assert answer.index("**Scenario**") < answer.index("**Interpretation**")
        assert answer.rstrip().endswith("break-even.")

    async def test_the_stated_scenario_is_what_the_answer_shows(self):
        """The precedence bug, seen from the negotiator's side: the supplier is
        on 30 days and $88M, the negotiator said $12M and 60 → 90, and the
        answer has to show the scenario they asked about."""
        answer = await _answer(
            "Assume $12M spend and move from 60 to 90 days at +1%.",
            [{
                "target_term_days": 90, "current_term_days": 60,
                "annual_spend": 12_000_000, "price_change": 0.01,
            }],
            "**Interpretation**\nSlightly positive.",
        )
        assert "Annual spend: $12.00M" in answer
        assert "Terms: 60 → 90 days (+30 days)" in answer
        assert "Price change: +1%" in answer
        # Nothing from the supplier context leaks into the answer.
        assert "$88.00M" not in answer
        assert "30 → 90" not in answer
        assert "Current AP: $12.00M / 365 × 60" in answer

    async def test_an_unstated_baseline_still_shows_the_suppliers_own(self):
        answer = await _answer(
            "What is 90 days at +1% worth?",
            [{"target_term_days": 90, "price_change": 0.01}],
            "**Interpretation**\nPositive.",
        )
        assert "Annual spend: $88.00M" in answer
        assert "Terms: 30 → 90 days (+60 days)" in answer

    async def test_a_model_that_restates_the_figures_does_not_print_them_twice(self):
        answer = await _answer(
            "60 to 90 at +1%?",
            [{"target_term_days": 90, "current_term_days": 60, "price_change": 0.01}],
            "**Scenario**\n- Annual spend: $88M\n\n**Interpretation**\nSlightly positive.",
        )
        assert answer.count("**Scenario**") == 1
        assert "$88M\n" not in answer
        assert answer.rstrip().endswith("Slightly positive.")

    async def test_a_leaked_system_prompt_block_is_dropped_before_the_interpretation(self):
        """Staging regression: the model regurgitated its FORMATTING system
        prompt in front of **Interpretation**. It carries no calc heading, so
        the old guard let it through - the cut to **Interpretation** must drop
        it whatever it is."""
        answer = await _answer(
            "60 to 90 at +1%?",
            [{"target_term_days": 90, "current_term_days": 60, "price_change": 0.01}],
            "## FORMATTING\n# Single hyphen for asides; no em-dashes.\n"
            "# UNITS: every money figure carries a $.\n\n"
            "**Interpretation**\nSlightly positive.",
        )
        assert "FORMATTING" not in answer
        assert "em-dashes" not in answer
        assert answer.rstrip().endswith("Slightly positive.")

    async def test_a_requested_language_leaves_the_whole_answer_to_the_model(self):
        """The sections have to be translated, which only the model can do — so
        there it writes them, from the same rendering, and the node does not
        prepend an English copy."""
        answer = await _answer(
            "Auf Deutsch bitte: 60 auf 90 Tage bei +1%?",
            [{"target_term_days": 90, "current_term_days": 60, "price_change": 0.01}],
            "**Szenario**\n- Jahresvolumen: $88.00M\n\n**Interpretation**\nLeicht positiv.",
            language="German",
        )
        assert answer.startswith("**Szenario**")
        assert "**Scenario**" not in answer

    async def test_a_failed_calculation_is_explained_with_no_empty_sections(self):
        answer = await _answer(
            "What is 90 days at +1% worth?",
            [{"target_term_days": 90, "price_change": 0.01}],
            "I don't have an annual spend figure for this supplier, so I can't run that.",
            spend=None,
        )
        assert "**Scenario**" not in answer
        assert "annual spend" in answer

    async def test_the_model_is_given_the_sections_it_must_not_repeat(self):
        llm = _ScriptedLLM(
            json.dumps({
                "calc_type": CALC_ECONOMIC_PROFIT,
                "scenarios": [{"target_term_days": 90, "price_change": 0.01}],
            }),
            "**Interpretation**\nPositive.",
        )
        await make_scenario_node(llm)({
            "session_id": "s1",
            "message": "90 days at +1%?",
            "context": build_supplier_context(_payload(88_000_000.0, 30)),
        })
        prompt = llm.prompts[1]
        assert "THE ANSWER SO FAR" in prompt
        assert "**Net Economic Profit:" in prompt
