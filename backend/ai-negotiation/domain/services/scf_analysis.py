from __future__ import annotations

from dataclasses import dataclass

from domain.entities.facts import SupplierFacts

# How much more expensive than the supplier's own financing our programme may be
# and still be worth offering, in percentage points. Inside this band SCF is sold
# on settlement timing (day-5 cash) and off-balance-sheet treatment, not on price;
# beyond it the offer has nothing left to stand on. Client rule, 2026-08-26.
SCF_RATE_TOLERANCE_PTS = 1.0


# What each inviability reason means, in one negotiator-readable phrase. A
# surface that has to SAY why the programme is off the table for this supplier
# (the prompt policy directive in ``scf_policy``, chiefly) reads it from here so
# the three reasons are worded in exactly one place.
_INVIABLE_REASON_PHRASES = {
    "no_scf_rate": "no SCF programme rate is on file for this supplier",
    "no_supplier_rate": (
        "the supplier's own financing rate is unknown, so our programme cannot "
        "be compared against it"
    ),
    "not_competitive": (
        f"our SCF rate runs more than {SCF_RATE_TOLERANCE_PTS:.0f} percentage "
        "point above the supplier's own financing rate"
    ),
}

_UNKNOWN_REASON_PHRASE = "the programme cannot be offered to this supplier"


def scf_inviable_reason_phrase(reason: str | None) -> str:
    """The short "why not" for an ``inviable_reason``, safe to put in a prompt."""
    return _INVIABLE_REASON_PHRASES.get(reason or "", _UNKNOWN_REASON_PHRASE)


@dataclass(frozen=True)
class ScfViability:
    """Whether SCF can be credibly offered — and why, with supporting pitch context.

    ``viable=True`` means our SCF rate is close enough to the supplier's own
    financing rate for a pitch to hold up — either below it, or no more than
    :data:`SCF_RATE_TOLERANCE_PTS` above it, where the programme still wins on
    settlement timing and off-balance-sheet treatment rather than on price.
    ``viable=False`` means it can't — the reason is one of:
    - ``"no_scf_rate"``       — no SCF programme rate on file for this session
    - ``"no_supplier_rate"``  — supplier's financing rate unknown; comparison impossible
    - ``"not_competitive"``   — our SCF rate exceeds theirs by more than the tolerance
    """

    viable: bool
    inviable_reason: str | None  # None when viable

    # Rate figures — internal-only; never state literally in supplier-facing output
    scf_rate: float | None
    supplier_financing_rate: float | None
    # Signed spread in percentage-points when viable; None otherwise. POSITIVE
    # means our programme undercuts them by that much; zero or NEGATIVE means it
    # costs the same or up to SCF_RATE_TOLERANCE_PTS more, which is still viable
    # but must never be pitched as a saving — check ``undercuts_supplier_rate``
    # before framing it as one.
    # The spread itself is a derived value and is safe to reference in the pitch
    # as the magnitude of the rate advantage (e.g. "3.5 percentage points cheaper").
    rate_spread_pts: float | None

    # Contextual signals bundled here so the prompt builder has them in one place
    financial_sensitivity_level: str   # "low" | "medium" | "high" | "unknown"
    financial_sensitivity_rationale: str
    leverage_posture: str              # "buyer_favored" | "balanced" | "supplier_favored"
    leverage_strength: str
    leverage_rationale: str
    is_sme: bool

    supplier_name: str | None
    country: str | None
    industry: str | None
    target_term_days: int | None
    current_term_days: int | None
    spend_volume: float | None
    target_cash_flow: float | None
    # Supplier's own post-tax cost of capital — internal-only context for the pitch;
    # never state literally in supplier-facing output.
    wacc_after_tax: float | None

    # True only when our rate is strictly below theirs. Viability now tolerates a
    # small premium, so this is the flag that gates any "cheaper than your own
    # borrowing" claim; ``viable`` alone no longer implies it.
    undercuts_supplier_rate: bool = False


def analyze_scf_viability(facts: SupplierFacts, argument_analysis: dict) -> ScfViability:
    """Determine whether SCF is a credible offer and bundle supporting pitch context.

    ``argument_analysis`` is the bundle from
    :func:`domain.services.negotiation_arguments.build_argument_analysis`; the
    posture judgments (financial sensitivity, leverage) are read off it so the
    pitch context matches what every other surface was shown. The SME flag comes
    straight off the facts — it used to arrive folded into a risk grade, which
    said "medium risk" where the pitch only ever needed "this is an SME".

    Outcomes:
    1. No SCF rate on file → not viable (``"no_scf_rate"``).
    2. Supplier financing rate unknown → not viable (``"no_supplier_rate"``).
    3. Our SCF rate exceeds the supplier's by more than
       :data:`SCF_RATE_TOLERANCE_PTS` → not viable (``"not_competitive"``).
    4. Otherwise viable; the signed spread is computed. Note that viable no
       longer means cheaper: at or within the tolerance above their rate the
       programme is offered on day-5 settlement and off-balance-sheet treatment
       instead, and ``undercuts_supplier_rate`` is False so no surface frames it
       as a saving.
    """
    scf_rate = facts.scf_rate
    supplier_rate = facts.supplier_financing_rate

    posture = (argument_analysis or {}).get("posture") or {}
    sensitivity = posture.get("financial_sensitivity") or {}
    leverage = posture.get("leverage") or {}

    common = dict(
        scf_rate=scf_rate,
        supplier_financing_rate=supplier_rate,
        rate_spread_pts=None,
        financial_sensitivity_level=sensitivity.get("level", "unknown"),
        financial_sensitivity_rationale=sensitivity.get("rationale", ""),
        leverage_posture=leverage.get("posture", ""),
        leverage_strength=leverage.get("strength", ""),
        leverage_rationale=leverage.get("rationale", ""),
        is_sme=facts.is_sme,
        supplier_name=facts.supplier_name,
        country=facts.country,
        industry=facts.industry,
        target_term_days=facts.target_term_days,
        current_term_days=facts.current_term_days,
        spend_volume=facts.spend_volume,
        target_cash_flow=facts.target_cash_flow,
        wacc_after_tax=facts.wacc_after_tax,
    )

    if scf_rate is None:
        return ScfViability(viable=False, inviable_reason="no_scf_rate", **common)

    if supplier_rate is None:
        return ScfViability(viable=False, inviable_reason="no_supplier_rate", **common)

    # Rounded before the comparison so a rate pair that is exactly the tolerance
    # apart (0.055 vs 0.065) is not pushed over it by binary-float error.
    premium_pts = round((scf_rate - supplier_rate) * 100, 6)
    if premium_pts > SCF_RATE_TOLERANCE_PTS:
        return ScfViability(viable=False, inviable_reason="not_competitive", **common)

    return ScfViability(
        viable=True,
        inviable_reason=None,
        **{
            **common,
            "rate_spread_pts": 0.0 if premium_pts == 0 else round(-premium_pts, 2),
            "undercuts_supplier_rate": premium_pts < 0,
        },
    )


def resolve_scf_viability(
    facts: SupplierFacts,
    argument_analysis: dict | None = None,
    *,
    scf_enabled: bool,
) -> ScfViability | None:
    """Both gates in one place: enabled for the session AND offerable on rate.

    ``None`` means SCF must not appear on this surface at all. Every surface
    that OFFERS SCF — the concession rung, the playbook sections, the pushback
    scripts — asks this rather than checking ``scf_enabled`` alone, because the
    two questions had drifted apart: the ladder was offering the programme on
    sessions where the pitch surfaces would have refused it on rate (client,
    2026-08-27).

    The session gate is checked first and is fail-closed, so a payload that
    still carries rates can never re-open a programme the client does not have.
    """
    if not scf_enabled:
        return None
    viability = analyze_scf_viability(facts, argument_analysis or {})
    return viability if viability.viable else None
