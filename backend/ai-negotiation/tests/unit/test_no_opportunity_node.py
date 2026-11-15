"""no_opportunity/scf_blocked must surface WHY they fired via `blocked_by`.

Without this, the API route has no way to tell that a strategy intent was
short-circuited rather than actually generated — see agents.state.blocked_by
and agents.nodes.follow_up_generator for why that distinction matters.
"""
from __future__ import annotations

import pytest

from agents.nodes.no_opportunity import make_no_opportunity_node
from agents.nodes.scf_blocked import make_scf_blocked_node
from domain.entities.context import SupplierContext
from domain.entities.facts import SupplierFacts
from domain.services.improvement_opportunity import BLOCKED_BY_NO_EXTENSION


def _context(**kw) -> SupplierContext:
    base = dict(
        supplier_name="Acme", country="DE", industry="Manufacturing", company_size="large",
        target_term_days=75, current_term_days=75, batna_term_days=None,
        benchmark_term_days=None, regulatory_max_term_days=None,
    )
    base.update(kw)
    return SupplierContext(supplier_id="sup-1", facts=SupplierFacts(**base))


@pytest.mark.asyncio
async def test_no_opportunity_node_sets_blocked_by():
    node = make_no_opportunity_node()
    result = await node({"context": _context(), "intent": "generate_negotiation_playbook"})
    assert result["blocked_by"] == BLOCKED_BY_NO_EXTENSION
    assert "nothing to negotiate" in result["response"]


@pytest.mark.asyncio
async def test_scf_blocked_node_sets_blocked_by():
    node = make_scf_blocked_node()
    result = await node({"intent_reasoning": "asked about SCF"})
    assert result["blocked_by"] == "scf_disabled"
    assert result["response"]
