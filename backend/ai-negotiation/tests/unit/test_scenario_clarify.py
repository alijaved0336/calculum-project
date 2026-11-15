"""Unit tests for agents.nodes.scenario's deterministic clarify wording.

Pure function, no LLM — safe to test directly.
"""
from __future__ import annotations

from agents.nodes.scenario import _build_clarify_message
from domain.entities.facts import SupplierFacts
from domain.entities.scenario import ScenarioRequest


def _facts(current_term_days: int | None) -> SupplierFacts:
    return SupplierFacts(
        supplier_name="Acme",
        country="DE",
        industry="Manufacturing",
        company_size="large",
        target_term_days=60,
        current_term_days=current_term_days,
        batna_term_days=None,
        benchmark_term_days=None,
        regulatory_max_term_days=None,
    )


class TestBareNumberClarify:
    def test_uses_current_term_when_known(self):
        request = ScenarioRequest(calc_type="clarify", target_term_days=10.0)
        msg = _build_clarify_message(_facts(30), request)
        assert "30" in msg
        assert "extend the term by 10 days" in msg

    def test_zero_current_term_not_woven_in_as_baseline(self):
        # current_term_days == 0 is the "not recorded" sentinel — the clarify
        # wording must fall back to the no-baseline phrasing, never state a
        # bogus "0 -> 10" reading.
        request = ScenarioRequest(calc_type="clarify", target_term_days=10.0)
        msg = _build_clarify_message(_facts(0), request)
        assert "0 ->" not in msg and "0 →" not in msg
        assert "extend the current term by 10 days" in msg

    def test_missing_current_term_uses_generic_wording(self):
        request = ScenarioRequest(calc_type="clarify", target_term_days=10.0)
        msg = _build_clarify_message(_facts(None), request)
        assert "extend the current term by 10 days" in msg


class TestFullyGenericClarify:
    def test_no_numbers_asks_open_question(self):
        # calc_type="clarify" with no extension_days/target_term_days is what
        # the extraction step now emits for a fully generic "run a scenario"
        # ask — no silent default, an actual clarifying question instead.
        request = ScenarioRequest(calc_type="clarify")
        msg = _build_clarify_message(_facts(30), request)
        assert "extending the current term by a number of days" in msg
        assert "moving to a specific new term" in msg
        # Never silently assume the old 15-day harmonization step.
        assert "15" not in msg
