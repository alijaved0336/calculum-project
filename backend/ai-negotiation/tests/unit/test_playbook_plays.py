"""The client's approved plays: wording, section membership, availability.

Client 2026-09-10: four-section playbook. Approved-plays prompt block was
dropped (arguments come from key_argument_bullets; treasury from the opening
line block). Registry tests remain.
"""
from __future__ import annotations

import pytest

from domain.entities.playbook_plays import (
    PLAYBOOK_PLAYS,
    SECTION_OBJECTIONS_AND_CONCESSIONS,
    SECTION_OPENING_AND_ARGUMENTATION,
    TERM_PLACEHOLDER,
    play_by_key,
    plays_for_section,
)
from utils.prompts.negotiation_guide_prompt import (
    REQUIRED_PLAYBOOK_SECTIONS,
    negotiation_guide_system_prompt as SYSTEM,
)


@pytest.mark.parametrize(
    "key,title,section",
    [
        ("mandatoryTreasuryPolicy", "Opening Line", SECTION_OPENING_AND_ARGUMENTATION),
        ("parentOrSupplierMax", "Parent/Supplier Maximum Precedent", SECTION_OPENING_AND_ARGUMENTATION),
        ("supplierStandard", "Supplier Standard / Existing Relationship Precedent", SECTION_OPENING_AND_ARGUMENTATION),
        ("peerGroupBenchmarking", "Peer Group Standard / Industry Benchmarking", SECTION_OPENING_AND_ARGUMENTATION),
        ("relationshipValue", "Relationship Value / Strategic Partnership", SECTION_OPENING_AND_ARGUMENTATION),
        ("costImpact", "Cost Impact / Working Capital Impact", SECTION_OPENING_AND_ARGUMENTATION),
        ("pricingThreat", "Pricing Threat / Discount Equivalent", SECTION_OBJECTIONS_AND_CONCESSIONS),
        ("multiPhaseTransition", "Multi-Phase Transition", SECTION_OBJECTIONS_AND_CONCESSIONS),
        ("discountOffering", "Discount Offering", SECTION_OBJECTIONS_AND_CONCESSIONS),
    ],
)
def test_each_play_keeps_its_name_and_section(key, title, section):
    play = play_by_key(key)
    assert play is not None, key
    assert play.title == title
    assert section in play.sections


def test_the_treasury_policy_wording_uses_company_compliance():
    play = play_by_key("mandatoryTreasuryPolicy")
    assert "company compliance" in play.description
    assert "ERP system compliance" not in play.description
    assert SECTION_OPENING_AND_ARGUMENTATION in play.sections


def test_every_play_names_a_real_playbook_section():
    for play in PLAYBOOK_PLAYS:
        for section in play.sections:
            assert section in REQUIRED_PLAYBOOK_SECTIONS, (play.key, section)


def test_play_keys_are_unique():
    keys = [play.key for play in PLAYBOOK_PLAYS]
    assert len(keys) == len(set(keys))


def test_the_term_placeholder_is_substituted():
    play = play_by_key("mandatoryTreasuryPolicy")
    assert "Net 75" in play.render(75)
    assert TERM_PLACEHOLDER not in play.render(75)


def test_a_missing_term_leaves_no_bracketed_placeholder():
    play = play_by_key("multiPhaseTransition")
    rendered = play.render(None)
    assert TERM_PLACEHOLDER not in rendered
    assert "the proposed term" in rendered


def test_plays_for_section_unfiltered_returns_the_catalogue_view():
    titles = [p.title for p in plays_for_section(SECTION_OPENING_AND_ARGUMENTATION)]
    assert "Opening Line" in titles
    assert "Parent/Supplier Maximum Precedent" in titles


def test_the_pricing_threat_play_stays_in_the_registry_but_not_in_objections_engine():
    from domain.services.objections import build_objection_plan
    from tests.unit.prompt_fixtures import rich_facts

    play = play_by_key("pricingThreat")
    assert SECTION_OBJECTIONS_AND_CONCESSIONS in play.sections
    counters = [
        counter
        for o in build_objection_plan(rich_facts()).objections
        for counter in o.counters
    ]
    assert play.say not in counters


def test_cost_impact_serves_opening_and_objections():
    assert play_by_key("costImpact").sections == (
        SECTION_OPENING_AND_ARGUMENTATION,
        SECTION_OBJECTIONS_AND_CONCESSIONS,
    )


@pytest.mark.parametrize(
    "key,fragment",
    [
        ("multiPhaseTransition", "we can phase the rollout so you transition gradually"),
        ("discountOffering", "an alternative arrangement of agreed cash-discount"),
    ],
)
def test_the_concession_plays_reach_the_playbook_through_the_engine(key, fragment):
    from domain.services.concessions import build_concession_plan
    from tests.unit.prompt_fixtures import rich_facts

    assert fragment in play_by_key(key).spoken_line(75)
    plan = build_concession_plan(
        rich_facts(target_term_days=90, opportunity_term_days=90, current_term_days=50),
        scf_enabled=False,
    )
    assert any(fragment in c.offer for c in plan.concessions), key


def test_the_spoken_line_takes_the_term_too():
    line = play_by_key("multiPhaseTransition").spoken_line(75)
    assert "Net 75" in line
    assert TERM_PLACEHOLDER not in line


def test_an_evidence_play_points_at_the_argument_catalogue():
    play = play_by_key("parentOrSupplierMax")
    assert play.say is None
    assert play.pitch_from_argument == "parentOrSupplierMax"


def test_every_play_supplies_wording_one_way_or_the_other():
    for play in PLAYBOOK_PLAYS:
        assert play.say or play.pitch_from_argument, play.key


def test_the_prompt_requires_four_sections_and_treasury_opening():
    assert "Do NOT write this section" in SYSTEM
    assert "Opening Line" in SYSTEM
    assert "NO Opening Anchor" in SYSTEM
    assert "1. Target and BATNA" in SYSTEM
    assert "4. Rationale" in SYSTEM
    assert "appended after generation" in SYSTEM

def test_every_play_declares_its_sections_as_a_tuple_of_known_headings():
    for play in PLAYBOOK_PLAYS:
        assert isinstance(play.sections, tuple), play.key
        for section in play.sections:
            assert section in REQUIRED_PLAYBOOK_SECTIONS, f"{play.key}: {section!r}"
