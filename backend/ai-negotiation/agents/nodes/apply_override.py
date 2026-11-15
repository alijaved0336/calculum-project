from __future__ import annotations

import logging
from typing import Any

from agents.state import NegotiationState, NodeFn
from application.services.override_store import (
    clear,
    get_overrides,
    set_target,
    set_batna,
)
from domain.entities.facts import (
    TERM_HARMONISATION_STEP_DAYS,
    harmonise_term_days,
    regulatory_cap_days,
)
from domain.ports.llm_port import LLMPort
from domain.services.context_builder import build_supplier_context
from domain.services.improvement_opportunity import thin_opportunity_warning
from domain.services.negotiation_overrides import resolve_overridden_context
from utils.json_extract import extract_first_json_object
from utils.prompts.apply_override_prompt import (
    apply_override_extraction_system_prompt,
    build_apply_override_extraction_prompt,
)

logger = logging.getLogger(__name__)

_RULE = "-" * 88

# Guardrails on any override value the negotiator supplies. A payment term
# outside this band is almost certainly a misparse, not a real instruction.
_MIN_TERM_DAYS = 1
_MAX_TERM_DAYS = 365

_MISSING_CONTEXT = (
    "I don't have supplier data loaded for this session yet, so I can't change "
    "the target or BATNA for this supplier."
)
_UNCLEAR = (
    "I can set or reset the **target** term or the **BATNA** "
    "for this supplier. Tell me the number of days — e.g. \"target 85 days\" or "
    "\"set the BATNA to 55\" — or say \"reset the target to the default\" to go "
    "back to the calculated values."
)


def _as_int(value: object) -> int | None:
    try:
        if value is None or isinstance(value, bool):
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _parse(raw: str) -> dict[str, Any]:
    data = extract_first_json_object(raw)
    if data is None:
        logger.warning("apply_override: no valid extraction JSON: %r", raw)
        return {"action": "unclear"}
    return data


def _fmt(days: int | None) -> str:
    return f"{days} days" if days is not None else "not set"


def make_apply_override_node(llm: LLMPort) -> NodeFn:
    """Build the `apply_override` node.

    The negotiator can override the calculated TARGET and/or BATNA term for
    this supplier ("let's target 85 days", "set our BATNA to 55"), or revert
    to the calculated defaults ("reset the target"). Overrides persist for the
    rest of the session (see `application.services.override_store`) and are
    applied to every intent's context by `resolve_overridden_context`.

    One LLM call extracts the structured request; all validation and the
    confirmation wording are deterministic here, so the numbers are exact and no
    supplier-facing text is ever produced (this is negotiator-only config).
    """

    async def apply_override_node(state: NegotiationState) -> dict[str, Any]:
        context = state.get("context")
        if context is None or context.facts is None or context.raw is None:
            logger.warning("apply_override: missing supplier context")
            return {"response": _MISSING_CONTEXT, "errors": ["apply_override: missing context"]}

        session_id = state.get("session_id") or ""
        if not session_id:
            logger.warning("apply_override: missing session_id")
            return {"response": _MISSING_CONTEXT, "errors": ["apply_override: missing session_id"]}

        # The CALCULATED defaults (no overrides) — the baseline for validation,
        # for stating what the recommendation was, and for reset confirmations.
        base = build_supplier_context(context.raw)
        current = base.facts.current_term_days
        base_target = base.facts.target_term_days
        base_batna = _batna_floor(base)

        message = state.get("message", "")
        prompt = build_apply_override_extraction_prompt(
            message, base.facts, state.get("conversation_history")
        )

        try:
            raw = await llm.complete(
                prompt,
                system=apply_override_extraction_system_prompt,
                temperature=0,
                enable_thinking=False,
                stream_to_client=False,
            )
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("apply_override: extraction failed")
            return {"response": None, "errors": [f"apply_override: {exc}"]}

        data = _parse(raw)
        action = str(data.get("action") or "unclear").strip().lower()

        if action == "reset":
            return _handle_reset(session_id, data, base, base_target, base_batna)
        if action == "set":
            return _handle_set(
                session_id, data, base, current, base_target, base_batna
            )
        return {"response": _UNCLEAR}

    return apply_override_node


def _handle_reset(
    session_id: str,
    data: dict[str, Any],
    base,
    base_target: int | None,
    base_batna: int | None,
) -> dict[str, Any]:
    scope = str(data.get("reset_scope") or "all").strip().lower()
    reset_target = scope in ("all", "target")
    # Accept legacy "walkaway"/"fallback" scopes from older model extractions.
    reset_batna = scope in ("all", "batna", "walkaway", "fallback")
    if not (reset_target or reset_batna):
        reset_target = reset_batna = True

    clear(session_id, target=reset_target, batna=reset_batna)
    effective = resolve_overridden_context(base, get_overrides(session_id)) or base

    parts = ["Reverted to the calculated"]
    if reset_target and reset_batna:
        parts.append(
            f" defaults: target **{_fmt(base_target)}**, BATNA **{_fmt(base_batna)}**."
        )
    elif reset_target:
        parts.append(f" target of **{_fmt(base_target)}**.")
    else:
        parts.append(f" BATNA of **{_fmt(base_batna)}**.")
    parts.append(" I'll use these for the rest of the session unless you change them again.")
    return {"response": "".join(parts), "source": _source(effective)}


def _handle_set(
    session_id: str,
    data: dict[str, Any],
    base,
    current: int | None,
    base_target: int | None,
    base_batna: int | None,
) -> dict[str, Any]:
    requested_target = _as_int(data.get("target_term_days"))
    requested_batna = _as_int(data.get("batna_term_days"))
    if requested_target is None and requested_batna is None:
        return {"response": _UNCLEAR}

    # Harmonise the negotiator's number to a multiple of 15 BEFORE validating or
    # storing it, so the bound the BATNA is checked against, the value put in
    # the store and the figure confirmed back are all the one that will actually
    # be used. `resolve_overridden_context` harmonises too (it is the funnel
    # every override passes through); doing it here as well is what keeps the
    # negotiator from being told 71 while the system argues 75.
    cap = regulatory_cap_days(base.facts)
    new_target = harmonise_term_days(requested_target, cap=cap)

    # The BATNA is harmonised too (§1). It is a negotiating POSITION — a term
    # the negotiator would actually put to a supplier — so it moves on the same
    # 15-day ladder as the target.
    new_batna = harmonise_term_days(requested_batna, cap=cap)

    problems: list[str] = []
    stored_target = False
    stored_batna = False

    # ── Target: must be a plausible term and, for an extension, sit above the
    # current term — the same bar `assess_improvement_opportunity` applies. A
    # target less than a full step above it is stored, with the thin-opportunity
    # warning added to the confirmation below.
    if new_target is not None:
        if not (_MIN_TERM_DAYS <= new_target <= _MAX_TERM_DAYS):
            problems.append(
                f"A target of {requested_target} days doesn't look like a valid payment "
                f"term, so I left the target unchanged."
            )
        elif cap is not None and requested_target is not None and requested_target > cap:
            problems.append(
                f"A target of {requested_target} days is above the {cap}-day "
                f"regulatory limit that applies to this supplier, so I left the "
                f"target unchanged."
            )
        elif current is not None and new_target <= current:
            problems.append(
                f"A target of {requested_target} days isn't above the current term of "
                f"{current} days — for an extension the target needs to be longer, "
                f"so I left the target unchanged."
            )
        else:
            set_target(session_id, new_target)
            stored_target = True

    session_target = get_overrides(session_id).target_term_days
    effective_target_for_batna = (
        session_target if session_target is not None else base.facts.target_term_days
    )

    # ── BATNA: never below the current term, never above the target.
    if new_batna is not None:
        if not (_MIN_TERM_DAYS <= new_batna <= _MAX_TERM_DAYS):
            problems.append(
                f"A BATNA of {new_batna} days doesn't look like a valid "
                f"payment term, so I left the BATNA unchanged."
            )
        elif current is not None and new_batna < current:
            problems.append(
                f"A BATNA of {requested_batna} days is below the current term of "
                f"{current} days — the BATNA can't be worse than the status quo, "
                f"so I left the BATNA unchanged."
            )
        elif cap is not None and requested_batna is not None and requested_batna > cap:
            problems.append(
                f"A BATNA of {requested_batna} days is above the {cap}-day "
                f"regulatory limit that applies to this supplier, so I left the "
                f"BATNA unchanged."
            )
        elif (
            effective_target_for_batna is not None
            and new_batna > effective_target_for_batna
        ):
            problems.append(
                f"A BATNA of {requested_batna} days is above the target of "
                f"{effective_target_for_batna} days — a BATNA sits below the "
                f"target, so I left the BATNA unchanged."
            )
        else:
            set_batna(session_id, new_batna)
            stored_batna = True

    if not (stored_target or stored_batna):
        return {"response": " ".join(problems) if problems else _UNCLEAR}

    effective = resolve_overridden_context(base, get_overrides(session_id)) or base
    eff_target = effective.facts.target_term_days
    eff_batna = _batna_floor(effective)

    lines: list[str] = []
    if stored_target:
        was = f" (the calculated recommendation was {_fmt(base_target)})" if base_target is not None else ""
        lines.append(f"Target set to **{eff_target} days**{was}.")
        if requested_target is not None and eff_target != requested_target:
            direction = "up" if eff_target > requested_target else "down"
            lines.append(
                f"Rounded {direction} from {requested_target} — targets are set in "
                f"{TERM_HARMONISATION_STEP_DAYS}-day steps."
            )
    if stored_batna:
        was = f" (the calculated default was {_fmt(base_batna)})" if base_batna is not None else ""
        lines.append(f"BATNA set to **{eff_batna} days**{was}.")
    if stored_target and not stored_batna:
        lines.append(
            f"The BATNA now recalculates to **{_fmt(eff_batna)}** for the new "
            f"target; say \"set the BATNA to N\" to fix it at a specific number."
        )

    thin_warning = thin_opportunity_warning(effective.facts) if stored_target else None
    if thin_warning:
        lines.append(f"**Note:** {thin_warning}")

    confirmation = " ".join(lines)
    confirmation += (
        " I'll use these for the rest of this session — say \"reset to the "
        "defaults\" to switch back to the calculated values."
    )
    if problems:
        confirmation += "\n\n" + " ".join(problems)

    return {"response": confirmation, "source": _source(effective)}


def _batna_floor(context) -> int | None:
    """The resolved BATNA floor off the context's argument bundle.

    The bundle is rebuilt from the patched facts by
    :func:`resolve_overridden_context`, so this reflects the override the
    negotiator just set — or the value it recalculated to when only the target
    moved.
    """
    terms = (context.argument_analysis or {}).get("terms") or {}
    return terms.get("batna_floor")


def _source(context) -> dict[str, dict[str, object]]:
    batna = _batna_floor(context)
    return {
        "Target Term Days": {"path": "override: session target", "value": context.facts.target_term_days},
        "BATNA (days)": {"path": "override: session BATNA", "value": batna},
    }
