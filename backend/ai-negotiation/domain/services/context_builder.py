from __future__ import annotations

from typing import Any

from domain.entities.context import SupplierContext
from domain.services.negotiation_arguments import build_argument_analysis
from domain.services.opening_strategy_analysis import analyze_opening_strategy
from domain.services.supplier_facts import extract_supplier_facts


def build_supplier_context(payload: dict[str, Any]) -> SupplierContext:
    """Build a :class:`SupplierContext` from a raw API payload.

    ``facts`` is extracted first, then the Tier-2 bundle ``argument_analysis``
    (what we can argue) and ``opening_strategy`` are derived from it — in that
    order, exactly once — so callers always get a fully resolved,
    internally-consistent context straight from the upstream response.
    """
    supplier_id = str(payload.get("supplier", {}).get("uuid", ""))
    facts = extract_supplier_facts(payload)
    argument_analysis = build_argument_analysis(facts)
    return SupplierContext(
        supplier_id=supplier_id,
        raw=payload,
        facts=facts,
        argument_analysis=argument_analysis,
        opening_strategy=analyze_opening_strategy(facts, argument_analysis),
    )
