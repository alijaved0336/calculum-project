"""The apply_override node: one LLM extraction call, deterministic validation
and confirmation, and writes to the session override store."""
from __future__ import annotations

from typing import Any

import pytest

import application.services.override_store as store
from agents.nodes.apply_override import make_apply_override_node
from domain.entities.overrides import NegotiationOverrides
from domain.services.context_builder import build_supplier_context


class _FakeLLM:
    """Returns a preset extraction JSON for the single complete() call."""

    def __init__(self, response: str) -> None:
        self._response = response

    async def complete(self, prompt: str, **kwargs: Any) -> str:
        return self._response


def _payload(target=None, opportunity=76, current=34) -> dict[str, Any]:
    return {
        "supplier": {
            "name": "U.S. Foodservice", "uuid": "u1", "country": "US",
            "mainIndustryName": "Foodservice", "companySize": "LARGE",
            "spendVolume": 12852649.0,
        },
        "target": {"targetPaymentTerms": target, "opportunityPaymentTerms": opportunity},
        "spend": {
            "contractualPaymentTermsWithoutCashDiscount": current,
            "actualPaymentTerms": current,
        },
        "agreement": {},
        "negotiationStrategy": {
            "industryRegionStandard": {"value": 40},
            "peerGroupStandard": {"value": 58},
            "supplierStandard": {"value": 70},
            "parentOrSupplierMax": {"value": 80},
        },
    }


async def _run(
    session_id: str,
    extraction_json: str,
    message: str = "msg",
    payload: dict[str, Any] | None = None,
) -> str:
    store.clear_session(session_id)
    node = make_apply_override_node(_FakeLLM(extraction_json))
    state = {
        "session_id": session_id,
        "message": message,
        "context": build_supplier_context(payload if payload is not None else _payload()),
    }
    result = await node(state)
    return result["response"]


@pytest.mark.asyncio
async def test_set_target_stores_override_and_confirms():
    sid = "sess-node-target"
    # 85 harmonises to 90 before it is stored, so the store, the walkaway bound
    # and the confirmation all speak the number the system will actually argue.
    resp = await _run(sid, '{"action":"set","target_term_days":85,"batna_term_days":null}')
    assert store.get_overrides(sid).target_term_days == 90
    assert "90 days" in resp
    assert "Rounded up from 85" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_set_batna_stores_override_and_confirms():
    sid = "sess-node-walkaway"
    resp = await _run(sid, '{"action":"set","target_term_days":null,"batna_term_days":45}')
    assert store.get_overrides(sid).batna_term_days == 45
    assert "45 days" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_a_walkaway_override_is_harmonised_like_the_target():
    """§1: the walkaway is a negotiating position, so it moves in 15-day steps.

    This path used to store the raw number — the one way an unharmonised
    walkaway could ship next to a harmonised target.
    """
    sid = "sess-node-walkaway-harmonised"
    resp = await _run(sid, '{"action":"set","target_term_days":null,"batna_term_days":53}')
    assert store.get_overrides(sid).batna_term_days == 60   # 53 -> 60
    assert "60 days" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_reset_clears_overrides():
    sid = "sess-node-reset"
    store.set_target(sid, 85)
    node = make_apply_override_node(_FakeLLM('{"action":"reset","reset_scope":"all"}'))
    state = {"session_id": sid, "message": "reset", "context": build_supplier_context(_payload())}
    resp = (await node(state))["response"]
    assert store.get_overrides(sid) == NegotiationOverrides()
    assert "Reverted" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_target_below_current_is_rejected_not_stored():
    sid = "sess-node-bad-target"
    # current term is 34; a target of 20 is not an extension → rejected.
    resp = await _run(sid, '{"action":"set","target_term_days":20,"batna_term_days":null}')
    assert store.get_overrides(sid).target_term_days is None
    assert "34 days" in resp and "left the target unchanged" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_walkaway_above_target_is_rejected():
    sid = "sess-node-bad-walkaway"
    # target resolves to 90 (the modeled 76, harmonised); 100 sits above it → rejected.
    resp = await _run(sid, '{"action":"set","target_term_days":null,"batna_term_days":100}')
    assert store.get_overrides(sid).batna_term_days is None
    assert "above the target" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_walkaway_validated_against_session_target_override():
    sid = "sess-node-walkaway-vs-override"
    store.clear_session(sid)
    store.set_target(sid, 105)  # negotiator raised the target from the calculated 90
    node = make_apply_override_node(
        _FakeLLM('{"action":"set","target_term_days":null,"batna_term_days":95}')
    )
    state = {"session_id": sid, "message": "set walkaway 95", "context": build_supplier_context(_payload())}
    resp = (await node(state))["response"]
    # 95 harmonises to 90, which sits below the overridden target (105) —
    # valid, even though it is at the calculated target (90).
    assert store.get_overrides(sid).batna_term_days == 90
    assert "90 days" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_walkaway_above_overridden_target_is_rejected():
    sid = "sess-node-walkaway-above-override"
    store.clear_session(sid)
    store.set_target(sid, 60)  # negotiator lowered the target from the calculated 76
    node = make_apply_override_node(
        _FakeLLM('{"action":"set","target_term_days":null,"batna_term_days":70}')
    )
    state = {"session_id": sid, "message": "set walkaway 70", "context": build_supplier_context(_payload())}
    resp = (await node(state))["response"]
    # 70 is above the session target of 60 — must be rejected against the
    # override, not the calculated 76 (which would wrongly accept it).
    assert store.get_overrides(sid).batna_term_days is None
    assert "above the target of 60" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_unclear_action_changes_nothing():
    sid = "sess-node-unclear"
    resp = await _run(sid, '{"action":"unclear"}')
    assert store.get_overrides(sid) == NegotiationOverrides()
    assert "target" in resp.lower() and "batna" in resp.lower()
    store.clear_session(sid)


# ── the regulatory ceiling ─────────────────────────────────────────────────


def _capped_payload(cap: int = 60, applied: bool = True) -> dict[str, Any]:
    payload = _payload()
    payload["negotiationStrategy"]["regulatoryTerm"] = {
        "applied": applied,
        "value": cap,
        "group": {"value": cap, "enforced": True, "limitType": "ONLY_EXCEPTIONS"},
    }
    return payload


@pytest.mark.asyncio
async def test_a_target_above_an_applied_regulatory_cap_is_refused():
    """Refused, not quietly capped.

    Storing 60 in answer to "set the target to 90" reads as the assistant
    having misheard; the reason — a legal ceiling — is the whole point.
    """
    sid = "sess-node-reg-target"
    resp = await _run(
        sid,
        '{"action":"set","target_term_days":90,"batna_term_days":null}',
        payload=_capped_payload(),
    )
    assert store.get_overrides(sid).target_term_days is None
    assert "60-day regulatory limit" in resp
    assert "left the target unchanged" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_a_target_under_an_applied_regulatory_cap_is_stored():
    """60 is the only target that both clears the 15-day step over the 34-day
    current term AND stays under the 60-day cap."""
    sid = "sess-node-reg-ok"
    resp = await _run(
        sid,
        '{"action":"set","target_term_days":60,"batna_term_days":null}',
        payload=_capped_payload(),
    )
    assert store.get_overrides(sid).target_term_days == 60
    assert "60 days" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_a_target_inside_the_15_day_step_is_stored_with_a_warning():
    """The bar `assess_improvement_opportunity` applies, applied here too: a
    target above the current term is accepted even when it is less than a full
    step above it — with the thin-opportunity warning in the confirmation."""
    sid = "sess-node-small-step"
    resp = await _run(
        sid,
        '{"action":"set","target_term_days":45,"batna_term_days":null}',
    )
    assert store.get_overrides(sid).target_term_days == 45
    assert "only 11 days above the current 34-day terms" in resp
    assert "15-day step" in resp
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_an_unapplied_regulation_does_not_refuse_the_target():
    """`enforced` alone caps nothing — the negotiator's 90 stands."""
    sid = "sess-node-reg-unapplied"
    await _run(
        sid,
        '{"action":"set","target_term_days":90,"batna_term_days":null}',
        payload=_capped_payload(applied=False),
    )
    assert store.get_overrides(sid).target_term_days == 90
    store.clear_session(sid)


@pytest.mark.asyncio
async def test_a_walkaway_above_an_applied_regulatory_cap_is_refused():
    sid = "sess-node-reg-walkaway"
    resp = await _run(
        sid,
        '{"action":"set","target_term_days":null,"batna_term_days":75}',
        payload=_capped_payload(),
    )
    assert store.get_overrides(sid).batna_term_days is None
    assert "60-day regulatory limit" in resp
    store.clear_session(sid)
