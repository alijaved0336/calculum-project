"""The concessions engine - playbook section 6, decided in code.

The client's spec (2026-08-25): section 6 is a RANKED LADDER of four named
concessions, cheapest move first, each appearing only when its condition is met
for this supplier. Same pattern as :mod:`domain.services.objections` and
:mod:`domain.services.batna` - the ladder is chosen and worded here, and the
model only renders it.

    A. SCF Program Access             - SCF is enabled for this session
    B. Phased Implementation Roadmap  - target - current > 25 days
    C. Equivalent Discount    - always, once the discount computes above 0
                                (priced by the buyer economic-profit model)
    D. Volume / Wallet-Share Guarantee - buyer leverage is high

The letters are assigned IN ORDER OF WHAT ACTUALLY QUALIFIES, so a supplier with
no SCF gets "A. Phased Implementation Roadmap" rather than a ladder that starts
at B with a hole where A should be. The client's own numbering skipped a letter
(they wrote A, B, C, E); the ladder position is what carries meaning here, not
the letter itself.

WHY THE ORDER IS THE LADDER: SCF costs the buyer nothing but a facility fee and
leaves the term where it is; a phased rollout moves only WHEN the term lands;
a discount is real money; a volume guarantee commits future spend. Cheapest to
most expensive, which is the order the section has always asked for and the
order the client listed them in.

TWO PLAYS ARE REUSED, NOT RETYPED. `multiPhaseTransition` and `discountOffering`
in :mod:`domain.entities.playbook_plays` are the client's own wording for B and
C, so those two lift their sentence out of the registry. SCF access and the
volume guarantee have no play; their wording is written here, from the client's
spec.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal, ROUND_HALF_UP

from domain.entities.analysis import NegotiationAnalysis
from domain.entities.facts import (
    SupplierFacts,
    negotiation_ask_term,
)
from domain.entities.playbook_plays import PLAYBOOK_PLAYS
from domain.services.economic_profit import compensating_price_change
from domain.services.scf_analysis import ScfViability, resolve_scf_viability

# The equivalent discount is priced by the buyer economic-profit model
# (`domain.services.economic_profit.compensating_price_change`) - the same model,
# assumptions and cost of capital as every what-if and counter-offer. It used to
# carry its own formula here, `extension / 365 x 9.5%` with no tax, set by the
# client on 2026-08-25; replaced 2026-09-21 on the user's instruction that the
# economic-profit model be the ONE valuation of terms against price across the
# app. The old formula disagreed with a what-if on the same move (34 -> 75 days:
# 1% here, 1.5% there) and kept a second buyer cost of capital (9.5% vs 8%).

# Discounts are quoted in quarter-points. A discount of "1.0411%" reads as a
# calculated artefact rather than an offer; the ladder is a negotiating
# instrument, and the figures on it are round.
DISCOUNT_STEP_PERCENT = Decimal("0.25")

# A phased rollout only earns its place on a big move. Under this the phases are
# shorter than the 15-day ladder every term sits on, so "phase it" is a
# scheduling detail rather than a concession worth spending.
PHASED_ROLLOUT_MIN_GAP_DAYS = 25

# What the SCF programme settles at — the client's "as early as Day 5".
SCF_SETTLEMENT_DAY = 5


@dataclass(frozen=True)
class Concession:
    """One rung of the ladder.

    ``offer`` is the ready-to-say line. ``when_to_use`` and ``cost_note`` are the
    negotiator's own reading — what the rung is for, and what giving it costs
    us. ``talking_points`` carries the supporting detail for the rungs that have
    any (SCF), already filled in with this supplier's figures.
    """

    key: str
    title: str
    offer: str
    when_to_use: str
    cost_note: str
    talking_points: tuple[str, ...] = ()
    # Where in the client's own materials this concession is documented.
    # INTERNAL — it names other accounts, and never goes to the supplier.
    source_reference: str | None = None
    caution: str | None = None


@dataclass(frozen=True)
class ConcessionPlan:
    concessions: list[Concession] = field(default_factory=list)

    def __bool__(self) -> bool:
        return bool(self.concessions)


def build_concession_plan(
    facts: SupplierFacts,
    analysis: NegotiationAnalysis | None = None,
    *,
    scf_enabled: bool = False,
) -> ConcessionPlan:
    """The ladder for this supplier, cheapest rung first.

    ``scf_enabled`` is the session's SCF setting and is the FIRST of rung A's
    two gates. It is passed in rather than inferred: SCF availability is a
    per-session decision (see :mod:`domain.services.scf_policy`), not a property
    of the supplier, and inferring it from a surviving ``scf_rate`` is how a
    fail-closed gate becomes a fail-open one. The second gate is rate viability
    — the same check every other SCF surface runs.
    """
    if analysis is None:
        from domain.services.negotiation_arguments import analyze_supplier
        analysis = analyze_supplier(facts)

    ask = negotiation_ask_term(facts)
    current = facts.current_term_days
    extension = None if ask is None or current is None else ask - current

    concessions = [
        concession
        for concession in (
            _scf_access(facts, ask, scf_enabled=scf_enabled),
            _phased_rollout(facts, ask, extension),
            _equivalent_discount(facts, current, ask),
            _volume_guarantee(facts, analysis),
        )
        if concession is not None
    ]
    return ConcessionPlan(concessions=concessions)


# ── A. SCF Program Access ──────────────────────────────────────────────────


def _scf_access(
    facts: SupplierFacts, ask: int | None, *, scf_enabled: bool
) -> Concession | None:
    """The strongest rung, gated twice: enabled for the session, AND offerable.

    Offering a financing programme that is not enabled for this client is the
    one failure mode SCF policy exists to prevent, so the session gate is
    fail-closed: no ``scf_enabled``, no rung, whatever else the facts happen to
    carry. The rate gate is the second: a programme that prices too far above
    this supplier's own borrowing is not a concession they would take, and every
    other SCF surface already refuses it (client, 2026-08-27). Both run here so
    the ladder cannot offer what the pitch surfaces would decline to pitch.
    """
    viability = resolve_scf_viability(facts, scf_enabled=scf_enabled)
    if viability is None:
        return None

    return Concession(
        key="scfAccess",
        title="SCF Program Access",
        offer=(
            "If the cash-flow timing is the obstacle, we can give you access to "
            "our supply chain finance programme — settlement as early as day "
            f"{SCF_SETTLEMENT_DAY}, with the payment terms themselves unchanged."
        ),
        when_to_use=_scf_when_to_use(viability),
        cost_note=(
            "Costs us the facility fee only; the term still lands at "
            f"{ask} days, so nothing is conceded on the number itself."
            if ask is not None else
            "Costs us the facility fee only; nothing is conceded on the term."
        ),
        talking_points=_scf_talking_points(facts, viability),
        source_reference=(
            'Terumo: "The proposed terms are operationally neutralized through '
            "BMS's Supply Chain Finance program.\" One of the strongest "
            "documented concessions across the client's materials."
        ),
        caution=(
            "Neutralises the cash-flow objection; it does not buy a shorter "
            "term. Never pair it with a move off the target, and never quote "
            "our own facility rate."
        ),
    )


def _scf_when_to_use(viability: ScfViability) -> str:
    """The rung's condition, worded to what the rates actually say.

    The cheaper-than-your-own-borrowing line is only true where we undercut
    them; inside the viability tolerance the rung stands on settlement timing,
    and telling the negotiator otherwise sends them in with a price argument
    they do not have.
    """
    base = (
        "SCF is enabled for this negotiation and the buyer holds an "
        "investment-grade credit rating — the programme prices off the BUYER's "
        "rating"
    )
    if viability.undercuts_supplier_rate:
        return (
            f"{base}, which is what makes it cheaper than the supplier's own "
            f"borrowing."
        )
    return (
        f"{base}. It does NOT undercut this supplier's own borrowing cost, so "
        f"offer it for the day-{SCF_SETTLEMENT_DAY} settlement and the "
        f"off-balance-sheet treatment — never as cheaper money."
    )


def _scf_talking_points(
    facts: SupplierFacts, viability: ScfViability
) -> tuple[str, ...]:
    """The client's SCF talking points, filled in with real figures.

    Each one appears only when the data behind it exists. The receivables pair
    is the standard identity — ``spend x days / 365`` — computed on the
    supplier's OWN collection cycle today against day-5 settlement under the
    programme, so the improvement is theirs rather than a restatement of the
    buyer's unlock (which is internal leverage and never framed as their gain).
    """
    points: list[str] = []
    dso, spend = facts.dso, facts.spend_volume

    if dso is not None and dso > SCF_SETTLEMENT_DAY:
        points.append(
            f"Collection moves from around {dso} days to day {SCF_SETTLEMENT_DAY}."
        )
        if spend:
            today = spend * dso / 365
            with_scf = spend * SCF_SETTLEMENT_DAY / 365
            points.append(
                f"Receivables tied up on this account drop from about "
                f"{_money(today)} to about {_money(with_scf)} "
                f"(annual spend x days / 365)."
            )
            points.append(
                "Operating cash flow improves by the difference — about "
                f"{_money(today - with_scf)} released."
            )

    points.append(
        "Off-balance-sheet: it is a settlement facility, not debt on your books."
    )

    # The shared flag, not a second comparison: viability tolerates a small
    # premium, and this claim must track the same line every other surface uses.
    if viability.undercuts_supplier_rate:
        # The SPREAD is the argument; neither rate is stated to the supplier.
        points.append(
            "Rate arbitrage: the programme prices below your own cost of "
            "borrowing, so early settlement costs you less than financing the "
            "gap yourself. (Rates are internal — describe the advantage, never "
            "quote either figure.)"
        )
    return tuple(points)


# ── B. Phased Implementation Roadmap ───────────────────────────────────────


def _phased_rollout(
    facts: SupplierFacts, ask: int | None, extension: int | None
) -> Concession | None:
    if extension is None or extension <= PHASED_ROLLOUT_MIN_GAP_DAYS:
        return None
    play = _play("multiPhaseTransition")
    if play is None:
        return None
    return Concession(
        key="phasedRollout",
        title="Phased Implementation Roadmap",
        offer=play.spoken_line(ask),
        when_to_use=(
            f"The move is {extension} days — more than "
            f"{PHASED_ROLLOUT_MIN_GAP_DAYS}, so landing it in one step is a "
            "genuine operational change for the supplier rather than an "
            "administrative one."
        ),
        cost_note=(
            "Costs us the timing only — the destination is still "
            f"{ask} days." if ask is not None else
            "Costs us the timing only — the destination is unchanged."
        ),
        caution=play.caution,
    )


# ── C. Equivalent Discount ─────────────────────────────────────────


def _equivalent_discount(
    facts: SupplierFacts, current: int | None, ask: int | None
) -> Concession | None:
    """The discount at today's term that is worth as much as the extension.

    Solved by the buyer economic-profit model - what price change on the
    CURRENT term produces the same economic profit as moving to the ask at
    today's price - and rounded to the nearest quarter-point, because the
    ladder is a negotiating instrument and "1.3985%" reads as a calculated
    artefact rather than an offer. Computed in :class:`Decimal` on the exact
    solve; rounding the percentage first and the quarter-point after disagrees
    with this for most extensions.
    """
    if current is None or ask is None or ask <= current:
        return None
    percent = _discount_percent(current, ask)
    if percent is None or percent <= 0:
        # Under an eighth of a point. There is no offer to make.
        return None

    play = _play("discountOffering")
    quoted = _format_percent(percent)
    current = facts.current_term_days
    current_clause = (
        f" to pay the supplier on the current terms of {current} days"
        if current is not None
        else ""
    )
    offer = (
        f"{play.say} On this extension that equates to {quoted}{current_clause}."
        if play is not None and play.say else
        "If the new payment terms cannot be achieved immediately, we "
        "can look at an alternative arrangement of equivalent cash-discount "
        f"that equates to {quoted} {current_clause}."
    )
    return Concession(
        key="equivalentDiscount",
        title="Equivalent Discount",
        offer=offer,
        when_to_use=(
            "The supplier will not move on the term itself and wants "
            "commercial compensation for it."
        ),
        cost_note=(
            f"Real money: {quoted} of invoice value - the discount worth as much "
            "to us as the extension itself, after tax at our cost of capital. "
            "The most expensive rung before a volume commitment."
        ),
        # The play's own caution said "never invent a discount rate". This
        # figure is not invented — it is the economic-profit solve, computed in
        # code — but the second half of that rule still stands.
        caution=(
            f"{quoted} is the CALCULATED equivalent, not an approved price. "
            "Never offer it as the first concession, never go above it, and "
            "never quote the cost of capital it was derived from."
        ),
    )


def _discount_percent(current: int, ask: int) -> Decimal | None:
    """The compensating discount, as a positive percentage on the quarter-point."""
    solved = compensating_price_change(current, ask)
    if solved is None:
        return None
    raw = -solved * 100
    steps = (raw / DISCOUNT_STEP_PERCENT).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )
    return steps * DISCOUNT_STEP_PERCENT


def _format_percent(percent: Decimal) -> str:
    return f"{percent.normalize():f}%".replace(".00%", "%")


# ── D. Volume / Wallet-Share Guarantee ─────────────────────────────────────


def _volume_guarantee(
    facts: SupplierFacts, analysis: NegotiationAnalysis
) -> Concession | None:
    """Gated on HIGH buyer leverage — the client's "supplier depends on the
    account".

    Buyer leverage is the scored form of exactly that dependence (spend
    importance against the supplier's size and position), so it is the gate
    rather than a second judgment invented here.
    """
    if (facts.buyer_leverage_level or "").strip().lower() != "high":
        return None
    return Concession(
        key="volumeGuarantee",
        title="Volume / Wallet-Share Guarantee",
        offer=(
            "If the terms work, we can look at how future volume and continuity "
            "on this account are allocated — that conversation is open to "
            "suppliers aligned on our payment terms."
        ),
        when_to_use=(
            "Buyer leverage on this account is high and the supplier depends on "
            "the volume — the last rung, and only against a supplier for whom "
            "future placement is worth more than the term."
        ),
        cost_note=(
            "The most expensive rung: it commits future spend allocation, which "
            "is not ours to trade away lightly. Never name a volume, a share or "
            "a contract length."
        ),
        source_reference=(
            'Oxford: "Future placement volume and contract continuity..."'
        ),
        caution=(
            "Link the terms to how future volume is CONSIDERED, never to a "
            "guaranteed quantity, percentage or renewal. A promise of specific "
            "volume is a commitment the negotiator cannot make at the table."
        ),
    )


# ── shared ─────────────────────────────────────────────────────────────────


def _play(key: str):
    return next((p for p in PLAYBOOK_PLAYS if p.key == key), None)


def _money(value: float) -> str:
    """Compact money — "$12.85M", "$850K". Mirrors the arguments engine's own
    formatter; `domain` must not reach into `utils.prompts` for one."""
    if abs(value) >= 1_000_000:
        return f"${value / 1_000_000:,.2f}M"
    if abs(value) >= 1_000:
        return f"${value / 1_000:,.0f}K"
    return f"${value:,.0f}"
