"""The objection scan — what ELSE this supplier's data says they may push back on.

The objections engine (:mod:`domain.services.objections`) carries the client's
five approved objections, each gated, each with a pre-written counter. For most
suppliers only two or three of them qualify, and a negotiator who asks to
"scan the whole supplier" for pushbacks was handed those two or three, every
time, however they asked — the client's pushback playbook in the knowledge base
(objection categories, each with counter strategies and scripts; served by
:mod:`application.services.pushback_knowledge`) was never consulted unless the
supplier had already said something.

This module is the bridge. It reads the supplier's own data and names the
knowledge-base categories that data makes LIKELY, with the reason in plain
words, by category key — the slug of the category's name in the document
("Tier 2 Supplier Pressure" → ``tier_2_supplier_pressure``). A key the loaded
document does not carry is skipped downstream. It decides nothing about wording
— the knowledge base holds the counters — and it never guesses: a category
appears only when a figure or flag on this supplier points at it. A category
with no signal is left out, which is the same rule the engine follows for its
own objections.

The reasons are NEGOTIATOR-facing. They may carry internal figures (DSO, the
cost impact, our actual payment days) because they explain why to prepare; they
are never wording for the supplier.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from domain.entities.analysis import NegotiationAnalysis
from domain.entities.facts import SupplierFacts, negotiation_ask_term

# An extension this long is a big enough ask that the supplier will want
# something back for it — volume, contract length — before agreeing.
LARGE_EXTENSION_DAYS = 30

# The ask lengthens the supplier's collection cycle by at least one 15-day step
# beyond what it runs at today. Complements the engine's "own operations"
# objection, which covers the opposite case (DSO already near the ask).
DSO_STRETCH_DAYS = 15

# Industry keywords → the knowledge-base categories that industry's economics
# make likely. Matched as whole words against the supplier's industry label.
_INDUSTRY_CATEGORIES: tuple[tuple[re.Pattern[str], tuple[tuple[str, str], ...]], ...] = (
    (
        re.compile(
            r"\b(food|foodservice|beverage|agri\w*|dairy|meat|grocer\w*|"
            r"chemical\w*|metal\w*|steel|plastic\w*|packaging|paper|energy|"
            r"oil|gas|mining|commodit\w*)\b",
            re.IGNORECASE,
        ),
        (
            ("raw_material_volatility", "buys commodity-priced inputs whose cost moves before it is paid"),
            ("inventory", "pays for stock up front and carries it until the invoice is settled"),
        ),
    ),
    (
        re.compile(
            r"\b(manufactur\w*|industrial\w*|automotive|electronic\w*|machinery|"
            r"equipment|components?|textiles?|apparel)\b",
            re.IGNORECASE,
        ),
        (
            ("inventory", "pre-funds raw material before production is paid for"),
            ("tier_2_supplier_pressure", "has to pay its own suppliers well before we pay it"),
        ),
    ),
    (
        re.compile(
            r"\b(software|technology|tech|pharma\w*|biotech\w*|medical|"
            r"semiconductor\w*|research)\b",
            re.IGNORECASE,
        ),
        (("r_and_d_reinvestment_cycle", "funds product development out of current sales"),),
    ),
)

_WEAK_RATING = re.compile(r"^\s*(BB|B|CCC|CC|C|D)(?![A-Z])", re.IGNORECASE)


@dataclass(frozen=True)
class LikelyObjection:
    """One knowledge-base category this supplier's data makes likely."""

    kb_key: str
    # Why THIS supplier may raise it — negotiator-facing, grounded in a figure
    # or flag on the supplier. Never wording for the supplier.
    likely_because: str


def scan_likely_objections(
    facts: SupplierFacts,
    analysis: NegotiationAnalysis | None = None,
) -> list[LikelyObjection]:
    """Every knowledge-base objection the data points to, strongest evidence first.

    One entry per category; when two signals point at the same category the
    first (stronger) reason is kept.
    """
    if analysis is None:
        from domain.services.negotiation_arguments import analyze_supplier
        analysis = analyze_supplier(facts)

    ask = negotiation_ask_term(facts)
    current = facts.current_term_days
    extension = ask - current if ask is not None and current is not None else None

    found: list[LikelyObjection] = []
    seen: set[str] = set()

    def add(kb_key: str, reason: str) -> None:
        if kb_key not in seen:
            seen.add(kb_key)
            found.append(LikelyObjection(kb_key, reason))

    # ── our own behaviour ─────────────────────────────────────────────────
    reliability = analysis.payment_reliability
    if reliability is not None and reliability.status == "behind_terms":
        add(
            "late_payments",
            f"We already pay them in {reliability.actual_payment_days} days on "
            f"average against {reliability.pay_on_terms_term_days}-day "
            "pay-on-terms, so they can say we are informally on longer terms "
            "already.",
        )

    # ── what the extension costs them ─────────────────────────────────────
    cost = analysis.cost_impact
    if cost is not None and cost.status == "material":
        add(
            "erosion_of_margins",
            f"The extension costs them about {cost.cost_impact_percent}% of "
            "invoice value — large enough to argue it eats their margin.",
        )
    sensitivity = analysis.financial_sensitivity
    if sensitivity is not None and sensitivity.level == "high":
        add(
            "erosion_of_margins",
            "Their financing costs are high, so every extra day of waiting "
            "costs them real money.",
        )

    # ── their collection cycle ────────────────────────────────────────────
    if facts.dso is not None and ask is not None and ask - facts.dso >= DSO_STRETCH_DAYS:
        add(
            "dso",
            f"Their DSO is {facts.dso} days; a {ask}-day term pushes it out by "
            f"{ask - facts.dso} days, which shows up in the KPIs they report on.",
        )

    # ── their balance sheet ───────────────────────────────────────────────
    if facts.credit_rating and _WEAK_RATING.match(facts.credit_rating):
        add(
            "bank_covenant",
            f"A {facts.credit_rating} credit rating usually comes with tight "
            "lender covenants on working capital and receivables.",
        )
    if facts.is_sme:
        add(
            "inventory",
            "They are an SME, with less financing headroom to carry a longer "
            "cash gap.",
        )

    # ── who needs whom ────────────────────────────────────────────────────
    leverage = analysis.leverage
    if leverage is not None and leverage.posture == "supplier_favored":
        add(
            "supplier_market_share",
            "Leverage sits with the supplier, so they can argue we need them "
            "more than they need us.",
        )
        add(
            "alternative_customer",
            "With leverage on their side, they can point to other customers "
            "who pay faster.",
        )

    # ── the size of the ask ───────────────────────────────────────────────
    if extension is not None and extension >= LARGE_EXTENSION_DAYS:
        add(
            "reciprocity_demand",
            f"A {extension}-day extension (from {current} to {ask} days) is a "
            "big ask; expect them to want volume or contract length in return.",
        )

    # ── their industry ────────────────────────────────────────────────────
    industry = facts.industry or ""
    for pattern, categories in _INDUSTRY_CATEGORIES:
        if pattern.search(industry):
            for key, economics in categories:
                add(key, f"As a {industry} business, it {economics}.")
            break

    # ── their market ──────────────────────────────────────────────────────
    if facts.country_rating and _WEAK_RATING.match(facts.country_rating):
        add(
            "currency_effect",
            f"A {facts.country_rating} country rating points to currency risk "
            "on money that arrives later.",
        )

    return found


def clear_checks(
    facts: SupplierFacts,
    analysis: NegotiationAnalysis | None = None,
) -> list[str]:
    """What the scan looked at and found NO pushback signal in — plain words.

    The other half of an honest "is that all?": a negotiator told there are no
    more objections needs to see that the supplier was actually scanned. Only
    checks with data behind them are listed; a figure we do not hold is never
    reported as clear. Each line names a reason the supplier will NOT push back,
    never an objection we cannot answer.
    """
    if analysis is None:
        from domain.services.negotiation_arguments import analyze_supplier
        analysis = analyze_supplier(facts)

    ask = negotiation_ask_term(facts)
    current = facts.current_term_days
    clear: list[str] = []

    reliability = analysis.payment_reliability
    if reliability is not None and reliability.status in ("on_or_before_terms", "minor_variance"):
        clear.append("Our payment record: we pay on or close to terms, so no late-payment complaint.")
    cost = analysis.cost_impact
    if cost is not None and cost.status == "limited":
        clear.append(
            f"Cost to them: about {cost.cost_impact_percent}% of invoice value, too small "
            "to carry a margin-erosion argument."
        )
    sensitivity = analysis.financial_sensitivity
    if sensitivity is not None and sensitivity.level == "low":
        clear.append("Their financing costs: low, so waiting longer for cash costs them little.")
    if facts.dso is not None and ask is not None and ask - facts.dso < DSO_STRETCH_DAYS:
        clear.append(f"Their DSO: {facts.dso} days, already close to the ask, so no KPI shock.")
    if facts.credit_rating and not _WEAK_RATING.match(facts.credit_rating):
        clear.append(f"Credit rating: {facts.credit_rating}, no sign of tight lender covenants.")
    if facts.company_size and not facts.is_sme:
        clear.append(f"Company size: {facts.company_size}, not an SME short of financing headroom.")
    leverage = analysis.leverage
    if leverage is not None and leverage.posture in ("buyer_favored", "balanced"):
        clear.append(
            "Leverage: not with the supplier, so a \"you need us more\" or "
            "\"other customers pay faster\" line has little behind it."
        )
    if ask is not None and current is not None and 0 < ask - current < LARGE_EXTENSION_DAYS:
        clear.append(
            f"Size of the ask: a {ask - current}-day extension is modest enough "
            "not to invite a demand for something in return."
        )
    industry = facts.industry or ""
    if industry and not any(pattern.search(industry) for pattern, _ in _INDUSTRY_CATEGORIES):
        clear.append(
            f"Industry: {industry} carries no commodity, inventory or R&D-funding pressure."
        )
    if facts.country_rating and not _WEAK_RATING.match(facts.country_rating):
        clear.append(f"Country rating: {facts.country_rating}, no currency-risk signal.")
    return clear
