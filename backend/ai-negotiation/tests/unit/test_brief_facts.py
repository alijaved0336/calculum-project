"""The FACTS renderer: levels, and the attribution that cannot drift from them.

The thing these lock down is the reason the renderer exists. Seven prompts used
to carry a `_facts_block` plus a hand-written tuple of the fields it quoted, and
the two halves had drifted apart. Here they come from one declaration, and these
tests assert that they still agree — for every level, on both a rich supplier
and a sparse one.
"""
from __future__ import annotations

import pytest

from domain.services.brief_builder import brief_from
from utils.prompts.brief.facts import (
    LEVEL_FULL,
    LEVEL_MINIMAL,
    LEVEL_STANDARD,
    collect_fact_sources,
    fact_fields,
    format_money,
    render_facts,
)
from tests.unit.prompt_fixtures import rich_facts, sparse_facts

LEVELS = (LEVEL_MINIMAL, LEVEL_STANDARD, LEVEL_FULL)


def test_no_brief_renders_nothing():
    assert render_facts(None, level=LEVEL_FULL) == ""


@pytest.mark.parametrize("level", LEVELS)
def test_every_level_identifies_the_supplier_and_the_ask(level):
    """Whatever else a surface gets, it must know who and how much."""
    block = render_facts(brief_from(rich_facts()), level=level)
    assert "Acme Industrial GmbH" in block
    assert "- Current agreed term: 34 days" in block
    assert "- Target term: 76 days" in block


def test_levels_are_nested():
    """MINIMAL ⊂ STANDARD ⊂ FULL — a surface never loses a fact by moving up."""
    minimal, standard, full = (set(fact_fields(level)) for level in LEVELS)
    assert minimal < standard < full


def test_level_picks_the_detail_a_surface_needs():
    brief = brief_from(rich_facts())
    minimal = render_facts(brief, level=LEVEL_MINIMAL)
    standard = render_facts(brief, level=LEVEL_STANDARD)
    full = render_facts(brief, level=LEVEL_FULL)

    # The signals that say how the ask will be RECEIVED are at MINIMAL, not
    # STANDARD: they used to reach the drafting surfaces only as scored factors
    # inside the negotiating-strength block, and that composite is gone.
    for received in ("Buyer Leverage", "Credit Rating", "Success Probability"):
        assert received in minimal, received

    # The SME flag is a profile detail, not needed to write a sentence.
    assert "SME" not in minimal
    assert "SME" in standard

    # Benchmark figures are ARGUMENTS. A drafting surface reads them from the
    # argument block, in precedence order — never as a flat second list here.
    for benchmark_line in ("Peer Group Standard", "Industry/region benchmark"):
        assert benchmark_line not in standard
        assert benchmark_line in full


def test_absent_figures_are_dropped_not_printed_as_none():
    """A brief padded with null rows teaches the model that a missing figure is
    a value it can quote."""
    block = render_facts(brief_from(sparse_facts()), level=LEVEL_FULL)
    assert "None" not in block
    assert "Peer Group Standard" not in block   # no peer data at all
    assert "Highest spend-line opportunity" not in block


def test_internal_economics_render_under_their_own_heading():
    """Spend volume, the cash-flow unlock and the financing rates are the
    buyer's private leverage — they are never mixed in with the quotable facts."""
    block = render_facts(brief_from(rich_facts()), level=LEVEL_FULL)
    quotable, _, internal = block.partition("## INTERNAL FIGURES")
    assert internal, "the internal-figures heading is missing"
    assert format_money(12_400_000.0) in internal   # "$12.40M", not nine digits
    assert "Spend volume" not in quotable
    assert "Cash-flow unlock" not in quotable


def test_the_floor_is_opt_in_and_can_be_marked_internal():
    brief = brief_from(rich_facts())
    assert "walkaway" not in render_facts(brief, level=LEVEL_STANDARD).lower()

    plain = render_facts(brief, level=LEVEL_STANDARD, include_floor=True)
    assert "BATNA" in plain
    assert "walkaway" not in plain.lower()
    assert "fallback" not in plain.lower() or "fallback" not in render_facts(brief, level=LEVEL_STANDARD, include_floor=True).lower()
    # 75-day ask less 15 = 60 (§5).
    assert "60 days" in plain
    assert "[INTERNAL ONLY" not in plain

    internal = render_facts(
        brief, level=LEVEL_STANDARD, include_floor=True, floor_internal=True
    )
    assert "[INTERNAL ONLY, do not state to the supplier]" in internal


def test_the_floor_is_never_presented_as_a_benchmark():
    """A model that equates the computed reserve floor with a market benchmark
    will quote one as the other."""
    block = render_facts(brief_from(rich_facts()), level=LEVEL_FULL, include_floor=True)
    assert "computed reserve floor" in block


def test_the_ask_label_is_the_surface_s_own():
    brief = brief_from(rich_facts())
    assert "- Target term to propose: 76 days" in render_facts(
        brief, level=LEVEL_MINIMAL, ask_label="Target term to propose"
    )
    assert "- Target term (our ask): 76 days" in render_facts(
        brief, level=LEVEL_MINIMAL, ask_label="Target term (our ask)"
    )


def test_a_negotiator_set_target_is_marked_as_theirs():
    """An overridden target is the negotiator's decision, not a computed one —
    a surface that cannot tell them apart re-argues a number already approved."""
    assert "approved target" in render_facts(
        brief_from(rich_facts(target_is_user_set=True)), level=LEVEL_MINIMAL
    )
    assert "approved target" not in render_facts(
        brief_from(rich_facts()), level=LEVEL_MINIMAL
    )


# ── the anti-drift contract ────────────────────────────────────────────────


@pytest.mark.parametrize("level", LEVELS)
@pytest.mark.parametrize("make_facts", [rich_facts, sparse_facts], ids=["rich", "sparse"])
def test_attribution_only_covers_facts_the_block_rendered(level, make_facts):
    """The source panel must never claim provenance for a figure the model was
    not shown. This is the exact failure the hand-maintained tuples produced."""
    brief = brief_from(make_facts())
    block = render_facts(brief, level=level)
    for label, entry in collect_fact_sources(brief, level).items():
        value = entry["value"]
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        # Money now renders compact ("$37.54M"), rates as percentages, the
        # rest verbatim — a figure may legitimately appear in any of them.
        rendered = {
            str(value),
            f"{value:,}",
            f"{value * 100:.2f}%",
            format_money(value),
        }
        assert any(form in block for form in rendered), (
            f"{level}: attributed {label}={value}, which the block never renders"
        )


@pytest.mark.parametrize("level", LEVELS)
def test_attribution_carries_a_payload_path_for_every_entry(level):
    facts = rich_facts()
    brief = brief_from(facts)
    block = render_facts(brief, level=level)
    for label, entry in collect_fact_sources(brief, level).items():
        assert entry["path"], f"{label} is attributed with no payload path"


# ── SCF is fail-closed ─────────────────────────────────────────────────────


def test_scf_rate_is_hidden_unless_the_turn_enables_it():
    """Fail-closed by construction: a brief built without saying anything about
    SCF has `scf_enabled=False`, and the concept never surfaces — not even as
    "N/A". A prompt builder must not depend on the upstream strip having run.
    """
    facts = rich_facts(scf_rate=0.031)

    default = render_facts(brief_from(facts), level=LEVEL_FULL)
    assert "SCF rate" not in default

    enabled = render_facts(brief_from(facts, scf_enabled=True), level=LEVEL_FULL)
    assert "SCF rate: 3.10%" in enabled


# ── The regulatory line has three states, not two ──────────────────────────


def test_an_applied_regulatory_cap_is_stated_as_binding():
    """The model is told the target IS the limit, and to present it that way."""
    facts = rich_facts(
        regulatory_max_term_days=60, regulatory_limit_type="ONLY_EXCEPTIONS",
        regulatory_enforced=True, regulatory_applied=True,
    )
    block = render_facts(brief_from(facts), level=LEVEL_FULL)
    assert "Regulatory cap APPLIED: 60 days" in block
    assert "aligned with applicable regulatory requirements" in block


def test_an_unapplied_regulation_is_marked_informational():
    """`sparse_facts` carries an enforced 60-day limit with `applied` false.

    Left as a bare figure, this is an invitation to cite a cap that binds
    nothing — so the line says outright that it is not an argument.
    """
    block = render_facts(brief_from(sparse_facts()), level=LEVEL_FULL)
    assert "Regulatory reference, NOT applied: 60 days" in block
    assert "do not cite it" in block
    assert "APPLIED:" not in block


def test_no_regulation_renders_no_line_at_all():
    facts = rich_facts(
        regulatory_max_term_days=None, regulatory_limit_type=None,
        regulatory_enforced=False, regulatory_applied=False,
    )
    block = render_facts(brief_from(facts), level=LEVEL_FULL)
    assert "Regulatory" not in block
