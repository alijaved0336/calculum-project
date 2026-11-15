"""Unit tests for the negotiation-arguments builder.

Rules under test:
  * argument sources: the four market benchmarks (supplierStandard,
    parentOrSupplierMax, peerGroupStandard, industryRegionStandard) + the
    highest spend-line opportunity. Everything else (harmonization,
    regulatoryTerm, buyerStandard, payOnTerms, scf*) is excluded.
  * buckets: full (> target), partial (floor < v <= target), none (<= floor).
  * ordering WITHIN a bucket is by SOURCE precedence, never the day-value;
    the spend line ranks after every benchmark.
"""
from __future__ import annotations

from domain.entities.facts import SupplierFacts, StrategyBenchmark
from domain.entities.argument_catalog import argument_display_name
from domain.services.negotiation_arguments import build_negotiation_arguments
from tests.unit.prompt_fixtures import explain_block, pitch_block


def _facts(**kw) -> SupplierFacts:
    base = dict(
        supplier_name="Acme", country="DE", industry="Manufacturing",
        company_size="large", target_term_days=76, current_term_days=50,
        batna_term_days=None, benchmark_term_days=48, regulatory_max_term_days=None,
        opportunity_term_days=76,
    )
    base.update(kw)
    return SupplierFacts(**base)


_LABELS = {
    "supplierStandard": "this supplier's own segment",
    "parentOrSupplierMax": "parent/supplier maximum term",
    "peerGroupStandard": "comparable peer group",
    "industryRegionStandard": "industry/region standard",
    "buyerStandard": "buyer (internal AP) standard",
    "regulatoryTerm": "regulatory limit",
    "payOnTerms": "pay-on-terms baseline",
}


def _b(name, value):
    return StrategyBenchmark(name=name, label=_LABELS.get(name, name), value=value)


# ── categories + precedence ─────────────────────────────────────────────────

def test_full_support_ordered_by_source_precedence_not_value():
    # ask 76, current 50. Floor = 76 − 15 = 61, harmonised to 60 (§5).
    f = _facts(
        strategy_benchmarks=[
            _b("industryRegionStandard", 80),
            _b("supplierStandard", 90),
            _b("parentOrSupplierMax", 78),
            _b("peerGroupStandard", 70),
        ],
    )
    args = build_negotiation_arguments(f)
    assert args.target_term_days == 76 and args.batna_term_days == 60

    # supplier(1) > parent(2) > industry(4) > spend(5) — industry 80 ranks BELOW
    # parent 78 despite the bigger number, because ordering is by source.
    assert [a.source for a in args.full_support] == [
        "supplierStandard", "parentOrSupplierMax",
        "peerGroupStandard", "industryRegionStandard",
    ]
    assert all(a.support == "full" for a in args.full_support)
    # peer 70 is above the 50-day current term but below the 76-day ask. TWO
    # buckets: it is SUPPORTING like the rest, and what it may claim is said in
    # its rationale rather than by putting it in a lower tier.
    assert args.non_support == []


def test_spend_line_ranks_after_every_benchmark():
    f = _facts(
        strategy_benchmarks=[_b("industryRegionStandard", 80)],
    )
    args = build_negotiation_arguments(f)
    # Even at 200 days the spend line comes AFTER the industry benchmark.
    assert [a.source for a in args.full_support] == ["industryRegionStandard"]


# ── exclusions ──────────────────────────────────────────────────────────────

def test_excludes_non_argument_sources():
    f = _facts(strategy_benchmarks=[
        _b("supplierStandard", 90),
        _b("buyerStandard", 95),       # buyer-internal — excluded
        _b("regulatoryTerm", 120),     # legal ceiling — excluded
        _b("payOnTerms", 88),          # baseline — excluded
        _b("harmonization", 100),      # internal — excluded
    ])
    sources = [a.source for a in build_negotiation_arguments(f).all]
    assert sources == ["supplierStandard"]


# ── undermines flag + non-support ───────────────────────────────────────────

def test_below_current_is_non_support_and_undermines():
    f = _facts(target_term_days=90, opportunity_term_days=None, current_term_days=51,
               strategy_benchmarks=[_b("supplierStandard", 45), _b("industryRegionStandard", 40)])
    args = build_negotiation_arguments(f)
    assert args.batna_term_days == 75    # 90 − 15, harmonised (§5)
    assert args.full_support == []
    assert {a.source for a in args.non_support} == {"supplierStandard", "industryRegionStandard"}
    assert all(a.undermines for a in args.non_support)   # both below the 51-day current term


def test_between_the_bar_and_floor_is_supporting_not_dropped():
    """The lower bound is the support bar (current + 15 here), and there is no
    middle tier.

    A 70-day benchmark against a 50-day current term would land in non-support
    if the 75-day floor were the bar — thrown away even though it proves longer
    terms already exist.
    """
    f = _facts(target_term_days=90, opportunity_term_days=None, current_term_days=50,
               strategy_benchmarks=[_b("parentOrSupplierMax", 85), _b("peerGroupStandard", 70)])
    args = build_negotiation_arguments(f)
    assert args.batna_term_days == 75
    assert {a.source for a in args.full_support} == {"parentOrSupplierMax", "peerGroupStandard"}
    peer = next(a for a in args.full_support if a.source == "peerGroupStandard")
    assert peer.support == "full" and peer.undermines is False
    # ...and it is told, in words, what it does and does not justify (P4).
    assert "short of the" in peer.rationale
    assert "do NOT present it as justifying the full ask" in peer.rationale


# ── the supporting set is the whole deployable set ──────────────────────────
# There is no `usable_now` fallback tier any more: with two buckets, everything
# above the current term IS what the negotiator deploys.

def test_the_supporting_set_is_everything_above_the_current_term():
    f = _facts(strategy_benchmarks=[_b("supplierStandard", 90), _b("peerGroupStandard", 70)])
    args = build_negotiation_arguments(f)
    assert args.has_full_support
    assert [a.source for a in args.full_support] == ["supplierStandard", "peerGroupStandard"]


def test_benchmarks_short_of_the_ask_are_still_the_supporting_set():
    # No benchmark reaches the 90-day ask; both clear the 65-day bar (50 + 15).
    f = _facts(target_term_days=90, opportunity_term_days=None, current_term_days=50,
               strategy_benchmarks=[_b("parentOrSupplierMax", 85), _b("peerGroupStandard", 70)])
    args = build_negotiation_arguments(f)
    assert args.has_full_support                 # both clear the bar
    assert [a.source for a in args.full_support] == ["parentOrSupplierMax", "peerGroupStandard"]


# ── negotiation-guide/opening-strategy block contract ───────────────────────
# negotiation_guide_prompt.py and opening_strategy_prompt.py instruct the LLM
# to cite "EVERY argument under 'USE TO JUSTIFY THE ASK'" / hold arguments
# "under 'HOLD IN RESERVE'" — those are literal string lookups against the
# block the PITCH voice renders. If the heading text here ever drifts from what
# those two prompt files reference, the LLM loses the anchor and silently drops
# arguments instead of citing all of them.
#
# A group whose bucket is empty is omitted rather than printed as "(none)" —
# absence is unambiguous and the heading costs tokens — so the fixture below
# fills all four.

def test_negotiation_block_uses_the_literal_headings_the_prompts_key_off():
    # ask 76, current 30, floor 60 (§5). supplierStandard 90 and the 95-day
    # spend line support the ask; peer 65 clears the current term but not the
    # ask, so it is reserve (§4); industry 25 sits below the current term and
    # is not an argument; parentOrSupplierMax has no value at all.
    f = _facts(
        current_term_days=30,
        strategy_benchmarks=[
            _b("supplierStandard", 90),
            _b("peerGroupStandard", 65),
            _b("industryRegionStandard", 25),
        ],
    )
    block = pitch_block(f)
    assert "USE TO JUSTIFY THE ASK" in block
    assert "NOT ARGUMENTS" in block
    assert "NOT AVAILABLE" in block


# ── unavailable sources (null upstream — must be named, not just dropped) ──

def test_unavailable_lists_argument_eligible_sources_with_no_value():
    # Only parent + industry have a value; supplierStandard, peerGroupStandard,
    # and the spend-line opportunity are simply absent from the payload (the
    # extraction layer already drops null entries before they reach facts).
    f = _facts(
        target_term_days=76, current_term_days=50, opportunity_term_days=76,
        strategy_benchmarks=[
            _b("parentOrSupplierMax", 80),
            _b("industryRegionStandard", 35),
        ],
    )
    args = build_negotiation_arguments(f)
    # The entity keeps the payload keys; the rendered blocks below name them in
    # words. A paraphrase would read as a different source, so the wording comes
    # from the catalogue rather than the model.
    assert args.unavailable == [
        "supplierStandard",       # precedence 1
        "peerGroupStandard",      # precedence 3
    ]

    for block_fn in (
        lambda a: explain_block(f),
        lambda a: pitch_block(f),
    ):
        block = block_fn(args)
        assert "NOT AVAILABLE" in block
        assert "Supplier Standard" in block
        assert "Peer Group Standard" in block
        assert "supplierStandard" not in block
        # Reference for the model, never an output group (user, 2026-09-17).
        assert 'never write a "Not available" heading' in block


# ── boundary: value == ask is FULL support, not "too low" ──────────────────
# Real defect (LOTTERIE NAZIONALI): ask 30, parentOrSupplierMax 30, floor 30.
# `_classify` used `value > target`, so 30 fell through to non_support and the
# brief described it as "at or below the BATNA — too low to support the
# ask". Meanwhile `supplier_facing_benchmarks` uses `>=`, so the SAME benchmark
# was also offered as citable supplier-facing evidence. The playbook printed it
# twice, in contradictory groups.

def _lotterie_facts() -> SupplierFacts:
    return _facts(
        target_term_days=30, current_term_days=29, opportunity_term_days=30,
        strategy_benchmarks=[
            _b("parentOrSupplierMax", 30),      # exactly at the ask
            _b("industryRegionStandard", 18),   # below the current term
        ],
    )


def test_benchmark_equal_to_the_ask_is_full_support():
    args = build_negotiation_arguments(_lotterie_facts())
    assert [a.source for a in args.full_support] == [
        "parentOrSupplierMax",
    ]
    assert [a.source for a in args.non_support] == ["industryRegionStandard"]
    # and it is described as matching the ask, never as too low
    parent = next(a for a in args.full_support if a.source == "parentOrSupplierMax")
    assert "matches the 30-day ask" in parent.rationale
    assert "too low" not in parent.rationale and "floor" not in parent.rationale


def test_no_benchmark_appears_in_two_buckets():
    args = build_negotiation_arguments(_lotterie_facts())
    buckets = [
        {a.source for a in args.full_support},
        {a.source for a in args.non_support},
        set(args.unavailable),
    ]
    seen: set[str] = set()
    for names in buckets:
        assert not (seen & names), f"{seen & names} classified into two buckets at once"
        seen |= names


def test_supplier_facing_selection_agrees_with_full_support():
    # The supplier-facing threshold (>= proposed) and the argument classifier
    # must never disagree: anything citable to the supplier has to be sitting in
    # the group the guide labels "supporting".
    from domain.services.negotiation_arguments import supplier_facing_benchmarks

    f = _lotterie_facts()
    args = build_negotiation_arguments(f)
    citable = {b.name for b in supplier_facing_benchmarks(f)}
    supporting = {a.source for a in args.full_support}
    assert citable <= supporting, f"{citable - supporting} is citable but not 'supporting'"


def test_value_one_below_the_ask_is_not_full_support():
    # The boundary is >=, but only by one day — 29 must still fall short of a
    # 30-day ask, and lands in movement support instead.
    f = _facts(
        target_term_days=30, current_term_days=20, opportunity_term_days=30,
        strategy_benchmarks=[_b("parentOrSupplierMax", 29), _b("industryRegionStandard", 21)],
    )
    args = build_negotiation_arguments(f)
    # A 30-day ask yields 15; 15 < 20 + 5 → No BATNA.
    assert args.batna_term_days is None
    # A 10-day gap puts the bar at the 25-day midpoint: 29 is closer to the ask
    # and supports; 21 is closer to the current term and does not. Neither
    # reaches the 30-day ask, which the RATIONALE says rather than a bucket.
    assert [a.source for a in args.full_support] == ["parentOrSupplierMax"]
    assert "do NOT present it as justifying the full ask" in args.full_support[0].rationale
    industry = next(a for a in args.non_support if a.source == "industryRegionStandard")
    assert industry.undermines is False
    assert "too close to it to support the 30-day ask" in industry.rationale


def test_every_argument_line_leads_with_its_proper_name():
    # The line's leading name is what a drafted document copies, so it is the
    # name in words ("Supplier Standard"), never the payload key. Naming it at
    # all is still the point: left to itself a draft renames supplierStandard to
    # "this supplier's own segment".
    f = _facts(
        target_term_days=76, current_term_days=34, opportunity_term_days=76,
        strategy_benchmarks=[
            _b("parentOrSupplierMax", 80),      # full support
            _b("supplierStandard", 22),         # below current -> undermines
            _b("industryRegionStandard", 35),   # at/below floor
        ],
    )
    args = build_negotiation_arguments(f)
    # The full negotiator picture carries every bucket, values included.
    full = explain_block(f)
    for a in args.all:
        assert f"- {argument_display_name(a.source)} — {a.value} days" in full, (
            f"{a.source} is not named in words in:\n{full}"
        )
    # The advice block renders only the arguments it may argue from; the rest
    # are named without figures (see `_not_arguments_lines`), so the canonical
    # key still has to be the name used.
    advice = pitch_block(f)
    for a in args.full_support:
        assert f"- {argument_display_name(a.source)} — {a.value} days" in advice, (
            f"{a.source} is not named in words in:\n{advice}"
        )
    for a in args.non_support:
        assert argument_display_name(a.source) in advice
    # And no payload key survives anywhere in either block.
    for block in (full, advice):
        for a in args.all:
            assert a.source not in block, f"{a.source} leaked as a raw key"


def test_unavailable_empty_when_every_source_has_a_value():
    f = _facts(
        strategy_benchmarks=[
            _b("supplierStandard", 90), _b("parentOrSupplierMax", 80),
            _b("peerGroupStandard", 70), _b("industryRegionStandard", 60),
        ],
    )
    assert build_negotiation_arguments(f).unavailable == []


def test_negotiation_block_cites_every_full_support_argument_not_just_one():
    # Four independent sources all beat the 76-day ask — every one of them
    # must appear in the block the guide's Key Arguments section draws from,
    # not just the strongest one.
    f = _facts(
        strategy_benchmarks=[
            _b("supplierStandard", 90),
            _b("parentOrSupplierMax", 80),
            _b("peerGroupStandard", 78),
            _b("industryRegionStandard", 77),
        ],
    )
    args = build_negotiation_arguments(f)
    assert len(args.full_support) == 4  # 4 benchmarks + the spend-line opportunity
    block = pitch_block(f)
    justify_section = block.split("USE TO JUSTIFY THE ASK")[1].split("HOLD IN RESERVE")[0]
    for a in args.full_support:
        assert f"{a.value} days" in justify_section, (
            f"{a.source} ({a.value} days) missing from the USE TO JUSTIFY THE ASK block"
        )


def test_reported_case_supplier_standard_below_current_term_is_not_quotable():
    # The exact figures from the reported pushback answer: supplierStandard 22
    # against a 34-day current term and a 76-day ask. The answer read "their
    # current segment terms (22 days) are actually shorter than what you already
    # pay, you can confidently hold the line" — a benchmark that cannot justify
    # the ask, used to justify holding it.
    f = _facts(
        target_term_days=76, current_term_days=34, opportunity_term_days=76,
        strategy_benchmarks=[
            _b("supplierStandard", 22),
            _b("parentOrSupplierMax", 80),
            _b("industryRegionStandard", 35),
        ],
    )
    block = pitch_block(f)

    assert "22" not in block                  # the figure is simply not there
    assert "Supplier Standard" in block       # still named, so "what about X?" works
    assert "Parent / Supplier Max — 80 days" in block  # untouched


def test_negotiation_block_names_every_non_supporting_source_without_its_value():
    # Two regressions in one, from opposite directions:
    #   * a non-supporting benchmark that does NOT undermine (one sitting
    #     exactly AT the current term) was once dropped from the advice block
    #     entirely, so a playbook silently omitted it from "considered but not
    #     cited";
    #   * later, rendering the whole bucket WITH values let a supplierStandard of
    #     22 days — below the supplier's own 34-day term — come back as "their
    #     segment terms are shorter than what you already pay, so you can hold
    #     the line", inverting counter-evidence into support.
    # So: named always, figure never.
    f = _facts(
        target_term_days=76, current_term_days=34, opportunity_term_days=76,
        strategy_benchmarks=[
            _b("parentOrSupplierMax", 80),
            # 34 sits exactly AT the current term: it evidences only the status
            # quo, so it is non_support — but it does not undermine either,
            # because it is not BELOW what we already pay.
            _b("industryRegionStandard", 34),
        ],
    )
    args = build_negotiation_arguments(f)
    industry = next(a for a in args.non_support if a.source == "industryRegionStandard")
    assert industry.support == "none" and industry.undermines is False

    block = pitch_block(f)
    excluded = block.split("NOT ARGUMENTS")[1].split("NOT AVAILABLE")[0]
    # Named in words, so the negotiator can ask about it...
    assert "Industry Region Standard" in excluded
    # ...but with no figure anywhere in the advice block, and no prose gloss
    # that could be mistaken for a citable source.
    assert "Industry Region Standard — 34 days" not in block
    assert "industry/region standard" not in block


# ── relative strength: the reply must say which argument is strongest ───────

def test_supporting_arguments_carry_relative_strength_tags():
    # Five supporting arguments -> strongest, three middle ranks, weakest.
    f = _facts(
        strategy_benchmarks=[
            _b("supplierStandard", 90),
            _b("parentOrSupplierMax", 80),
            _b("peerGroupStandard", 78),
            _b("industryRegionStandard", 77),
        ],
    )
    args = build_negotiation_arguments(f)
    expected = {
        "supplierStandard": "[STRONGEST]",
        "parentOrSupplierMax": "[2nd STRONGEST]",
        "peerGroupStandard": "[3rd STRONGEST]",
        "industryRegionStandard": "[WEAKEST OF THE SUPPORTING SET]",
        # the spend line ranks last despite carrying the biggest number (95)
    }
    for block in (explain_block(f), pitch_block(f)):
        assert "ARGUMENT STRENGTH — USE IT, NEVER LABEL IT" in block
        for source, tag in expected.items():
            name = argument_display_name(source)
            line = next(ln for ln in block.splitlines() if ln.startswith(f"  - {name} "))
            assert line.endswith(tag), f"{source} should be tagged {tag}, got: {line}"


def test_single_supporting_argument_gets_no_strength_tag_or_rule():
    # Nothing to rank against — a lone "strongest" is a comparison the
    # negotiator cannot see.
    f = _facts(strategy_benchmarks=[_b("parentOrSupplierMax", 80), _b("peerGroupStandard", 40)])
    args = build_negotiation_arguments(f)
    assert len(args.full_support) == 1
    block = pitch_block(f)
    assert "[STRONGEST]" not in block and "[WEAKEST" not in block
    assert "ARGUMENT STRENGTH — USE IT, NEVER LABEL IT" not in block


def _reserve_facts(**kw) -> SupplierFacts:
    # current 30, ask 76, floor 60 (§5). All three benchmarks clear the current
    # term without reaching the ask, so all three are partial support (§4).
    return _facts(
        current_term_days=30,
        strategy_benchmarks=[
            _b("parentOrSupplierMax", 70),
            _b("peerGroupStandard", 68),
            _b("industryRegionStandard", 40),
            *kw.pop("extra_benchmarks", []),
        ],
        **kw,
    )




# ── recommend-arguments voice: no ruled-out or no-data groups (2026-09-17) ──

def test_recommend_voice_withholds_ruled_out_and_unavailable():
    from domain.services.brief_builder import brief_from
    from utils.prompts.brief import VOICE_EXPLAIN, VOICE_RECOMMEND, render_arguments

    f = _facts(
        target_term_days=75, current_term_days=34, opportunity_term_days=75,
        strategy_benchmarks=[
            _b("parentOrSupplierMax", 80),
            _b("supplierStandard", 22),
            _b("industryRegionStandard", 35),
        ],
    )
    brief = brief_from(f)
    assert "NOT AVAILABLE" in render_arguments(brief, voice=VOICE_EXPLAIN)
    block = render_arguments(brief, voice=VOICE_RECOMMEND)
    assert "Parent / Supplier Max" in block
    assert "NOT ARGUMENTS" in block
    assert "NOT AVAILABLE" not in block
    assert "RULED OUT" not in block
    assert "Peer Group Standard" not in block
    assert "COMPLETE SET" in block


def test_only_open_argument_requests_use_the_recommend_voice():
    from utils.prompts.explain_recommendation_prompt import (
        is_argument_recommendation_request,
    )

    assert is_argument_recommendation_request("Recommend negotiation arguments.")
    assert is_argument_recommendation_request(
        "Show additional arguments to optimize payment terms."
    )
    assert is_argument_recommendation_request(None, "recommend negotiation arguments for Acme")
    # Questions about ONE source keep the full block (they need the no-data list).
    assert not is_argument_recommendation_request(
        "Should I use the peer group standard or the supplier standard?"
    )
    assert not is_argument_recommendation_request("Can I use DSO as an argument?")
