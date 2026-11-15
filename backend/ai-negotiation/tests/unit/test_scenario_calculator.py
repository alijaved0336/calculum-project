"""Unit tests for domain.services.scenario_calculator.

All functions are pure and deterministic — no mocks needed.
"""
from __future__ import annotations

import pytest

from domain.entities.facts import SupplierFacts
from domain.entities.scenario import ScenarioCalculation, ScenarioRequest
from domain.services.scenario_calculator import (
    DAYS_PER_YEAR,
    calc_delta,
    calc_extension,
    calc_formula_explain,
    calc_ramp,
    calc_term_impact,
    calc_threshold,
    run_scenario_calculation,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _facts(
    spend_volume: float | None = 1_000_000.0,
    current_term_days: int | None = 30,
    target_term_days: int | None = 60,
    target_cash_flow: float | None = 82_000.0,
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
        target_cash_flow=target_cash_flow,
    )


def _req(**kwargs) -> ScenarioRequest:
    defaults = dict(calc_type="extension")
    defaults.update(kwargs)
    return ScenarioRequest(**defaults)


# ---------------------------------------------------------------------------
# calc_extension
# ---------------------------------------------------------------------------

class TestCalcExtension:
    def test_happy_path(self):
        facts = _facts(spend_volume=730_000.0)
        result = calc_extension(facts, extension_days=365.0)
        assert result.calc_type == "extension"
        assert result.value == pytest.approx(730_000.0)
        assert result.inputs["extension_days"] == 365.0
        assert result.inputs["spend_volume"] == 730_000.0

    def test_partial_year(self):
        facts = _facts(spend_volume=365_000.0)
        result = calc_extension(facts, extension_days=73.0)
        expected = 365_000.0 * 73.0 / DAYS_PER_YEAR
        assert result.value == pytest.approx(expected)

    def test_no_spend_returns_none_value(self):
        result = calc_extension(_facts(spend_volume=None), extension_days=30.0)
        assert result.value is None
        assert result.calc_type == "extension"
        assert result.notes  # must carry an explanatory note


# ---------------------------------------------------------------------------
# calc_term_impact
# ---------------------------------------------------------------------------

class TestCalcTermImpact:
    def test_happy_path(self):
        facts = _facts(spend_volume=365_000.0, current_term_days=30)
        result = calc_term_impact(facts, target_term_days=60.0)
        expected = 365_000.0 * 30.0 / DAYS_PER_YEAR
        assert result.calc_type == "term_impact"
        assert result.value == pytest.approx(expected)
        assert result.inputs["extension_days"] == pytest.approx(30.0)

    def test_no_spend(self):
        result = calc_term_impact(_facts(spend_volume=None), target_term_days=60.0)
        assert result.value is None
        assert result.notes

    def test_no_baseline(self):
        result = calc_term_impact(
            _facts(spend_volume=500_000.0, current_term_days=None),
            target_term_days=60.0,
        )
        assert result.value is None
        assert result.notes

    def test_target_below_current_gives_negative(self):
        facts = _facts(spend_volume=365_000.0, current_term_days=60)
        result = calc_term_impact(facts, target_term_days=30.0)
        assert result.value == pytest.approx(-365_000.0 * 30.0 / DAYS_PER_YEAR)

    def test_zero_current_term_treated_as_missing_baseline(self):
        # current_term_days == 0 is the upstream "not recorded yet" sentinel,
        # never a genuine 0-day term — must be refused exactly like None,
        # not silently used as a real baseline.
        result = calc_term_impact(
            _facts(spend_volume=500_000.0, current_term_days=0),
            target_term_days=60.0,
        )
        assert result.value is None
        assert result.notes


# ---------------------------------------------------------------------------
# calc_delta
# ---------------------------------------------------------------------------

class TestCalcDelta:
    def test_positive_delta(self):
        facts = _facts(spend_volume=365_000.0)
        result = calc_delta(facts, term_a=75.0, term_b=60.0)
        expected = 365_000.0 * 15.0 / DAYS_PER_YEAR
        assert result.calc_type == "delta"
        assert result.value == pytest.approx(expected)

    def test_negative_delta(self):
        facts = _facts(spend_volume=365_000.0)
        result = calc_delta(facts, term_a=45.0, term_b=60.0)
        assert result.value == pytest.approx(-365_000.0 * 15.0 / DAYS_PER_YEAR)

    def test_zero_delta(self):
        facts = _facts(spend_volume=500_000.0)
        result = calc_delta(facts, term_a=60.0, term_b=60.0)
        assert result.value == pytest.approx(0.0)

    def test_baseline_not_required(self):
        # calc_delta must work even without current_term_days
        facts = _facts(spend_volume=365_000.0, current_term_days=None)
        result = calc_delta(facts, term_a=75.0, term_b=60.0)
        assert result.value is not None

    def test_no_spend(self):
        result = calc_delta(_facts(spend_volume=None), term_a=75.0, term_b=60.0)
        assert result.value is None
        assert result.notes


# ---------------------------------------------------------------------------
# calc_threshold
# ---------------------------------------------------------------------------

class TestCalcThreshold:
    def test_happy_path(self):
        facts = _facts(spend_volume=365_000.0, current_term_days=30)
        # to unlock 1000, need 1000 * 365 / 365000 = 1 extra day → target = 31
        result = calc_threshold(facts, target_amount=1_000.0)
        assert result.calc_type == "threshold"
        assert result.value == pytest.approx(31.0)
        assert result.inputs["extension_days"] == pytest.approx(1.0)

    def test_no_spend(self):
        result = calc_threshold(_facts(spend_volume=None), target_amount=50_000.0)
        assert result.value is None
        assert result.notes

    def test_no_baseline(self):
        result = calc_threshold(
            _facts(spend_volume=500_000.0, current_term_days=None),
            target_amount=50_000.0,
        )
        assert result.value is None
        assert result.notes

    def test_zero_current_term_treated_as_missing_baseline(self):
        result = calc_threshold(
            _facts(spend_volume=500_000.0, current_term_days=0),
            target_amount=50_000.0,
        )
        assert result.value is None
        assert result.notes


# ---------------------------------------------------------------------------
# calc_ramp
# ---------------------------------------------------------------------------

class TestCalcRamp:
    def test_happy_path(self):
        facts = _facts(spend_volume=365_000.0, current_term_days=30)
        # full_extension = 60 - 30 = 30 days
        # full_unlock = 365000 * 30/365
        # ramp_cost = full_unlock * (6/12) / 2
        full_unlock = 365_000.0 * 30.0 / DAYS_PER_YEAR
        expected_cost = full_unlock * (6.0 / 12.0) / 2.0
        result = calc_ramp(facts, target_term_days=60.0, ramp_months=6.0)
        assert result.calc_type == "ramp"
        assert result.value == pytest.approx(expected_cost)
        assert result.inputs["full_extension_days"] == pytest.approx(30.0)

    def test_no_spend(self):
        result = calc_ramp(_facts(spend_volume=None), target_term_days=60.0, ramp_months=6.0)
        assert result.value is None
        assert result.notes

    def test_no_baseline(self):
        result = calc_ramp(
            _facts(spend_volume=500_000.0, current_term_days=None),
            target_term_days=60.0,
            ramp_months=6.0,
        )
        assert result.value is None
        assert result.notes

    def test_notes_mention_linear_ramp(self):
        facts = _facts()
        result = calc_ramp(facts, target_term_days=60.0, ramp_months=3.0)
        assert any("linear" in n.lower() for n in result.notes)

    def test_zero_current_term_treated_as_missing_baseline(self):
        result = calc_ramp(
            _facts(spend_volume=500_000.0, current_term_days=0),
            target_term_days=60.0,
            ramp_months=6.0,
        )
        assert result.value is None
        assert result.notes


# ---------------------------------------------------------------------------
# calc_formula_explain
# ---------------------------------------------------------------------------

class TestCalcFormulaExplain:
    def test_full_data_surfaces_modeled_unlock(self):
        facts = _facts(
            spend_volume=365_000.0,
            current_term_days=30,
            target_term_days=60,
            target_cash_flow=99_000.0,
        )
        result = calc_formula_explain(facts)
        assert result.calc_type == "formula_explain"
        assert result.value == pytest.approx(99_000.0)  # upstream figure quoted as-is
        assert "modeled_unlock" in result.inputs
        assert result.inputs["modeled_unlock"] == pytest.approx(
            365_000.0 * 30.0 / DAYS_PER_YEAR
        )
        assert len(result.notes) >= 2

    def test_missing_spend_no_modeled(self):
        facts = _facts(spend_volume=None, current_term_days=30, target_term_days=60)
        result = calc_formula_explain(facts)
        assert "modeled_unlock" not in result.inputs
        assert result.notes

    def test_missing_current_term_no_modeled(self):
        facts = _facts(current_term_days=None, target_term_days=60)
        result = calc_formula_explain(facts)
        assert "modeled_unlock" not in result.inputs
        assert result.notes

    def test_zero_current_term_no_modeled(self):
        facts = _facts(current_term_days=0, target_term_days=60)
        result = calc_formula_explain(facts)
        assert "modeled_unlock" not in result.inputs
        assert result.notes

    def test_null_target_cash_flow(self):
        facts = _facts(target_cash_flow=None)
        result = calc_formula_explain(facts)
        assert result.value is None


# ---------------------------------------------------------------------------
# run_scenario_calculation (dispatcher)
# ---------------------------------------------------------------------------

class TestRunScenarioCalculation:
    def test_dispatches_extension(self):
        facts = _facts(spend_volume=365_000.0)
        req = _req(calc_type="extension", extension_days=30.0)
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "extension"
        assert result.value == pytest.approx(365_000.0 * 30.0 / DAYS_PER_YEAR)

    def test_dispatches_term_impact(self):
        facts = _facts(spend_volume=365_000.0, current_term_days=30)
        req = _req(calc_type="term_impact", target_term_days=60.0)
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "term_impact"

    def test_dispatches_delta(self):
        facts = _facts(spend_volume=365_000.0)
        req = _req(calc_type="delta", term_a=75.0, term_b=60.0)
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "delta"

    def test_dispatches_threshold(self):
        facts = _facts(spend_volume=365_000.0, current_term_days=30)
        req = _req(calc_type="threshold", target_amount=1_000.0)
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "threshold"

    def test_dispatches_ramp(self):
        facts = _facts()
        req = _req(calc_type="ramp", target_term_days=60.0, ramp_months=6.0)
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "ramp"

    def test_dispatches_formula_explain(self):
        facts = _facts()
        req = _req(calc_type="formula_explain")
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "formula_explain"

    def test_unsupported_calc_type(self):
        facts = _facts()
        req = _req(calc_type="magic_calc")
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "unsupported"
        assert result.value is None

    def test_missing_params_extension(self):
        facts = _facts()
        req = _req(calc_type="extension", extension_days=None)
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "unsupported"
        assert result.value is None

    def test_missing_params_delta_term_b(self):
        facts = _facts()
        req = _req(calc_type="delta", term_a=75.0, term_b=None)
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "unsupported"

    def test_missing_params_ramp_months(self):
        facts = _facts()
        req = _req(calc_type="ramp", target_term_days=60.0, ramp_months=None)
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "unsupported"

    def test_assumptions_appended_to_notes(self):
        facts = _facts(spend_volume=365_000.0)
        req = _req(
            calc_type="extension",
            extension_days=30.0,
            assumptions="defaulted to 30-day extension",
        )
        result = run_scenario_calculation(facts, req)
        assert any("defaulted to 30-day extension" in n for n in result.notes)

    def test_assumptions_appended_on_unsupported(self):
        facts = _facts()
        req = _req(
            calc_type="magic_calc",
            assumptions="some assumption",
            reasoning="not supported",
        )
        result = run_scenario_calculation(facts, req)
        assert result.calc_type == "unsupported"
        assert any("some assumption" in n for n in result.notes)
