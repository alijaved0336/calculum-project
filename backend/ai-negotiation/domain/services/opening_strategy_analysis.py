from __future__ import annotations

from domain.entities.facts import (
    StrategyBenchmark,
    SupplierFacts,
    negotiation_ask_term,
)
from domain.entities.opening_strategy import (
    AnchorEvidence,
    BenchmarkComparison,
    OpeningStrategyAnalysis,
    ScfReserveLever,
    StretchCeiling,
)
from domain.services.negotiation_arguments import WEAK_CREDIT_RATINGS
from domain.services.scf_analysis import SCF_RATE_TOLERANCE_PTS
from domain.services.scf_policy import SCF_LINKED_BENCHMARKS

# Strategy benchmarks whose target term is conditioned on an SCF / early-pay
# offer being part of the deal — if one of these is the applied anchor (or
# supports the target), the opening should introduce SCF up front rather than
# hold it in reserve. Canonical set lives in ``scf_policy``.
_SCF_LINKED_BENCHMARKS = SCF_LINKED_BENCHMARKS


def _format_detail(benchmark: StrategyBenchmark) -> str:
    """Render a benchmark's value plus whatever supporting stats it carries."""
    if benchmark.occurrences is not None or benchmark.avg is not None or benchmark.q3 is not None:
        parts = [f"{benchmark.value} days"]
        stats = []
        if benchmark.avg is not None:
            stats.append(f"avg {benchmark.avg}")
        if benchmark.q3 is not None:
            stats.append(f"Q3 {benchmark.q3}")
        if benchmark.occurrences is not None:
            stats.append(f"n={benchmark.occurrences}")
        if stats:
            parts.append(f"({', '.join(stats)})")
        return " ".join(parts)

    if benchmark.description:
        suffix = f", {benchmark.limit_type} limit" if benchmark.limit_type else ""
        return f"{benchmark.value} days — {benchmark.description}{suffix}"

    if benchmark.limit_type:
        return f"{benchmark.value} days ({benchmark.limit_type} limit)"

    return f"{benchmark.value} days"


def _classify(
    benchmark: StrategyBenchmark,
    current_term_days: int | None,
    ask: int | None,
) -> str:
    """Classify a benchmark as evidence for the opening ask.

    ``ask`` is the term actually on the table (:func:`negotiation_ask_term`) —
    the same bar as :func:`domain.entities.facts.is_benchmark_citable`:

    - "supports": at or above the ask — it justifies our number.
    - "undermines": below the *current* term — evidence the supplier could
      cite to argue terms should be shorter, not longer. Never volunteered.
    - "neutral": everything else (between the current term and the ask, or no
      ask to compare against). Held back, not volunteered.
    """
    value = benchmark.value
    if value is None:
        return "neutral"
    if ask is not None and value >= ask:
        return "supports"
    if current_term_days is not None and value < current_term_days:
        return "undermines"
    return "neutral"


def _build_benchmark_ladder(facts: SupplierFacts) -> list[BenchmarkComparison]:
    ask = negotiation_ask_term(facts)
    return [
        BenchmarkComparison(
            source=b.name,
            label=b.label,
            value=b.value,
            classification=_classify(b, facts.current_term_days, ask),
            detail=_format_detail(b),
        )
        for b in facts.strategy_benchmarks
    ]


def _build_primary_anchor(
    facts: SupplierFacts, ladder: list[BenchmarkComparison]
) -> AnchorEvidence | None:
    """The benchmark the upstream system actually applied to set the target.

    Falls back to `None` if nothing is flagged `applied` — callers should then
    use the existing target-vs-`benchmark_term_days` framing from
    the argument sequence in `build_argument_analysis`.
    """
    applied = next((b for b in facts.strategy_benchmarks if b.applied), None)
    if applied is None:
        return None

    comparison = next((c for c in ladder if c.source == applied.name), None)
    detail = comparison.detail if comparison else _format_detail(applied)

    rationale = (
        f"The upstream system derived the {facts.target_term_days}-day target "
        f"from the {applied.label} ({detail}) — this is the strongest "
        f"available justification for the opening anchor because it's the "
        f"basis the system itself already used."
    )
    if applied.name in _SCF_LINKED_BENCHMARKS:
        rationale += (
            " Because this benchmark is SCF/early-payment-linked, the opening "
            "should introduce the SCF offer alongside the term ask, not hold "
            "it in reserve."
        )

    return AnchorEvidence(
        source=applied.name,
        label=applied.label,
        value=applied.value,
        detail=detail,
        rationale=rationale,
    )


def _build_stretch_ceiling(facts: SupplierFacts) -> StretchCeiling | None:
    """The gap between the modeled opportunity ceiling and the target term."""
    opportunity = facts.opportunity_term_days
    target = facts.target_term_days
    if opportunity is None or target is None or opportunity <= target:
        return None

    gap = opportunity - target
    return StretchCeiling(
        term_days=opportunity,
        gap_days=gap,
        rationale=(
            f"The modeled opportunity ceiling ({opportunity} days) sits "
            f"{gap} days above the target ({target} days). If the opening "
            f"lands without resistance, the data supports pushing toward "
            f"{opportunity} days before settling — don't anchor lower than "
            f"the target requires."
        ),
    )


def _build_phased_approach(
    facts: SupplierFacts, argument_analysis: dict
) -> tuple[bool, str | None]:
    """Whether the opening should proactively offer a phased/ramp structure
    rather than waiting for resistance — mirrors the `objection_small_company_cashflow`
    guardrail (90-day ramp) from the pushback playbook.

    Reads the two facts that say the supplier may not absorb the change in one
    step. It used to read a composite risk grade instead, which also went high
    on an enforced regulatory cap and on stale data — neither of which is a
    reason to RAMP, and both of which silently triggered one. That grade was
    removed (client, 2026-08-20); this reads the signals directly.
    """
    reasons: list[str] = []
    if facts.is_sme:
        reasons.append("the supplier is classified as an SME")
    rating = (facts.credit_rating or "").strip().upper()
    if rating in WEAK_CREDIT_RATINGS:
        reasons.append(
            f"the credit rating ({facts.credit_rating}) says they may not be able "
            f"to fund a longer cash cycle in one step"
        )

    if not reasons:
        return False, None

    return True, (
        "Proactively offer a phased/ramp structure in the opening rather than "
        "presenting the target cold, because " + "; ".join(reasons) + "."
    )


def _build_scf_reserve_lever(facts: SupplierFacts) -> ScfReserveLever | None:
    """Whether SCF is a credible fallback offer, based on the financing-rate
    spread and any SCF-linked strategy benchmarks at/above the target.

    Shares the viability rule in :mod:`domain.services.scf_analysis`: the lever
    survives a premium of up to :data:`SCF_RATE_TOLERANCE_PTS`, where it is held
    in reserve for the day-5 settlement rather than for cheaper money.
    """
    scf_rate = facts.scf_rate
    supplier_rate = facts.supplier_financing_rate
    target = facts.target_term_days

    if scf_rate is None or supplier_rate is None:
        return ScfReserveLever(
            available=False,
            rationale="SCF rate or supplier financing rate not available — cannot assess SCF as a reserve lever.",
        )

    premium_pts = round((scf_rate - supplier_rate) * 100, 6)
    if premium_pts > SCF_RATE_TOLERANCE_PTS:
        return ScfReserveLever(
            available=False,
            rationale=(
                f"The SCF rate ({scf_rate:.2%}) exceeds the supplier's financing rate "
                f"({supplier_rate:.2%}) by more than {SCF_RATE_TOLERANCE_PTS:.0f} pt, "
                f"so SCF is not a strong reserve lever here."
            ),
        )

    supporting = [
        b for b in facts.strategy_benchmarks
        if b.name in _SCF_LINKED_BENCHMARKS and target is not None and b.value is not None and b.value >= target
    ]

    if premium_pts < 0:
        position = (
            f"SCF rate ({scf_rate:.2%}) undercuts the supplier's financing rate "
            f"({supplier_rate:.2%}) by {-premium_pts:.1f} pts"
        )
    elif premium_pts == 0:
        position = (
            f"SCF rate ({scf_rate:.2%}) matches the supplier's own financing rate, so "
            f"the lever is the day-5 settlement and off-balance-sheet treatment, not price"
        )
    else:
        position = (
            f"SCF rate ({scf_rate:.2%}) runs {premium_pts:.1f} pts above the supplier's own "
            f"financing rate ({supplier_rate:.2%}) — within the {SCF_RATE_TOLERANCE_PTS:.0f} pt "
            f"tolerance, so the lever is the day-5 settlement and off-balance-sheet treatment, "
            f"not price; do not pitch it as cheaper money"
        )

    if supporting:
        names = ", ".join(f"{b.label} ({b.value} days)" for b in supporting)
        return ScfReserveLever(
            available=True,
            rationale=(
                f"{position}, and SCF-linked benchmarks support terms at/above the "
                f"target: {names}. SCF is a credible fallback, not just a platitude, "
                f"if resistance is strong."
            ),
        )

    return ScfReserveLever(
        available=True,
        rationale=(
            f"{position} — a credible relief valve to offer if resistance is strong, "
            f"though no SCF-linked benchmark explicitly supports the target term."
        ),
    )


def _build_cash_discount_note(facts: SupplierFacts) -> str | None:
    """The agreed cash-discount arrangement to reconcile in the opening, if any.

    Returns None when there is nothing on file. It used to return a "no
    arrangement on file" sentence instead, which put a note about a discount
    that does not exist into EVERY opening-strategy prompt — inviting the model
    to write a sequencing line about nothing. `None` simply omits the block, and
    the prompt's "skip any that don't apply" already covers its absence.

    "Cash discount", not "early-payment discount": this is the contractual
    prompt-payment discount, unrelated to Supply Chain Finance, and the old
    wording made the SCF output backstop fire on legitimate answers.
    """
    if facts.agreed_terms_with_cash_discounts is None and facts.agreed_cash_discount_percentage is None:
        return None

    pct = (
        f"{facts.agreed_cash_discount_percentage:.2%}"
        if facts.agreed_cash_discount_percentage is not None
        else "an unspecified rate"
    )
    days = (
        f"{facts.agreed_terms_with_cash_discounts} days"
        if facts.agreed_terms_with_cash_discounts is not None
        else "an unspecified term"
    )
    return (
        f"An agreed cash discount is in place ({days} at {pct}) — "
        f"the opening should address whether the term extension preserves, "
        f"modifies, or trades away this discount."
    )


def analyze_opening_strategy(
    facts: SupplierFacts, argument_analysis: dict
) -> OpeningStrategyAnalysis:
    """Run every opening-strategy-specific judgment once and bundle the results.

    Call this exactly once per supplier — `build_supplier_context` does it
    at session start, right after `build_argument_analysis`, whose bundle it
    takes for the posture judgments — and have `recommend_opening_strategy` read
    the result from `context.opening_strategy` rather than re-deriving it.
    """
    ladder = _build_benchmark_ladder(facts)
    primary_anchor = _build_primary_anchor(facts, ladder)
    counter_evidence = [c for c in ladder if c.classification == "undermines"]
    phased_recommended, phased_reason = _build_phased_approach(facts, argument_analysis)

    return OpeningStrategyAnalysis(
        primary_anchor=primary_anchor,
        benchmark_ladder=ladder,
        counter_evidence=counter_evidence,
        stretch_ceiling=_build_stretch_ceiling(facts),
        phased_approach_recommended=phased_recommended,
        phased_approach_reason=phased_reason,
        scf_reserve_lever=_build_scf_reserve_lever(facts),
        cash_discount_note=_build_cash_discount_note(facts),
    )
