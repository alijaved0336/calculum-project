from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class StrategyBenchmark:
    """One entry from the raw ``negotiationStrategy`` payload, verbatim.

    Every ``negotiationStrategy.<name>`` field carries the same shape — a
    ``value`` and an ``applied`` flag, sometimes with sample-size stats
    (``occurrences``/``avg``/``q3``) or a descriptive ``group``. The upstream
    system flips ``applied`` to ``True`` on exactly the one entry it used to
    derive ``target_term_days`` — that flag is the strongest signal available
    for *why* the target is what it is, so it's preserved here rather than
    discarded like the rest of ``negotiationStrategy``.
    """

    name: str  # raw key, e.g. "peerGroupStandard"
    label: str  # human-readable, e.g. "comparable peer group"
    value: float | int | None
    applied: bool = False
    occurrences: int | None = None
    avg: float | None = None
    q3: float | None = None
    description: str | None = None
    limit_type: str | None = None


@dataclass(frozen=True)
class SupplierFacts:
    """Verbatim, source-tagged facts pulled directly from the supplier payload.

    These are values the upstream Adabot/Calculum system already decided —
    target term, benchmarks, financial figures, identity, ratings, ... They
    are quoted as-is anywhere they're surfaced; nothing here is recomputed,
    rounded, or reworded by an agent or LLM.

    ``source_paths`` maps each field to the payload path it came from, so any
    figure can be traced back to its origin. ``internal_only_fields`` names
    the fields whose literal values must never reach supplier-facing text —
    :func:`domain.services.asymmetry_guard.enforce_asymmetry_guard` uses this
    list as its redaction backstop.
    """

    # Identity
    supplier_name: str | None
    country: str | None
    industry: str | None
    company_size: str | None

    # Term decision — given directly by the upstream system
    target_term_days: int | None
    current_term_days: int | None
    batna_term_days: int | None
    benchmark_term_days: int | None
    regulatory_max_term_days: int | None
    # Supplier profile, read straight off the supplier payload. Optional; a
    # summary shows only the ones the payload carries and never infers them.
    description: str | None = None
    address: str | None = None
    website: str | None = None
    ownership: str | None = None
    stock_ticker: str | None = None
    entity_type: str | None = None
    # Whether the regulation is legally ENFORCED (a statutory limit) or only a
    # government recommendation. DESCRIPTIVE ONLY — it says what KIND of
    # regulation this is, and is quoted as such in the facts block. It is NOT
    # the decision flag: whether the limit actually binds this negotiation is
    # `regulatory_applied` below. See :func:`regulatory_cap_days`.
    regulatory_enforced: bool = False
    # THE decision flag (`negotiationStrategy.regulatoryTerm.applied`). True
    # when the upstream system has resolved that this limit caps the
    # negotiation; False when the regulation is informational only. The limit
    # type (NONE / ONLY_EXCEPTIONS / ALL) is what produced it upstream and is
    # never re-interpreted here — see :func:`regulatory_cap_days`.
    regulatory_applied: bool = False

    # True when the negotiator's own target (``target.targetPaymentTerms``) was
    # set upstream; False when it was null and ``target_term_days`` fell back to
    # Calculum's modeled opportunity term. Drives the "no user-selected target
    # has been set — the recommended opportunity is N days" messaging. Flipped
    # True whenever a session target override is applied (see
    # :func:`domain.services.negotiation_overrides.resolve_overridden_context`).
    target_is_user_set: bool = False

    # Session BATNA override (negotiator-set for this session). When not None,
    # :func:`resolve_effective_batna` returns THIS value directly and skips the
    # calculated floor — so every surface that reads the BATNA from facts
    # (analysis, the guide, counter-offer, scenario, ...) sees the same number.
    # Set by
    # :func:`domain.services.negotiation_overrides.resolve_overridden_context`,
    # which is the ONLY place that should populate it.
    batna_override_days: int | None = None

    # Financial figures — all three rate fields belong to the SUPPLIER.
    # wacc_pre_tax / wacc_after_tax = supplier's own weighted average cost of
    # capital (pre- and post-tax).  supplier_financing_rate = the rate at which
    # the supplier borrows / bridges cash gaps; this is the primary signal for
    # predicting cash-flow pushback (high rate → more pain from delayed payment).
    wacc_pre_tax: float | None = None
    wacc_after_tax: float | None = None
    scf_rate: float | None = None
    supplier_financing_rate: float | None = None

    # Business value
    spend_volume: float | None = None
    target_cash_flow: float | None = None
    # Calculum 9-box (1-9). Drives Priority in key facts - see
    # :func:`rank_business_priority` (Carlos, 2026-09-15).
    nine_box_term_extension: int | None = None

    # Leverage / risk signals — raw levels; interpretation happens in analysis.
    # `supplier_leverage_level` is deliberately absent (client, 2026-08-03): OUR
    # leverage is the signal that decides how hard the ask can be pressed, and
    # carrying theirs only invited the assistant to narrate a "balanced but
    # difficult environment" off a Medium/Medium pair. The upstream column
    # (`entitySupplierLeverageLevel`) is left dormant, never extracted.
    buyer_leverage_level: str | None = None
    success_probability: str | None = None  # categorical level, e.g. "low"/"medium"/"high"
    credit_rating: str | None = None
    country_rating: str | None = None
    is_sme: bool = False
    protected_flags: dict[str, bool | None] = field(default_factory=dict)

    # Benchmark / peer-comparison figures — used to answer factual data
    # questions (peer comparisons, regulatory limits).
    pay_on_terms_term_days: int | None = None
    buyer_standard_term_days: int | None = None
    buyer_standard_description: str | None = None
    # "HARD" or "MAX" means buyer standard acts as a guardrail, not just a benchmark.
    buyer_standard_limit_type: str | None = None
    regulatory_limit_type: str | None = None
    supplier_segment_term_days: int | None = None
    supplier_segment_avg_term_days: float | None = None
    supplier_segment_q3_term_days: float | None = None
    supplier_segment_occurrences: int | None = None
    peer_group_term_days: int | None = None
    peer_group_avg_term_days: float | None = None
    peer_group_q3_term_days: float | None = None
    peer_group_occurrences: int | None = None

    # Opening-strategy specific signals — see domain.services.opening_strategy_analysis
    dso: int | None = None
    # The spend-volume-weighted average of the supplier's per-line
    # ``spends.actual_payment_terms`` (``spend.actualPaymentTerms`` in the
    # payload) — how many days we ACTUALLY take to pay this supplier.
    #
    # BEHAVIOURAL SIGNAL ONLY. This is never the current term and never the
    # negotiation baseline: ``current_term_days`` carries the CONTRACTUAL
    # weighted average, which is what the platform's supplier card shows and
    # what every benchmark, target and no-improvement check is measured
    # against. Quoting actual-paid days as "current terms" is precisely the
    # mismatch the client kept reporting.
    #
    # Its two consumers are the assessments that ask how we BEHAVE rather than
    # what we agreed:
    #   * :func:`domain.services.negotiation_arguments.assess_payment_reliability`
    #     (actual vs the pay-on-terms baseline), and
    #   * the DSO alignment assessment.
    # Both need this verbatim figure and report "unavailable" without it, so it
    # is extracted with NO fallback chain — a missing actual figure stays
    # missing rather than silently borrowing the contractual one, which would
    # manufacture a variance of 0 and claim reliability we have no evidence for.
    actual_payment_terms_days: int | None = None
    opportunity_term_days: int | None = None
    agreed_terms_with_cash_discounts: int | None = None
    agreed_cash_discount_percentage: float | None = None
    cost_of_debt_spread: float | None = None
    # Every `negotiationStrategy.<name>` entry with a non-null value, verbatim
    # (including its `applied` flag) — see StrategyBenchmark.
    strategy_benchmarks: list[StrategyBenchmark] = field(default_factory=list)

    # ISO-8601 timestamp of the last supplier data update (from supplier.updatedAt).
    # Old data should trigger a low-confidence warning in analysis.
    updated_at: str | None = None

    source_paths: dict[str, str] = field(default_factory=dict)
    internal_only_fields: frozenset[str] = field(default_factory=frozenset)


# ── Term harmonisation: the ask is always a whole multiple of 15 days ──────
#
# The client negotiates in 15-day steps, so an ask of 71 or 83 days is not a
# term they would ever put to a supplier. Every target that enters the system is
# moved to the CLOSEST multiple of 15 (71 → 75, 76 → 75, 83 → 90, 113 → 120); a
# term already on a multiple is left exactly as it is.
#
# Nearest, not "always up" (product decision, 2026-08-03). Rounding up on every
# target turns a modelled 76 into a 90-day ask — 14 days above anything upstream
# evidenced — so the ask moves to whichever step it is actually closest to, even
# when that is downward. Note the consequence: a target barely above the current
# term can round DOWN to it (a 31-day target against a 30-day current term
# harmonises to 30), which leaves no extension to argue. That is accepted; the
# rounding is not where a too-small opportunity gets caught.
#
# Applied at the two points a target enters the system, so everything
# downstream — the argument buckets, the BATNA, the opening anchor,
# every prompt — reads one already-harmonised number rather than each rounding
# its own:
#   * :func:`domain.services.supplier_facts.build_supplier_facts` (the payload);
#   * the negotiator's session override (``agents.nodes.apply_override``).
#
# NOT the ``harmonization`` benchmark. That was a nine-box payload figure
# deleted from the product (see [[project_removed_figures]]) and must never come
# back. This is a rounding rule on the ask, shares nothing with it but the word.
TERM_HARMONISATION_STEP_DAYS = 15


def harmonise_term_days(value: int | None, *, cap: int | None = None) -> int | None:
    """Move a term to the CLOSEST multiple of 15 days.

    Distance decides the direction: 76 → 75 (1 day away) and 83 → 90 (7 days
    away, against 8 down to 75). An exact half-step would round up, though with
    whole days and an odd step no integer can actually land on one.

    ``cap`` is a hard ceiling the term may not cross — an APPLIED regulatory
    maximum (:func:`regulatory_cap_days`). It binds TWICE, because a legal
    ceiling outranks both the negotiator's number and the 15-day ladder:

      * the value is pulled down to the cap first (a 90-day target under a
        60-day cap is a 60-day target — the ``min()`` rule), then
      * the result is harmonised DOWNWARD whenever the nearest multiple would
        breach it (a 50-day cap gives 45, not 50; a 58-day cap gives 45, not
        the nearest-60 that rounding alone would reach for).

    So the ask stays on the 15-day ladder in every case, capped or not — the
    one invariant every downstream consumer relies on. The single exception is
    a cap below one whole step, where no multiple of 15 exists under it at all:
    the cap itself is returned rather than a 0-day term.

    ``None`` in, ``None`` out: a missing target stays missing rather than
    becoming a 15.
    """
    if value is None:
        return None
    step = TERM_HARMONISATION_STEP_DAYS
    if cap is not None:
        value = min(value, cap)
    remainder = value % step
    # Ties (remainder exactly half a step) go UP — unreachable for whole days
    # against an odd step, but the comparison says which way it would fall.
    harmonised = value - remainder if remainder * 2 < step else value + (step - remainder)
    if cap is not None and harmonised > cap:
        # Rounding up would breach the cap, so take the step below it instead.
        harmonised = value - remainder
        if harmonised <= 0:
            # No multiple of 15 fits under the cap — quote the cap verbatim
            # rather than produce a 0-day term.
            return cap
    return harmonised


def regulatory_cap_days(facts: SupplierFacts) -> int | None:
    """The regulatory ceiling that BINDS this negotiation, or ``None``.

    ``regulatoryTerm.applied`` is the single source of truth. The upstream
    system has already resolved the limit type against the regulation's
    enforcement status —

      * ``NONE``            — never applies; reference material only,
      * ``ONLY_EXCEPTIONS`` — applies only to legally enforced limits,
      * ``ALL``             — applies to recommendations as well —

    and flipped ``applied`` accordingly. That resolution is NOT repeated here:
    re-deriving it from ``limit_type``/``enforced`` is exactly how the two
    systems drift apart. ``applied`` decides, and ``enforced`` survives only as
    a description of what kind of regulation it is.

    Every place that caps a term reads this one function — harmonisation at the
    payload boundary, the session override, the improvement gate and the
    opening anchor — so a regulation binds all four or none.
    """
    if not facts.regulatory_applied:
        return None
    return facts.regulatory_max_term_days


def regulatory_recommendation_days(
    facts: SupplierFacts, ask: int | None = None
) -> int | None:
    """The regulatory term the ask goes BEYOND lawfully, or ``None``.

    The other side of :func:`regulatory_cap_days`: a regulation that is neither
    applied nor enforced by law is a government recommendation, so a term above
    it is still legal by mutual agreement — and saying so is the Regulatory
    Compliance argument. Only worth making when the ask actually exceeds it;
    an enforced limit is a statutory cap and never qualifies.
    """
    if facts.regulatory_applied or facts.regulatory_enforced:
        return None
    days = facts.regulatory_max_term_days
    ask = negotiation_ask_term(facts) if ask is None else ask
    if days is None or ask is None or ask <= days:
        return None
    return days


def rescale_cash_flow_for_term(
    base_cash_flow: float | None,
    *,
    base_term: int | None,
    new_term: int | None,
    current_term: int | None,
) -> float | None:
    """The cash-flow unlock at ``new_term``, scaled from the one computed at
    ``base_term``.

    The unlock is proportional to the EXTENSION (``term - current``), not to the
    term, so moving the ask from 71 to 75 days against a 30-day current term
    scales the figure by 45/41 rather than by 75/71. Shared by the two places
    that move a target — harmonisation at construction and the negotiator's
    session override — so one rule produces both.

    Returns ``base_cash_flow`` untouched when there is nothing to scale from: no
    baseline term, no figure, or a base extension of zero (which would divide by
    nothing and, in any case, means the upstream figure was never keyed to an
    extension we can re-derive).
    """
    if base_cash_flow is None or new_term is None:
        return base_cash_flow
    if base_term is None or current_term is None or base_term == current_term:
        return base_cash_flow
    if base_term == new_term:
        return base_cash_flow
    return round(base_cash_flow * (new_term - current_term) / (base_term - current_term))


def negotiation_ask_term(facts: SupplierFacts) -> int | None:
    """The term actually put on the table — the opportunity term if the
    upstream system modelled one, otherwise the target term.

    Both fields are already harmonised to a multiple of 15 (see
    :func:`harmonise_term_days`), so every consumer of the ask gets the
    harmonised figure without rounding anything itself.
    """
    if facts.opportunity_term_days is not None:
        return facts.opportunity_term_days
    return facts.target_term_days


# ── The BATNA floor: one ladder step below the ask ─────────────────────────
#
# BATNA = harmonise_to_15(Target − 15). If that figure sits below
# Contractual + 5 (current terms + 5 days), there is No BATNA — null means no
# alternative negotiation; hold the target or stay on current terms.
BATNA_OFFSET_DAYS = TERM_HARMONISATION_STEP_DAYS  # Target − 15
BATNA_MIN_ABOVE_CONTRACTUAL_DAYS = 5


def batna_from_target(target: int | None) -> int | None:
    """Raw BATNA for an ask of ``target`` days — ``harmonise(target − 15)``.

    Does not apply the contractual+5 "No BATNA" gate; that lives in
    :func:`resolve_effective_batna`. ``None`` in, ``None`` out.
    """
    if target is None:
        return None
    return harmonise_term_days(target - BATNA_OFFSET_DAYS)


def resolve_effective_batna(facts: SupplierFacts) -> tuple[int | None, str | None]:
    """The BATNA floor for this negotiation.

    ``harmonise(target − 15)``, where ``target`` is the ask
    (:func:`negotiation_ask_term` — opportunity term first, else target term).
    A 90-day ask yields 75.

    This day-count floor IS the playbook's BATNA. See :mod:`domain.services.batna`.

    If the floor is strictly below Contractual + 5 (``current_term_days`` + 5),
    there is No BATNA: return ``None``. Null means no alternative negotiation —
    either pursue the target or stay on current terms. The same gate binds a
    session BATNA override.

    ``None`` with no ask at all: never invent a floor.

    Returns ``(effective_batna_term_days, note)`` — the note explains which
    rule produced the figure (or why there is none).
    """
    current = facts.current_term_days

    # Session override wins over the CALCULATION — see
    # SupplierFacts.batna_override_days. Returning it HERE (not just on the
    # analysis object) is what keeps every facts-based recomputation (guide,
    # counter-offer, scenario, arguments) consistent with the negotiator's
    # chosen floor. The contractual+5 No-BATNA gate still applies.
    if facts.batna_override_days is not None:
        override = facts.batna_override_days
        if current is not None and override < current + BATNA_MIN_ABOVE_CONTRACTUAL_DAYS:
            return None, (
                f"No BATNA: the {override}-day BATNA set for this session "
                f"sits below the contractual {current}-day term plus "
                f"{BATNA_MIN_ABOVE_CONTRACTUAL_DAYS} days. Hold the target or "
                "stay on current terms — there is no alternative negotiation."
            )
        return override, (
            f"BATNA is fixed at {override} days for "
            f"this session (overrides the calculated floor)."
        )

    target = negotiation_ask_term(facts)
    floor = batna_from_target(target)

    if floor is None:
        return None, None

    if current is not None and floor < current + BATNA_MIN_ABOVE_CONTRACTUAL_DAYS:
        return None, (
            f"No BATNA: {floor} days (target − {BATNA_OFFSET_DAYS}, harmonised) "
            f"sits below the contractual {current}-day term plus "
            f"{BATNA_MIN_ABOVE_CONTRACTUAL_DAYS} days. Hold the target or stay "
            "on current terms — there is no alternative negotiation."
        )

    if target is not None and floor >= target:
        return None, (
            f"No BATNA: target − {BATNA_OFFSET_DAYS} harmonises back to "
            f"{floor} days, the ask itself. Hold the target."
        )

    return floor, (
        f"BATNA = the {target}-day ask less {BATNA_OFFSET_DAYS} days, "
        f"harmonised to the 15-day ladder: {floor} days. Hold it in reserve; "
        "never open with it."
    )
