"""The concessions engine — playbook section 6, decided in code.

Client spec (2026-08-25): a ranked ladder of four named concessions, cheapest
rung first, each appearing only when its condition is met. What is pinned here
is the GATES and the discount ARITHMETIC — a rung offered without its condition
is a concession the negotiator cannot actually make.
"""
from __future__ import annotations

import pytest

from domain.services.concessions import (
    PHASED_ROLLOUT_MIN_GAP_DAYS,
    build_concession_plan,
)
from tests.unit.prompt_fixtures import rich_facts


def _facts(**kw):
    """Ask 90, current 50 — a 40-day extension, so B and C both qualify."""
    base = dict(
        target_term_days=90,
        opportunity_term_days=90,
        current_term_days=50,
        buyer_leverage_level="medium",
        # Offerable rates by default: rung A is gated on viability now, so a
        # fixture with no rates would silently drop it from every ladder test.
        scf_rate=0.031,
        supplier_financing_rate=0.08,
        dso=None,
        spend_volume=None,
    )
    base.update(kw)
    return rich_facts(**base)


def _keys(scf_enabled: bool = False, **kw) -> list[str]:
    plan = build_concession_plan(_facts(**kw), scf_enabled=scf_enabled)
    return [c.key for c in plan.concessions]


def _one(key: str, scf_enabled: bool = False, **kw):
    plan = build_concession_plan(_facts(**kw), scf_enabled=scf_enabled)
    return next(c for c in plan.concessions if c.key == key)


# ── A. SCF Program Access — the conditional rung ───────────────────────────


def test_scf_is_offered_only_when_scf_is_enabled():
    """The whole point of the rung, and a fail-closed gate: offering a financing
    programme this client does not have is what SCF policy exists to prevent."""
    assert "scfAccess" in _keys(scf_enabled=True)
    assert "scfAccess" not in _keys(scf_enabled=False)


def test_scf_stays_off_even_when_the_rate_survives_on_the_facts():
    """`scf_enabled` decides first, never the presence of a rate. Inferring the
    gate from a surviving `scf_rate` is how a fail-closed gate becomes
    fail-open."""
    assert "scfAccess" not in _keys(scf_enabled=False, scf_rate=0.031)


def test_scf_is_dropped_when_the_programme_is_not_offerable_on_rate():
    """Second gate (client, 2026-08-27): enabled is not enough. A programme
    priced too far above this supplier's own borrowing is refused by every other
    SCF surface, so the ladder must not offer it either."""
    assert "scfAccess" not in _keys(scf_enabled=True, scf_rate=0.08, supplier_financing_rate=0.029)
    assert "scfAccess" not in _keys(scf_enabled=True, scf_rate=None)
    assert "scfAccess" not in _keys(scf_enabled=True, supplier_financing_rate=None)


def test_scf_is_still_offered_inside_the_rate_tolerance():
    """Up to a point above their own rate the rung stands — on settlement timing
    rather than on price, and the condition says so."""
    keys = _keys(scf_enabled=True, scf_rate=0.06, supplier_financing_rate=0.055)
    assert "scfAccess" in keys
    rung = _one("scfAccess", True, scf_rate=0.06, supplier_financing_rate=0.055)
    assert "does NOT undercut" in rung.when_to_use
    assert "never as cheaper money" in rung.when_to_use


def test_the_condition_claims_the_price_advantage_only_when_there_is_one():
    assert "cheaper than the supplier's own borrowing" in _one("scfAccess", True).when_to_use


def test_scf_leads_the_ladder_when_it_is_available():
    """Cheapest rung: the facility fee, and the term does not move."""
    assert _keys(scf_enabled=True)[0] == "scfAccess"
    assert "nothing is conceded on the number" in _one("scfAccess", True).cost_note


def test_the_scf_talking_points_carry_this_suppliers_figures():
    concession = _one("scfAccess", True, dso=80, spend_volume=56_347_149.0)
    points = " ".join(concession.talking_points)
    assert "from around 80 days to day 5" in points
    # Receivables identity: spend x days / 365, today against day-5 settlement.
    assert "$12.35M" in points and "$772K" in points
    assert "Operating cash flow improves" in points
    assert "Off-balance-sheet" in points


def test_the_rate_arbitrage_point_needs_both_rates_and_a_real_advantage():
    def points(**kw):
        return " ".join(_one("scfAccess", True, **kw).talking_points)

    assert "Rate arbitrage" in points(scf_rate=0.031, supplier_financing_rate=0.08)
    # Offerable, but priced above them — there is no advantage to claim. (A
    # bigger gap than the tolerance drops the rung entirely; see the gate test.)
    assert "Rate arbitrage" not in points(scf_rate=0.06, supplier_financing_rate=0.055)


def test_the_scf_talking_points_never_quote_a_rate():
    points = " ".join(
        _one("scfAccess", True, scf_rate=0.031, supplier_financing_rate=0.08)
        .talking_points
    )
    assert "3.1" not in points and "0.031" not in points


def test_scf_survives_with_no_dso_or_spend():
    """The rung is still offerable; only the figures behind it drop out."""
    points = _one("scfAccess", True).talking_points
    assert points  # the off-balance-sheet point has no data behind it
    assert not any("days to day 5" in p for p in points)


# ── B. Phased Implementation Roadmap — gap > 25 ────────────────────────────


def test_a_big_move_opens_the_phased_rollout():
    assert "phasedRollout" in _keys()          # 90 - 50 = 40


def test_a_move_at_or_under_the_threshold_does_not():
    small = 50 + PHASED_ROLLOUT_MIN_GAP_DAYS   # exactly 25 — not "more than"
    assert "phasedRollout" not in _keys(
        target_term_days=small, opportunity_term_days=small
    )


def test_the_phased_rung_keeps_the_clients_own_wording():
    from domain.entities.playbook_plays import play_by_key

    offer = _one("phasedRollout").offer
    assert "we can phase the rollout so you transition gradually" in offer
    assert offer == play_by_key("multiPhaseTransition").spoken_line(90)


# ── C. Equivalent Discount — priced by the buyer economic-profit model ─────


@pytest.mark.parametrize("extension,expected", [
    # From a 50-day contract term. Exact solves in the comment; the ladder
    # quotes the quarter-point.
    (15, "0.5%"),    # 0.5145%
    (30, "1%"),      # 1.0289%
    (40, "1.25%"),   # 1.3719% - the client's old worked case gave 1% (40/365 x 9.5%)
    (45, "1.5%"),    # 1.5434%
    (60, "2%"),      # 2.0579%
    (90, "3%"),      # 3.0868%
    (120, "4%"),     # 4.1158%
])
def test_the_discount_is_the_economic_profit_solve_on_a_quarter_point(extension, expected):
    ask = 50 + extension
    concession = _one(
        "equivalentDiscount", target_term_days=ask, opportunity_term_days=ask
    )
    assert expected in concession.offer
    assert expected in concession.cost_note


def test_the_concession_and_a_what_if_quote_the_same_discount():
    """2026-09-21: one valuation of terms against price across the app.

    The concession used to price with its own formula (extension / 365 x 9.5%,
    no tax), so the playbook said 1% where a "what discount would compensate
    us?" what-if said 1.40% for the same move. Both now come from the same
    model; the concession only rounds it to the quarter-point.
    """
    from decimal import Decimal, ROUND_HALF_UP

    from domain.entities.economic_profit import (
        CALC_COMPENSATING_PRICE_CHANGE,
        EconomicProfitScenarioSpec,
    )
    from domain.entities.scenario import ScenarioRequest
    from domain.services.scenario_calculator import run_economic_profit_scenarios

    facts = _facts(target_term_days=90, opportunity_term_days=90, spend_volume=12_000_000.0)
    what_if = run_economic_profit_scenarios(
        facts,
        ScenarioRequest(
            calc_type=CALC_COMPENSATING_PRICE_CHANGE,
            scenarios=[
                EconomicProfitScenarioSpec(target_term_days=90),
                EconomicProfitScenarioSpec(target_term_days=facts.current_term_days),
            ],
        ),
    )
    solved = -what_if.solved_price_change * 100
    quarter = (solved / Decimal("0.25")).quantize(Decimal("1"), rounding=ROUND_HALF_UP) * Decimal("0.25")
    expected = f"{quarter.normalize():f}%"
    assert expected in _one("equivalentDiscount", **{
        "target_term_days": 90, "opportunity_term_days": 90, "spend_volume": 12_000_000.0,
    }).offer


def test_there_is_one_buyer_cost_of_capital_in_the_app():
    """The concession's private 9.5% is gone; the model's 8% is the only one."""
    import domain.services.concessions as concessions

    assert not hasattr(concessions, "BUYER_COST_OF_CAPITAL")


def test_a_discount_that_rounds_to_zero_is_not_offered():
    """3 days prices at about 0.10%, which rounds to nothing. A 0% discount is
    a rounding result, not a concession."""
    assert "equivalentDiscount" not in _keys(
        target_term_days=53, opportunity_term_days=53
    )


def test_the_discount_figure_is_flagged_as_calculated_not_approved():
    caution = _one("equivalentDiscount").caution
    assert "CALCULATED equivalent, not an approved price" in caution
    assert "never quote the cost of capital" in caution


# ── D. Volume / Wallet-Share Guarantee — high buyer leverage ───────────────


def test_the_volume_guarantee_needs_high_buyer_leverage():
    assert "volumeGuarantee" in _keys(buyer_leverage_level="high")
    for level in ("medium", "low", None):
        assert "volumeGuarantee" not in _keys(buyer_leverage_level=level)


def test_the_volume_guarantee_never_promises_a_quantity():
    concession = _one("volumeGuarantee", buyer_leverage_level="high")
    assert "how future volume and continuity" in concession.offer
    assert "never to a guaranteed quantity" in concession.caution


# ── the ladder itself ──────────────────────────────────────────────────────


def test_the_order_is_cheapest_first():
    assert _keys(
        scf_enabled=True, buyer_leverage_level="high", dso=80,
        spend_volume=56_347_149.0,
    ) == ["scfAccess", "phasedRollout", "equivalentDiscount", "volumeGuarantee"]


def test_a_supplier_with_nothing_to_offer_gets_an_empty_ladder():
    """Small move, no SCF, no leverage — and the section says so rather than
    inventing a fallback."""
    assert _keys(
        target_term_days=65, opportunity_term_days=65, buyer_leverage_level="low"
    ) == ["equivalentDiscount"]
    assert _keys(
        target_term_days=53, opportunity_term_days=53, buyer_leverage_level="low"
    ) == []
