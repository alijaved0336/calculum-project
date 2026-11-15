"""The objections engine — playbook section 5, decided in code.

Client spec (2026-08-25): a FIXED set of objections, each raised only when its
condition is met for this supplier, each with a pre-written counter. What is
pinned here is the GATES — an objection raised without its condition is a
counter the supplier can disprove in the room.
"""
from __future__ import annotations

from domain.entities.facts import StrategyBenchmark
from domain.services.objections import DSO_PROXIMITY_DAYS, build_objection_plan
from tests.unit.prompt_fixtures import rich_facts


def _facts(**kw):
    """Ask 90, current 50, and every gate switched OFF unless a test opens it."""
    base = dict(
        target_term_days=90,
        opportunity_term_days=90,
        current_term_days=50,
        strategy_benchmarks=[],
        dso=None,
        spend_volume=None,          # no spend ⇒ no cost-impact percentage
        regulatory_max_term_days=None,
        regulatory_applied=False,
        regulatory_enforced=False,
    )
    base.update(kw)
    return rich_facts(**base)


def _keys(**kw) -> list[str]:
    return [o.key for o in build_objection_plan(_facts(**kw)).objections]


def _one(key: str, **kw):
    return next(o for o in build_objection_plan(_facts(**kw)).objections if o.key == key)


def _benchmark(name: str, value: int) -> StrategyBenchmark:
    return StrategyBenchmark(name=name, label=name, value=value)


# ── what qualifies, and what does not ──────────────────────────────────────


def test_only_the_ungated_objection_survives_an_empty_supplier():
    """Objection 3 (regulatory) is the one with no condition. Everything else
    has to earn its place."""
    assert _keys() == ["regulatory"]


def test_an_objection_that_does_not_qualify_is_not_mentioned_at_all():
    """Not raised, and not listed as unavailable either — a playbook that names
    the objections it cannot answer shows the negotiator where they are weak."""
    plan = build_objection_plan(_facts())
    text = " ".join(
        o.supplier_line + " ".join(o.counters) + o.trigger for o in plan.objections
    )
    assert "standard terms are shorter" not in text
    assert "others accept" not in text


# ── 1. cash flow — cost impact at or under 2% ──────────────────────────────


def test_a_limited_cost_impact_opens_the_cash_flow_objection():
    objection = _one("cashFlow", spend_volume=56_347_149.0, wacc_after_tax=0.071)
    assert objection.supplier_line == "This will hurt our cash flow."
    assert "% of invoice value" in objection.counters[0]
    assert "minimal" in objection.counters[0]


def test_a_material_cost_impact_withholds_the_cash_flow_objection():
    """Above 2% the figure is withheld everywhere else too — quantifying a cost
    the supplier considers large hands them the objection instead of shrinking
    it, so there is no counter to give."""
    # A tiny spend base against the same extension pushes the ratio over 2%.
    assert "cashFlow" not in _keys(spend_volume=50_000.0, wacc_after_tax=0.071)


def test_no_counter_ever_names_the_supplier():
    """Every counter is a line said TO the supplier, so naming them in one is
    always wrong — it claims knowledge of their own trading. Asserted across the
    whole set rather than on the one that got it wrong, because the next
    pre-written counter is where it would come back."""
    plan = build_objection_plan(
        _facts(
            strategy_benchmarks=[
                _benchmark("supplierStandard", 90),
                _benchmark("peerGroupStandard", 95),
            ],
            dso=120,
            spend_volume=56_347_149.0,
            wacc_after_tax=0.071,
        )
    )
    # Every gate open — all five counters, so none of them can regress unseen.
    assert len(plan.objections) == 5, [o.key for o in plan.objections]
    for objection in plan.objections:
        # EVERY counter, not just the first: a supporting counter is said in
        # the room exactly like the one it follows, so it is under the same
        # disclosure rules and has to be scanned by the same test.
        for counter in objection.counters:
            assert "Acme Industrial GmbH" not in counter, objection.key
            assert "Acme" not in counter, objection.key


def test_the_cash_flow_counter_never_carries_its_inputs():
    objection = _one("cashFlow", spend_volume=56_347_149.0, wacc_after_tax=0.071)
    assert "WACC" not in objection.counters[0]
    assert "56,347,149" not in objection.counters[0]
    assert "WACC" in objection.caution      # the negotiator is told why


# ── 2. supplier standard reaches the ask ───────────────────────────────────


def test_a_supplier_standard_at_the_ask_answers_shorter_terms():
    objection = _one(
        "supplierStandard", strategy_benchmarks=[_benchmark("supplierStandard", 90)]
    )
    assert "already accepting 90 days" in objection.counters[0]
    # GENERALISED, never personalised (client, 2026-08-26). Naming the supplier
    # here told them we hold a reading of their own book — what they accept and
    # from whom. The figure stays; the attribution goes.
    assert "Acme Industrial GmbH" not in objection.counters[0]
    assert "your organization" in objection.counters[0]
    # Standing policy on this source is internal-only; the client approved it
    # for THIS counter, so the restriction travels with it.
    assert objection.caution and "only once they have raised" in objection.caution
    assert "never name the supplier" in objection.caution
    # It reaches the ask, so there is no landing-point warning to give.
    assert "BELOW our" not in objection.caution


def test_a_supplier_standard_above_the_current_term_answers_it_too():
    """Client, 2026-08-25 — the bar is the CURRENT TERM, not the ask.

    Real case: 83 days accepted from 19 other customers against a 90-day ask and
    75-day current term. "Our standard terms are shorter" is a claim about how
    they trade, and 83 disproves it outright; gating at the ask silenced the
    objection on a supplier who had plainly answered it.
    """
    objection = _one(
        "supplierStandard",
        current_term_days=75,
        strategy_benchmarks=[_benchmark("supplierStandard", 83)],
    )
    assert "already accepting 83 days" in objection.counters[0]
    assert "above our current 75-day term" in objection.trigger


def test_a_figure_short_of_the_ask_carries_a_landing_point_warning():
    """The cost of the wider bar, said out loud: a number quoted in the room is
    a number the supplier can settle on."""
    caution = _one(
        "supplierStandard",
        current_term_days=75,
        strategy_benchmarks=[_benchmark("supplierStandard", 83)],
    ).caution
    assert "83 days is BELOW our 90-day ask" in caution
    assert "never as a figure you would settle at" in caution
    assert "not present it as backing the full request" in caution


def test_a_supplier_standard_at_or_below_the_current_term_does_not():
    """At the current term it evidences the status quo; below it, it is the
    supplier's own counter-figure."""
    for value in (75, 60):
        assert "supplierStandard" not in _keys(
            current_term_days=75,
            strategy_benchmarks=[_benchmark("supplierStandard", value)],
        )


# ── 3. regulatory — always prepared, worded from our own data ──────────────


def test_the_regulatory_objection_needs_no_condition():
    assert "regulatory" in _keys()


def test_no_recorded_limit_is_answered_as_no_limit():
    assert "no governmental or statutory regulation" in _one("regulatory").counters[0]


def test_a_strict_limit_is_named_as_statutory():
    objection = _one(
        "regulatory", regulatory_max_term_days=120, regulatory_enforced=True
    )
    assert "statutory limit" in objection.counters[0]
    assert "120 days" in objection.counters[0]


def test_a_governmental_limit_is_named_as_a_recommendation():
    """The client's second kind: guidance, not a cap. Calling it statutory would
    concede a constraint that does not exist."""
    objection = _one(
        "regulatory", regulatory_max_term_days=120, regulatory_enforced=False
    )
    assert "recommendation rather than a statutory cap" in objection.counters[0]


def test_an_applied_cap_at_the_ask_is_answered_as_the_maximum_allowed():
    objection = _one(
        "regulatory",
        regulatory_max_term_days=90,
        regulatory_enforced=True,
        regulatory_applied=True,
    )
    assert "maximum the rules allow" in objection.counters[0]


# ── 3a. a recommendation binds nobody (client, 2026-08-26) ─────────────────
#
# Whenever the regulatory figure is guidance rather than statute, the counter
# closes by saying the parties may agree beyond it. The pairs below are what
# makes that safe: it must never reach a statutory cap, where it would be an
# invitation to breach one.

_NON_BINDING = "where both parties agree, payment terms can be set beyond it"


def test_a_recommendation_the_ask_clears_says_the_parties_may_agree_beyond_it():
    objection = _one(
        "regulatory", regulatory_max_term_days=60, regulatory_enforced=False
    )
    assert _NON_BINDING in objection.counters[0]


def test_a_recommendation_the_ask_was_capped_to_says_it_too():
    """The case it matters most in — the ask sits ON the recommendation, so
    'you cannot go higher' is exactly the objection being answered."""
    objection = _one(
        "regulatory",
        regulatory_max_term_days=90,
        regulatory_enforced=False,
        regulatory_applied=True,
    )
    assert _NON_BINDING in objection.counters[0]
    # And it cannot both cap the term and offer to pass the cap: a
    # recommendation is never "the maximum the rules allow".
    assert "maximum the rules allow" not in objection.counters[0]


def test_a_statutory_cap_never_offers_to_agree_beyond_it():
    for applied in (False, True):
        objection = _one(
            "regulatory",
            regulatory_max_term_days=90,
            regulatory_enforced=True,
            regulatory_applied=applied,
        )
        assert _NON_BINDING not in objection.counters[0], f"applied={applied}"


def test_no_recorded_limit_has_nothing_to_be_non_binding_about():
    assert _NON_BINDING not in _one("regulatory").counters[0]


def test_the_caution_does_not_tell_the_model_to_cut_the_second_sentence():
    """'One line, then stop' read as permission to trim the counter, which is
    emitted verbatim and now runs to two sentences."""
    objection = _one(
        "regulatory", regulatory_max_term_days=60, regulatory_enforced=False
    )
    assert "One line" not in objection.caution
    assert "as written" in objection.caution


# ── 4. own operations — DSO within one step of the ask ─────────────────────


def test_a_long_dso_opens_the_own_operations_objection():
    """The client's gate: dso > ask - 15."""
    assert "ownOperations" in _keys(dso=90 - DSO_PROXIMITY_DAYS + 1)


def test_a_dso_exactly_one_step_below_the_ask_does_not():
    assert "ownOperations" not in _keys(dso=90 - DSO_PROXIMITY_DAYS)


def test_the_dso_counter_never_states_their_figure():
    objection = _one("ownOperations", dso=80)
    assert "80" not in objection.counters[0]
    assert "Days Sales Outstanding" in objection.counters[0]
    assert objection.caution and "Never state their DSO" in objection.caution


# ── 5. peer group reaches the ask ──────────────────────────────────────────


def test_the_client_answers_lead_the_why_should_we_objection():
    """Client, 2026-09-18. "Why should we accept what others accept?" is a
    challenge to the PREMISE of benchmarking, so the two approved answers come
    first: why the benchmark means anything, and what falls out of alignment
    operationally. The peer figure follows as the evidence for them."""
    objection = _one(
        "peerGroupStandard", strategy_benchmarks=[_benchmark("peerGroupStandard", 95)]
    )
    assert len(objection.counters) == 3
    first, second, third = objection.counters
    assert "economic equilibrium of our industry" in first
    assert "cash flow burdens are distributed equitably" in first
    assert "manual overhead on our end" in second
    assert "automated, fastest payment pipelines" in second
    assert "Similar suppliers" in third
    assert "95 days" in third


def test_the_two_client_answers_quote_no_figure_of_ours():
    """Neither needs a number to land, so neither carries one — a changed
    benchmark cannot silently make either of them wrong."""
    objection = _one(
        "peerGroupStandard", strategy_benchmarks=[_benchmark("peerGroupStandard", 95)]
    )
    for counter in objection.counters[:2]:
        assert "95" not in counter
        assert "days" not in counter
        assert "%" not in counter


def test_only_the_why_should_we_objection_carries_more_than_one_counter():
    plan = build_objection_plan(
        _facts(
            strategy_benchmarks=[
                _benchmark("supplierStandard", 90),
                _benchmark("peerGroupStandard", 95),
            ],
            dso=120,
            spend_volume=56_347_149.0,
            wacc_after_tax=0.071,
        )
    )
    for objection in plan.objections:
        expected = 3 if objection.key == "peerGroupStandard" else 1
        assert len(objection.counters) == expected, objection.key


def test_a_peer_group_below_the_ask_does_not():
    """Objection 5 keeps the NARROWER `>= ask` bar, unlike objection 2.

    "Why should we accept what others accept?" is answered only by a peer group
    already sitting at our number; a lower peer figure answers it with an
    argument for the supplier. The two gates differ because the objections do.

    The client's two answers (2026-09-18) did NOT widen this. They carry no
    figure and would "work" for any supplier, but raising the objection without
    the peer number would answer "why should we accept what others accept?"
    without ever saying what others accept.
    """
    assert "peerGroupStandard" not in _keys(
        strategy_benchmarks=[_benchmark("peerGroupStandard", 80)]
    )


# ── the set is closed at five ──────────────────────────────────────────────


def test_the_pricing_threat_play_is_not_an_objection():
    """Client, 2026-08-25: dropped from the playbook.

    It reached section 5 through the APPROVED PLAYS block before the engine
    existed, and was briefly carried here as a sixth entry. The play stays in
    the registry; it no longer appears in any section.
    """
    everything = _keys(
        spend_volume=56_347_149.0,
        wacc_after_tax=0.071,
        dso=80,
        strategy_benchmarks=[
            _benchmark("peerGroupStandard", 95),
            _benchmark("supplierStandard", 90),
        ],
    )
    assert "pricingThreat" not in everything
    assert len(everything) == 5


# ── order ──────────────────────────────────────────────────────────────────


def test_the_order_is_the_clients_numbering():
    keys = _keys(
        spend_volume=56_347_149.0,
        wacc_after_tax=0.071,
        dso=80,
        strategy_benchmarks=[
            _benchmark("peerGroupStandard", 95),
            _benchmark("supplierStandard", 90),
        ],
    )
    assert keys == [
        "cashFlow",
        "supplierStandard",
        "regulatory",
        "ownOperations",
        "peerGroupStandard",
    ]


# ── the counters reach the surfaces that say them ──────────────────────────


def _peer_facts():
    from tests.unit.prompt_fixtures import rich_facts

    return rich_facts(
        strategy_benchmarks=[_benchmark("peerGroupStandard", 95)],
        peer_group_term_days=95,
    )


def test_the_playbook_renders_one_counter_bullet_per_approved_counter():
    """Three approved answers must arrive as three bullets. Rendered through
    one shared loop, so an objection gaining a counter later needs no change
    here or in the prompt's shape instruction."""
    from domain.services.brief_builder import brief_from
    from utils.prompts.negotiation_guide_prompt import build_negotiation_guide_prompt

    facts = _peer_facts()
    prompt = build_negotiation_guide_prompt("playbook", facts, None, brief=brief_from(facts))
    objection = next(
        o for o in build_objection_plan(facts).objections if o.key == "peerGroupStandard"
    )
    for counter in objection.counters:
        assert f'* **Counter**: "{counter}"' in prompt
    assert prompt.count("**Counter**") >= 3


def test_the_pushback_block_carries_every_counter():
    from utils.prompts.pushback_prompt import prepared_objections_block

    facts = _peer_facts()
    block = prepared_objections_block(build_objection_plan(facts))
    objection = next(
        o for o in build_objection_plan(facts).objections if o.key == "peerGroupStandard"
    )
    for counter in objection.counters:
        assert f'Counter (word for word): "{counter}"' in block
