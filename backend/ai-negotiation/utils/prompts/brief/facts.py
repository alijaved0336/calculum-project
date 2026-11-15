"""The FACTS block — one renderer, three levels.

Seven prompts carried their own ``_facts_block``, each with a hand-maintained
tuple of the fields it quoted (``_SUMMARY_FACT_FIELDS``, ``_PUSHBACK_FACT_FIELDS``,
...) so the UI's source-attribution panel could say where each figure came from.
Two lists per surface, kept in step by hand, and they had drifted: DSO reached
the opening prompt and no other, the regulatory limit type reached one, and a
couple of attribution tuples named fields their own block never rendered — so
the panel claimed provenance for numbers the model could not have used.

Here the line and the fields it quotes are declared together, once
(:class:`FactLine`), and the levels are built from those declarations. A
surface picks a LEVEL; :func:`render_facts` renders it and :func:`fact_fields`
returns exactly the fields that were rendered. They cannot drift because
neither is written by hand.

Levels are nested — MINIMAL ⊂ STANDARD ⊂ FULL:

  * :data:`LEVEL_MINIMAL`  — who, what we pay now, what we are asking, what it
    is worth, and the four signals that say how the ask is likely to be
    received: buyer leverage, the credit rating, supplier size and the upstream
    success probability. What a drafting surface needs to write a sentence AND
    to judge how firmly to write it. Those four used to reach the drafting
    surfaces only as scored factors inside a negotiating-strength block; that
    composite is gone (client, 2026-08-20) and they are rendered as the plain
    facts they always were, so no surface lost the signal with it.
  * :data:`LEVEL_STANDARD` — plus the SME flag and the remaining profile
    signals.
  * :data:`LEVEL_FULL`     — every figure the payload carries. For the surfaces
    that answer "what do we know?" and must be able to enumerate.

Benchmark figures deliberately stop at STANDARD: they are ARGUMENTS, and they
are rendered as arguments, in precedence order with their disclosure rules, by
:mod:`utils.prompts.brief.arguments`. A drafting surface that also saw them as a
flat FACTS list got the same numbers twice, in two different orders.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable

from domain.entities.brief import NegotiationBrief
from domain.entities.facts import SupplierFacts, regulatory_recommendation_days
from utils.constants import format_camel_label
from utils.prompts.brief.success_probability import LABEL as SUCCESS_PROBABILITY_LABEL

# A buyer-standard limit of these types is a guardrail rather than a benchmark.
_HARD_LIMIT_TYPES = frozenset({"HARD", "MAX"})
# Past this, the payload's age is worth a caveat of its own.
_STALE_DATA_DAYS = 90

FACTS_HEADING = "## FACTS — quote exactly, do not recompute"
INTERNAL_HEADING = (
    "## INTERNAL FIGURES — negotiator-only; never suggest stating these to the supplier"
)

LEVEL_MINIMAL = "minimal"
LEVEL_STANDARD = "standard"
LEVEL_FULL = "full"

_LEVEL_ORDER = (LEVEL_MINIMAL, LEVEL_STANDARD, LEVEL_FULL)


@dataclass(frozen=True)
class FactLine:
    """One line of the block, together with the facts it quotes.

    ``fields`` is what makes the source panel honest: it is the set of
    ``SupplierFacts`` attributes this line can put in front of the model, so
    attribution is derived from the same declaration that produced the text.
    """

    render: Callable[[SupplierFacts], str | None]
    fields: tuple[str, ...] = ()
    # Which level this line first appears at.
    level: str = LEVEL_MINIMAL
    # True for the buyer-internal economics, which render under their own
    # heading rather than mixed in with the quotable facts.
    internal: bool = False
    # An extra brief-level condition. Used for the SCF rate, which must be
    # FAIL-CLOSED: a caller who says nothing about SCF gets a brief with
    # `scf_enabled=False`, and the concept never surfaces — not even as "N/A".
    gate: Callable[[NegotiationBrief], bool] | None = None


def _fmt_rate(value: float | None) -> str:
    return f"{value * 100:.2f}%" if value is not None else "N/A"


def format_money(value: float | int | None) -> str:
    """A money figure the way a negotiator reads one aloud: ``$37.54M``.

    Raw amounts reached the prompt unformatted, so the model rendered them
    digit-for-digit — "$37,544,807" against "$2,195,377" in the same summary.
    Nine digits carry no more meaning than three here (nobody negotiates on the
    last $807) and they cost the reader the comparison, which is the whole
    reason the two figures are next to each other.

    Scaled to the largest unit that leaves a number under four digits, two
    decimals from a million up, none below: ``$1.20B`` / ``$37.54M`` /
    ``$850K`` / ``$412``. Negatives keep their sign.
    """
    if value is None:
        return "N/A"
    sign = "-" if value < 0 else ""
    amount = abs(float(value))
    if amount >= 1_000_000_000:
        return f"{sign}${amount / 1_000_000_000:.2f}B"
    if amount >= 1_000_000:
        return f"{sign}${amount / 1_000_000:.2f}M"
    if amount >= 1_000:
        return f"{sign}${amount / 1_000:.0f}K"
    return f"{sign}${amount:,.0f}"


def _money(label: str, name: str) -> Callable[[SupplierFacts], str | None]:
    """An `_optional` line whose figure is money — rendered compact."""
    def render(facts: SupplierFacts) -> str | None:
        value = getattr(facts, name, None)
        if value is None:
            return None
        return f"- {label}: {format_money(value)}"
    return render


def _level(label: str, name: str) -> Callable[[SupplierFacts], str | None]:
    """An `_optional` line whose figure is a rating word ("high"/"LOW"/...).

    The upstream payload is inconsistent about case (see
    :func:`domain.services.negotiation_arguments.normalise_level`), so this
    Title-Cases the value before it reaches the model — the FACTS block tells
    the model to quote figures exactly, and a raw "high" quoted exactly stays
    lower-case in the negotiator-facing output.
    """
    def render(facts: SupplierFacts) -> str | None:
        value = getattr(facts, name, None)
        if value is None:
            return None
        return f"- {label}: {format_camel_label(str(value))}"
    return render


def _optional(label: str, name: str, suffix: str = "") -> Callable[[SupplierFacts], str | None]:
    """A line that is skipped entirely when its figure is absent.

    Absent lines are dropped rather than printed as ``None``: a "give me
    everything" request should enumerate what is actually known, and a brief
    padded with null rows teaches the model that a missing figure is a value.
    """
    def render(facts: SupplierFacts) -> str | None:
        value = getattr(facts, name, None)
        if value is None:
            return None
        return f"- {label}: {value}{suffix}"
    return render


# ── The lines ──────────────────────────────────────────────────────────────


def _identity(facts: SupplierFacts) -> str:
    return (
        f"- Supplier: {facts.supplier_name} ({facts.country}, {facts.industry}, "
        f"{facts.company_size})"
    )


def _sme(facts: SupplierFacts) -> str:
    return f"- SME: {'yes' if facts.is_sme else 'no'}"


def _regulatory(facts: SupplierFacts) -> str | None:
    """The regulatory line, in the three states the payload can be in.

    APPLIED is the only one that changes the negotiation: the limit has capped
    the target, and the model is told to present the ask as aligned with it
    rather than to argue from it. A regulation that is present but NOT applied
    is reference material — informational only — and the line says so outright,
    because a bare "regulatory limit: 60 days" is an invitation to cite a cap
    that does not bind anything.

    The limit type (NONE / ONLY_EXCEPTIONS / ALL) is shown for context only. It
    is never the decision: `regulatory_applied` already carries the upstream
    system's resolution of it (see
    :func:`domain.entities.facts.regulatory_cap_days`).
    """
    limit = (
        f" (limit type: {facts.regulatory_limit_type})"
        if facts.regulatory_limit_type
        else ""
    )
    if facts.regulatory_applied and facts.regulatory_max_term_days is not None:
        kind = "enforced by law" if facts.regulatory_enforced else "regulatory guidance"
        return (
            f"- Regulatory cap APPLIED: {facts.regulatory_max_term_days} days"
            f"{limit} — {kind}. The target has been capped to this limit; present "
            "the ask as aligned with applicable regulatory requirements, never "
            "above it."
        )
    if regulatory_recommendation_days(facts) is not None:
        return (
            f"- Regulatory recommendation, NOT applied: "
            f"{facts.regulatory_max_term_days} days{limit} — a government "
            "recommendation, not a statutory cap. It does not cap the target, and "
            "payment terms can legally be set beyond it by mutual agreement; "
            "never present it as a limit."
        )
    if facts.regulatory_max_term_days is not None or facts.regulatory_limit_type:
        reference = (
            f"{facts.regulatory_max_term_days} days"
            if facts.regulatory_max_term_days is not None
            else "no figure"
        )
        return (
            f"- Regulatory reference, NOT applied: {reference}{limit} — "
            "informational only. It does not cap the target and is not a "
            "negotiation argument; do not cite it."
        )
    return None


def _leverage(facts: SupplierFacts) -> str:
    """OUR leverage, and only ours.

    The supplier's rating used to sit on this line too. Handed both, the model
    narrated the pair — "both buyer and supplier leverage are Medium, creating a
    balanced but difficult environment" — which is an observation the negotiator
    cannot act on, drawn from a rating that no longer scores anything.
    """
    return f"- Buyer Leverage: {format_camel_label(facts.buyer_leverage_level or '')}"


def _ratings(facts: SupplierFacts) -> str | None:
    """Whichever ratings the payload actually carries.

    Both on one line when both exist, but never "Credit Rating: B- / Country
    Rating: None" — a printed None reads as a value, and the whole point of
    scoring an unknown factor at zero is that it is not one.
    """
    parts = []
    if facts.credit_rating is not None:
        parts.append(f"Credit Rating: {facts.credit_rating}")
    if facts.country_rating is not None:
        parts.append(f"Country Rating: {facts.country_rating}")
    return f"- Ratings — {' / '.join(parts)}" if parts else None




def _segment_peers(facts: SupplierFacts) -> str | None:
    """Also known, in the catalog and the UI, as "Supplier Standard" — the
    negotiator's own name for this figure. Rendered under that name here too
    (rather than a paraphrase like "supplier-segment peers") so a factual
    question using the name the user actually sees resolves to this line
    regardless of phrasing. Internal-only per the catalog's disclosure_note
    for ``supplierStandard``: the negotiator sees it, the supplier never does.
    """
    if facts.supplier_segment_term_days is None:
        return None
    return (
        f"- Supplier Standard (this supplier's own segment, avg "
        f"{facts.supplier_segment_avg_term_days}, q3 {facts.supplier_segment_q3_term_days}, "
        f"n={facts.supplier_segment_occurrences}): {facts.supplier_segment_term_days} days "
        "— internal only, never state to the supplier unless disclosure is explicitly permitted"
    )


def _peer_group(facts: SupplierFacts) -> str | None:
    """Also known, in the catalog and the UI, as "Peer Group Standard" —
    rendered under that name here too, for the same reason as
    :func:`_segment_peers`.
    """
    if facts.peer_group_term_days is None:
        return None
    return (
        f"- Peer Group Standard: {facts.peer_group_term_days} days "
        f"(avg {facts.peer_group_avg_term_days}, q3 {facts.peer_group_q3_term_days}, "
        f"n={facts.peer_group_occurrences})"
    )


def _buyer_standard(facts: SupplierFacts) -> str | None:
    """The buyer's own standard term, and whether it is a GUARDRAIL.

    The limit type used to reach a prompt only folded into a risk grade — a
    "HARD"/"MAX" type pushed the risk level to high and the reason was one clause
    in that rationale. The grade is gone (client, 2026-08-20); the distinction it
    was carrying is not, so it is stated here, where the term it qualifies is.
    """
    if facts.buyer_standard_term_days is None:
        return None
    description = (
        f" ({facts.buyer_standard_description})" if facts.buyer_standard_description else ""
    )
    limit = ""
    if facts.buyer_standard_limit_type:
        limit_type = facts.buyer_standard_limit_type.upper()
        guardrail = (
            " — an internal GUARDRAIL, not a benchmark to argue past"
            if limit_type in _HARD_LIMIT_TYPES else ""
        )
        limit = f" [limit type: {facts.buyer_standard_limit_type}{guardrail}]"
    return (
        f"- Buyer standard term: {facts.buyer_standard_term_days} days"
        f"{description}{limit}"
    )


def _protected(facts: SupplierFacts) -> str | None:
    """Any protected-business designation the payload carries.

    Named individually rather than as a single "protected" boolean: which
    designation applies is what a negotiator adjusts for.
    """
    designations = [
        format_camel_label(name).lower()
        for name, flag in sorted(facts.protected_flags.items())
        if flag
    ]
    if not designations:
        return None
    return (
        "- Protected-business designation: " + ", ".join(designations)
        + ". Weigh this when deciding how hard to press."
    )


def _data_age(facts: SupplierFacts) -> str | None:
    """How old the payload is, when it is old enough to matter.

    Under the threshold nothing is printed: "supplier data is 3 days old" is
    noise, and a line that always renders stops being read.
    """
    if not facts.updated_at:
        return None
    try:
        updated = datetime.fromisoformat(facts.updated_at.replace("Z", "+00:00"))
    except ValueError:
        return None
    age_days = (datetime.now(timezone.utc) - updated).days
    if age_days <= _STALE_DATA_DAYS:
        return None
    return (
        f"- Supplier data is {age_days} days old — treat every figure above with "
        f"reduced confidence, and say so when the answer turns on one."
    )


def _rate(label: str, name: str) -> Callable[[SupplierFacts], str | None]:
    def render(facts: SupplierFacts) -> str | None:
        value = getattr(facts, name, None)
        return None if value is None else f"- {label}: {_fmt_rate(value)}"
    return render


_LINES: tuple[FactLine, ...] = (
    FactLine(_identity, ("supplier_name", "country", "industry", "company_size")),
    FactLine(_sme, ("is_sme",), level=LEVEL_STANDARD),
    FactLine(_protected, ("protected_flags",), level=LEVEL_STANDARD),
    FactLine(_optional("Current agreed term", "current_term_days", " days"),
             ("current_term_days",)),
    # `regulatory_applied` is deliberately NOT listed: it decides the WORDING of
    # this line, but it is a bool, and every field named here that is not None
    # becomes a row in the source panel — so listing it would put a
    # "Regulatory Limit Applied: False" row in front of every negotiator whose
    # supplier has no regulation at all. The figure and the limit type are what
    # gets traced.
    FactLine(_regulatory, ("regulatory_max_term_days", "regulatory_limit_type")),

    FactLine(_leverage, ("buyer_leverage_level",)),
    # The upstream read on whether the ask lands. Internal, and at MINIMAL:
    # it replaced a scored composite that every advice surface used to be
    # handed (client, 2026-08-20), so no surface that renders facts may lose
    # the signal — see `utils.prompts.brief.success_probability`.
    FactLine(_level(SUCCESS_PROBABILITY_LABEL, "success_probability"),
             ("success_probability",), internal=True),
    FactLine(_ratings, ("credit_rating", "country_rating")),

    FactLine(_optional("Opportunity term", "opportunity_term_days", " days"),
             ("opportunity_term_days",), level=LEVEL_FULL),
    FactLine(_optional("Industry/region benchmark", "benchmark_term_days", " days"),
             ("benchmark_term_days",), level=LEVEL_FULL),
    FactLine(_optional("Pay-on-terms figure", "pay_on_terms_term_days", " days"),
             ("pay_on_terms_term_days",), level=LEVEL_FULL),
    FactLine(_buyer_standard,
             ("buyer_standard_term_days", "buyer_standard_description",
              "buyer_standard_limit_type"),
             level=LEVEL_FULL),
    FactLine(_segment_peers,
             ("supplier_segment_term_days", "supplier_segment_avg_term_days",
              "supplier_segment_q3_term_days", "supplier_segment_occurrences"),
             level=LEVEL_FULL),
    FactLine(_peer_group,
             ("peer_group_term_days", "peer_group_avg_term_days",
              "peer_group_q3_term_days", "peer_group_occurrences"),
             level=LEVEL_FULL),
    FactLine(_optional(
        "DSO (the SUPPLIER's own receivables / cash-collection cycle)", "dso", " days"),
        ("dso",), level=LEVEL_FULL),
    FactLine(_data_age, ("updated_at",), level=LEVEL_STANDARD),

    # ── buyer-internal economics ──────────────────────────────────────────
    FactLine(_money("Spend volume on this supplier", "spend_volume"),
             ("spend_volume",), internal=True),
    FactLine(_money("Cash-flow unlock at the target term", "target_cash_flow"),
             ("target_cash_flow",), internal=True),
    FactLine(_rate("Supplier's own financing rate", "supplier_financing_rate"),
             ("supplier_financing_rate",), level=LEVEL_FULL, internal=True),
    FactLine(_rate("Cost of debt spread", "cost_of_debt_spread"),
             ("cost_of_debt_spread",), level=LEVEL_FULL, internal=True),
    FactLine(_rate("Supplier WACC pre-tax", "wacc_pre_tax"),
             ("wacc_pre_tax",), level=LEVEL_FULL, internal=True),
    FactLine(_rate("Supplier WACC after-tax", "wacc_after_tax"),
             ("wacc_after_tax",), level=LEVEL_FULL, internal=True),
    # `scf_policy._sanitize_facts` normally strips scf_rate before any node
    # runs, but a prompt builder must not DEPEND on that: the gate makes the
    # default (no SCF stated anywhere) the safe one.
    FactLine(_rate("SCF rate", "scf_rate"), ("scf_rate",),
             level=LEVEL_FULL, internal=True,
             gate=lambda brief: brief.scf_enabled),
)


def _at_level(level: str) -> list[FactLine]:
    depth = _LEVEL_ORDER.index(level)
    return [line for line in _LINES if _LEVEL_ORDER.index(line.level) <= depth]


# ── The ask, which every surface labels in its own terms ───────────────────


def _ask_lines(brief: NegotiationBrief, ask_label: str) -> list[str]:
    facts = brief.facts
    approved = " (the negotiator's approved target)" if facts.target_is_user_set else ""
    return [f"- {ask_label}: {facts.target_term_days} days{approved}"]


def _floor_line(brief: NegotiationBrief, internal: bool) -> list[str]:
    """The BATNA, marked INTERNAL where the surface drafts to the supplier.

    It is the computed reserve floor, NOT a raw benchmark — a model that equates
    it with the industry benchmark will quote one as the other.
    """
    floor = brief.batna_floor
    if floor is None:
        return []
    marker = "[INTERNAL ONLY, do not state to the supplier] " if internal else ""
    note = f" — {brief.batna_note}" if brief.batna_note else ""
    return [
        f"- {marker}BATNA (computed reserve floor — the term "
        f"the buyer will not concede below): {floor} days{note}"
    ]


def render_facts(
    brief: NegotiationBrief | None,
    *,
    level: str = LEVEL_STANDARD,
    heading: str = FACTS_HEADING,
    ask_label: str = "Target term",
    include_floor: bool = False,
    floor_internal: bool = False,
) -> str:
    """The FACTS block for one surface."""
    if brief is None or brief.facts is None:
        return ""
    facts = brief.facts
    lines = [heading]
    internal: list[str] = []
    for line in _at_level(level):
        if line.gate is not None and not line.gate(brief):
            continue
        text = line.render(facts)
        if text is None:
            continue
        (internal if line.internal else lines).append(text)
        # The ask and the floor sit immediately after the current term, where
        # they mean something, rather than wherever the field order puts them.
        if text.startswith("- Current agreed term"):
            lines += _ask_lines(brief, ask_label)
            if include_floor:
                lines += _floor_line(brief, floor_internal)
    if internal:
        lines += ["", INTERNAL_HEADING, *internal]
    return "\n".join(lines)


def fact_fields(level: str = LEVEL_STANDARD) -> tuple[str, ...]:
    """Exactly the ``SupplierFacts`` attributes :func:`render_facts` can quote
    at this level — the input to the source-attribution panel.

    Derived from the same declarations that produce the text, so a field cannot
    be attributed unless the block actually renders it.
    """
    names: list[str] = ["target_term_days"]
    for line in _at_level(level):
        for name in line.fields:
            if name not in names:
                names.append(name)
    return tuple(names)


def collect_fact_sources(
    brief: NegotiationBrief | None, level: str = LEVEL_STANDARD
) -> dict[str, dict[str, object]]:
    """Each rendered fact mapped to the payload path it was extracted from.

    Feeds the panel that lets a negotiator — or an auditor — trace any figure in
    a reply back to its origin. Only facts the block ACTUALLY rendered are
    attributed: a field with no value is skipped here exactly as it is skipped
    there, so the panel never claims provenance for a number the model could not
    have quoted.

    It takes the BRIEF, not bare facts, for one reason: the gated lines. The
    renderer hides the SCF rate unless the turn enables SCF, and a collector
    working from facts alone would attribute a figure the model was never
    shown. Passing the same object to both is what makes that impossible rather
    than merely unlikely.

    Surfaces layer their own non-scalar attributions (the applied benchmark, the
    opening anchor) on top of this.
    """
    from utils.constants import format_source_label

    if brief is None or brief.facts is None:
        return {}
    facts = brief.facts
    shown = {
        name
        for line in _at_level(level)
        if line.gate is None or line.gate(brief)
        for name in line.fields
    }
    shown.add("target_term_days")
    return {
        format_source_label(name): {
            "path": facts.source_paths[name],
            "value": getattr(facts, name, None),
        }
        for name in fact_fields(level)
        if name in shown
        and name in facts.source_paths and getattr(facts, name, None) is not None
    }
