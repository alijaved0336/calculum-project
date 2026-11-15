"""What Supply Chain Finance contributes to the playbook, decided in code.

SCF already owns concession rung A (:mod:`domain.services.concessions`). The
client asked for it in two more places (2026-08-26): the **Opening Position**,
where the availability of the programme is part of why the ask is reasonable,
and **Key Arguments**, where the financing costs and the rate advantage are
evidence for it.

Like every other playbook engine, the wording is written here and the model only
renders it. Two things make that non-negotiable for this section in particular:

* The gate is fail-closed and doubly conditioned — the session must have SCF
  enabled (:mod:`domain.services.scf_policy`) AND the programme must be
  offerable on rate (:func:`domain.services.scf_analysis.analyze_scf_viability`).
  Neither is visible to the model, so the model cannot be the one to decide.
* Since the tolerance change, "offerable" no longer implies "cheaper". The rate
  advantage is only claimed when we genuinely undercut them
  (``undercuts_supplier_rate``); inside the tolerance band the same slot pitches
  early settlement instead. A pitch that promises a rate below their own
  borrowing when it is not is a claim the supplier can check with their bank.

The two rate figures stay INTERNAL: the negotiator sees them, the supplier is
never told either, and only the qualitative advantage is sayable. This mirrors
the rule the SCF pitch surface and the asymmetry guard already enforce.
"""
from __future__ import annotations

from dataclasses import dataclass

from domain.entities.facts import SupplierFacts, negotiation_ask_term
from domain.services.concessions import SCF_SETTLEMENT_DAY
from domain.services.scf_analysis import ScfViability, resolve_scf_viability


# The titles these entries can carry in section 4. Exported so the playbook's
# bullet formatter recognises them as argument names the way it recognises the
# catalogue's own — an SCF bullet is a Key Arguments bullet like any other.
TITLE_SUPPLIER_FINANCING_COST = "Supplier Financing Cost"
TITLE_SCF_FINANCING_COST = "SCF Financing Cost"
TITLE_RATE_ADVANTAGE = "Rate Advantage"
TITLE_EARLY_SETTLEMENT = "Early Settlement Option"

SCF_KEY_ARGUMENT_TITLES: tuple[str, ...] = (
    TITLE_SUPPLIER_FINANCING_COST,
    TITLE_SCF_FINANCING_COST,
    TITLE_RATE_ADVANTAGE,
    TITLE_EARLY_SETTLEMENT,
)


@dataclass(frozen=True)
class ScfKeyArgument:
    """One Key Arguments entry contributed by SCF.

    ``figures`` is what follows the em-dash in the parent bullet, and it is a
    FIGURE, the way every other argument in the section carries one ("Cost
    Impact — 0.77% of spend"). The first draft phrased it as a sentence and the
    model dropped it, leaving three labels with no numbers under them.

    ``pitch`` is the ready-to-say sentence; None means the entry is evidence for
    the negotiator only and renders with the section's internal-only tail. A
    rate being unsayable does not make it unprintable: this is the negotiator's
    own document, and they need the number they are reasoning from.
    """

    title: str
    figures: str
    pitch: str | None = None

    @property
    def sayable(self) -> bool:
        return self.pitch is not None


@dataclass(frozen=True)
class ScfPlaybookPlan:
    """SCF's contribution to sections 1 and 4, ready to render."""

    viability: ScfViability
    # Section 1: a short standalone paragraph, NOT a clause spliced into the
    # opening sentence. The clause version came back welded onto the end of the
    # treasury-policy quote as a sentence fragment, and the whole section read as
    # one wall of text (client, real playbook, 2026-08-26).
    opening_note: str
    # Section 1: the literal sentence the negotiator says to the supplier.
    opening_pitch: str
    # Section 4: appended after the brief's own supporting arguments.
    key_arguments: tuple[ScfKeyArgument, ...]

    @property
    def undercuts_supplier_rate(self) -> bool:
        return self.viability.undercuts_supplier_rate


def build_scf_playbook_plan(
    facts: SupplierFacts,
    argument_analysis: dict | None = None,
    *,
    scf_enabled: bool,
) -> ScfPlaybookPlan | None:
    """SCF's playbook content, or None when it must not appear at all.

    None means the sections are written exactly as they were before SCF existed:
    no clause, no arguments, no mention. ``scf_enabled`` is the session setting
    and is checked first — an unavailable programme is never pitched, whatever
    rates the facts happen to carry.
    """
    viability = resolve_scf_viability(
        facts, argument_analysis, scf_enabled=scf_enabled
    )
    if viability is None:
        return None

    ask = negotiation_ask_term(facts)
    term = f"{ask} days" if ask is not None else "the proposed terms"

    return ScfPlaybookPlan(
        viability=viability,
        opening_note=(
            "The ask is enabled by the availability of Supply Chain Finance to "
            "address potential liquidity concerns. The proposed extension does "
            "not require the supplier to absorb the full cash-flow impact "
            "immediately, as SCF provides an option for early settlement while "
            "maintaining the agreed payment structure."
        ),
        opening_pitch=(
            "We recognize that payment term changes can impact working capital "
            "planning. To ensure this transition remains operationally neutral, "
            "we can provide access to our Supply Chain Finance program, allowing "
            "early payment options while aligning the contractual terms."
        ),
        key_arguments=_key_arguments(viability, term),
    )


def _key_arguments(v: ScfViability, term: str) -> tuple[ScfKeyArgument, ...]:
    """The three SCF entries: their cost of money, ours, and what that buys.

    The first two are the raw rates and are never sayable. The third is the only
    one that reaches the supplier, and what it may claim depends on which side of
    their own borrowing cost our programme sits.
    """
    return (
        ScfKeyArgument(
            title=TITLE_SUPPLIER_FINANCING_COST,
            figures=f"{v.supplier_financing_rate:.2%} short-term borrowing rate",
        ),
        ScfKeyArgument(
            title=TITLE_SCF_FINANCING_COST,
            figures=(
                f"{v.scf_rate:.2%}, settling as early as day {SCF_SETTLEMENT_DAY}"
            ),
        ),
        _rate_advantage(v, term),
    )


def _rate_advantage(v: ScfViability, term: str) -> ScfKeyArgument:
    if v.undercuts_supplier_rate:
        return ScfKeyArgument(
            title=TITLE_RATE_ADVANTAGE,
            figures=(
                f"{v.rate_spread_pts:.1f} percentage points below the supplier's "
                f"own borrowing cost"
            ),
            pitch=(
                f"While the payment terms extend to {term}, your organization "
                "retains the option to receive payment earlier through our SCF "
                "program. The program provides access to financing at a rate below "
                "typical supplier borrowing costs, reducing the working-capital "
                "impact of the change."
            ),
        )

    # Inside the tolerance band: offerable, but not cheaper money. The slot keeps
    # its place — early settlement is still worth pitching — and loses the rate
    # claim, which would be false here.
    return ScfKeyArgument(
        title=TITLE_EARLY_SETTLEMENT,
        figures=f"settlement from day {SCF_SETTLEMENT_DAY}, at no rate advantage",
        pitch=(
            f"While the payment terms extend to {term}, your organization retains "
            "the option to receive payment earlier through our SCF program — "
            f"settlement as early as day {SCF_SETTLEMENT_DAY}, without the facility "
            "sitting on your balance sheet as debt."
        ),
    )
