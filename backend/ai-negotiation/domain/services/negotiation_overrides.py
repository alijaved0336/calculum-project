from __future__ import annotations

from dataclasses import replace

from domain.entities.context import SupplierContext
from domain.entities.facts import (
    SupplierFacts,
    harmonise_term_days,
    regulatory_cap_days,
)
from domain.entities.overrides import NegotiationOverrides
from domain.services.negotiation_arguments import build_argument_analysis
from domain.services.opening_strategy_analysis import analyze_opening_strategy


def _rescale_target_cash_flow(facts: SupplierFacts, new_target: int) -> float | None:
    """The cash-flow unlock at ``new_target``, re-derived so it never lags the
    target the negotiator actually set.

    The unlock is ~linear in the extension length (a DPO working-capital model),
    so we scale the upstream figure by the ratio of the new extension to the
    original one — keeping it anchored to Calculum's number while responding to
    the override. Falls back to a plain DPO estimate from spend, or ``None`` when
    there isn't enough to compute from.
    """
    current = facts.current_term_days
    if current is None:
        return facts.target_cash_flow  # no baseline to measure an extension from

    new_extension = new_target - current
    base_cf = facts.target_cash_flow
    base_target = facts.target_term_days
    if base_cf is not None and base_target is not None and base_target != current:
        return round(base_cf * new_extension / (base_target - current))
    if facts.spend_volume is not None:
        return round(facts.spend_volume * new_extension / 365.0)
    return base_cf


def resolve_overridden_context(
    context: SupplierContext | None, overrides: NegotiationOverrides
) -> SupplierContext | None:
    """Return a context with the negotiator's target/BATNA overrides applied.

    The base ``context`` is the CALCULATED default computed once at session start.
    This bakes the session overrides into ``facts`` and then rebuilds both Tier-2
    bundles and ``opening_strategy`` from those patched facts — so ``facts`` stays
    the single source of truth and EVERYTHING derived from the target or BATNA
    (cash-flow unlock, argument buckets, benchmark citability, the BATNA
    wherever it is recomputed, priority, opening strategy) re-derives from the new
    numbers instead of comparing against stale ones.

      * **Target override** → replaces the target term AND the ask
        (``opportunity_term_days``), marks the target user-set, and re-derives the
        cash-flow unlock for the new extension.
      * **BATNA override** → sets ``batna_override_days`` so
        ``resolve_effective_batna`` returns it everywhere.
      * **Target override with NO BATNA override** → the BATNA is NOT pinned;
        it RECOMPUTES from the new target's benchmark band (product decision,
        2026-07-19 — "recompute everything related to target"). Only an explicit
        BATNA override freezes the floor.

    Returns ``context`` unchanged when there is nothing to override or the context
    is not fully built.
    """
    if context is None or context.facts is None or not overrides.has_any:
        return context

    patches: dict[str, object] = {}

    if overrides.target_term_days is not None:
        # Harmonised like every other target that enters the system (71 → 75),
        # so an override cannot be the one path that puts a non-multiple-of-15
        # ask on the table. Applied here rather than only in the node that
        # stores it because THIS is the single funnel every override passes
        # through on its way into facts; `harmonise_term_days` is idempotent, so
        # a value already rounded by the node comes through unchanged.
        new_target = harmonise_term_days(
            int(overrides.target_term_days),
            cap=regulatory_cap_days(context.facts),
        )
        patches["target_term_days"] = new_target
        patches["opportunity_term_days"] = new_target
        patches["target_is_user_set"] = True
        patches["target_cash_flow"] = _rescale_target_cash_flow(context.facts, new_target)

    # Only an EXPLICIT BATNA override freezes the floor. With no BATNA
    # override, the BATNA is left to recompute from facts (from the new target
    # band when the target changed) — nothing stays anchored to the old target.
    if overrides.batna_term_days is not None:
        patches["batna_override_days"] = int(overrides.batna_term_days)

    facts = replace(context.facts, **patches)
    argument_analysis = build_argument_analysis(facts)
    return replace(
        context,
        facts=facts,
        argument_analysis=argument_analysis,
        opening_strategy=analyze_opening_strategy(facts, argument_analysis),
    )
