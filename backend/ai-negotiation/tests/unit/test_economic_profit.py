"""Buyer-side economic profit: the calculator and the supplier binding.

The golden case is the client's workbook (Carlos, 2026-09): $12M annual
spend, 60 -> 90 days, +1% supplier price increase, 35% tax, 8% buyer WACC.
Every intermediate is asserted, not just the bottom line — the whole point of
the calculation is that a +$3.3K answer is two six-figure legs nearly
cancelling, so a sign error in either leg has to fail here rather than produce
a plausible-looking total.
"""
from __future__ import annotations

from decimal import Decimal

import pytest

from domain.entities.economic_profit import (
    BREAK_EVEN,
    CALC_BREAK_EVEN_PRICE,
    CALC_COMPENSATING_PRICE_CHANGE,
    CALC_ECONOMIC_PROFIT,
    CALC_ECONOMIC_PROFIT_COMPARE,
    EconomicProfitScenarioSpec,
    FINANCIALLY_NEGATIVE,
    FINANCIALLY_POSITIVE,
)
from domain.entities.facts import SupplierFacts
from domain.entities.scenario import ScenarioRequest
from domain.services.economic_profit import (
    DEFAULT_APPLICABLE_TAX_RATE,
    DEFAULT_BUYER_WACC,
    break_even_price_change,
    calculate_economic_profit,
    solve_price_change_for_target_economic_profit,
)
from domain.services.scenario_calculator import run_economic_profit_scenarios

_SPEND = Decimal("12000000")


def _facts(
    spend_volume: float | None = 12_000_000.0,
    current_term_days: int | None = 60,
    target_term_days: int | None = 90,
) -> SupplierFacts:
    return SupplierFacts(
        supplier_name="Acme",
        country="DE",
        industry="Manufacturing",
        company_size="large",
        target_term_days=target_term_days,
        current_term_days=current_term_days,
        batna_term_days=None,
        benchmark_term_days=None,
        regulatory_max_term_days=None,
        spend_volume=spend_volume,
    )


# ---------------------------------------------------------------------------
# The workbook
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def result():
    """The client's workbook case."""
    return calculate_economic_profit(_SPEND, 60, 90, Decimal("0.01"))


class TestWorkbookGoldenCase:
    def test_every_intermediate_matches_the_workbook(self, result):
        assert result.volume_adjustment == Decimal("120000.00")
        assert result.adjusted_annual_spend == Decimal("12120000.00")
        assert result.after_tax_operating_profit_change == Decimal("-78000.00")
        assert result.current_ap == Decimal("1972602.74")
        assert result.proposed_ap == Decimal("2988493.15")
        assert result.cash_flow_impact == Decimal("1015890.41")
        assert result.value_of_invested_capital == Decimal("81271.23")
        assert result.economic_profit == Decimal("3271.23")

    def test_it_is_positive_but_only_just(self, result):
        assert result.financial_outcome == FINANCIALLY_POSITIVE
        # A quarter of a basis point of spend: positive, and nowhere near
        # enough to describe as a win.
        assert result.economic_profit_pct_spend < Decimal("0.0005")

    def test_the_defaults_are_the_workbook_assumptions(self, result):
        assert DEFAULT_APPLICABLE_TAX_RATE == Decimal("0.35")
        assert DEFAULT_BUYER_WACC == Decimal("0.08")
        assert result.tax_rate == Decimal("0.35")
        assert result.buyer_wacc == Decimal("0.08")

    def test_the_breakdown_adds_up_exactly_as_printed(self, result):
        assert (
            result.after_tax_operating_profit_change + result.value_of_invested_capital
            == result.economic_profit
        )

    def test_the_proposed_ap_is_built_on_the_adjusted_spend(self, result):
        """The new price is what gets invoiced at the new term.

        Computing the proposed AP off the ORIGINAL spend would drop the price
        change out of the working-capital leg and overstate this scenario.
        """
        assert result.proposed_ap == (
            result.adjusted_annual_spend / Decimal(365) * 90
        ).quantize(Decimal("0.01"))

    def test_terms_are_reported_back(self, result):
        assert (result.contract_terms, result.target_terms) == (60, 90)
        assert result.term_change_days == 30


# ---------------------------------------------------------------------------
# The other directions
# ---------------------------------------------------------------------------

class TestDirections:
    def test_a_term_extension_with_no_price_change_is_positive(self):
        result = calculate_economic_profit(_SPEND, 60, 90, Decimal("0"))
        assert result.economic_profit > 0
        assert result.financial_outcome == FINANCIALLY_POSITIVE
        # Pure working capital: no price leg at all.
        assert result.after_tax_operating_profit_change == Decimal("0.00")

    def test_a_price_increase_past_break_even_turns_it_negative(self):
        result = calculate_economic_profit(_SPEND, 60, 90, Decimal("0.02"))
        assert result.economic_profit < 0
        assert result.financial_outcome == FINANCIALLY_NEGATIVE

    def test_a_discount_with_no_term_change_is_positive(self):
        result = calculate_economic_profit(_SPEND, 60, 60, Decimal("-0.01"))
        assert result.economic_profit > 0
        assert result.financial_outcome == FINANCIALLY_POSITIVE
        # The discount is a gain to the buyer...
        assert result.after_tax_operating_profit_change > 0
        # ...and paying less at the same term slightly REDUCES payables, so
        # the working-capital leg is a small drag, not another gain.
        assert result.cash_flow_impact < 0
        assert result.value_of_invested_capital < 0

    def test_shorter_terms_destroy_working_capital_value(self):
        shorter = calculate_economic_profit(_SPEND, 60, 45, Decimal("0"))
        assert shorter.term_change_days == -15
        assert shorter.cash_flow_impact < 0
        assert shorter.economic_profit < 0
        assert shorter.financial_outcome == FINANCIALLY_NEGATIVE

    def test_value_is_the_return_on_the_cash_not_the_cash(self):
        """The single most expensive mistake this model can make.

        The cash-flow impact is a one-off balance-sheet swing; only the WACC
        earned on it is annual profit. Quoting the swing itself overstates the
        workbook case by more than 300x.
        """
        result = calculate_economic_profit(_SPEND, 60, 90, Decimal("0.01"))
        assert result.value_of_invested_capital == (
            result.cash_flow_impact * DEFAULT_BUYER_WACC
        ).quantize(Decimal("0.01"))
        assert abs(result.economic_profit) < result.cash_flow_impact / 100

    def test_longer_terms_are_worth_more_than_shorter_ones(self):
        at_75 = calculate_economic_profit(_SPEND, 60, 75, Decimal("0"))
        at_90 = calculate_economic_profit(_SPEND, 60, 90, Decimal("0"))
        assert at_90.economic_profit > at_75.economic_profit > 0


# ---------------------------------------------------------------------------
# Break-even
# ---------------------------------------------------------------------------

class TestBreakEven:
    def test_it_matches_the_expected_figure(self):
        break_even = break_even_price_change(60, 90)
        assert break_even == pytest.approx(Decimal("0.01043"), abs=Decimal("0.00001"))

    def test_economic_profit_at_the_break_even_price_is_zero(self):
        break_even = break_even_price_change(60, 90)
        result = calculate_economic_profit(_SPEND, 60, 90, break_even)
        assert abs(result.economic_profit) < Decimal("1")
        assert result.financial_outcome == BREAK_EVEN

    def test_just_under_is_positive_and_just_over_is_negative(self):
        break_even = break_even_price_change(60, 90)
        assert calculate_economic_profit(_SPEND, 60, 90, break_even - Decimal("0.001")).economic_profit > 0
        assert calculate_economic_profit(_SPEND, 60, 90, break_even + Decimal("0.001")).economic_profit < 0

    def test_it_does_not_depend_on_spend(self):
        """Annual spend cancels out of the solve — the same term move has the
        same break-even price for a $200K supplier and a $200M one."""
        break_even = break_even_price_change(60, 90)
        small = calculate_economic_profit(Decimal("200000"), 60, 90, break_even)
        assert small.financial_outcome == BREAK_EVEN

    def test_a_term_reduction_needs_a_discount_to_break_even(self):
        assert break_even_price_change(60, 45) < 0


# ---------------------------------------------------------------------------
# The generic solver
# ---------------------------------------------------------------------------

class TestSolver:
    def test_solving_for_zero_reproduces_the_break_even(self):
        solved = solve_price_change_for_target_economic_profit(_SPEND, 60, 90, 0)
        assert solved == pytest.approx(break_even_price_change(60, 90), abs=Decimal("1e-12"))

    def test_the_discount_that_compensates_for_terms_we_cannot_get(self):
        """Scenario A: 90 days, no price change. Scenario B: stay at 60, get X.

        The solve is what makes the two worth the same, so B's economic profit
        must come back equal to A's — through the SAME calculator, not a
        second formula.
        """
        wanted = calculate_economic_profit(_SPEND, 60, 90, Decimal("0"))
        solved = solve_price_change_for_target_economic_profit(
            _SPEND, 60, 60, wanted.economic_profit
        )
        assert solved < 0  # a discount, not an increase
        assert calculate_economic_profit(_SPEND, 60, 60, solved).economic_profit == pytest.approx(
            wanted.economic_profit, abs=Decimal("1")
        )

    def test_zero_spend_has_no_answer_rather_than_a_made_up_one(self):
        assert solve_price_change_for_target_economic_profit(0, 60, 90, 1000) is None


# ---------------------------------------------------------------------------
# Precision
# ---------------------------------------------------------------------------

class TestPrecision:
    def test_float_inputs_do_not_leak_binary_error(self):
        """0.01 as a float is 0.01000000000000000020816681711721685...

        Extraction hands us JSON numbers, so the calculator has to coerce
        through the string form or the cents drift.
        """
        from_float = calculate_economic_profit(12_000_000.0, 60, 90, 0.01)
        from_decimal = calculate_economic_profit(_SPEND, 60, 90, Decimal("0.01"))
        assert from_float == from_decimal

    def test_money_is_carried_to_the_cent(self):
        result = calculate_economic_profit(Decimal("7333333"), 60, 83, Decimal("0.013"))
        for value in (
            result.volume_adjustment,
            result.current_ap,
            result.proposed_ap,
            result.cash_flow_impact,
            result.economic_profit,
        ):
            assert value == value.quantize(Decimal("0.01"))

    def test_break_even_is_not_prematurely_rounded(self):
        """The percentage is reported to two decimals, but rounding it HERE
        would make the round-trip back through the calculator miss zero."""
        assert break_even_price_change(60, 90) != Decimal("0.0104")


# ---------------------------------------------------------------------------
# Binding to a supplier
# ---------------------------------------------------------------------------

class TestSupplierBinding:
    def _run(self, calc_type, specs, facts=None):
        return run_economic_profit_scenarios(
            facts or _facts(), ScenarioRequest(calc_type=calc_type, scenarios=specs)
        )

    def test_annual_spend_and_the_contract_term_come_from_the_supplier(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))],
        )
        result = analysis.scenarios[0].result
        assert result.annual_spend == Decimal("12000000.00")
        assert result.contract_terms == 60
        assert result.economic_profit == Decimal("3271.23")

    def test_the_baseline_is_the_contractual_term_not_the_actual_paid_term(self):
        """`current_term_days` is the CONTRACTUAL term; `actual_payment_terms_days`
        is how we behave. The workbook uses the contractual one."""
        from dataclasses import replace

        facts = replace(_facts(), actual_payment_terms_days=72)
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))],
            facts=facts,
        )
        assert analysis.scenarios[0].result.contract_terms == 60

    def test_extend_by_thirty_days_resolves_against_the_contract_term(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(extension_days=30, price_change=Decimal("0.01"))],
        )
        assert analysis.scenarios[0].result.target_terms == 90

    def test_a_destination_wins_when_extraction_sends_both_readings(self):
        """The prompt asks for one or the other, but "extend by 30 days to 90"
        reads as both and comes back with both filled. The destination is the
        term the negotiator named out loud, so it wins - and the delta is not
        added on top of it, which would model 120 days."""
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [
                EconomicProfitScenarioSpec(
                    target_term_days=90, extension_days=30, price_change=Decimal("0.01")
                )
            ],
        )
        assert analysis.scenarios[0].result.target_terms == 90

    def test_a_term_only_move_is_valued_at_the_cost_of_capital(self):
        """"What is the financial impact if I move from 60 to 120 days?"

        No price leg at all, so economic profit IS the working-capital value:
        the return on the freed cash, not the freed cash itself. $12M x 60
        days / 365 x 8% = $157.8K, against a $1.97M cash-flow swing.
        """
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(target_term_days=120, price_change=Decimal("0"))],
        )
        result = analysis.scenarios[0].result
        assert result.after_tax_operating_profit_change == Decimal("0.00")
        assert result.economic_profit == Decimal("157808.22")
        assert result.economic_profit == result.value_of_invested_capital
        assert result.cash_flow_impact == Decimal("1972602.74")
        assert result.financial_outcome == FINANCIALLY_POSITIVE

    def test_a_scenario_naming_no_term_leaves_the_term_unchanged(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(price_change=Decimal("-0.01"))],
        )
        assert analysis.scenarios[0].result.target_terms == 60
        assert analysis.scenarios[0].result.economic_profit > 0

    def test_the_break_even_rides_along_with_every_term_move(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))],
        )
        assert analysis.break_even_price_change is not None

    def test_a_trade_off_with_no_price_named_answers_with_the_break_even(self):
        """§13: the reverse calculation IS the answer to "should I give them a
        price increase for 90 days?" — better than a clarifying round-trip."""
        analysis = self._run(
            CALC_ECONOMIC_PROFIT, [EconomicProfitScenarioSpec(target_term_days=90)]
        )
        assert analysis.error is None
        assert analysis.calc_type == CALC_BREAK_EVEN_PRICE
        assert analysis.break_even_price_change == pytest.approx(
            Decimal("0.01043"), abs=Decimal("0.00001")
        )
        assert any("break-even" in note for note in analysis.notes)

    def test_a_scenario_that_moves_nothing_is_refused_rather_than_answered(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(price_change=Decimal("0"))],
        )
        assert analysis.error is not None
        assert not analysis.scenarios

    def test_a_break_even_needs_a_term_move_to_measure(self):
        analysis = self._run(CALC_BREAK_EVEN_PRICE, [EconomicProfitScenarioSpec()])
        assert analysis.error is not None

    def test_comparison_runs_both_through_the_same_calculator(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT_COMPARE,
            [
                EconomicProfitScenarioSpec(target_term_days=75),
                EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01")),
            ],
        )
        assert len(analysis.scenarios) == 2
        first, second = (s.result for s in analysis.scenarios)
        # 75 days at the current price beats 90 days bought with +1%.
        assert analysis.difference == first.economic_profit - second.economic_profit
        assert analysis.difference > 0

    def test_an_unstated_price_in_a_comparison_is_the_current_price(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT_COMPARE,
            [
                EconomicProfitScenarioSpec(target_term_days=75),
                EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01")),
            ],
        )
        assert analysis.scenarios[0].result.price_change_pct == Decimal("0")

    def test_a_sensitivity_sweep_is_the_same_comparison_with_more_scenarios(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT_COMPARE,
            [
                EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal(p))
                for p in ("0.005", "0.01", "0.015", "0.02")
            ],
        )
        profits = [s.result.economic_profit for s in analysis.scenarios]
        assert profits == sorted(profits, reverse=True)
        assert profits[0] > 0 and profits[-1] < 0
        # Only a two-way comparison has a single "difference" to report.
        assert analysis.difference is None

    def test_the_compensating_discount_equalises_the_two_scenarios(self):
        analysis = self._run(
            CALC_COMPENSATING_PRICE_CHANGE,
            [
                EconomicProfitScenarioSpec(target_term_days=90),
                EconomicProfitScenarioSpec(target_term_days=60),
            ],
        )
        assert analysis.solved_price_change < 0
        wanted, alternative = (s.result for s in analysis.scenarios)
        assert alternative.economic_profit == pytest.approx(
            wanted.economic_profit, abs=Decimal("1")
        )

    def test_a_discount_the_supplier_already_named_is_evaluated_not_overwritten(self):
        """"They rejected 90 days but offered 1% if we stay at 60."

        The 1% is the scenario, not a slot to solve into. It gets evaluated
        and compared; the solved equivalence price rides along as what the
        discount would have to be.
        """
        analysis = self._run(
            CALC_COMPENSATING_PRICE_CHANGE,
            [
                EconomicProfitScenarioSpec(target_term_days=90),
                EconomicProfitScenarioSpec(target_term_days=60, price_change=Decimal("-0.01")),
            ],
        )
        wanted, offered = (s.result for s in analysis.scenarios)
        assert offered.price_change_pct == Decimal("-0.01")
        # 1% is slightly short of the ~1.03% that would make them equal.
        assert analysis.difference > 0
        assert analysis.solved_price_change < Decimal("-0.01")

    def test_missing_spend_is_named_precisely_and_nothing_is_invented(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))],
            facts=_facts(spend_volume=None),
        )
        assert not analysis.scenarios
        assert "annual spend" in analysis.error

    def test_missing_contract_term_is_named_precisely(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))],
            facts=_facts(current_term_days=None),
        )
        assert not analysis.scenarios
        assert "contractual payment term" in analysis.error

    def test_scenario_labels_are_deterministic(self):
        analysis = self._run(
            CALC_ECONOMIC_PROFIT,
            [EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))],
        )
        assert analysis.scenarios[0].label == "90 days at +1% price"


# ---------------------------------------------------------------------------
# The compensating discount, spend-free
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("contract,target", [(34, 75), (60, 90), (50, 90), (30, 120)])
def test_the_spend_free_compensating_discount_is_the_general_solve(contract, target):
    """The closed form exists so the playbook concession can quote it for a
    supplier with no spend on file. It must never drift from the solver every
    other reverse question uses."""
    from domain.services.economic_profit import compensating_price_change

    wanted = calculate_economic_profit(_SPEND, contract, target, 0).economic_profit
    solved = solve_price_change_for_target_economic_profit(_SPEND, contract, contract, wanted)
    assert compensating_price_change(contract, target) == pytest.approx(solved, abs=Decimal("1e-9"))
    assert compensating_price_change(contract, target) < 0  # a discount


# ---------------------------------------------------------------------------
# Baseline precedence: what the negotiator stated beats the supplier's facts
# ---------------------------------------------------------------------------

class TestStatedBaselineWins:
    """"Assume annual spend is $12M and move from 60 to 90 days at +1%."

    A negotiator who names their own starting term or spend is running a
    hypothetical against THAT figure. Substituting the supplier's answers a
    question nobody asked, and because economic profit is two large legs
    nearly cancelling, a wrong baseline does not look wrong - it just quietly
    prices the move off the wrong number of days.

    The supplier here is deliberately unlike the scenario: 30-day contractual
    term, $88M of spend.
    """

    # 30 days / $88M — nothing like the scenarios below.
    def _supplier(self):
        return _facts(spend_volume=88_000_000.0, current_term_days=30, target_term_days=60)

    def _run(self, spec):
        return run_economic_profit_scenarios(
            self._supplier(),
            ScenarioRequest(calc_type=CALC_ECONOMIC_PROFIT, scenarios=[spec]),
        ).scenarios[0].result

    def test_a_stated_starting_term_is_the_baseline(self):
        """A — "move from 60 to 90 at +1.5%": 60 -> 90, spend still the supplier's."""
        result = self._run(
            EconomicProfitScenarioSpec(
                current_term_days=60, target_term_days=90, price_change=Decimal("0.015")
            )
        )
        assert (result.contract_terms, result.target_terms) == (60, 90)
        assert result.term_change_days == 30
        assert result.annual_spend == Decimal("88000000.00")
        assert result.price_change_pct == Decimal("0.015")

    def test_a_stated_spend_and_starting_term_both_win(self):
        """B — "annual spend is $12M, move from 60 to 90 at +1%".

        The workbook case, reached with a supplier whose every figure differs:
        if either baseline leaked through, this would not land on +$3,271.23.
        """
        result = self._run(
            EconomicProfitScenarioSpec(
                annual_spend=Decimal("12000000"),
                current_term_days=60,
                target_term_days=90,
                price_change=Decimal("0.01"),
            )
        )
        assert result.annual_spend == Decimal("12000000.00")
        assert (result.contract_terms, result.target_terms) == (60, 90)
        assert result.economic_profit == Decimal("3271.23")

    def test_an_extension_with_no_stated_baseline_runs_off_the_supplier(self):
        """C — "extend by 30 days at +1%": the delta lands on the supplier's 30."""
        result = self._run(
            EconomicProfitScenarioSpec(extension_days=30, price_change=Decimal("0.01"))
        )
        assert (result.contract_terms, result.target_terms) == (30, 60)
        assert result.annual_spend == Decimal("88000000.00")

    def test_a_destination_alone_leaves_the_supplier_baseline_alone(self):
        """D — "move to 90 days at +1%": the target is stated, the baseline is not."""
        result = self._run(
            EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))
        )
        assert (result.contract_terms, result.target_terms) == (30, 90)
        assert result.annual_spend == Decimal("88000000.00")

    def test_an_extension_is_a_delta_off_the_stated_baseline(self):
        """"we're on 60 today - what does extending by 30 do?" is 60 -> 90.

        The delta resolves against the baseline the negotiator gave, not the
        supplier's 30, which would model 30 -> 60.
        """
        result = self._run(
            EconomicProfitScenarioSpec(
                current_term_days=60, extension_days=30, price_change=Decimal("0.01")
            )
        )
        assert (result.contract_terms, result.target_terms) == (60, 90)

    def test_a_stated_spend_stands_in_for_a_supplier_with_none_on_file(self):
        """The stated figure is a real input, not an override of an existing
        one: with no spend on file this now runs instead of refusing."""
        analysis = run_economic_profit_scenarios(
            _facts(spend_volume=None, current_term_days=60),
            ScenarioRequest(
                calc_type=CALC_ECONOMIC_PROFIT,
                scenarios=[
                    EconomicProfitScenarioSpec(
                        annual_spend=Decimal("12000000"),
                        target_term_days=90,
                        price_change=Decimal("0.01"),
                    )
                ],
            ),
        )
        assert analysis.error is None
        assert analysis.scenarios[0].result.economic_profit == Decimal("3271.23")

    def test_a_stated_term_stands_in_for_a_supplier_with_none_on_file(self):
        analysis = run_economic_profit_scenarios(
            _facts(current_term_days=None),
            ScenarioRequest(
                calc_type=CALC_ECONOMIC_PROFIT,
                scenarios=[
                    EconomicProfitScenarioSpec(
                        current_term_days=60, target_term_days=90, price_change=Decimal("0.01")
                    )
                ],
            ),
        )
        assert analysis.error is None
        assert analysis.scenarios[0].result.contract_terms == 60

    def test_nothing_stated_and_nothing_on_file_is_still_refused(self):
        """Precedence ends in the missing-input handling it always did — a
        stated baseline is the only thing that fills the gap."""
        analysis = run_economic_profit_scenarios(
            _facts(spend_volume=None, current_term_days=None),
            ScenarioRequest(
                calc_type=CALC_ECONOMIC_PROFIT,
                scenarios=[
                    EconomicProfitScenarioSpec(target_term_days=90, price_change=Decimal("0.01"))
                ],
            ),
        )
        assert not analysis.scenarios
        assert "annual spend" in analysis.error

    def test_a_comparison_weighs_both_scenarios_off_the_same_stated_baseline(self):
        """A baseline stated once governs every scenario in the message.

        Two scenarios measured from two different starting terms are not
        comparable, so the difference between them would be meaningless.
        """
        analysis = run_economic_profit_scenarios(
            self._supplier(),
            ScenarioRequest(
                calc_type=CALC_ECONOMIC_PROFIT_COMPARE,
                scenarios=[
                    EconomicProfitScenarioSpec(
                        annual_spend=Decimal("12000000"),
                        current_term_days=60,
                        target_term_days=90,
                        price_change=Decimal("0.01"),
                    ),
                    EconomicProfitScenarioSpec(target_term_days=75, price_change=Decimal("0")),
                ],
            ),
        )
        first, second = (s.result for s in analysis.scenarios)
        assert first.contract_terms == second.contract_terms == 60
        assert first.annual_spend == second.annual_spend == Decimal("12000000.00")
        assert second.target_terms == 75

    def test_the_break_even_is_measured_from_the_stated_baseline(self):
        """The break-even depends on the term MOVE, so the baseline decides it:
        60 -> 90 is ~1.043%, the supplier's 30 -> 90 is a different number."""
        analysis = run_economic_profit_scenarios(
            self._supplier(),
            ScenarioRequest(
                calc_type=CALC_BREAK_EVEN_PRICE,
                scenarios=[
                    EconomicProfitScenarioSpec(current_term_days=60, target_term_days=90)
                ],
            ),
        )
        assert analysis.break_even_price_change == pytest.approx(
            break_even_price_change(60, 90), abs=Decimal("1e-12")
        )
        assert analysis.break_even_price_change == pytest.approx(
            Decimal("0.01043"), abs=Decimal("0.00001")
        )
