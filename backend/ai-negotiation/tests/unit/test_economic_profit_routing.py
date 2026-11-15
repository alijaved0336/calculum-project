"""The run_scenario node's economic-profit branch.

The classifier routes a financial what-if to `run_scenario` exactly as it
always did; what is new is the EXTRACTION step choosing one of the four
economic-profit calc types, and the node running the economic-profit
calculator for those and the working-capital one for everything else.

These tests drive the node with a scripted extraction result, so they assert
the branch and the figures — not the live model's wording.
"""
from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

import pytest

from agents.nodes.scenario import _parse_request, make_scenario_node
from domain.entities.economic_profit import (
    CALC_BREAK_EVEN_PRICE,
    CALC_COMPENSATING_PRICE_CHANGE,
    CALC_ECONOMIC_PROFIT,
    CALC_ECONOMIC_PROFIT_COMPARE,
)
from domain.services.context_builder import build_supplier_context


class _ScriptedLLM:
    """Returns each queued response in turn; records every prompt it saw.

    The node makes two calls — extraction, then response drafting — so the
    first queued item is the extraction JSON and the second the prose.
    """

    def __init__(self, *responses: str) -> None:
        self._responses = list(responses)
        self.prompts: list[str] = []
        self.systems: list[str] = []

    async def complete(self, prompt: str, **kwargs: Any) -> str:
        self.prompts.append(prompt)
        self.systems.append(kwargs.get("system", ""))
        return self._responses.pop(0) if self._responses else "drafted answer"


def _payload() -> dict[str, Any]:
    return {
        "supplier": {
            "name": "Acme", "uuid": "u1", "country": "US",
            "mainIndustryName": "Manufacturing", "companySize": "LARGE",
            "spendVolume": 12_000_000.0,
        },
        "target": {"targetPaymentTerms": 90, "opportunityPaymentTerms": 90},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": 60,
            "actualPaymentTerms": 60,
        },
        "agreement": {},
        "negotiationStrategy": {
            "industryRegionStandard": {"value": 70},
            "peerGroupStandard": {"value": 75},
        },
    }


def _state(message: str) -> dict:
    context = build_supplier_context(_payload())
    return {"session_id": "s1", "message": message, "context": context}


def _extraction(calc_type: str, scenarios: list[dict]) -> str:
    return json.dumps({"calc_type": calc_type, "scenarios": scenarios})


async def _run(message: str, extraction: str) -> tuple[dict, _ScriptedLLM]:
    llm = _ScriptedLLM(extraction, "drafted answer")
    result = await make_scenario_node(llm)(_state(message))
    return result, llm


# ---------------------------------------------------------------------------
# Extraction parsing
# ---------------------------------------------------------------------------

class TestExtractionParsing:
    def test_the_four_economic_profit_calc_types_survive_parsing(self):
        for calc_type in (
            CALC_ECONOMIC_PROFIT,
            CALC_ECONOMIC_PROFIT_COMPARE,
            CALC_BREAK_EVEN_PRICE,
            CALC_COMPENSATING_PRICE_CHANGE,
        ):
            assert _parse_request(_extraction(calc_type, [])).calc_type == calc_type

    def test_a_price_change_becomes_an_exact_decimal(self):
        request = _parse_request(
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": 0.01}])
        )
        assert request.scenarios[0].price_change == Decimal("0.01")

    def test_percentage_points_are_normalised_to_a_fraction(self):
        """"1% increase" coming back as `1` instead of `0.01` is the plausible
        extraction slip, and unnormalised it would answer with a 100% price
        increase — off by two orders of magnitude, with no sign it went wrong."""
        request = _parse_request(
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": 1}])
        )
        assert request.scenarios[0].price_change == Decimal("0.01")

    def test_an_absent_price_change_stays_absent(self):
        """None is not zero here: it is what makes the answer a break-even."""
        request = _parse_request(
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": None}])
        )
        assert request.scenarios[0].price_change is None

    def test_a_destination_term_and_a_delta_stay_distinct(self):
        request = _parse_request(
            _extraction(
                CALC_ECONOMIC_PROFIT_COMPARE,
                [{"target_term_days": 90}, {"extension_days": 30}],
            )
        )
        assert request.scenarios[0].target_term_days == 90
        assert request.scenarios[0].extension_days is None
        assert request.scenarios[1].extension_days == 30
        assert request.scenarios[1].target_term_days is None

    def test_a_stated_baseline_is_carried_through(self):
        """"assume $12M and move from 60 to 90" — both figures reach the spec."""
        request = _parse_request(
            _extraction(
                CALC_ECONOMIC_PROFIT,
                [{
                    "target_term_days": 90,
                    "current_term_days": 60,
                    "annual_spend": 12_000_000,
                    "price_change": 0.01,
                }],
            )
        )
        spec = request.scenarios[0]
        assert spec.current_term_days == 60
        assert spec.annual_spend == Decimal("12000000")
        assert spec.target_term_days == 90

    def test_an_unstated_baseline_stays_absent(self):
        """None is what says "use the supplier's own" — a zero or a guess here
        would price the move off a term nobody proposed."""
        request = _parse_request(
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": 0.01}])
        )
        assert request.scenarios[0].current_term_days is None
        assert request.scenarios[0].annual_spend is None

    def test_a_stated_spend_becomes_an_exact_decimal(self):
        """Built from the string form: this figure goes straight into money
        arithmetic, and a float's binary error would follow it there."""
        request = _parse_request(
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "annual_spend": 12_500_000.5}])
        )
        assert request.scenarios[0].annual_spend == Decimal("12500000.5")

    def test_a_stated_term_is_whole_days(self):
        request = _parse_request(
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "current_term_days": 60.0}])
        )
        assert request.scenarios[0].current_term_days == 60

    def test_malformed_entries_are_dropped_not_crashed_on(self):
        request = _parse_request(
            json.dumps({"calc_type": CALC_ECONOMIC_PROFIT, "scenarios": ["nonsense", 7]})
        )
        assert request.scenarios == []

    def test_the_existing_calc_types_are_untouched(self):
        request = _parse_request(json.dumps({"calc_type": "term_impact", "target_term_days": 90}))
        assert request.calc_type == "term_impact"
        assert request.target_term_days == 90
        assert request.scenarios == []


# ---------------------------------------------------------------------------
# The node branch
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
class TestNodeBranch:
    async def test_a_term_and_price_trade_off_runs_economic_profit(self):
        result, llm = await _run(
            "Supplier will accept 90 days instead of 60 but wants a 1% price increase. Is that worth it?",
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": 0.01}]),
        )
        response_prompt = llm.prompts[1]
        assert "ECONOMIC PROFIT RESULT" in response_prompt
        # The workbook figures, already rounded for the model to copy.
        assert "+$3.3K" in response_prompt
        assert "-$78.0K" in response_prompt
        assert "+$81.3K" in response_prompt
        assert result["source"]["Economic Profit - 90 days at +1% price"]["value"] == 3271.23

    async def test_the_break_even_is_offered_alongside_the_point_estimate(self):
        _result, llm = await _run(
            "What if I extend terms by 30 days but the price increases by 1%?",
            _extraction(CALC_ECONOMIC_PROFIT, [{"extension_days": 30, "price_change": 0.01}]),
        )
        assert "Break-even price change for the 90-day move: +1.04%" in llm.prompts[1]

    async def test_a_trade_off_with_no_price_named_answers_with_the_break_even(self):
        _result, llm = await _run(
            "Would it make sense to give them a price increase for 90 days?",
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": None}]),
        )
        prompt = llm.prompts[1]
        assert "Break-even price change for the 90-day move: +1.04%" in prompt
        assert "No price change was named" in prompt

    async def test_a_comparison_names_the_term_its_break_even_belongs_to(self):
        """A bare break-even beside two scenarios gets read against the wrong
        one: the 75-day limit was narrated as the 90-day scenario's ceiling."""
        _result, llm = await _run(
            "Compare 75 days at the current price with 90 days at +1%.",
            _extraction(
                CALC_ECONOMIC_PROFIT_COMPARE,
                [
                    {"target_term_days": 75, "price_change": 0},
                    {"target_term_days": 90, "price_change": 0.01},
                ],
            ),
        )
        assert "Break-even price change for the 75-day move:" in llm.prompts[1]

    async def test_a_comparison_reports_the_difference_and_the_winner(self):
        _result, llm = await _run(
            "Compare 75 days at the current price with 90 days at +1%.",
            _extraction(
                CALC_ECONOMIC_PROFIT_COMPARE,
                [
                    {"target_term_days": 75, "price_change": 0},
                    {"target_term_days": 90, "price_change": 0.01},
                ],
            ),
        )
        prompt = llm.prompts[1]
        assert "75 days at no price change" in prompt
        assert "90 days at +1% price" in prompt
        assert 'in favour of "75 days at no price change"' in prompt

    async def test_the_compensating_discount_is_solved_not_guessed(self):
        _result, llm = await _run(
            "What discount would compensate us if they stay at 60 days?",
            _extraction(
                CALC_COMPENSATING_PRICE_CHANGE,
                [{"target_term_days": 90, "price_change": 0}, {"target_term_days": 60, "price_change": None}],
            ),
        )
        assert "Price change that makes the two equivalent: -1.03%" in llm.prompts[1]

    async def test_the_financial_result_and_the_term_evidence_stay_apart(self):
        """§14: a positive economic profit is not evidence for the ask."""
        _result, llm = await _run(
            "Is 90 days at +1% worth it?",
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": 0.01}]),
        )
        prompt = llm.prompts[1]
        assert "NEGOTIATION EVIDENCE" in prompt
        # This supplier's best benchmark is 75 days, so nothing backs the
        # 90-day ask and the answer has to be able to say so.
        assert "No benchmark reaches 90 days" in prompt
        system = llm.systems[1]
        assert "never means the negotiator should accept" in system

    async def test_a_missing_figure_is_named_and_nothing_is_estimated(self):
        payload = _payload()
        payload["supplier"]["spendVolume"] = None
        llm = _ScriptedLLM(
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": 0.01}]),
            "drafted answer",
        )
        state = {
            "session_id": "s1",
            "message": "Is 90 days at +1% worth it?",
            "context": build_supplier_context(payload),
        }
        await make_scenario_node(llm)(state)
        prompt = llm.prompts[1]
        assert "CALCULATION COULD NOT RUN" in prompt
        assert "annual spend volume is not available" in prompt

    async def test_it_is_a_narrow_surface_like_every_other_scenario_answer(self):
        """The success-probability signal alone, no facts block.

        An economic-profit answer explains arithmetic; handed the full facts
        block it has instruction competing with the thing it was asked to do.
        Same brief profile as the plain scenario surface, deliberately.
        """
        _result, llm = await _run(
            "Is 90 days at +1% worth it?",
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 90, "price_change": 0.01}]),
        )
        prompt = llm.prompts[1]
        assert "## SUCCESS PROBABILITY" in prompt
        assert "## INTERNAL FIGURES" not in prompt

    async def test_a_term_only_move_is_valued_when_the_ask_is_financial(self):
        """"What is the financial impact if I move from 60 to 120 days?"

        No price is in play, so the price leg is zero and the answer is the
        working-capital value alone - but it is economic profit, at the
        buyer's cost of capital, not the raw cash the term frees.
        """
        result, llm = await _run(
            "What is the financial impact if I move from 60 to 120 days?",
            _extraction(CALC_ECONOMIC_PROFIT, [{"target_term_days": 120, "price_change": 0}]),
        )
        prompt = llm.prompts[1]
        assert "ECONOMIC PROFIT RESULT" in prompt
        assert "Terms: 60 days → 120 days" in prompt
        assert "Price change: 0%" in prompt
        assert "Price impact after tax: $0" in prompt
        # 12M x 60 extra days / 365 x 8% WACC = $157.8K, and the source panel
        # carries the same figure the prompt shows.
        assert "+$157.8K" in prompt
        assert result["source"]["Economic Profit - 120 days at no price change"]["value"] == 157808.22

    async def test_both_ends_of_one_move_are_one_scenario_not_two(self):
        """"from 60 to 120" names both ends of a SINGLE move: 120 is the
        destination, 60 the baseline — never one half of a two-scenario
        comparison. Here the stated baseline and the supplier's contractual
        term agree at 60, so the rendered move is 60 → 120 either way."""
        _result, llm = await _run(
            "What is the financial impact if I move from 60 to 120 days?",
            _extraction(
                CALC_ECONOMIC_PROFIT,
                [{"target_term_days": 120, "current_term_days": 60, "price_change": 0}],
            ),
        )
        prompt = llm.prompts[1]
        assert prompt.count("### ") == 1
        assert "60 days → 120 days" in prompt

    async def test_a_stated_baseline_overrides_the_supplier_end_to_end(self):
        """The bug this guards: the negotiator says 60 → 90 on $12M, the
        supplier is on 30 days and $88M, and the answer comes back priced off
        the supplier's figures without saying so. Through the node, the stated
        baseline reaches the calculator and the source panel says where it
        came from."""
        payload = _payload()
        payload["supplier"]["spendVolume"] = 88_000_000.0
        payload["spend"]["contractualPaymentTermsWithoutCashDiscount"] = 30
        state = {
            "session_id": "s1",
            "message": "Assume annual spend is $12M and move from 60 to 90 days at +1%.",
            "context": build_supplier_context(payload),
        }
        llm = _ScriptedLLM(
            _extraction(
                CALC_ECONOMIC_PROFIT,
                [{
                    "target_term_days": 90,
                    "current_term_days": 60,
                    "annual_spend": 12_000_000,
                    "price_change": 0.01,
                }],
            ),
            "drafted answer",
        )
        result = await make_scenario_node(llm)(state)
        prompt = llm.prompts[1]
        assert "60 days → 90 days" in prompt
        assert "Annual spend: $12.00M" in prompt
        assert result["source"]["Economic Profit - 90 days at +1% price"]["value"] == 3271.23
        # Cited as the negotiator's figures, not as the supplier payload's.
        assert result["source"]["Annual Spend Volume"]["value"] == 12_000_000.0
        assert result["source"]["Annual Spend Volume"]["path"] == "stated in the request"
        assert result["source"]["Current Payment Term (days)"]["value"] == 60
        assert result["source"]["Current Payment Term (days)"]["path"] == "stated in the request"

    async def test_a_plain_cash_unlock_question_keeps_the_existing_behaviour(self):
        """"How much cash do I unlock at 90 days?" is the one carve-out: it
        asks for the CASH a term frees, not what the move is worth, and must
        still go through the working-capital calculator."""
        _result, llm = await _run(
            "How much cash flow do I unlock at 90 days?",
            json.dumps({"calc_type": "term_impact", "target_term_days": 90}),
        )
        prompt = llm.prompts[1]
        assert "CALCULATION RESULT" in prompt
        assert "ECONOMIC PROFIT RESULT" not in prompt
        assert "Break-even" not in prompt
