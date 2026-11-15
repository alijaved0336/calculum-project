from __future__ import annotations

from dataclasses import dataclass, field

from domain.entities.argument_catalog import ARGUMENT_CATALOG
from domain.entities.arguments import NegotiationArguments

# The approved supplier-facing wordings, read from the ONE place they are
# defined: the client catalogue.
#
# These used to be separate strings declared here, and they had drifted — the
# email said one sentence about our payment record and the playbook said a
# different one, for the same argument, both labelled "the approved wording".
# Aliasing keeps the names every existing caller imports while leaving exactly
# one sentence per argument to maintain.
#
# Pay-on-Terms states a relationship without quoting figures — a trust
# argument, never a benchmark, so surfaces quote it and do not paraphrase it
# into "we pay in N days".
PAY_ON_TERMS_SUPPLIER_FACING_WORDING = ARGUMENT_CATALOG["payOnTerms"].supplier_pitch

# DSO CARRIES its figures — contractual current vs DSO vs ask is the leverage —
# so it is a template filled per supplier (same pattern as cost impact).
DSO_ALIGNMENT_SUPPLIER_FACING_TEMPLATE = (
    "Although contractual terms are {current} days, DSO already sits at "
    "{dso} days - payment timing already runs past the contract. That "
    "{dso}-day baseline is leverage toward {ask}-day terms."
)

# Cost impact CARRIES its figure — quantifying the impact as a small share of
# invoice value is the whole argument — so it is a template filled per supplier
# rather than a fixed sentence. The financing rate behind the figure is never
# stated (see `CostImpact`).
# "of spend", not "of invoice value". Joel, 2026-08-13: *"we need to review
# because it's expressed here in base of the invoice value. It's rare because we
# never know exactly how much invoice"* — and the client's formula divides by
# spend volume, so the sentence now names the denominator it actually used.
#
# No day-count: the figure no longer derives from the extension length, so
# quoting one alongside it would imply an arithmetic relationship that is not
# there.
COST_IMPACT_SUPPLIER_FACING_TEMPLATE = (
    "The proposed change represents an estimated economic impact of "
    "approximately {percent}% of our spend with you — a limited cost relative "
    "to the overall commercial relationship."
)


def dso_supplier_facing_wording(current: int, dso: int, ask: int) -> str:
    """Approved DSO leverage sentence with the three day-counts filled in."""
    return DSO_ALIGNMENT_SUPPLIER_FACING_TEMPLATE.format(
        current=current, dso=dso, ask=ask,
    )


@dataclass(frozen=True)
class LeverageAssessment:
    posture: str   # "buyer_favored" | "balanced" | "supplier_favored"
    strength: str  # "low" | "medium" | "high"
    rationale: str


@dataclass(frozen=True)
class FinancialSensitivity:
    level: str  # "low" | "medium" | "high" | "unknown"
    financing_spread_percent: float | None
    rationale: str
    avoid_claims: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class BusinessPriority:
    level: str  # "low" | "medium" | "high"
    rationale: str


@dataclass(frozen=True)
class PaymentReliability:
    """Pay-on-Terms as a TRUST argument: evidence that extending terms adds no
    payment risk, because we already pay the terms we have.

    Pay-on-Terms ONLY. DSO is a different measure and is deliberately absent —
    it is carried as a plain fact (``SupplierFacts.dso``) and will get its own
    treatment; it never feeds this assessment.

    ``variance_days = actual_payment_days - pay_on_terms_term_days``:

    ======================  ==========================  ====================
    variance                status                      use
    ======================  ==========================  ====================
    ``<= 0``                ``on_or_before_terms``      strong argument
    ``<= tolerance``        ``minor_variance``          usable argument
    ``> tolerance``         ``behind_terms``            never volunteer
    either input missing    ``unavailable``             never volunteer
    ======================  ==========================  ====================

    Pay-on-Terms is explicitly NOT a benchmark, a supplier standard, a
    payment-term target, or a reason to demand longer terms — it never justifies
    the ask itself and its day-count is not quoted to the supplier. The approved
    supplier-facing form is :data:`PAY_ON_TERMS_SUPPLIER_FACING_WORDING`, which
    carries no figures at all.

    Built by :func:`domain.services.negotiation_arguments.assess_payment_reliability`.
    """

    status: str  # "on_or_before_terms" | "minor_variance" | "behind_terms" | "unavailable"
    # Whether this may be put TO the supplier. False whenever we pay materially
    # late or the data is missing: that is never volunteered, only addressed if
    # the supplier raises it first.
    usable_as_argument: bool
    rationale: str
    # ``negotiationStrategy.payOnTerms.value`` — the contractual baseline.
    pay_on_terms_term_days: int | None = None
    # Spend-volume-weighted average of per-line actual payment terms
    # (``SupplierFacts.actual_payment_terms_days``).
    actual_payment_days: int | None = None
    # actual − contractual. Negative = we pay early. None when unavailable.
    variance_days: int | None = None


@dataclass(frozen=True)
class DsoAlignment:
    """DSO as leverage: contractual current vs DSO vs the ask.

    When DSO sits above the contractual current terms, payment timing already
    runs past the contract. That gap is leverage toward the target — e.g.
    current 60, DSO 75, ask 90: the real step is from a 75-day baseline, not
    from 60.

    ===========================  =======================  =====================
    condition                    status                   use
    ===========================  =======================  =====================
    ``dso > current`` and
    ``dso < ask``                ``stepping_stone``       usable leverage
    ``dso > current`` and
    ``dso >= ask``               ``at_or_above_ask``      usable leverage
    ``dso <= current``           ``at_or_below_contract``  do not claim leverage
    any input missing            ``unavailable``           say nothing
    ===========================  =======================  =====================

    Not a market benchmark. The approved supplier-facing form is
    :func:`dso_supplier_facing_wording` (carries the three day-counts).

    Built by :func:`domain.services.negotiation_arguments.assess_dso_alignment`.
    """

    status: str  # stepping_stone | at_or_above_ask | at_or_below_contract | unavailable
    usable_as_argument: bool
    rationale: str
    # ``supplier.dso``.
    dso: int | None = None
    # Contractual current terms for this negotiation.
    current_term_days: int | None = None
    # The term on the table (:func:`negotiation_ask_term`).
    proposed_term_days: int | None = None
    # proposed − dso (informational; leverage gate is dso vs current).
    gap_days: int | None = None
    # Approved sentence with current / DSO / ask filled in, when usable.
    supplier_facing_wording: str | None = None


@dataclass(frozen=True)
class CostImpact:
    """What the extension actually costs the supplier, as a share of spend.

    The client's own formula (Carlos, 2026-08-18)::

        Supplier Economic Profit = cash_flow_opportunity × supplier_WACC
                                 + price_change_pct × volume_change
                                   × (1 − supplier_tax_rate)

        Cost Impact %            = Supplier Economic Profit / spend_volume

    ``supplier_WACC`` is ``wacc_after_tax``, defaulting to 9% when null;
    ``supplier_tax_rate`` defaults to 35% when null. Both defaults are
    ASSUMPTIONS and are named in the rationale whenever they are used — an
    unattributed figure is the provenance complaint the client kept raising.

    This REPLACES the earlier
    ``(extension_days / 365) × supplier_financing_rate``. Carlos predicted the
    discrepancy himself on 2026-08-13: *"I think we have, instead of financing
    rate, we might be using the supplier's WACC."*

    The point is to make the cost CONCRETE and small. A supplier hears "60 more
    days" as a large, unquantified loss; bounded at a fraction of a percent it
    is an argument against resistance rather than a concession. So unlike the
    other supporting arguments this one is quoted WITH its figure — the
    percentage is the argument.

    The rate INPUTS stay internal
    (:data:`domain.services.supplier_facts._INTERNAL_ONLY_FIELDS`): the approved
    sentence states the impact, never the WACC it came from.

    ``status`` is ``limited`` (small enough to argue), ``material`` (too large to
    call limited — quantifying it would hand the supplier a number to resist
    with), ``no_extension`` (the proposal is not an extension), or
    ``unavailable``.

    Built by :func:`domain.services.negotiation_arguments.assess_cost_impact`.
    """

    status: str  # "limited" | "material" | "no_extension" | "unavailable"
    usable_as_argument: bool
    rationale: str
    extension_days: int | None = None
    # INTERNAL ONLY — inputs, never the output. Never stated to the supplier.
    supplier_financing_rate: float | None = None
    # The WACC actually used, and whether it came from the payload or the 9%
    # default. `assumptions` names every default applied, so the rationale can
    # say which figures rest on one.
    supplier_wacc: float | None = None
    supplier_tax_rate: float | None = None
    assumptions: tuple[str, ...] = ()
    # The intermediate the client's formula names, carried so the negotiator can
    # check the arithmetic — Carlos's actual ask was "how did you calculate?".
    supplier_economic_profit: float | None = None
    cash_flow_opportunity: float | None = None
    spend_volume: float | None = None
    # The impact as a fraction of spend (0.009 = 0.9%) and as a rounded
    # percentage for display.
    cost_impact_ratio: float | None = None
    cost_impact_percent: float | None = None
    # The arithmetic, written out, for the playbook bullet.
    calculation: str | None = None
    # The approved supplier-facing sentence with the figure filled in, or None
    # when the impact is not usable as an argument.
    supplier_facing_wording: str | None = None


@dataclass(frozen=True)
class RelationshipAssessment:
    """How much the client–supplier relationship itself is worth as an argument.

    Scored from spend importance, the supplier's size, and the two leverage
    ratings. It is the argument of last resort in the best sense: when no
    benchmark reaches the ask (a stretch target), the case rests on the
    relationship — so this is what stops a surface either inventing market
    support or having nothing to say.

    ``negotiation_tone`` is a RECOMMENDED posture derived from leverage, not the
    wording style: the negotiator picks that in the UI (``selected_tone``) and
    that selection always governs how the text actually reads.

    ``pitch`` is supplier-facing and carries no figures — the spend volume and
    leverage ratings behind the score are internal.

    Built by
    :func:`domain.services.negotiation_arguments.assess_client_supplier_relationship`.
    """

    strength: str          # "High" | "Medium" | "Low"
    negotiation_tone: str  # "assertive" | "empathetic" | "collaborative"
    usable_as_argument: bool
    rationale: list[str] = field(default_factory=list)
    pitch: str | None = None


@dataclass(frozen=True)
class ArgumentStep:
    label: str  # "anchor" | "supporting_benchmark" | "spend_line_opportunity" |
                # "payment_reliability" | "fallback"
    term_days: int | None
    argument: str


@dataclass(frozen=True)
class NegotiationAnalysis:
    """Tier-2 judgments derived from :class:`SupplierFacts`.

    INTERNAL to the scoring layer. This is how the scoring functions in
    :mod:`domain.services.negotiation_arguments` hand their results to one
    another and to the bundle builder; it is deliberately not stored, not
    carried on the context or the brief, and not passed to any prompt.

    What callers read instead is
    :func:`domain.services.negotiation_arguments.build_argument_analysis` (what
    we can argue). This object used to be stored alongside it, carrying the same
    posture judgments the argument bundle already carried — one computation with
    two representations, and two ways for one supplier to be described.

    Two composites that used to sit here are gone, both for the same reason —
    each rolled several plain facts into one level a negotiator could not trace
    back:

      * the scored "negotiating strength" (client, 2026-08-20). How likely the
        ask is to be agreed comes from the payload as
        ``SupplierFacts.success_probability``.
      * ``RiskProfile`` (client, 2026-08-20), which graded the regulatory cap,
        the SME flag, the protected-business designation, a weak credit rating,
        the buyer-standard limit type and the data's age into low/medium/high.

    Both sets of inputs are still carried and still reach a prompt — as the
    plain facts they are, not as points in a composite.
    """

    leverage: LeverageAssessment
    financial_sensitivity: FinancialSensitivity
    priority: BusinessPriority
    argument_sequence: list[ArgumentStep]

    # Our own payment record against the Pay-on-Terms baseline — a trust
    # argument. Defaulted to None only so direct constructions stay valid;
    # `analyze_supplier` always populates it.
    payment_reliability: PaymentReliability | None = None

    # DSO vs contractual current — leverage toward the ask when DSO sits above
    # the contract. Separate from `payment_reliability`: different figure,
    # different use.
    dso_alignment: DsoAlignment | None = None

    # What the extension costs the supplier as a share of invoice value — the
    # argument that makes the cost concrete and small.
    cost_impact: CostImpact | None = None

    # The relationship itself as an argument, plus the posture the leverage
    # ratings recommend. The fallback case when no benchmark reaches the ask.
    relationship: RelationshipAssessment | None = None

    # The negotiation arguments (benchmarks + spend), segregated into full /
    # partial / non-support and precedence-ordered — see
    # `domain.services.negotiation_arguments.build_negotiation_arguments`. Defaulted
    # to None only so direct constructions stay valid; `analyze_supplier`
    # always populates it.
    arguments: NegotiationArguments | None = None

    # The BATNA floor for THIS negotiation —
    # harmonise(target − 15), or None (No BATNA) when that figure sits below
    # contractual + 5. See `resolve_effective_batna` and
    # `domain.services.batna`.
    effective_batna_term_days: int | None = None
    # Explains which rule produced `effective_batna_term_days`, for the
    # drafting prompts.
    batna_note: str | None = None
