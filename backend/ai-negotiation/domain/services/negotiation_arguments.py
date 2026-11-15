"""The negotiation-argument engine — one place for every argument the
assistant can make, and for the judgments those arguments rest on.

Everything here is Tier-2: derived from :class:`SupplierFacts`, never invented,
computed exactly ONCE per session by
:func:`domain.services.context_builder.build_supplier_context` and read by every
intent/agent from ``context.argument_analysis``. Nothing in this module is specific to a
single intent — the playbook, the opening strategy, pushback handling, the
counter-offer evaluation and the summary all argue from the same objects, which
is what stops two surfaces disagreeing about the same supplier.

What lives here:

  * **Arguments** (:func:`build_negotiation_arguments`) — the checkable term
    figures (market benchmarks + the spend-file opportunity) bucketed by how far
    they support the ask, ordered by source credibility.
  * **Benchmark leverage** (:func:`is_benchmark_citable`,
    :func:`citable_support_benchmarks`, :func:`supplier_facing_benchmarks`,
    :func:`opening_anchor_benchmark`, ...) — which benchmark may justify the ask,
    which may be shown to the supplier, which anchors the opening — plus
    :func:`build_argument_sequence`, which orders them into a case.
  * **Payment behaviour** — two separate supporting arguments about cash rather
    than the market: :func:`assess_payment_reliability` (Pay-on-Terms against
    what we actually pay — do WE keep our side?) and
    :func:`assess_dso_alignment` (DSO already above contractual current — leverage
    toward the ask from a baseline past the contract).
  * **Cost impact** (:func:`assess_cost_impact`) — what the extension actually
    costs the supplier as a share of SPEND, using the client's own formula
    (cash-flow opportunity valued at the supplier's WACC): the argument that
    makes an unbounded cash-flow objection bounded.
  * **Relationship** (:func:`assess_client_supplier_relationship`) — the
    partnership itself as an argument, and the posture the leverage ratings
    recommend for making it. The case a stretch target falls back on.
  * **The presented set** (:func:`collect_supporting_arguments`) — every
    argument that actually supports THIS ask, ranked by the client's source
    order and bound to the catalogue wording (what it is / how to pitch it).
  * **Posture judgments** (:func:`score_leverage`,
    :func:`classify_financial_sensitivity`, :func:`rank_business_priority`)
    — how hard this negotiation can be pushed,
    which is what decides how forcefully the arguments get deployed.

:func:`analyze_supplier` runs the lot and bundles it into
:class:`NegotiationAnalysis`.

How likely the ask is to be AGREED is not computed here, and is no longer
computed anywhere: it arrives from the upstream payload as
``SupplierFacts.success_probability`` (client, 2026-08-20).

Neither is a RISK PROFILE. One was graded here — regulatory cap, SME flag,
protected-business designation, weak credit rating, buyer-standard limit type,
data age → low/medium/high — and removed on the same date. Every one of those is
a fact, and every one is now rendered as a fact; grading them into a level
neither added information nor let the negotiator see which one was firing.
"""
from __future__ import annotations

from domain.entities.analysis import (
    COST_IMPACT_SUPPLIER_FACING_TEMPLATE,
    ArgumentStep,
    BusinessPriority,
    CostImpact,
    DsoAlignment,
    FinancialSensitivity,
    LeverageAssessment,
    NegotiationAnalysis,
    PaymentReliability,
    RelationshipAssessment,
    dso_supplier_facing_wording,
)
from utils.constants import format_camel_label
from utils.prompts.brief.facts import format_money
from domain.entities.argument_catalog import (
    ARGUMENT_CATALOG,
    PresentedArgument,
    argument_display_name,
)
from domain.entities.arguments import (
    ARGUMENT_SOURCE_PRECEDENCE,
    SUPPORT_FULL,
    SUPPORT_NONE,
    Argument,
    NegotiationArguments,
)
from domain.entities.facts import (
    TERM_HARMONISATION_STEP_DAYS,
    StrategyBenchmark,
    SupplierFacts,
    negotiation_ask_term,
    regulatory_cap_days,
    resolve_effective_batna,
)

_LEVEL_RANK = {"low": 0, "medium": 1, "high": 2}
# Public rather than private: a weak rating gates the financing arguments here
# and is also rendered, as the plain fact it is, on the FACTS block.
WEAK_CREDIT_RATINGS = frozenset({"C", "CC", "CCC", "D"})

# ``negotiationStrategy.<name>`` entries we can point to by name to *leverage* a
# position as evidence FOR the ask. Deliberately EXCLUDES:
#   - harmonization  — internal rounding bucket (removed from the product)
#   - regulatoryTerm — a legal ceiling / guardrail, never a lever
#   - payOnTerms     — a baseline, usually ≈ the current term. Not discarded: it
#                      is payment-behaviour evidence, handled by
#                      :func:`assess_payment_reliability`.
#   - scf* / vCard / cashDiscountConversion — conditional on a financing or
#                      discount deal, not a plain-term lever.
_LEVERAGE_BENCHMARK_NAMES = frozenset({
    "parentOrSupplierMax",
    "peerGroupStandard",
    "industryRegionStandard",
    "supplierStandard",
    "buyerStandard",
})

# The subset usable as supplier-facing ARGUMENTS: the same pool minus the
# buyer's own AP policy, which is not independent market evidence ("our system
# says X"). Derived rather than re-listed — the two sets differ by exactly this
# one name, and spelling both out is how they drift. The four that remain are
# the client's benchmark hierarchy; their relative strength lives in
# ``ARGUMENT_SOURCE_PRECEDENCE``.
_ARGUMENT_BENCHMARK_NAMES = _LEVERAGE_BENCHMARK_NAMES - {"buyerStandard"}

def _rank(level: str | None) -> int | None:
    if level is None:
        return None
    return _LEVEL_RANK.get(level.strip().lower())


# ── Arguments: benchmarks + the spend-file opportunity ─────────────────────


def _classify(value: int, bar: float | None) -> str:
    """Bucket a benchmark: SUPPORTING above the support bar, otherwise not.

    TWO buckets, not three (client, 2026-08-18). Every benchmark above
    :func:`benchmark_support_bar` is a supporting benchmark; everything at or
    below it is non-supporting and never reaches the playbook at all.

    The old model had a third, middle band — ``partial`` / HOLD IN RESERVE, for
    figures above the floor but below the ask. Carlos, Aug 11: *"we should just
    focus on the ones that are contributing in some way that are larger than the
    contractual. And the other ones, we don't need to mention unless they ask
    about it."* Joel: *"we don't base our proposal on that... try to keep it
    simple."* A reserve tier the negotiator had to reason about is exactly the
    complexity they asked us to remove.

    The bar sits between the current term and the target (see
    :func:`benchmark_support_bar`), so a supporting benchmark can still fall
    short of the ask. What it may not do is claim to justify the full ask; that
    is a WORDING rule (see :func:`_rationale`, and ``P4_INSUFFICIENT_EVIDENCE``
    on the output), not a reason to bucket it lower.
    """
    if bar is not None and value > bar:
        return SUPPORT_FULL
    return SUPPORT_NONE


def _rationale(
    label: str,
    value: int,
    support: str,
    target: int | None,
    fallback: int | None,
    current: int | None,
    undermines: bool,
    reference: str | None = None,
) -> str:
    # A figure that comes from ONE identifiable record (the spend-line
    # opportunity) is always named with that record, so the rationale itself
    # tells the negotiator which spend it is — not just "the highest line".
    label = f"{label} ({reference})" if reference else label
    if support == SUPPORT_FULL:
        # Above the current term, so it is a supporting benchmark. Whether it
        # reaches the ASK decides what it may be said to prove — P4, and the
        # thing Carlos flagged twice ("A 48 day benchmark does not justify a 90
        # extension").
        if target is not None and value < target:
            return (
                f"At {value} days, {label} is above our current {current}-day "
                f"term but short of the {target}-day ask — independent, "
                "checkable evidence that longer terms already exist here. Cite "
                "it to show the current term is not the ceiling; do NOT present "
                "it as justifying the full ask."
            )
        position = "matches" if value == target else "sits above"
        return (
            f"At {value} days, {label} {position} the {target}-day ask — "
            "independent, checkable evidence that the target is reasonable. "
            "Cite it to justify the ask."
        )
    if undermines:
        return (
            f"At {value} days, {label} is below the current {current}-day term — "
            "the supplier could cite it to argue for shorter terms, so never "
            "volunteer it."
        )
    if current is not None and value > current:
        return (
            f"At {value} days, {label} is above our current {current}-day term "
            f"but too close to it to support the {target}-day ask — it is not an "
            "argument; hold it back."
        )
    return (
        f"At {value} days, {label} is at our current {current}-day term — it "
        "evidences only the status quo, so it argues for no movement at all; "
        "hold it back."
    )


def _make_argument(
    source: str,
    label: str,
    value: int,
    target: int | None,
    fallback: int | None,
    current: int | None,
    bar: float | None,
    occurrences: int | None = None,
    reference: str | None = None,
) -> Argument:
    # Bucketed against the support bar (see `benchmark_support_bar`), not the
    # BATNA — the floor now only colours the wording (see `_rationale`).
    support = _classify(value, bar)
    undermines = current is not None and value < current
    return Argument(
        source=source,
        label=label,
        value=value,
        precedence=ARGUMENT_SOURCE_PRECEDENCE.get(source, 99),
        support=support,
        undermines=undermines,
        rationale=_rationale(
            label, value, support, target, fallback, current, undermines, reference
        ),
        occurrences=occurrences,
        reference=reference,
    )


def build_negotiation_arguments(facts: SupplierFacts) -> NegotiationArguments:
    """Gather every negotiation argument from the supplier's benchmarks + spend
    file, segregate them by support level, and order each bucket by source
    precedence.

    The ask is :func:`negotiation_ask_term` (opportunity term first, else
    target); the floor is :func:`resolve_effective_batna` — which already
    honours a session BATNA override baked into ``facts``
    (``batna_override_days``), so the buckets line up with the floor shown
    everywhere else. Harmonization, the regulatory (legal) term, and the buyer's
    internal standard are excluded — see ``_ARGUMENT_BENCHMARK_NAMES``.
    """
    target = negotiation_ask_term(facts)
    fallback, _ = resolve_effective_batna(facts)
    current = facts.current_term_days
    bar = benchmark_support_bar(facts)

    candidates: list[Argument] = []
    present_sources: set[str] = set()

    # 1) Market benchmarks — the four client-hierarchy sources.
    for b in facts.strategy_benchmarks:
        if b.name in _ARGUMENT_BENCHMARK_NAMES and b.value is not None:
            candidates.append(
                _make_argument(
                    b.name, b.label, int(b.value), target, fallback, current,
                    bar, occurrences=b.occurrences,
                )
            )
            present_sources.add(b.name)

    def _ordered(support: str) -> list[Argument]:
        # Within a bucket, order by SOURCE precedence (client hierarchy), then
        # by value descending as a stable tiebreak.
        return sorted(
            (a for a in candidates if a.support == support),
            key=lambda a: (a.precedence, -a.value),
        )

    # Every argument-eligible source with NO value at all for this supplier —
    # dropped upstream at extraction (null in the raw payload), so it never
    # became a candidate above. Named by CANONICAL source key (supplierStandard,
    # peerGroupStandard, ...) rather than a prose label: the negotiator refers to
    # benchmarks by those names, and a paraphrase like "this supplier's own
    # segment" reads as a different, unrecognisable source. Ordered by the same
    # source-credibility precedence as the buckets.
    unavailable = [
        name
        for name, _ in sorted(ARGUMENT_SOURCE_PRECEDENCE.items(), key=lambda kv: kv[1])
        if name not in present_sources
    ]

    return NegotiationArguments(
        target_term_days=target,
        batna_term_days=fallback,
        current_term_days=current,
        full_support=_ordered(SUPPORT_FULL),
        non_support=_ordered(SUPPORT_NONE),
        unavailable=unavailable,
    )


# ── Benchmark leverage: which benchmark may be cited, and to whom ─────────
#
# These used to live in `domain.entities.facts`, next to the data they read.
# They are not data: they are the policy deciding which figure may justify the
# ask and which may be shown to the supplier — the same decision the argument
# buckets above make — so they belong with the arguments. `facts` keeps only
# the raw fields and the two derivations everything here builds on
# (`negotiation_ask_term`, `resolve_effective_batna`).


def _leverage_pool(
    facts: SupplierFacts,
    *,
    at_least: int | float | None = None,
    above: int | float | None = None,
    below: int | float | None = None,
    highest_first: bool = True,
) -> list[StrategyBenchmark]:
    """Leverage-pool benchmarks with a value, bounded and sorted.

    The one filter behind every benchmark selector below. It used to be copied
    into each of them, which is how the citability bar drifted apart once
    already — with one filter, a rule change lands everywhere at once or
    nowhere. Bounds are inclusive-low (``at_least``) or exclusive
    (``above``/``below``) to match how each band is defined.
    """
    return sorted(
        (b for b in facts.strategy_benchmarks
         if b.name in _LEVERAGE_BENCHMARK_NAMES
         and b.value is not None
         and (at_least is None or b.value >= at_least)
         and (above is None or b.value > above)
         and (below is None or b.value < below)),
        key=lambda b: b.value, reverse=highest_first,
    )


# A gap wider than this between the current term and the ask moves the support
# bar to ``current + 15``; at or inside it, the bar is the midpoint between the
# two. One harmonisation step — the smallest improvement the gate accepts.
BENCHMARK_WIDE_GAP_DAYS = TERM_HARMONISATION_STEP_DAYS


def benchmark_support_bar(facts: SupplierFacts) -> float | None:
    """The value a benchmark must STRICTLY exceed to be used as an argument.

    Client rule (2026-09-17), with ``gap = ask - current``:

      * ``gap <= 15`` — only benchmarks CLOSER TO THE ASK than to the current
        term, i.e. above the midpoint ``(current + ask) / 2``. Benchmarks above
        the ask count too; they are closer to it. If NO leverage-pool benchmark
        clears the midpoint, fall back to every benchmark above the current term.
      * ``gap > 15`` — only benchmarks above ``current + 15``.

    Current 30, ask 45 → bar 37.5 (40 and 60 count, 35 does not; with only 32
    and 35 on file, the bar drops to 30 and both count). Current 30, ask 60 →
    bar 45 (50 counts, 45 does not).

    ONE bar per supplier, decided over the whole leverage pool, so every
    selector (arguments, BATNA support, supplier-facing benchmarks) agrees on
    which benchmark is evidence — including whether the fallback fired. Never
    below the current term: a figure at or under what we pay today is the status
    quo or the supplier's counter-evidence whatever the ask. ``None`` when there
    is no current term; the current term itself when there is no ask.
    """
    current = facts.current_term_days
    if current is None:
        return None
    ask = negotiation_ask_term(facts)
    if ask is None or ask <= current:
        return float(current)
    if ask - current > BENCHMARK_WIDE_GAP_DAYS:
        return float(current + BENCHMARK_WIDE_GAP_DAYS)
    midpoint = (current + ask) / 2
    if _leverage_pool(facts, above=midpoint):
        return midpoint
    return float(current)


def is_benchmark_citable(value: float | int | None, facts: SupplierFacts) -> bool:
    """Whether a single benchmark value may be used as an argument.

    Citable means STRICTLY ABOVE :func:`benchmark_support_bar` — above the
    midpoint between the current term and the ask when they are within 15 days
    of each other (else above the current term, if nothing clears the midpoint),
    above ``current + 15`` when they are further apart. A benchmark at or below
    the current term is never an argument — at the current term it is the status
    quo, and below it, it hands the supplier a counter-figure ("the standard is
    35 — why do you want 76?"). One between the current term and the bar is too
    close to the status quo to move the supplier. Any of those may still be
    *stated* as market context via :func:`market_benchmarks`; they are never
    argued from.

    What survives from the old ``value >= ask`` rule is the DISTINCTION, not the
    exclusion: :func:`key_argument_benchmarks` (``>= ask``) justifies the full
    ask; one between the bar and the ask justifies moving off the status quo but
    not the whole way. P4 requires saying which — which the rationale wording
    does — not putting them in different buckets.

    Every selector below applies this same bar — when they disagreed, one
    benchmark was presented as both citable evidence and non-supporting in the
    same brief.
    """
    bar = benchmark_support_bar(facts)
    return value is not None and bar is not None and value > bar


# How far below the ask a benchmark may sit and still count as AT the target:
# half a harmonisation step. The ask is itself rounded to the nearest 15 days,
# so a figure within 7 days of it would round to the very same target — 59
# against 60 is the target, not evidence falling short of it.
BENCHMARK_AT_TARGET_TOLERANCE_DAYS = TERM_HARMONISATION_STEP_DAYS // 2

TARGET_SUPPORT_FULL = "full"  # the argued value is at or above the ask
TARGET_SUPPORT_AT_TARGET = "at_target"  # within the tolerance below the ask
TARGET_SUPPORT_UPPER_RANGE = "upper_range"  # only the upper quartile gets there
TARGET_SUPPORT_PARTIAL = "partial"  # neither does: direction, not the number


def benchmark_target_support(
    value: float | None, q3: float | None, ask: float | None
) -> str | None:
    """How far a CITED benchmark carries the target, for the playbook Rationale.

    Citability (:func:`is_benchmark_citable`) decides whether a benchmark is
    argued at all; this decides what the rationale may claim for it:

      * ``full``        — the argued value is at or above the ask;
      * ``at_target``   — it is below the ask by no more than
                          :data:`BENCHMARK_AT_TARGET_TOLERANCE_DAYS`;
      * ``upper_range`` — the value falls short, but the upper quartile is at
                          or within that tolerance of the ask, so the target is
                          inside the range already being accepted;
      * ``partial``     — both fall short: it supports moving off the current
                          term, not the full target.

    ``None`` when there is no value or no ask to compare against.
    """
    if value is None or ask is None:
        return None
    floor = ask - BENCHMARK_AT_TARGET_TOLERANCE_DAYS
    if value >= ask:
        return TARGET_SUPPORT_FULL
    if value >= floor:
        return TARGET_SUPPORT_AT_TARGET
    if q3 is not None and q3 >= floor:
        return TARGET_SUPPORT_UPPER_RANGE
    return TARGET_SUPPORT_PARTIAL


def market_benchmarks(facts: SupplierFacts) -> list[StrategyBenchmark]:
    """Every leverage-pool benchmark that has a value, highest first.

    This is the full market context the negotiator may *state* factually —
    including benchmarks below the ask (e.g. a low industry standard).
    Distinct from :func:`citable_support_benchmarks`, which is the subset that
    may be used to *justify* the ask. Quoting a benchmark and justifying the ask
    with it are different things: we disclose all of them, but only argue from
    the ones that reach the ask.
    """
    return _leverage_pool(facts)


def citable_support_benchmarks(facts: SupplierFacts) -> list[StrategyBenchmark]:
    """Every benchmark usable as an argument, in citation order.

    Leverage-pool benchmarks STRICTLY ABOVE :func:`benchmark_support_bar` (see
    :func:`is_benchmark_citable`). A benchmark at or below the bar is not an
    argument; state it as context via :func:`market_benchmarks` instead.

    A superset of :func:`key_argument_benchmarks` (``>= ask`` — justifies the
    full ask) — every benchmark above the bar. Ascending — the
    benchmark closest to our number first, because it reads as independent
    corroboration, while a far-higher outlier invites "you picked the one that
    suits you". Everything returned is quotable, so this is a presentation
    order, not a strength ranking; how far each one reaches is what the two
    narrower selectors say.
    """
    bar = benchmark_support_bar(facts)
    if bar is None:
        return []
    return _leverage_pool(facts, above=bar, highest_first=False)


def key_argument_benchmarks(facts: SupplierFacts) -> list[StrategyBenchmark]:
    """Benchmarks AT OR ABOVE the ask — evidence for the FULL ask.

    Leverage-pool benchmarks whose value meets or exceeds the ask (opportunity
    term first, else target). These are the strongest justification for the
    target: an independent market figure that already sits at or above what
    we're proposing. Highest first.

    Deliberately narrower than :func:`citable_support_benchmarks`. That set is
    everything we may argue from (``> current``); this is the subset that
    reaches all the way. P4 — a 48-day benchmark does not justify a 90-day
    extension — is why that distinction survives in the WORDING even though
    both now sit in one bucket.

    ``>=``, not ``>``: a benchmark landing exactly on the ask fully supports it,
    and the applied benchmark the target was derived from usually IS the ask.
    """
    ask = negotiation_ask_term(facts)
    if ask is None:
        return []
    return _leverage_pool(facts, at_least=ask)


# Which benchmarks may be cited TO THE SUPPLIER, and in what preference order
# (client spec 2026-07-20). Distinct from the internal ARGUMENT_SOURCE_PRECEDENCE:
#   * buyerStandard LEADS — framed to the supplier as company payment-term policy;
#   * the supplier/parent precedent is a SINGLE collapsed entry (parentOrSupplierMax)
#     — the data has no separate supplierMax/parentMax, so supplierMax is deferred;
#   * industry/region outranks the peer group;
#   * supplierStandard and the spend-line opportunity are INTERNAL ONLY — never here.
_SUPPLIER_FACING_BENCHMARK_PRECEDENCE = {
    "buyerStandard": 1,
    "parentOrSupplierMax": 2,
    "industryRegionStandard": 3,
    "peerGroupStandard": 4,
}

def supplier_facing_benchmarks(facts: SupplierFacts) -> list[StrategyBenchmark]:
    """EVERY benchmark that may be cited TO THE SUPPLIER, strongest first.

    Selection rules:
      * a benchmark is usable ONLY when ``value > benchmark_support_bar`` —
        null, zero, at-current, below-current and too-close-to-current
        benchmarks are ignored (they only arm the supplier);
      * ordered by SUPPLIER-FACING precedence (buyerStandard > supplier/parent
        precedent > industry/region > peer group).

    The bar is :func:`benchmark_support_bar`, not the ask. A benchmark between
    the two still shows the supplier that longer terms already exist — evidence for
    movement, which is a real argument to put to them. How far each one reaches
    is decided by the rationale wording; this selector answers only "may we say
    it to them", and precedence answers "in what order".

    NO CAP (client, 2026-07-30 — this used to return at most two). Every
    benchmark above the bar is evidence, and dropping the third and
    fourth threw away support the negotiator had earned; the ordering already
    says which to lead with. ``supplierStandard`` and the spend-line opportunity
    are internal-only and never appear here. Returns ``[]`` when nothing clears
    the bar — see :func:`supplier_facing_benchmark_support`; do not invent
    support.
    """
    bar = benchmark_support_bar(facts)
    if bar is None:
        return []
    return sorted(
        (b for b in facts.strategy_benchmarks
         if b.name in _SUPPLIER_FACING_BENCHMARK_PRECEDENCE
         and b.value is not None and b.value > bar),
        key=lambda b: _SUPPLIER_FACING_BENCHMARK_PRECEDENCE[b.name],
    )


def supplier_facing_benchmark_support(facts: SupplierFacts) -> bool:
    """Whether ANY benchmark supports the proposed term for supplier-facing use.

    ``False`` means a STRETCH TARGET — the proposal has no market benchmark at or
    above it, so the case to the supplier must rest on the relationship, payment
    reliability, and the proposed terms, never on invented benchmark support.
    """
    return bool(supplier_facing_benchmarks(facts))


def opening_anchor_benchmark(facts: SupplierFacts) -> StrategyBenchmark | None:
    """The benchmark to OPEN at — a citable precedent STRICTLY ABOVE the ask.

    The playbook's Opening Position must show the movement logic, not just the
    ask: "open at [anchor], supported by the precedent, with the objective of
    settling at [target]". The anchor is the first supplier-facing benchmark
    (:func:`supplier_facing_benchmarks` — already precedence-ordered and
    ``value >= ask``-filtered) whose value exceeds the ask — anchoring at a
    figure we could never cite would be incoherent, and a benchmark EQUAL to
    the ask leaves no headroom to open above it.

    Returns ``None`` when no citable benchmark clears the ask (the opening IS
    the target itself) or when the only candidates breach an APPLIED regulatory
    cap (:func:`regulatory_cap_days`) — never advise opening above a legal
    maximum.
    """
    ask = negotiation_ask_term(facts)
    if ask is None:
        return None
    cap = regulatory_cap_days(facts)
    for b in supplier_facing_benchmarks(facts):
        if b.value is None or b.value <= ask:
            continue
        if cap is not None and b.value > cap:
            continue
        return b
    return None


# ── Payment behaviour: Pay-on-Terms as a trust argument ────────────────────

# How many days past the contractual terms still counts as "broadly aligned".
# Client rule: zero-or-negative variance is the strong form, a small overrun is
# still usable, anything beyond this is late and never put to the supplier.
PAYMENT_VARIANCE_TOLERANCE_DAYS = 2


def assess_payment_reliability(
    facts: SupplierFacts,
    tolerance_days: int = PAYMENT_VARIANCE_TOLERANCE_DAYS,
) -> PaymentReliability:
    """Whether our own payment record can be offered to the supplier as
    reassurance that a longer term adds no payment risk.

    ``variance = actual payment days − Pay-on-Terms`` (client rule):

      * ``<= 0``              — we pay on or before terms → strong argument;
      * ``<= tolerance_days`` — broadly aligned            → usable argument;
      * beyond that           — we pay late                → never volunteered;
      * either input missing  — unavailable                → never volunteered.

    The two inputs are :attr:`SupplierFacts.pay_on_terms_term_days`
    (``negotiationStrategy.payOnTerms.value``, the contractual baseline) and
    :attr:`SupplierFacts.actual_payment_terms_days` (the spend-volume-weighted
    average of per-line actual payment terms). The actual figure is deliberately
    NOT ``current_term_days``: that field falls back to payOnTerms itself when
    spend data is absent, which would compare the baseline with itself, produce
    a variance of 0 and claim reliability we have no evidence for.

    DSO is NOT used here. It is a different measure of a different thing and is
    getting its own treatment; this assessment is Pay-on-Terms only.

    What this is NOT: Pay-on-Terms is not a benchmark, not a supplier standard,
    not a payment-term target, and never a reason to demand longer terms. It
    cannot justify the ask — it only removes an objection to it, which is why it
    never enters the benchmark pools (see ``_ARGUMENT_BENCHMARK_NAMES``) and why
    the approved supplier-facing wording carries no day-count at all.
    """
    baseline = facts.pay_on_terms_term_days
    actual = facts.actual_payment_terms_days

    if baseline is None or actual is None:
        missing = (
            "Pay-on-Terms baseline" if baseline is None else "actual payment data"
        )
        return PaymentReliability(
            status="unavailable",
            usable_as_argument=False,
            rationale=(
                f"{missing} is unavailable for this supplier, so payment "
                "reliability cannot be evidenced. Do not claim a payment record "
                "to the supplier — say nothing about it either way."
            ),
            pay_on_terms_term_days=baseline,
            actual_payment_days=actual,
        )

    variance = actual - baseline
    common = dict(
        pay_on_terms_term_days=baseline,
        actual_payment_days=actual,
        variance_days=variance,
    )
    figures = (
        f"Actual payment average {actual} days against a Pay-on-Terms baseline "
        f"of {baseline} days (variance {variance:+d} days)."
    )
    # Why the argument works, in the client's terms: the supplier is paid
    # predictably, so the extension reads as a working-capital adjustment rather
    # than a financing risk they are being asked to carry.
    trust_framing = (
        " Use it as reassurance only: payments arrive predictably, so the "
        "proposed extension is a structured adjustment to the payment cycle, "
        "not a change in payment reliability. It does not justify the ask."
    )

    if variance <= 0:
        return PaymentReliability(
            status="on_or_before_terms",
            usable_as_argument=True,
            rationale=f"Buyer pays within agreed payment terms. {figures}{trust_framing}",
            **common,
        )

    if variance <= tolerance_days:
        return PaymentReliability(
            status="minor_variance",
            usable_as_argument=True,
            rationale=(
                f"Buyer payment behaviour is broadly aligned with agreed terms. "
                f"{figures}{trust_framing}"
            ),
            **common,
        )

    return PaymentReliability(
        status="behind_terms",
        usable_as_argument=False,
        rationale=(
            f"Buyer pays beyond agreed payment terms. {figures} Do NOT offer our "
            "payment record as an argument — it invites the supplier to raise "
            "our own late payment. Address it only if they raise it first, by "
            "committing to predictable payment under the new terms."
        ),
        **common,
    )


# ── DSO: contractual current vs DSO vs the ask ─────────────────────────────


def assess_dso_alignment(facts: SupplierFacts) -> DsoAlignment:
    """Whether DSO already sits above contractual current — leverage toward the ask.

    Example: current 60, DSO 75, ask 90. Contract says 60, but DSO already sits
    at 75 — payment timing past the contract. That 75-day baseline is leverage
    toward 90.

    ``dso > current`` → usable (``stepping_stone`` if DSO is still below the ask,
    ``at_or_above_ask`` when DSO already reaches it). Otherwise do not claim
    this leverage.
    """
    dso = facts.dso
    current = facts.current_term_days
    proposed = negotiation_ask_term(facts)

    if dso is None or current is None or proposed is None:
        missing = (
            "The DSO figure" if dso is None
            else "The contractual current term" if current is None
            else "The proposed term"
        )
        return DsoAlignment(
            status="unavailable",
            usable_as_argument=False,
            rationale=(
                f"{missing} is unavailable, so DSO cannot be compared with "
                "contractual current terms. Do not claim payment already runs "
                "past the contract on DSO."
            ),
            dso=dso,
            current_term_days=current,
            proposed_term_days=proposed,
        )

    gap = proposed - dso
    common = dict(
        dso=dso,
        current_term_days=current,
        proposed_term_days=proposed,
        gap_days=gap,
    )

    if dso <= current:
        return DsoAlignment(
            status="at_or_below_contract",
            usable_as_argument=False,
            rationale=(
                f"DSO is {dso} days against contractual current terms of "
                f"{current} days - not above the contract. Do NOT claim "
                "payment already runs past the contract on DSO, and do not "
                f"use DSO as leverage toward the {proposed}-day ask."
            ),
            **common,
        )

    status = "stepping_stone" if dso < proposed else "at_or_above_ask"
    wording = dso_supplier_facing_wording(current, dso, proposed)
    return DsoAlignment(
        status=status,
        usable_as_argument=True,
        rationale=(
            f"Contractual terms are {current} days, but DSO already sits at "
            f"{dso} days - payment timing past the contract. That {dso}-day "
            f"baseline is leverage toward the {proposed}-day ask."
        ),
        supplier_facing_wording=wording,
        **common,
    )


# ── Cost impact: what the extension actually costs the supplier ────────────

# Above this share of spend the impact stops being "limited". Putting a
# bigger number in front of the supplier arms them ("so you admit it costs us
# 4%") instead of shrinking the objection, so the argument is withheld rather
# than reworded. Chosen here, not client-specified: confirm the ceiling.
COST_IMPACT_LIMITED_CEILING_PERCENT = 2.0

# Client defaults where the payload has no value (Carlos, 2026-08-18). Both are
# ASSUMPTIONS: every use is recorded on `CostImpact.assumptions` and named in
# the rationale, so a figure resting on one always says so.
DEFAULT_SUPPLIER_WACC = 0.09
# No supplier tax rate exists on the payload at all — this is always assumed.
DEFAULT_SUPPLIER_TAX_RATE = 0.35


def _money(value: float) -> str:
    """Compact money for the calculation string — "$12.85M", "$850K".

    Local rather than imported from the brief renderer: `domain` must not depend
    on `utils.prompts`. The client's own rule is the compact form ("MONEY AS
    GIVEN"), so nine digits never appear here either.
    """
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:,.2f}M"
    if abs(value) >= 1_000:
        return f"${value / 1_000:,.0f}K"
    return f"${value:,.0f}"

# Days in the financing year used to pro-rate the annual rate.
_DAYS_IN_YEAR = 365


def assess_cost_impact(
    facts: SupplierFacts,
    limited_ceiling_percent: float = COST_IMPACT_LIMITED_CEILING_PERCENT,
    *,
    price_change_pct: float = 0.0,
    volume_change: float = 0.0,
) -> CostImpact:
    """What the extension costs the supplier, as a share of spend volume.

    The client's formula (Carlos, 2026-08-18)::

        Supplier Economic Profit = cash_flow_opportunity × supplier_WACC
                                 + price_change_pct × volume_change
                                   × (1 − supplier_tax_rate)

        Cost Impact %            = Supplier Economic Profit / spend_volume

    ``supplier_WACC`` is ``wacc_after_tax``; ``supplier_tax_rate`` has no field
    on the payload at all. Both fall back to the client's stated defaults — 9%
    and 35% — and EVERY default applied is recorded in ``assumptions`` and named
    in the rationale. A percentage resting on an assumed rate that does not say
    so is precisely the "where is this coming from?" complaint.

    ``price_change_pct`` and ``volume_change`` are SCENARIO inputs and default to
    zero, so for a plain term extension the second term drops out entirely and
    the impact is the cash-flow opportunity valued at the supplier's own cost of
    capital. They exist so a "what if I also move price 2%?" scenario runs
    through the same formula rather than a second one.

    This REPLACES ``(extension_days / 365) × supplier_financing_rate``. Carlos
    called that discrepancy on 2026-08-13: *"instead of financing rate, we might
    be using the supplier's WACC"*.

    Usable only while the result is genuinely small (``<= limited_ceiling_percent``).
    Past that the honest figure works against us, so the argument is dropped
    rather than softened — never round it down or call a material cost limited.
    """
    proposed = negotiation_ask_term(facts)
    current = facts.current_term_days
    cash_flow = facts.target_cash_flow
    spend = facts.spend_volume

    # Spend volume is the denominator: without it there is no percentage, and a
    # zero would divide by nothing.
    if not spend or cash_flow is None:
        missing = (
            "The supplier's spend volume" if not spend
            else "The cash-flow opportunity"
        )
        return CostImpact(
            status="unavailable",
            usable_as_argument=False,
            rationale=(
                f"{missing} is unavailable, so the cost of the extension to the "
                "supplier cannot be quantified. Do not estimate it, and do not "
                "tell the supplier the impact is small — you do not know that."
            ),
            supplier_financing_rate=facts.supplier_financing_rate,
            cash_flow_opportunity=cash_flow,
            spend_volume=spend,
        )

    extension_days = (
        proposed - current if proposed is not None and current is not None else None
    )
    if extension_days is not None and extension_days <= 0:
        return CostImpact(
            status="no_extension",
            usable_as_argument=False,
            rationale=(
                f"The proposed {proposed}-day term is not an extension of the "
                f"current {current}-day term, so there is no cost to quantify."
            ),
            extension_days=extension_days,
            supplier_financing_rate=facts.supplier_financing_rate,
            cash_flow_opportunity=cash_flow,
            spend_volume=spend,
        )

    assumptions: list[str] = []
    wacc = facts.wacc_after_tax
    if wacc is None:
        wacc = DEFAULT_SUPPLIER_WACC
        assumptions.append(
            f"the supplier's WACC is not in the payload, so the "
            f"{DEFAULT_SUPPLIER_WACC:.0%} default is used"
        )
    # No supplier tax rate exists on the payload at all — it is always assumed,
    # but it only affects the result when a price/volume change is in play.
    tax_rate = DEFAULT_SUPPLIER_TAX_RATE
    if price_change_pct or volume_change:
        assumptions.append(
            f"no supplier tax rate is available, so the "
            f"{DEFAULT_SUPPLIER_TAX_RATE:.0%} default is used"
        )

    economic_profit = (
        cash_flow * wacc
        + price_change_pct * volume_change * (1 - tax_rate)
    )
    ratio = economic_profit / spend
    percent = round(ratio * 100, 2)

    calculation = (
        f"({_money(cash_flow)} cash-flow opportunity x {wacc:.2%} WACC"
        + (
            f" + {price_change_pct:.2%} price change x {volume_change:,.0f} "
            f"volume change x (1 - {tax_rate:.0%} tax)"
            if price_change_pct or volume_change
            else ""
        )
        + f") / {_money(spend)} spend = {percent}%"
    )
    assumption_note = (
        " Note: " + "; ".join(assumptions) + "." if assumptions else ""
    )

    common = dict(
        extension_days=extension_days,
        supplier_financing_rate=facts.supplier_financing_rate,
        supplier_wacc=wacc,
        supplier_tax_rate=tax_rate,
        assumptions=tuple(assumptions),
        supplier_economic_profit=economic_profit,
        cash_flow_opportunity=cash_flow,
        spend_volume=spend,
        cost_impact_ratio=ratio,
        cost_impact_percent=percent,
        calculation=calculation,
    )

    if percent > limited_ceiling_percent:
        return CostImpact(
            status="material",
            usable_as_argument=False,
            rationale=(
                f"The extension costs the supplier about {percent}% of spend — "
                f"above the {limited_ceiling_percent}% bar for a 'limited "
                "impact' argument. Do NOT put this figure to the supplier or "
                "call the cost small: it is real money to them, and quantifying "
                "it hands them the objection. Expect genuine cash-flow "
                f"resistance and prepare a financing option instead. "
                f"Calculation: {calculation}.{assumption_note}"
            ),
            **common,
        )

    return CostImpact(
        status="limited",
        usable_as_argument=True,
        rationale=(
            f"The extension costs the supplier about {percent}% of spend, "
            "valued at their own cost of capital — small against the value of "
            "the relationship. Quantify it: an unbounded 'longer terms hurt our "
            "cash flow' objection is much harder to answer than a bounded one. "
            f"Calculation: {calculation}.{assumption_note} State the percentage, "
            "never the WACC it came from."
        ),
        supplier_facing_wording=COST_IMPACT_SUPPLIER_FACING_TEMPLATE.format(
            percent=percent
        ),
        **common,
    )


# ── The relationship itself as an argument ─────────────────────────────────

# Spend bands for relationship importance, in payload currency units.
STRATEGIC_SPEND = 100_000_000
SIGNIFICANT_SPEND = 25_000_000


def normalise_level(value: str | None) -> str | None:
    """Lower-cased rating, or None.

    The payload is inconsistent about case — ``companySize`` arrives as both
    "large" and "LARGE", leverage levels as "high"/"low" — so every comparison
    below normalises first. Matching the raw strings would silently skip most of
    the scoring and leave every supplier on the default posture.
    """
    return value.strip().lower() if value else None


def assess_client_supplier_relationship(facts: SupplierFacts) -> RelationshipAssessment:
    """Score the relationship itself as a negotiation argument.

    Three inputs, all already in FACTS: how much we spend with this supplier,
    how big they are, and OUR leverage rating. Spend and size make the
    relationship worth invoking; our leverage decides the posture to invoke it
    with.

    The supplier's own leverage rating is deliberately not read (client,
    2026-08-03), matching :func:`score_leverage`. It used to move the score by
    -1/+0.5 and could force the empathetic posture on its own, so a supplier
    rated the same as us quietly cancelled out a real buyer position — the same
    differencing bug already removed from the posture.

    A High or Medium relationship is usable only when buyer leverage is also
    medium or high (client 2026-09-10) — and only as a fallback when stronger
    arguments are absent (that second half is enforced by the argument ranking
    / playbook prompt, not here). Spend and size make the relationship worth
    invoking; our leverage decides whether it may be invoked at all.

    A Low relationship is not usable: claiming a valuable relationship the
    numbers do not support is a claim the supplier can price.
    """
    score = 0.0
    rationale: list[str] = []

    spend_volume = facts.spend_volume
    if spend_volume:
        if spend_volume >= STRATEGIC_SPEND:
            score += 3
            rationale.append("high strategic spend relationship")
        elif spend_volume >= SIGNIFICANT_SPEND:
            score += 2
            rationale.append("significant commercial relationship")
        else:
            score += 1
            rationale.append("standard supplier relationship")

    company_size = normalise_level(facts.company_size)
    if company_size == "large":
        score += 1
        rationale.append("large strategic supplier")
    elif company_size == "medium":
        score += 0.5
        rationale.append("medium-size supplier relationship")

    buyer_leverage = normalise_level(facts.buyer_leverage_level)

    if buyer_leverage == "high":
        score += 1
        rationale.append("buyer has negotiation leverage")
    elif buyer_leverage == "low":
        score -= 1
        rationale.append("buyer has limited negotiation leverage")

    if score >= 4:
        strength = "High"
    elif score >= 2:
        strength = "Medium"
    else:
        strength = "Low"

    # Client 2026-09-10: relationship argument only at medium/high buyer leverage.
    leverage_allows = buyer_leverage in ("high", "medium")
    usable_as_argument = strength in ("High", "Medium") and leverage_allows
    if strength in ("High", "Medium") and not leverage_allows:
        rationale.append(
            "relationship argument withheld — buyer leverage is not medium/high"
        )

    # Posture, not wording style: the negotiator's own tone selection still
    # governs how the text reads (see `NegotiationState.selected_tone`).
    if buyer_leverage == "high":
        negotiation_tone = "assertive"
    elif buyer_leverage == "low":
        negotiation_tone = "empathetic"
    else:
        negotiation_tone = "collaborative"

    # None at Low strength: `usable_as_argument` is False there, so no surface
    # may offer the argument at all. A "kept for completeness" Low pitch used to
    # sit here as the `.get` default — text no caller could ever render, which
    # is exactly the kind of unreachable wording that gets picked up later by a
    # surface that forgets to check the gate.
    pitch = _RELATIONSHIP_PITCHES.get((strength, negotiation_tone))

    return RelationshipAssessment(
        strength=strength,
        negotiation_tone=negotiation_tone,
        usable_as_argument=usable_as_argument,
        rationale=rationale,
        pitch=pitch,
    )


# Approved supplier-facing wording per (strength, posture). No figures: the
# spend volume and leverage ratings that produced the score are internal.
_RELATIONSHIP_PITCHES: dict[tuple[str, str], str] = {
    ("High", "assertive"): (
        "Given the strategic importance and scale of our relationship, we "
        "believe aligning payment terms is a necessary step to create "
        "consistency across our commercial partnership."
    ),
    ("High", "empathetic"): (
        "We recognize the importance of our relationship and want to ensure any "
        "payment-term alignment supports a sustainable approach for both "
        "organizations."
    ),
    ("High", "collaborative"): (
        "Given the strength of our partnership and the value we create together, "
        "we believe aligning payment terms will support continued collaboration "
        "and long-term growth."
    ),
    ("Medium", "assertive"): (
        "Our ongoing relationship provides a strong foundation for aligning "
        "payment terms with our broader commercial approach."
    ),
    ("Medium", "empathetic"): (
        "We value our relationship and want to work together on a payment-term "
        "structure that balances the needs of both parties."
    ),
    ("Medium", "collaborative"): (
        "We value our ongoing relationship and believe aligning payment terms "
        "creates a more consistent and sustainable commercial framework for both "
        "organizations."
    ),
}


# ── Posture judgments: how hard this negotiation can be pushed ─────────────


def score_leverage(facts: SupplierFacts) -> LeverageAssessment:
    """Posture, from the BUYER's leverage level as scored upstream.

    Supplier leverage is deliberately NOT read here (client, 2026-08-01). The
    two ratings were previously differenced, so a Medium/Medium pair collapsed
    to "balanced" and told the negotiator nothing — and a supplier rated the
    same as the buyer silently cancelled a real buyer position out. Our own
    leverage is the signal that decides how hard the ask can be pressed; the
    supplier's rating is no longer extracted at all (2026-08-03).

    ``success_probability`` (also upstream) still refines the STRENGTH of a
    balanced posture — it is a different signal, not the supplier's leverage.
    """
    buyer = _rank(facts.buyer_leverage_level)

    if buyer is None:
        return LeverageAssessment(
            posture="balanced",
            strength="medium",
            rationale=(
                "Buyer leverage level was not provided by the supplier system; "
                "defaulting to a balanced posture until it is available."
            ),
        )

    if buyer == 2:
        posture, strength = "buyer_favored", "high"
    elif buyer == 1:
        posture, strength = "balanced", "medium"
    else:
        posture, strength = "supplier_favored", "medium"

    success_rank = _rank(facts.success_probability)
    if posture == "balanced" and success_rank is not None:
        strength = {0: "low", 1: "medium", 2: "high"}[success_rank]

    rationale = (
        f"Buyer leverage '{facts.buyer_leverage_level}'"
        + (
            f", success probability '{facts.success_probability}'"
            if facts.success_probability is not None
            else ""
        )
        + f" → {posture.replace('_', ' ')} posture, {strength} strength."
    )
    return LeverageAssessment(posture=posture, strength=strength, rationale=rationale)


def classify_financial_sensitivity(facts: SupplierFacts) -> FinancialSensitivity:
    """How much the supplier likely cares about a payment-term delay.

    Primary signal: supplierFinancingRate — the supplier's cost of bridging
    delayed payments.  Per the field guide, a high rate means cash-flow
    pushback is likely.  waccAfterTax is the supplier's own post-tax cost of
    capital and is surfaced as supporting context, not used for the level.
    """
    avoid_claims: list[str] = []
    if facts.scf_rate is None:
        avoid_claims.append(
            "Do not claim supply-chain financing is cheaper than the supplier's "
            "own financing — the SCF rate was not provided for this supplier."
        )

    if facts.supplier_financing_rate is None:
        return FinancialSensitivity(
            level="unknown",
            financing_spread_percent=None,
            rationale=(
                "Supplier financing rate was not provided; "
                "financial sensitivity cannot be assessed from the available data."
            ),
            avoid_claims=avoid_claims,
        )

    rate = facts.supplier_financing_rate
    if rate >= 0.10:
        level = "high"
    elif rate >= 0.06:
        level = "medium"
    else:
        level = "low"

    wacc_context = (
        f", supplier WACC after-tax {facts.wacc_after_tax:.2%}"
        if facts.wacc_after_tax is not None
        else ""
    )
    rationale = (
        f"Supplier financing rate {rate:.2%}{wacc_context} "
        f"→ {level} sensitivity to payment-term delay."
    )
    return FinancialSensitivity(
        level=level,
        financing_spread_percent=round(rate * 100, 2),
        rationale=rationale,
        avoid_claims=avoid_claims,
    )


# Carlos, 2026-09-15: Priority is the Calculum nine-box, not spend/cash-flow.
_NINE_BOX_LEVEL = {
    1: "high", 2: "high", 4: "high",
    3: "medium", 5: "medium", 7: "medium",
    6: "low", 8: "low", 9: "low",
}


def rank_business_priority(facts: SupplierFacts) -> BusinessPriority:
    """Priority from the Calculum nine-box (boxes 1/2/4 high, 3/5/7 medium,
    6/8/9 low)."""
    box = facts.nine_box_term_extension
    level = _NINE_BOX_LEVEL.get(box) if box is not None else None
    if level is None:
        # ponytail: missing/unknown box -> low; upgrade if Calculum adds a default
        return BusinessPriority(
            level="low",
            rationale="No nine-box position is available for this supplier.",
        )
    return BusinessPriority(
        level=level,
        rationale=f"Nine-box position {box} maps to {level} priority.",
    )


# ── Benchmark leverage: which argument leads, which is held back ───────────


def build_argument_sequence(
    facts: SupplierFacts,
    effective_batna_term_days: int | None,
) -> list[ArgumentStep]:
    """Order the arguments into an anchor → reinforcement → fallback sequence.

    What this adds that the argument block does not is the ORDER and the MOMENT:
    which argument opens, which reinforces, and which is held back until the
    supplier raises a specific objection. That is the whole of its job.

    It deliberately does NOT restate an argument's approved wording or its
    figures. It used to, and the result was that a playbook prompt carried the
    cost-impact and relationship sentences three times over — once in the
    argument block, once in the analysis block, once here — with the model
    invited to treat one argument as three. Each step now NAMES its argument in
    words (`argument_display_name`) and says when to deploy it; the wording and
    the numbers are read off the argument block, in one place. Names are spelled
    the same way here as on the argument lines: both are read by the negotiator,
    and a payload key in either is a payload key in the client's playbook.

    Priority follows the field guide (§9): the applied=true benchmark is the
    primary justification; a second citable benchmark reinforces it. Values are
    quoted from facts, never invented.
    """
    steps: list[ArgumentStep] = []

    # Only benchmarks at or above the ask may justify it — a benchmark below the
    # ask undermines us (see `citable_support_benchmarks`). The applied benchmark
    # leads if it is itself citable; otherwise fall back to the closest citable
    # benchmark, which is why a too-low industry benchmark (e.g. Coty's 67 vs a
    # 91 ask) is dropped in favour of a qualifying one rather than quoted.
    applied = next((b for b in facts.strategy_benchmarks if b.applied), None)
    support = list(citable_support_benchmarks(facts))
    if (
        applied is not None
        and is_benchmark_citable(applied.value, facts)
    ):
        primary = applied
    else:
        primary = support[0] if support else None

    if facts.target_term_days is not None:
        anchor = f"Open at {facts.target_term_days} days"
        if primary is not None:
            anchor += f", led by {argument_display_name(primary.name)}"
        steps.append(ArgumentStep(label="anchor", term_days=facts.target_term_days, argument=anchor + "."))

    # Secondary: the next distinct citable benchmark, as independent market
    # evidence. No extra bound is applied — everything in `support` already sits
    # at or above the ask, so any of them reinforces it; skipped only when the
    # primary was the sole citable benchmark.
    ask = negotiation_ask_term(facts)
    secondary = next((b for b in support if b is not primary), None)
    if secondary is not None:
        steps.append(ArgumentStep(
            label="supporting_benchmark",
            term_days=secondary.value,
            argument=(
                f"Reinforce with {argument_display_name(secondary.name)} as "
                "independent market evidence."
            ),
        ))

    # Payment reliability: our own record, usable only when we actually pay the
    # terms we have (`usable_as_argument`). `term_days` is None on purpose — this
    # step proposes no term. It removes the supplier's payment-risk objection to
    # the ask; it never argues for a longer one.
    reliability = assess_payment_reliability(facts)
    if reliability.usable_as_argument:
        steps.append(ArgumentStep(
            label="payment_reliability",
            term_days=None,
            argument=(
                "HOLD for the payment-risk objection — deploy Payment Reliability: our "
                "own record closes it off. Reassurance only; it never argues "
                "for a longer term."
            ),
        ))

    # DSO leverage: contractual current vs DSO vs the ask. Proposes no term
    # (`term_days=None`) — it is a day-count argument about practice past the
    # contract, not a benchmark that sets the number.
    dso = assess_dso_alignment(facts)
    if dso.usable_as_argument:
        steps.append(ArgumentStep(
            label="dso_alignment",
            term_days=None,
            argument=(
                "Deploy DSO Alignment: contractual terms sit below DSO, so "
                "payment timing already runs past the contract - leverage "
                "toward the ask from that higher baseline."
            ),
        ))

    # Cost impact: the extension priced as a share of invoice value. Held for
    # the cash-flow objection like the two above, and carries no term either —
    # what it argues is that the cost is small, not that the term should be long.
    cost = assess_cost_impact(facts)
    if cost.usable_as_argument:
        steps.append(ArgumentStep(
            label="cost_impact",
            term_days=None,
            argument=(
                "HOLD for when they resist on cost — deploy Cost Impact: it turns "
                "an open-ended cash-flow complaint into a bounded number."
            ),
        ))

    # The relationship itself — the case to make when no benchmark reaches the
    # ask, and the one argument that is always available to say something with.
    relationship = assess_client_supplier_relationship(facts)
    if relationship.usable_as_argument and relationship.pitch:
        steps.append(ArgumentStep(
            label="relationship",
            term_days=None,
            argument=(
                f"Frame the ask on the relationship — deploy Client-Supplier Relationship "
                f"({relationship.strength.lower()} strength). It justifies "
                "raising the subject, never a particular number; pair it with a "
                "benchmark whenever one reaches the ask."
            ),
        ))

    if effective_batna_term_days is not None:
        steps.append(ArgumentStep(
            label="batna",
            term_days=effective_batna_term_days,
            argument=(
                f"Hold {effective_batna_term_days} days in reserve as the "
                "BATNA if resistance is strong — do not open with it."
            ),
        ))

    return steps


def _whole_days(value: float | int) -> str:
    """A day-figure as a negotiator reads it: ``64`` for 64.0, ``64.5`` otherwise."""
    return str(int(value)) if float(value).is_integer() else f"{value:.1f}"


def benchmark_detail(b: StrategyBenchmark) -> str:
    """The negotiator-facing figures behind one benchmark, on one line.

    ``67 days (avg 65, top quartile 75, n=16)``. The average and the third
    quartile used to reach a prompt only on the loose FACTS block, several
    hundred lines from the argument they belong to, so a summary asked to
    explain the Supplier Standard almost never connected the two. The client's
    approved wording for that argument quotes both ("...on average across its
    customer base and XX days by top 3rd-quartile clients (n=16)"), so the
    statistics travel with the argument itself, and every surface gets them.
    """
    stats: list[str] = []
    if b.avg is not None:
        stats.append(f"avg {_whole_days(b.avg)}")
    if b.q3 is not None:
        stats.append(f"top quartile {_whole_days(b.q3)}")
    if b.occurrences is not None:
        stats.append(f"n={b.occurrences}")
    suffix = f" ({', '.join(stats)})" if stats else ""
    return f"{int(b.value)} days{suffix}"


# ── The presented argument set: catalogue wording + this supplier's figures ─


def collect_supporting_arguments(
    facts: SupplierFacts,
    analysis: NegotiationAnalysis | None = None,
) -> list[PresentedArgument]:
    """Every argument that currently supports the ask, strongest source first.

    Two kinds go in, in one ranked list:

      * **benchmarks** whose value is AT OR ABOVE the ask
        (:func:`key_argument_benchmarks`), plus the spend-line opportunity when
        it beats the ask — the arguments that justify the number;
      * **the assessments** that are usable for this supplier — DSO alignment,
        Pay-on-Terms, cost impact, relationship — which support the ask without
        arguing a number.

    Order is the client's SOURCE ranking (``ArgumentDefinition.rank``), never the
    day-figure: a large industry number is still a weaker argument than the
    supplier's own precedent.

    Each entry carries both wordings — ``meaning`` (what it is) for the surfaces
    that explain, ``supplier_pitch`` (how to put it) for the surfaces that draft —
    so no prompt has to invent either. An assessment that computes its own
    wording (cost impact quotes a percentage, the relationship pitch varies with
    posture) overrides the catalogue sentence; everything else uses it as-is.

    Nothing here is "available but unsupportive": an argument that does not
    support the ask is not in this list at all.
    """
    analysis = analysis or analyze_supplier(facts)
    presented: list[PresentedArgument] = []

    def _add(key: str, **kw) -> None:
        definition = ARGUMENT_CATALOG.get(key)
        if definition is None:
            return
        # An internal-only argument carries NO pitch. `ArgumentDefinition` has
        # always documented that internal_only "withholds the pitch entirely",
        # but the default below bound it anyway: `sayable` came back False while
        # `as_dict()["supplier_pitch"]` still carried a fully-formed sentence
        # telling the supplier we know they grant longer terms elsewhere — into
        # the graph state, and from there into prompts. Withheld at the source
        # instead of trusting every reader to check the flag.
        if definition.internal_only:
            kw["supplier_pitch"] = None
        else:
            kw.setdefault("supplier_pitch", definition.supplier_pitch)
        presented.append(PresentedArgument(definition=definition, **kw))

    # Every benchmark above the support bar (two buckets). This used to be
    # `key_argument_benchmarks` (>= ask), so a benchmark between the current
    # term and the ask was bucketed as supporting by
    # `build_negotiation_arguments` and then silently dropped from the brief the
    # playbook actually renders — one benchmark, two answers.
    for b in citable_support_benchmarks(facts):
        _add(b.name, value_days=int(b.value), detail=benchmark_detail(b))

    dso = analysis.dso_alignment
    if dso is not None and dso.usable_as_argument:
        _add(
            "dso",
            detail=(
                f"contractual {dso.current_term_days} days; DSO {dso.dso} days; "
                f"ask {dso.proposed_term_days} days "
                f"({format_camel_label(dso.status).lower()})"
            ),
            supplier_pitch=dso.supplier_facing_wording,
        )

    reliability = analysis.payment_reliability
    if reliability is not None and reliability.usable_as_argument:
        _add(
            "payOnTerms",
            detail=(
                f"we pay {reliability.actual_payment_days} days against a "
                f"{reliability.pay_on_terms_term_days}-day baseline "
                f"(variance {reliability.variance_days:+d})"
            ),
        )

    cost = analysis.cost_impact
    if cost is not None and cost.usable_as_argument:
        _add(
            "costImpact",
            # The figure AND the arithmetic behind it. Carlos's annotation on
            # this exact bullet was "Good argument how did you calculate?" —
            # twinned with "Where is this coming from?". A bare percentage is
            # what drew the question; the calculation is the answer.
            detail=(
                f"{cost.cost_impact_percent}% of invoice value"
                + (f" [{cost.calculation}]" if cost.calculation else "")
            ),
            # Carries the percentage — the figure IS the argument here.
            supplier_pitch=cost.supplier_facing_wording,
        )

    relationship = analysis.relationship
    # Client 2026-09-10: only when nothing stronger is already queued —
    # relationship ranks last (9).
    if (
        relationship is not None
        and relationship.usable_as_argument
        and not any(p.rank < ARGUMENT_CATALOG["relationship"].rank for p in presented)
    ):
        # Spend volume LEADS the detail (avoids "relationship — N/A").
        # Negotiator-facing only; disclosure note still forbids quoting spend.
        spend = (
            f"{format_money(facts.spend_volume)} spend on this supplier; "
            if facts.spend_volume else ""
        )
        _add(
            "relationship",
            detail=(
                f"{spend}{relationship.strength} strength, "
                f"{relationship.negotiation_tone} posture — "
                f"{'; '.join(relationship.rationale)}"
            ),
            supplier_pitch=relationship.pitch,
        )

    return sorted(presented, key=lambda p: p.rank)


def _catalogued(argument: Argument) -> dict:
    """A bucketed argument in JSON form, with its catalogue wording attached.

    Used for the arguments that do NOT support the ask. They are never sayable,
    so no pitch goes in — but the negotiator still needs to know what each one is
    and why it is out, which is exactly the question "what about X?" that an
    invisible argument cannot answer.
    """
    definition = ARGUMENT_CATALOG.get(argument.source)
    return {
        "key": argument.source,
        "title": definition.title if definition else argument.label,
        "rank": definition.rank if definition else None,
        "meaning": definition.meaning if definition else None,
        "value_days": argument.value,
        "occurrences": argument.occurrences,
        "reference": argument.reference,
        "support": argument.support,
        "undermines": argument.undermines,
        "rationale": argument.rationale,
        "sayable": False,
    }




def build_argument_analysis(facts: SupplierFacts) -> dict:
    """EVERYTHING this module worked out, as one JSON-serialisable bundle.

    The ONE part every caller outside this package reads — what we can argue.
    Takes ``facts`` and nothing
    else. The typed intermediate the scoring functions pass among themselves
    (:func:`analyze_supplier`) is plumbing internal to the domain: it used to be
    stored on the context and handed to prompts as a third representation of the
    same judgments, which meant two objects to keep in step and two ways for one
    supplier to be described.

    The supporting set is only half the picture. A negotiator asking "what is
    our position?" needs the arguments that fall short and the sources with no
    data at all just as much — those are what say how firm the position really
    is, and what to answer when the supplier names a figure of their own. So the
    bundle carries every bucket, plus the assessments INCLUDING the ones that
    came back unusable and the reason why.

    Shape::

        {
          "terms":        {ask, current, batna_floor, batna_note},
          "supporting":   [...],   # value > current term, or a usable assessment
          "non_supporting": [...], # at/below the current term, and so `undermines`
          "unavailable":  [...],   # argument-eligible sources with no value at all
          "assessments":  {payment_reliability, dso_alignment, cost_impact,
                           relationship},   # every one, usable or not
          "posture":      {leverage, financial_sensitivity, priority},
          "sequence":     [...],   # the ordered case
        }

    Derived, never authoritative: rebuilt from ``facts`` each turn, so nothing
    should mutate it.
    """
    analysis = analyze_supplier(facts)
    buckets = analysis.arguments

    def _assessment(obj, *fields: str) -> dict | None:
        if obj is None:
            return None
        return {f: getattr(obj, f) for f in fields}

    return {
        "terms": {
            "ask": negotiation_ask_term(facts),
            "current": facts.current_term_days,
            "batna_floor": analysis.effective_batna_term_days,
            "batna_note": analysis.batna_note,
        },
        "supporting": [
            a.as_dict() for a in collect_supporting_arguments(facts, analysis)
        ],
        "non_supporting": [_catalogued(a) for a in (buckets.non_support if buckets else [])],
        "unavailable": list(buckets.unavailable) if buckets else [],
        "assessments": {
            "payment_reliability": _assessment(
                analysis.payment_reliability,
                "status", "usable_as_argument", "rationale",
                "pay_on_terms_term_days", "actual_payment_days", "variance_days",
            ),
            "dso_alignment": _assessment(
                analysis.dso_alignment,
                "status", "usable_as_argument", "rationale",
                "dso", "current_term_days", "proposed_term_days", "gap_days",
                "supplier_facing_wording",
            ),
            "cost_impact": _assessment(
                analysis.cost_impact,
                "status", "usable_as_argument", "rationale",
                "extension_days", "cost_impact_percent",
                "supplier_economic_profit",
            ),
            "relationship": _assessment(
                analysis.relationship,
                "strength", "negotiation_tone", "usable_as_argument",
                "rationale", "pitch",
            ),
        },
        "posture": {
            "leverage": _assessment(
                analysis.leverage, "posture", "strength", "rationale"
            ),
            "financial_sensitivity": _assessment(
                analysis.financial_sensitivity,
                "level", "financing_spread_percent", "rationale", "avoid_claims",
            ),
            "priority": _assessment(analysis.priority, "level", "rationale"),
        },
        "sequence": [
            {"label": s.label, "term_days": s.term_days, "argument": s.argument}
            for s in analysis.argument_sequence
        ],
    }


# ── Entry point ────────────────────────────────────────────────────────────


def analyze_supplier(facts: SupplierFacts) -> NegotiationAnalysis:
    """Run every Tier-2 scoring function once and bundle the results.

    INTERNAL PLUMBING. This is how the scoring functions hand their results to
    one another and to the bundle builder; it is not what callers outside the
    domain read. They read :func:`build_argument_analysis` — the part the
    context and the brief actually carry.

    The result used to be stored on the context and passed to every prompt as a
    third representation of these same judgments. That meant two objects saying
    the same thing and two chances for one supplier to be described two ways, so
    the typed object now stops at this module's boundary.
    """
    effective_batna_term_days, batna_note = resolve_effective_batna(facts)
    leverage = score_leverage(facts)
    cost_impact = assess_cost_impact(facts)
    return NegotiationAnalysis(
        leverage=leverage,
        financial_sensitivity=classify_financial_sensitivity(facts),
        priority=rank_business_priority(facts),
        payment_reliability=assess_payment_reliability(facts),
        dso_alignment=assess_dso_alignment(facts),
        cost_impact=cost_impact,
        relationship=assess_client_supplier_relationship(facts),
        argument_sequence=build_argument_sequence(facts, effective_batna_term_days),
        arguments=build_negotiation_arguments(facts),
        effective_batna_term_days=effective_batna_term_days,
        batna_note=batna_note,
    )
