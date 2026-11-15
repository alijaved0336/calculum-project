"""SCF's contribution to the playbook — sections 1 and 4.

Client rule (2026-08-26): where SCF is enabled AND offerable, the Opening
Position says the ask is supported by the availability of the programme, and Key
Arguments carries the two financing costs and what the difference between them
buys. What is pinned here is the GATE (nothing appears unless both conditions
hold) and WHICH claims are sayable — the rates never are, and the rate advantage
only when there is one.
"""
from __future__ import annotations

from domain.entities.brief import NegotiationBrief
from domain.services.brief_builder import brief_from
from domain.services.scf_playbook import (
    TITLE_EARLY_SETTLEMENT,
    TITLE_RATE_ADVANTAGE,
    TITLE_SCF_FINANCING_COST,
    SCF_KEY_ARGUMENT_TITLES,
    TITLE_SUPPLIER_FINANCING_COST,
    build_scf_playbook_plan,
)
from utils.prompts.negotiation_guide_prompt import _scf_block
from tests.unit.prompt_fixtures import rich_facts

# Undercutting rates, so only the session gate decides in the gating tests.
_CHEAP = dict(scf_rate=0.03, supplier_financing_rate=0.06)


def _plan(scf_enabled=True, **rates):
    return build_scf_playbook_plan(rich_facts(**{**_CHEAP, **rates}), scf_enabled=scf_enabled)


def test_nothing_when_scf_is_off_for_the_session():
    """Fail-closed: good rates on the payload never override the session gate."""
    assert _plan(scf_enabled=False) is None


def test_nothing_when_the_rate_puts_scf_out_of_reach():
    assert _plan(scf_rate=0.08, supplier_financing_rate=0.029) is None


def test_nothing_when_a_rate_is_missing():
    assert _plan(scf_rate=None) is None
    assert _plan(supplier_financing_rate=None) is None


def test_opening_position_gets_a_standalone_note_and_a_pitch():
    plan = _plan()
    assert "Supply Chain Finance" in plan.opening_note
    assert "early settlement" in plan.opening_note
    assert "Supply Chain Finance program" in plan.opening_pitch


def test_key_arguments_are_the_two_costs_then_the_advantage():
    titles = [a.title for a in _plan().key_arguments]
    assert titles == [
        TITLE_SUPPLIER_FINANCING_COST,
        TITLE_SCF_FINANCING_COST,
        TITLE_RATE_ADVANTAGE,
    ]


def test_neither_rate_is_sayable_but_both_are_printed():
    """Unsayable is not unprintable: the playbook is the negotiator's own doc,
    and a label with no number under it is not an argument."""
    costs = _plan().key_arguments[:2]
    assert [a.sayable for a in costs] == [False, False]
    assert "6.00%" in costs[0].figures and "3.00%" in costs[1].figures


def test_the_advantage_carries_the_spread_as_its_figure():
    assert _plan().key_arguments[2].figures.startswith("3.0 percentage points")


def test_the_advantage_is_pitched_when_we_actually_undercut_them():
    advantage = _plan().key_arguments[2]
    assert advantage.sayable
    assert "below typical supplier borrowing costs" in advantage.pitch


def test_within_the_tolerance_the_pitch_drops_the_rate_claim():
    """Offerable at a small premium — but there is no saving to promise, and the
    supplier can check that claim against their own bank."""
    plan = _plan(scf_rate=0.06, supplier_financing_rate=0.055)
    entry = plan.key_arguments[2]
    assert entry.title == TITLE_EARLY_SETTLEMENT
    assert entry.sayable
    assert "no rate advantage" in entry.figures
    assert "below typical supplier borrowing costs" not in entry.pitch
    assert "day 5" in entry.pitch
    assert not plan.undercuts_supplier_rate


def _block(scf_enabled: bool, **rates) -> str:
    facts = rich_facts(**{**_CHEAP, **rates})
    return _scf_block(brief_from(facts, scf_enabled=scf_enabled))


def test_the_prompt_block_is_silent_rather_than_negative_when_scf_is_off():
    """No block at all — the playbook is written as though SCF did not exist."""
    assert _block(False) == ""
    assert _block(True, scf_rate=0.08, supplier_financing_rate=0.029) == ""


def test_the_prompt_block_carries_both_sections_and_the_internal_marking():
    block = _block(True)
    assert "section 2" in block.lower() or "Opening Position and Argumentation" in block
    # The SCF financing-cost argument lines are gone: section 2's arguments
    # are the four benchmarks and nothing else (client, 2026-09-21).
    assert "NOT SAYABLE" not in block
    assert "How to pitch it:" not in block


def test_the_prompt_block_gives_section_1_as_two_labelled_bullets():
    """Written out as literal lines to copy — the model welded the clause
    version onto the end of the treasury quote.

    BULLETS, not paragraphs: `build_playbook_html` renders a section as one
    summary paragraph plus a bullet list, so a labelled paragraph after the
    first is dropped from the PDF outright.
    """
    block = _block(True)
    assert "  * **Supply Chain Finance**: The ask is enabled" in block
    assert "  * **Supplier-facing pitch**: We recognize" in block
    assert "LAST" in block and "bullets" in block.lower()


def test_the_prompt_block_offers_no_scf_argument_lines():
    """SCF financing costs are not benchmarks, so section 2 never argues them."""
    block = _block(True)
    for title in SCF_KEY_ARGUMENT_TITLES:
        assert title not in block, title


def test_the_prompt_block_warns_off_the_rate_claim_inside_the_tolerance():
    block = _block(True, scf_rate=0.06, supplier_financing_rate=0.055)
    assert "does NOT price below" in block
    assert "do NOT write this into the playbook" in block


def test_the_normalizer_splits_the_scf_items_off_the_opening_paragraph():
    """The backstop for what the model actually did: both items welded onto the
    end of the play's quoted sentence, section 1 as one wall of prose."""
    from utils.prompts.negotiation_guide_prompt import normalize_playbook_structure

    welded = (
        "1. Opening Position — *Data-justified first ask*\n"
        'Open at 80 days. "All active contracts must be updated." '
        "**Supply Chain Finance**: The ask is enabled by SCF. "
        '**Supplier-facing pitch**: "We recognize that payment term changes..."\n'
        "\n2. Target Outcome — *Intended landing zone*\nbody"
    )
    fixed = normalize_playbook_structure(welded)
    assert "\n* **Supply Chain Finance**: The ask is enabled by SCF." in fixed
    assert '\n* **Supplier-facing pitch**: "We recognize' in fixed
    assert normalize_playbook_structure(fixed) == fixed


# ── The two-gate rule, shared by every surface that OFFERS SCF ──────────────


def test_resolve_scf_viability_is_the_one_gate():
    """`scf_enabled` alone was letting the concession ladder offer a programme
    the pitch surfaces would refuse on rate (client, 2026-08-27)."""
    from domain.services.scf_analysis import resolve_scf_viability

    offerable = rich_facts(**_CHEAP)
    too_dear = rich_facts(scf_rate=0.08, supplier_financing_rate=0.029)

    assert resolve_scf_viability(offerable, scf_enabled=True) is not None
    assert resolve_scf_viability(offerable, scf_enabled=False) is None
    assert resolve_scf_viability(too_dear, scf_enabled=True) is None


def test_pushback_drops_the_scf_scripts_when_it_is_not_offerable():
    """A ready-made SCF counter for a programme this supplier cannot be offered
    is a move the negotiator cannot make."""
    from tests.unit.pushback_kb_fixture import fixture_kb
    from utils.prompts.pushback_prompt import build_pushback_prompt

    def block(**rates) -> str:
        return build_pushback_prompt(
            "Our margins are already thin.",
            rich_facts(**rates),
            counter_categories=[fixture_kb()["cost_of_factoring"]],
            scf_enabled=True,
        )

    assert "Rate Arbitrage" in block(**_CHEAP)
    assert "Rate Arbitrage" not in block(
        scf_rate=0.08, supplier_financing_rate=0.029
    )
