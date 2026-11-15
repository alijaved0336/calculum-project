"""The objections engine — playbook section 5, decided in code.

The client's spec (2026-08-25): section 5 carries a FIXED set of objections, each
with a pre-written counter, and each one appears only when its condition is
actually met for this supplier. Section 5 used to be "the 2-3 most likely
pushbacks given this supplier's profile" — the model choosing both the objection
and the answer — which is the same open brief that made the old BATNA section
hallucinate (see :mod:`domain.services.batna`).

The five the client named, with their gates:

  1. "This will hurt our cash flow"           — cost impact is limited (<= 2%)
  2. "Our standard terms are shorter"         — supplierStandard > current term
  3. "Your ask is not compliant with the
     regulatory rules"                        — ALWAYS; answered from our own
                                                regulatory data
  4. "We need shorter terms for our own
     operations"                              — supplier DSO > ask - 15
  5. "Why should we accept what others
     accept?"                                 — peerGroupStandard reaches the ask

FIVE, and only five. The client's ``pricingThreat`` play ("Payment terms remain
a commercial lever, and any adjustment to them requires an equivalent commercial
offset") used to reach section 5 through the APPROVED PLAYS block and was
briefly carried here as a sixth entry. The client dropped it on 2026-08-25: the
play is real and stays in :mod:`domain.entities.playbook_plays`, but it no
longer appears in the playbook. Do not re-add it here without them asking.

THE TWO BENCHMARK GATES ARE DIFFERENT, deliberately (client, 2026-08-25):

  * objection 2 uses ``> current term`` — the shared citability bar. The claim
    being answered is "our standard terms are SHORTER", which is about how the
    supplier trades, not about our number: any figure above what we pay today
    disproves it. A supplier accepting 83 days elsewhere against a 90-day ask
    answers that objection completely, and gating it at the ask silenced it.
  * objection 5 uses ``>= ask``. "Why should we accept what others accept?" is
    answered only by a peer group that already sits at OUR number; a lower peer
    figure answers it with an argument for the supplier.

Where objection 2's figure falls short of the ask, its ``caution`` says so — a
number quoted in the room is a number the supplier can settle on.

An objection whose gate is not met is NOT raised, and is not mentioned as
unavailable either. A playbook that lists the objections it cannot answer tells
the negotiator where they are weak minutes before they walk into the room; the
same rule already governs the arguments block (`VOICE_PLAYBOOK`) and is enforced
by ``_check_no_missing_sources`` in the output verifier.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from domain.entities.analysis import NegotiationAnalysis
from domain.entities.facts import SupplierFacts, negotiation_ask_term

# Objection 4's gate, in the client's own terms: the supplier's collection cycle
# runs to within one 15-day step of the term we are asking for, so "we need
# shorter terms for our own operations" is a live objection rather than a
# reflex. Expressed as `dso > ask - DSO_PROXIMITY_DAYS`.
DSO_PROXIMITY_DAYS = 15


@dataclass(frozen=True)
class Objection:
    """One objection the supplier may raise, and the answer to it.

    ``counters`` holds the finished, ready-to-say answers — written here, never
    by the model. Most objections have exactly one. Where the client has
    approved several they are ALL said, in the order given: they answer the
    same objection from different angles and are not alternatives to pick
    between. There is deliberately no "primary" counter and no ranking among
    them — the order of this tuple is the whole of it, and nothing downstream
    may treat the first as the real one and the rest as optional colour.

    ``trigger`` says WHY this objection is in the playbook, for the
    negotiator's own understanding; it is not spoken.
    """

    key: str
    supplier_line: str
    counters: tuple[str, ...]
    trigger: str
    # A disclosure caution the negotiator must read before using the counters.
    caution: str | None = None


@dataclass(frozen=True)
class ObjectionPlan:
    objections: list[Objection] = field(default_factory=list)

    def __bool__(self) -> bool:
        return bool(self.objections)


def build_objection_plan(
    facts: SupplierFacts,
    analysis: NegotiationAnalysis | None = None,
) -> ObjectionPlan:
    """Every objection worth preparing for this supplier, in the client's order.

    ``analysis`` carries the cost-impact and DSO assessments. It is passed in
    where the caller already has one (the playbook builds it once per turn) and
    derived otherwise, so a direct caller or a test needs only facts.
    """
    if analysis is None:
        from domain.services.negotiation_arguments import analyze_supplier
        analysis = analyze_supplier(facts)

    ask = negotiation_ask_term(facts)
    objections: list[Objection] = []

    for build in (
        _cash_flow,
        _standard_terms_shorter,
        _regulatory,
        _own_operations,
        _why_accept_what_others_accept,
    ):
        objection = build(facts, analysis, ask)
        if objection is not None:
            objections.append(objection)

    return ObjectionPlan(objections=objections)


# ── 1. "This will hurt our cash flow" ──────────────────────────────────────


def _cash_flow(
    facts: SupplierFacts, analysis: NegotiationAnalysis, ask: int | None
) -> Objection | None:
    """Gated on a LIMITED cost impact — the client's "less than 2%".

    ``usable_as_argument`` already IS that test: ``assess_cost_impact`` returns
    ``limited`` at or under ``COST_IMPACT_LIMITED_CEILING_PERCENT`` (2.0) and
    ``material`` above it. Reusing the flag rather than re-comparing the
    percentage here is what keeps one ceiling in the codebase — and above it the
    figure is deliberately withheld, because quantifying a cost the supplier
    considers large hands them the objection instead of shrinking it.
    """
    cost = analysis.cost_impact
    if cost is None or not cost.usable_as_argument:
        return None
    if cost.cost_impact_percent is None:
        return None

    extension = cost.extension_days
    span = f"{extension}-day" if extension else "proposed"
    return Objection(
        key="cashFlow",
        supplier_line="This will hurt our cash flow.",
        counters=(
            f"For your organization, the cost impact of the {span} term "
            f"increase is minimal and represents only "
            f"{cost.cost_impact_percent}% of invoice value.",
        ),
        trigger=(
            f"Cost impact is {cost.cost_impact_percent}% — inside the 2% bar "
            "for a limited-impact answer, so the figure may be quoted."
        ),
        caution=(
            "State the percentage and nothing behind it — never the WACC, the "
            "cash-flow opportunity, or the spend figure it was computed from."
        ),
    )


# ── 2. "Our standard terms are shorter" ────────────────────────────────────


def _standard_terms_shorter(
    facts: SupplierFacts, analysis: NegotiationAnalysis, ask: int | None
) -> Objection | None:
    """Gated on ``supplierStandard > current term`` (client, 2026-08-25).

    NOT ``>= ask``, which is what this was built with and what silenced the
    objection on a supplier accepting 83 days elsewhere against a 90-day ask.
    The objection is "our standard terms are SHORTER" — a claim about how they
    trade, not about our number — so the bar is what we pay today: any figure
    above it proves the claim false. Reaching the ask is a different question,
    and it is the WORDING below that carries it.
    """
    current = facts.current_term_days
    value = _benchmark_above_current(facts, "supplierStandard", current)
    if value is None:
        return None

    reaches_ask = ask is not None and value >= ask
    if reaches_ask:
        trigger = (
            f"The Supplier Standard benchmark is {value} days, at or above the "
            f"{ask}-day ask — the supplier's own accepted terms answer this."
        )
        landing_warning = ""
    else:
        trigger = (
            f"The Supplier Standard benchmark is {value} days — above our "
            f"current {current}-day term, so it disproves "
            '"our standard terms are shorter", though it falls short of the '
            f"{ask}-day ask."
        )
        # The cost of the wider bar, said out loud. A figure quoted in the room
        # is a figure the supplier can settle on, and 83 against a 90-day ask is
        # a number they will happily accept as the outcome.
        landing_warning = (
            f" {value} days is BELOW our {ask}-day ask: use it to disprove the "
            "claim, never as a figure you would settle at, and do not present "
            "it as backing the full request."
        )

    return Objection(
        key="supplierStandard",
        supplier_line="Our standard terms are shorter.",
        # GENERALISED, never personalised (client, 2026-08-26). This line used
        # to open "Benchmark data shows that {supplier_name} and other
        # equivalent companies…", which tells the supplier we hold a reading of
        # THEIR book — what they accept, from whom. The figure is the same
        # either way; naming them turns a market observation into a claim about
        # their own trading, which is the disclosure the internal-only policy on
        # this source exists to prevent. Say it about their type of company.
        counters=(
            "Benchmark data shows that your organization and other "
            f"equivalent companies are already accepting {value} days from "
            "other clients.",
        ),
        trigger=trigger,
        # The standing policy on this source is INTERNAL-ONLY; the client wrote
        # this counter as a spoken line, which overrides it HERE and only here.
        # Flagged rather than silently reversed — see the module note in the
        # session record.
        caution=(
            "The figure behind this counter is the supplier's OWN accepted "
            "terms — which is why the line is worded about their type of "
            "company and not about them. Keep it generic: never name the "
            "supplier in it, and never attribute the figure to them. It is "
            "approved for THIS answer only, and only once they have raised "
            "the objection — never volunteer it, and never widen it into a "
            "claim about how they price or who else they supply."
            + landing_warning
        ),
    )


# ── 3. "Your ask is not compliant with the regulatory rules" ───────────────


def _regulatory(
    facts: SupplierFacts, analysis: NegotiationAnalysis, ask: int | None
) -> Objection | None:
    """Always prepared — no gate.

    The client's rule: this objection is always worth an answer, and the answer
    comes from our own regulatory data. Two kinds of limit, which is the
    distinction the counter has to carry: a STRICT one (``regulatory_enforced``
    — a statutory cap) and a GOVERNMENTAL one (a published recommendation that
    does not bind). Neither is re-derived here; ``regulatory_applied`` is the
    upstream decision and this only words it.
    """
    cap = facts.regulatory_max_term_days
    strict = facts.regulatory_enforced

    if cap is None:
        counter = (
            "According to industry data, there is no governmental or statutory "
            "regulation capping payment terms for this supplier, so the "
            f"{ask}-day proposal raises no compliance issue."
            if ask is not None else
            "According to industry data, there is no governmental or statutory "
            "regulation capping payment terms for this supplier, so the "
            "proposed terms raise no compliance issue."
        )
        trigger = "No regulatory limit is recorded for this supplier."
    elif ask is not None and ask >= cap and facts.regulatory_applied:
        # The ask was capped down to the limit upstream, so it sits ON it.
        # The two limits are worded apart rather than swapping one noun: only a
        # statute is "the maximum the rules allow". Saying that of a
        # recommendation contradicted the non-binding line appended below —
        # the counter claimed the ceiling was fixed and then offered to pass it.
        counter = (
            f"Our proposal sits at {ask} days, exactly the limit the applicable "
            "statutory cap sets for this market — it is the maximum the rules "
            "allow, not a breach of them."
            if strict else
            f"Our proposal sits at {ask} days, exactly the figure the "
            "applicable government recommendation sets for this market — it is "
            "aligned with that guidance, not a breach of it."
        )
        trigger = (
            f"An applied {'statutory' if strict else 'governmental'} limit of "
            f"{cap} days is what the {ask}-day ask was set to."
        )
    elif strict:
        counter = (
            f"The statutory limit that applies to this supplier is {cap} days, "
            f"and our {ask}-day proposal sits within it."
        )
        trigger = f"A statutory limit of {cap} days applies and the ask clears it."
    else:
        counter = (
            f"The {cap}-day term for this market is a government "
            "recommendation rather than a statutory cap."
        )
        trigger = (
            f"A governmental recommendation of {cap} days applies — guidance, "
            "not a binding cap."
        )

    # Client, 2026-08-26: a government recommendation binds nobody, so whenever
    # the regulatory figure is guidance the counter closes by saying the parties
    # may agree beyond it. Appended here rather than written into each branch
    # because it turns on ONE thing — the figure is not statutory — and that is
    # true of two of the branches above: the recommendation the ask clears, and
    # the recommendation the ask was capped down to (where it is the whole
    # answer to "you cannot go higher").
    #
    # NOT appended to a strict cap, where "both parties can agree more" is an
    # invitation to breach a statute; and not when no regulatory figure exists,
    # where there is nothing for it to be non-binding about.
    if cap is not None and not strict:
        # Both non-strict branches name the figure as a government
        # recommendation, so this can refer back to it instead of introducing
        # it a second time.
        counter += (
            " That guidance is not a binding limit: where both parties agree, "
            "payment terms can be set beyond it."
        )
        # Client 2026-09-09: when the ask clears the recommendation, close with
        # an explicit compliant line (struck the old "and our N-day proposal is
        # compliant with it" mid-sentence).
        if ask is not None and not (facts.regulatory_applied and ask >= cap):
            counter += (
                f" Therefore, our new {ask}-day payment terms are compliant."
            )

    return Objection(
        key="regulatory",
        supplier_line="Your ask is not compliant with the regulatory rules.",
        counters=(counter,),
        trigger=trigger,
        # "One line, then stop" used to open this. The counter now runs to two
        # sentences where the limit is a recommendation, and a rule saying ONE
        # line is how the second one gets dropped — it reads as permission to
        # trim rather than as the restriction it is.
        caution=(
            "Say the counter as written, then stop. Do not offer a legal "
            "opinion, cite a statute by name, or speculate about regulations "
            "in the supplier's own market that our data does not cover."
        ),
    )


# ── 4. "We need shorter terms for our own operations" ──────────────────────


def _own_operations(
    facts: SupplierFacts, analysis: NegotiationAnalysis, ask: int | None
) -> Objection | None:
    """Gated on ``dso > ask - 15`` (client's rule).

    The supplier's own collection cycle already runs to within one 15-day step
    of the term we are asking for, so "we need shorter terms to operate" is the
    objection they are most likely to reach for — and the one our own strategy
    is built to answer.
    """
    dso = facts.dso
    if dso is None or ask is None or dso <= ask - DSO_PROXIMITY_DAYS:
        return None
    return Objection(
        key="ownOperations",
        supplier_line="We need shorter terms for our own operations.",
        counters=(
            "This strategy is specifically designed to offset the extended "
            "Days Sales Outstanding (DSO) gaps that both sides are managing.",
        ),
        trigger=(
            f"The supplier's DSO is {dso} days — within {DSO_PROXIMITY_DAYS} "
            f"days of the {ask}-day ask, so their own cycle is already long."
        ),
        caution=(
            "Never state their DSO figure back to them. It is how this was "
            "assessed, not something to say."
        ),
    )


# ── 5. "Why should we accept what others accept?" ──────────────────────────


def _why_accept_what_others_accept(
    facts: SupplierFacts, analysis: NegotiationAnalysis, ask: int | None
) -> Objection | None:
    value = _benchmark_reaching_ask(facts, "peerGroupStandard", ask)
    if value is None:
        return None
    return Objection(
        key="peerGroupStandard",
        supplier_line="Why should we accept what others accept?",
        # The client's two answers (2026-09-18), in their order, followed by
        # the peer figure that qualified the objection in the first place.
        # "Why should we accept what others accept?" challenges the PREMISE of
        # benchmarking, so the answers lead on why the benchmark means
        # anything - the economics behind it, and what falls out of alignment
        # operationally. The figure lands last, as evidence for what has just
        # been argued rather than as the argument itself.
        counters=(
            "Market benchmarks aren't about blindly following others; they "
            "represent the economic equilibrium of our industry. These terms "
            "ensure that cash flow burdens are distributed equitably across "
            "the supply chain, keeping our partnership commercially viable "
            "for the long term.",
            "Operating outside of standard market terms introduces manual "
            "overhead on our end, which increases the risk of administrative "
            "bottlenecks. Aligning with the benchmark ensures your invoices "
            "are processed through our automated, fastest payment pipelines.",
        ),
        trigger=(
            f"The Peer Group Standard is {value} days, at or above the "
            f"{ask}-day ask."
        ),
    )


# ── shared ─────────────────────────────────────────────────────────────────


def _benchmark_reaching_ask(
    facts: SupplierFacts, name: str, ask: int | None
) -> int | None:
    """That benchmark's value when it is AT OR ABOVE the ask, else None.

    The bar for objection 5 ("why should we accept what others accept?"), where
    the counter's whole force is that the peer group already sits at our number.
    A peer figure short of the ask answers that objection with a smaller number,
    which is an argument for the supplier.

    Objection 2 uses the WIDER bar — see :func:`_benchmark_above_current`. The
    two differ because the objections differ, not by oversight.
    """
    return _benchmark_value(facts, name, floor=ask, inclusive=True)


def _benchmark_above_current(
    facts: SupplierFacts, name: str, current: int | None
) -> int | None:
    """That benchmark's value when it is STRICTLY ABOVE the current term.

    The same citability bar every evidence surface uses
    (:func:`domain.services.negotiation_arguments.is_benchmark_citable`): a
    figure above what we already pay proves longer terms exist here. At or below
    it, it evidences the status quo or arms the supplier.
    """
    return _benchmark_value(facts, name, floor=current, inclusive=False)


def _benchmark_value(
    facts: SupplierFacts, name: str, *, floor: int | None, inclusive: bool
) -> int | None:
    if floor is None:
        return None
    for benchmark in facts.strategy_benchmarks:
        if benchmark.name == name and benchmark.value is not None:
            value = int(benchmark.value)
            clears = value >= int(floor) if inclusive else value > int(floor)
            return value if clears else None
    return None
