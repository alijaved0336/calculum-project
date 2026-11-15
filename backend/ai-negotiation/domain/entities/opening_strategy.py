from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AnchorEvidence:
    """The primary justification for the opening anchor.

    Sourced from whichever `SupplierFacts.strategy_benchmarks` entry has
    `applied=True` — i.e. the benchmark the upstream system actually used to
    derive `target_term_days`. If none is applied, the anchor is `None` and
    callers fall back to the existing target-vs-benchmark framing.
    """

    source: str | None  # raw negotiationStrategy key, e.g. "peerGroupStandard"
    label: str
    value: float | int | None
    detail: str
    rationale: str


@dataclass(frozen=True)
class BenchmarkComparison:
    """One `negotiationStrategy` benchmark, classified against the current
    and target terms."""

    source: str
    label: str
    value: float | int | None
    classification: str  # "supports" | "neutral" | "undermines"
    detail: str


@dataclass(frozen=True)
class StretchCeiling:
    """The gap between the modeled opportunity ceiling and the target term —
    a second-ask reserve if the opening lands without resistance."""

    term_days: int
    gap_days: int
    rationale: str


@dataclass(frozen=True)
class ScfReserveLever:
    """Whether Supply Chain Finance is a credible fallback offer, based on
    the financing-rate spread and any SCF-linked strategy benchmarks."""

    available: bool
    rationale: str


@dataclass(frozen=True)
class OpeningStrategyAnalysis:
    """Tier-2 judgments specific to framing the opening move.

    Computed once, alongside the two Tier-2 bundles, in
    :func:`domain.services.context_builder.build_supplier_context` by
    :func:`domain.services.opening_strategy_analysis.analyze_opening_strategy`.
    `recommend_opening_strategy` reads this from `context.opening_strategy`
    rather than re-deriving it.
    """

    primary_anchor: AnchorEvidence | None
    benchmark_ladder: list[BenchmarkComparison] = field(default_factory=list)
    counter_evidence: list[BenchmarkComparison] = field(default_factory=list)
    stretch_ceiling: StretchCeiling | None = None
    # Payment reliability (DSO / pay-on-terms) is NOT here: it argues for the ask
    # on every surface, not just the opening, so it lives on
    # the argument bundle's `assessments.payment_reliability` — read it there.
    phased_approach_recommended: bool = False
    phased_approach_reason: str | None = None
    scf_reserve_lever: ScfReserveLever | None = None
    cash_discount_note: str | None = None
