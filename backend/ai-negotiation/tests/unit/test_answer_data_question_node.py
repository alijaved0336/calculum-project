"""answer_data_question node: reserve-floor resolution — reuse the analysis
figure when present (it carries session walkaway overrides), recompute from
facts only when analysis is None."""
from __future__ import annotations

from dataclasses import replace
from typing import Any

import pytest

from agents.nodes.answer_data_question import make_answer_data_question_node
from domain.entities.facts import resolve_effective_batna
from domain.services.context_builder import build_supplier_context

_FALLBACK_LABEL = "BATNA (days)"


class _FakeLLM:
    def __init__(self, response: str = "answer") -> None:
        self._response = response
        self.prompts: list[str] = []

    async def complete(self, prompt: str, **kwargs: Any) -> str:
        self.prompts.append(prompt)
        return self._response


def _payload() -> dict[str, Any]:
    return {
        "supplier": {
            "name": "U.S. Foodservice", "uuid": "u1", "country": "US",
            "mainIndustryName": "Foodservice", "companySize": "LARGE",
            "spendVolume": 12852649.0,
        },
        "target": {"targetPaymentTerms": None, "opportunityPaymentTerms": 76},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": 34,
            "actualPaymentTerms": 34,
        },
        "agreement": {},
        "negotiationStrategy": {
            "industryRegionStandard": {"value": 40},
            "peerGroupStandard": {"value": 58},
            "supplierStandard": {"value": 70},
            "parentOrSupplierMax": {"value": 80},
        },
    }


def _state(context) -> dict:
    return {
        "session_id": "s1",
        "message": "what is our fallback term?",
        "context": context,
    }


@pytest.mark.asyncio
async def test_bundleless_context_still_resolves_the_fallback_from_facts():
    ctx = build_supplier_context(_payload())
    assert ctx.argument_analysis is not None  # sanity: the builder provides it
    bare = replace(ctx, argument_analysis=None)
    expected, _note = resolve_effective_batna(bare.facts)
    assert expected is not None  # sanity: the payload yields an in-band floor

    result = await make_answer_data_question_node(_FakeLLM())(_state(bare))

    assert result["response"] == "answer"
    assert result["source"][_FALLBACK_LABEL]["value"] == expected


@pytest.mark.asyncio
async def test_fallback_on_the_bundle_is_reused_not_recomputed():
    ctx = build_supplier_context(_payload())
    # A figure a recompute from facts could never produce — stands in for a
    # session walkaway override carried by the resolved argument bundle.
    overridden = replace(
        ctx,
        argument_analysis={
            **ctx.argument_analysis,
            "terms": {
                **ctx.argument_analysis["terms"],
                "batna_floor": 61,
                "batna_note": "session walkaway override",
            },
        },
    )

    result = await make_answer_data_question_node(_FakeLLM())(_state(overridden))

    assert result["source"][_FALLBACK_LABEL]["value"] == 61
    assert result["source"][_FALLBACK_LABEL]["value"] != resolve_effective_batna(ctx.facts)[0]
