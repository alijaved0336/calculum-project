"""Is there anything to negotiate at all? (§2)

Before any strategy is generated, one question is asked and answered
deterministically: does the ask actually improve on what we already have?

    Target Term <= Current Term           →  no improvement opportunity (blocked)
    0 < Target Term - Current Term < 15   →  thin opportunity (allowed, warned)

Only a target AT or BELOW the current terms closes the door (client,
2026-09-24). A target above them by less than ONE FULL STEP OF THE 15-day
ladder (:data:`TERM_HARMONISATION_STEP_DAYS`) is a real, if small, extension:
strategy is generated as normal, and the negotiator is shown a short warning
that the opportunity is thin (:func:`thin_opportunity_warning`). That warning is
a UI notice carried beside the response — never written into the playbook, the
email or any other generated text, which may go on to the supplier.

This replaced the 2026-08-25 rule (``Target Term - Current Term < 15`` →
blocked), which refused 60→70 outright alongside 90→90.

When the door is closed, no argument, no strategy and no playbook may be
produced. The negotiator is told plainly why, and — only when the data supports
one — offered a higher target to set instead.

Two different things can close the door, and they need different answers:

  * NO EXTENSION — the target sits on or below the current terms. The remedy is
    in the negotiator's hands: set a higher target, and the suggestion names one
    when a benchmark evidences it — one that clears a full 15-day step, so the
    suggestion is never itself a thin opportunity.
  * REGULATORY CAP — an APPLIED regulatory limit (``regulatoryTerm.applied``,
    see :func:`domain.entities.facts.regulatory_cap_days`) leaves less than a
    full step above the current terms, and the ask was capped down to them.
    Raising the target changes
    NOTHING here: the cap binds whatever number is set. Offering "set a higher
    target" against a legal ceiling is worse than saying nothing, so this case
    suppresses the suggestion entirely and names the cap instead.

This is a CODE decision, never a model one. A model handed a 90-day ask against
90-day current terms writes a confident playbook for a negotiation that does not
exist; that is the "it should be smart enough to say there is no improvement"
complaint, and no amount of prompt wording fixed it.
"""
from __future__ import annotations

from dataclasses import dataclass

from domain.entities.facts import (
    TERM_HARMONISATION_STEP_DAYS,
    SupplierFacts,
    harmonise_term_days,
    negotiation_ask_term,
    regulatory_cap_days,
)

# The smallest extension that is NOT thin: one full step of the 15-day ladder.
# A gap below it is still negotiated, but with a warning (see
# `thin_opportunity_warning`). Derived from the ladder rather than written as
# its own 15, because the reason the bar is 15 IS the ladder — every figure
# downstream (the BATNA, the suggested target, the concession ladder) is a
# multiple of the same step. Suggested targets must clear it in full.
MIN_IMPROVEMENT_DAYS = TERM_HARMONISATION_STEP_DAYS

# Why the door is closed. `None` while it is open.
BLOCKED_BY_NO_EXTENSION = "no_extension"
BLOCKED_BY_REGULATORY_CAP = "regulatory_cap"


@dataclass(frozen=True)
class ImprovementOpportunity:
    """The verdict, plus everything a surface needs to explain it."""

    has_opportunity: bool
    current_term_days: int | None
    ask_term_days: int | None
    # A target worth setting instead, when one is evidenced. None when no
    # benchmark clears the current term — in that case there is nothing to
    # suggest and none may be invented.
    suggested_target_days: int | None = None
    # The benchmark the suggestion came from, so the figure is never offered
    # without its source (P1).
    suggested_target_source: str | None = None
    # BLOCKED_BY_NO_EXTENSION or BLOCKED_BY_REGULATORY_CAP when the door is
    # closed; None when it is open. Surfaces need to tell the two apart: only
    # one of them can be fixed by setting a higher target.
    blocked_by: str | None = None
    # The applied regulatory ceiling, when one binds this negotiation at all —
    # carried whether or not it is what closed the door, so a surface can say
    # "capped at 60 days" without re-reading the facts.
    regulatory_cap_days: int | None = None
    message: str = ""
    # Set only while the door is OPEN but the ask clears the current terms by
    # less than a full 15-day step. A UI notice for the negotiator — never
    # written into generated text (see the module docstring).
    warning: str | None = None


def _suggested_target(facts: SupplierFacts) -> tuple[int | None, str | None]:
    """The highest benchmark above the current term, harmonised to the ladder.

    §2: "a higher target can only be suggested if a supporting benchmark exists
    above the current term", and the suggestion must itself follow the 15-day
    rule. Highest first — when we are proposing a NEW target rather than
    defending one, the strongest evidenced figure is the one worth reaching for.

    Harmonisation can pull a suggestion back down to the current term (a 34-day
    benchmark against a 30-day term harmonises to 30), or leave it inside the
    15-day step (a 70-day benchmark against 60-day terms). Neither is a
    suggestion — the first would be blocked by this very gate the moment the
    negotiator took it, the second would only be a thin opportunity — so both
    are dropped rather than offered.
    """
    current = facts.current_term_days
    if current is None:
        return None, None

    # An APPLIED regulatory ceiling bounds what may be suggested — and when it
    # leaves less than a full step above the current terms there is no legal
    # room for ANY usable higher target, so nothing is suggested at all (the
    # caller says why instead).
    cap = regulatory_cap_days(facts)
    if cap is not None and cap - current < MIN_IMPROVEMENT_DAYS:
        return None, None

    above = [
        b for b in facts.strategy_benchmarks
        if b.value is not None and b.value > current
    ]
    if not above:
        return None, None

    best = max(above, key=lambda b: b.value)
    harmonised = harmonise_term_days(int(best.value), cap=cap)
    if harmonised is None or harmonised - current < MIN_IMPROVEMENT_DAYS:
        return None, None
    return harmonised, best.label


def has_improvement_opportunity(facts: SupplierFacts | None) -> bool:
    """None-safe convenience wrapper around :func:`assess_improvement_opportunity`.

    ``True`` when ``facts`` is missing entirely — a missing context/figure is
    not evidence there is nothing to gain (see ``assess_improvement_opportunity``'s
    own docstring on unknown current/ask terms). Shared by the graph's routing
    gate (`agents.graph._has_improvement_opportunity`) and any other caller that
    needs the same yes/no verdict without the full :class:`ImprovementOpportunity`
    breakdown (e.g. the follow-up generator, which only needs to know whether a
    drafting/strategy suggestion is currently safe to make).
    """
    if facts is None:
        return True
    return assess_improvement_opportunity(facts).has_opportunity


def assess_improvement_opportunity(facts: SupplierFacts) -> ImprovementOpportunity:
    """Whether this negotiation has anywhere to go.

    ``has_opportunity`` is False when the ask does not improve on the current
    terms at all — ``Target Term <= Current Term`` (§2, client 2026-09-24):
    an ask BELOW the current terms, or EQUAL to them (the 90→90 case the client
    called out by name).

    An ask above the current terms by less than one step of the ladder every
    term in this product is harmonised to (:data:`MIN_IMPROVEMENT_DAYS`) keeps
    the door open and sets ``warning`` instead.

    An unknown current term or an unknown ask is NOT treated as "no
    opportunity": we cannot show that there is nothing to gain, so the normal
    path runs and the missing figure surfaces on its own.

    An APPLIED regulatory cap that leaves less than a step above the current
    term reaches the same verdict through the same comparison — the ask was
    already pulled down to the cap when the facts were built — but is reported
    as its own
    ``blocked_by`` reason, because it is the one case a higher target cannot
    fix.
    """
    current = facts.current_term_days
    ask = negotiation_ask_term(facts)
    cap = regulatory_cap_days(facts)

    if current is None or ask is None or ask > current:
        return ImprovementOpportunity(
            has_opportunity=True,
            current_term_days=current,
            ask_term_days=ask,
            regulatory_cap_days=cap,
            warning=_thin_opportunity_message(current=current, ask=ask),
        )

    # A binding cap that leaves less than a full step above the current terms is
    # what closed the door, whatever the target happens to say: the ask was
    # pulled down to the cap at the payload boundary, and any target the
    # negotiator sets will be pulled down the same way.
    capped_out = cap is not None and cap - current < MIN_IMPROVEMENT_DAYS
    suggested, source = _suggested_target(facts)

    if capped_out:
        lead, tail = _regulatory_message(current=current, cap=cap)
    else:
        lead = _no_extension_lead(current=current, ask=ask)
        tail = _no_extension_tail(current=current, suggested=suggested, source=source)

    return ImprovementOpportunity(
        has_opportunity=False,
        current_term_days=current,
        ask_term_days=ask,
        suggested_target_days=suggested,
        suggested_target_source=source,
        blocked_by=(
            BLOCKED_BY_REGULATORY_CAP if capped_out else BLOCKED_BY_NO_EXTENSION
        ),
        regulatory_cap_days=cap,
        message=lead + tail,
    )


def thin_opportunity_warning(facts: SupplierFacts | None) -> str | None:
    """The negotiator-facing warning for a thin opportunity, or None.

    None-safe like :func:`has_improvement_opportunity`. Returns None when the
    door is closed (the block message says everything) or the gap is a full
    15-day step or more.
    """
    if facts is None:
        return None
    return assess_improvement_opportunity(facts).warning


def _thin_opportunity_message(*, current: int | None, ask: int | None) -> str | None:
    """"Only N days above" — said as a caution, never as a refusal."""
    if current is None or ask is None:
        return None
    gap = ask - current
    if not 0 < gap < MIN_IMPROVEMENT_DAYS:
        return None
    return (
        f"Small opportunity: the {ask}-day target is only {gap} "
        f"day{'s' if gap != 1 else ''} above the current {current}-day terms, "
        f"less than one {MIN_IMPROVEMENT_DAYS}-day step. There is little to "
        "gain from this negotiation."
    )


def _no_extension_lead(*, current: int, ask: int) -> str:
    """The two shapes of "nothing to negotiate", each said in its own words:
    the terms already match, or the target moves us backwards."""
    if ask == current:
        return (
            f"There is no improvement opportunity here: the target and the "
            f"current payment terms are both {current} days, so there is "
            "nothing to negotiate."
        )
    return (
        f"There is no improvement opportunity here: the {ask}-day target is "
        f"below the {current}-day payment terms we already have, so pursuing "
        "it would move us backwards."
    )


def _no_extension_tail(*, current: int, suggested: int | None, source: str | None) -> str:
    if suggested is not None:
        return (
            f" If you want to open a negotiation with this supplier, set a "
            f"higher target first — the {source} sits above our current terms "
            f"and supports a target of {suggested} days."
        )
    return (
        " No benchmark for this supplier sits above our current terms, so "
        "there is no evidence to support a higher target either. Nothing "
        "here justifies opening a negotiation. If you still want to use the "
        "playbook, opening strategy, email and pushback features, set the "
        f"target to {_next_step_above(current)} days or more."
    )


def _next_step_above(current: int) -> int:
    """The smallest target that opens the gate: the next 15-day step above
    ``current``. A number in between would be harmonised back onto the ladder —
    91-day terms need 105, because a 95 is stored as 90."""
    step = TERM_HARMONISATION_STEP_DAYS
    return (current // step + 1) * step


def _regulatory_message(*, current: int, cap: int) -> tuple[str, str]:
    """What to say when an APPLIED regulatory limit is what closed the door.

    Never offers a higher target. The cap applies to whatever target is set, so
    "set a higher target first" — the right advice in every other blocked
    case — would send the negotiator after a number the system will pull
    straight back down to the cap.

    Three shapes, like the no-extension message: the cap sits just above our
    terms (real room, but less than one 15-day step), exactly on them, or below
    them. The last is a different situation again: our existing terms are
    already longer than the regulation allows. That is a compliance matter to
    raise internally, not a negotiation to open, and the message says so rather
    than implying we could extend further.
    """
    if current < cap:
        room = cap - current
        lead = (
            f"There is no improvement opportunity here: an applicable "
            f"regulatory limit caps payment terms for this supplier at "
            f"{cap} days, only {room} day{'s' if room != 1 else ''} above our "
            f"current {current}-day terms."
        )
        tail = (
            f" Payment terms move in {MIN_IMPROVEMENT_DAYS}-day steps, so the "
            "cap leaves no room for a target worth negotiating — and setting a "
            "higher one won't change that, because the cap applies to whatever "
            "target is set."
        )
        return lead, tail

    if cap < current:
        lead = (
            f"There is no improvement opportunity here: an applicable "
            f"regulatory limit caps payment terms for this supplier at "
            f"{cap} days, and our current terms of {current} days are already "
            "longer than that."
        )
        tail = (
            " Extending further isn't available — the limit applies whatever "
            "target is set. This gap between our terms and the regulatory "
            "limit is worth raising with legal or compliance rather than with "
            "the supplier."
        )
        return lead, tail

    lead = (
        f"There is no improvement opportunity here: an applicable regulatory "
        f"limit caps payment terms for this supplier at {cap} days, which is "
        f"exactly where our current terms already sit."
    )
    tail = (
        " Setting a higher target won't change this — the cap applies to "
        "whatever target is set, so there is no room to extend and nothing to "
        "put to the supplier."
    )
    return lead, tail
