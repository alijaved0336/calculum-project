"""The SCF rate gate — how far above the supplier's own borrowing we may still go.

Client rule (2026-08-26): SCF is worth offering even when our programme rate is
higher than the supplier's own financing rate, up to a ceiling of
``SCF_RATE_TOLERANCE_PTS``. Inside that band the offer stands on day-5
settlement and off-balance-sheet treatment, so what is pinned here is both the
boundary AND ``undercuts_supplier_rate`` — the flag every surface checks before
claiming a saving.
"""
from __future__ import annotations

import pytest

from domain.services.scf_analysis import SCF_RATE_TOLERANCE_PTS, analyze_scf_viability
from tests.unit.prompt_fixtures import rich_facts


def _viability(scf_rate, supplier_rate):
    return analyze_scf_viability(
        rich_facts(scf_rate=scf_rate, supplier_financing_rate=supplier_rate), {}
    )


def test_undercutting_is_viable_with_a_positive_spread():
    v = _viability(0.05, 0.08)
    assert v.viable
    assert v.undercuts_supplier_rate
    assert v.rate_spread_pts == 3.0


def test_matching_their_rate_is_viable_but_not_a_saving():
    v = _viability(0.05, 0.05)
    assert v.viable
    assert not v.undercuts_supplier_rate
    assert v.rate_spread_pts == 0.0


@pytest.mark.parametrize("scf_rate", [0.0525, 0.055, 0.06])
def test_premium_within_the_tolerance_stays_viable(scf_rate):
    v = _viability(scf_rate, 0.05)
    assert v.viable
    assert not v.undercuts_supplier_rate
    # Signed spread: negative means we cost more.
    assert v.rate_spread_pts < 0


def test_exactly_the_tolerance_is_still_offered():
    """The boundary is the whole point of the rule — a full point above their
    rate is the maximum, not the first rejection."""
    v = _viability(0.065, 0.055)
    assert v.viable
    assert v.rate_spread_pts == -SCF_RATE_TOLERANCE_PTS


def test_beyond_the_tolerance_is_not_competitive():
    v = _viability(0.0651, 0.055)
    assert not v.viable
    assert v.inviable_reason == "not_competitive"


def test_missing_rates_are_still_hard_blocks():
    assert _viability(None, 0.05).inviable_reason == "no_scf_rate"
    assert _viability(0.05, None).inviable_reason == "no_supplier_rate"
