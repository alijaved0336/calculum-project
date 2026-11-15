"""The current payment term is CONTRACTUAL, and weighted averages round UP.

Two rules, both from the negotiation-logic update:

§8  The negotiation baseline (``current_term_days``) is the spend-volume-
    weighted average of the per-line CONTRACTUAL terms without cash discount,
    with a PER-LINE fallback to that line's actual figure where the contractual
    one is null. What we actually paid (``actual_payment_terms_days``) is a
    behavioural signal for the DSO / pay-on-terms assessments and is never the
    baseline.

§9  Both weighted averages are rounded UP to the next whole day — always
    ceiling, never half-up.
"""
from __future__ import annotations

import uuid as _uuid
from decimal import Decimal

import pytest

from domain.services.supplier_facts import extract_supplier_facts
from infrastructure.postgres.adapters.pg_supplier_data_adapter import (
    PostgresSupplierDataAdapter,
    _weighted_average_days,
)
from infrastructure.postgres.models.supplier import Supplier


# ── §9 — the weighted average always rounds up ────────────────────────────


@pytest.mark.parametrize(
    "weighted_sum, total_volume, expected",
    [
        # A hair above a whole day still climbs to the next one.
        (Decimal("741"), Decimal("10"), 75),   # 74.1 → 75
        (Decimal("749"), Decimal("10"), 75),   # 74.9 → 75
        # Exactly whole stays put — ceiling is not "always add one".
        (Decimal("750"), Decimal("10"), 75),   # 75.0 → 75
        # Half-up would have gone DOWN here; ceiling does not.
        (Decimal("74000001"), Decimal("1000000"), 75),
        (Decimal("300"), Decimal("10"), 30),
    ],
)
def test_a_weighted_average_rounds_up_to_the_next_whole_day(
    weighted_sum, total_volume, expected
):
    assert _weighted_average_days(weighted_sum, total_volume) == expected


def test_a_missing_numerator_stays_missing_rather_than_becoming_zero_days():
    assert _weighted_average_days(None, Decimal("10")) is None


def test_the_average_is_never_below_the_exact_figure_and_never_a_day_above_it():
    """The property §9 asks for: exact <= reported < exact + 1."""
    for numerator in range(6800, 7600):
        weighted_sum, total_volume = Decimal(numerator), Decimal("100")
        exact = weighted_sum / total_volume
        reported = _weighted_average_days(weighted_sum, total_volume)
        assert exact <= reported < exact + 1


# ── §8 — the baseline reads the contractual figure ────────────────────────


def _payload(spend: dict, **extra) -> dict:
    payload = {
        "supplier": {"name": "Acme GmbH"},
        "target": {"targetPaymentTerms": 90},
        "agreement": {},
        "negotiationStrategy": {},
        "spend": spend,
    }
    payload.update(extra)
    return payload


def test_the_current_term_is_the_contractual_average_not_the_actual_one():
    facts = extract_supplier_facts(_payload({
        "contractualPaymentTermsWithoutCashDiscount": 45,
        "actualPaymentTerms": 52,
    }))
    assert facts.current_term_days == 45


def test_what_we_actually_paid_is_kept_but_is_not_the_baseline():
    facts = extract_supplier_facts(_payload({
        "contractualPaymentTermsWithoutCashDiscount": 45,
        "actualPaymentTerms": 52,
    }))
    # Still available for the behavioural assessments...
    assert facts.actual_payment_terms_days == 52
    # ...and still not the current term.
    assert facts.current_term_days != facts.actual_payment_terms_days


def test_an_actual_figure_alone_no_longer_sets_the_current_term():
    """The old chain read actualPaymentTerms first. It must not any more."""
    facts = extract_supplier_facts(_payload({"actualPaymentTerms": 52}))
    assert facts.current_term_days is None
    assert facts.actual_payment_terms_days == 52


def test_the_agreed_term_is_the_fallback_when_there_are_no_spend_lines():
    facts = extract_supplier_facts(_payload(
        {},
        agreement={"agreedTermsWithoutCashDiscounts": 60},
    ))
    assert facts.current_term_days == 60


def test_pay_on_terms_is_the_last_resort():
    facts = extract_supplier_facts(_payload(
        {},
        negotiationStrategy={"payOnTerms": {"value": 34}},
    ))
    assert facts.current_term_days == 34


def test_a_baseline_is_never_invented():
    assert extract_supplier_facts(_payload({})).current_term_days is None


def test_the_baseline_names_the_contractual_field_as_its_source():
    """P1 — provenance points at the field on the platform's supplier card."""
    facts = extract_supplier_facts(_payload({
        "contractualPaymentTermsWithoutCashDiscount": 45,
    }))
    source = facts.source_paths["current_term_days"]
    assert "contractualPaymentTermsWithoutCashDiscount" in source
    # Qualified with its object: the bare name is a substring of the
    # contractual one ("contr" + "actualPaymentTerms" + "Without...").
    assert "spend.actualPaymentTerms" not in source


# ── the adapter emits that payload without crashing ───────────────────────
#
# WP1.6 deleted the max-spend-line opportunity from the payload, but the
# deletion stopped at the call site: `_spend_aggregates` still returned the
# `(max_opportunity, max_alias)` halves it was told to drop, so every session
# start died with "too many values to unpack (expected 2)" and opened with no
# supplier data at all.


class _SupplierRow:
    """A supplier row where every column is NULL except the ones named."""

    uuid = _uuid.UUID("7934963b-e1dd-400b-bb03-5e42824de851")
    name = "Acme GmbH"

    def __getattr__(self, _name: str) -> None:
        return None


class _AggregateResult:
    def __init__(self, values: tuple) -> None:
        self._values = values

    def one(self) -> tuple:
        return self._values

    def scalar_one_or_none(self):
        return self._values


class _FakeSession:
    """Answers `select(Supplier)` with a row and any aggregate with figures.

    The aggregate tuple is sized to whatever the statement actually selects,
    so the fake does not hard-code the adapter's current column list.
    """

    def __init__(self, contractual_sum, actual_sum, total_volume) -> None:
        self._figures = [contractual_sum, actual_sum, total_volume]

    async def execute(self, statement):
        columns = statement.column_descriptions
        if columns[0]["entity"] is Supplier:
            return _AggregateResult(_SupplierRow())
        padding = [None] * (len(columns) - len(self._figures))
        return _AggregateResult(tuple(self._figures + padding))


@pytest.mark.asyncio
async def test_the_adapter_builds_the_payload_for_a_supplier_with_spend_lines():
    adapter = PostgresSupplierDataAdapter(
        _FakeSession(Decimal("4500"), Decimal("5200"), Decimal("100"))
    )

    payload = await adapter.get_supplier_context(str(_SupplierRow.uuid), "calculum")

    assert payload["spend"] == {
        "contractualPaymentTermsWithoutCashDiscount": 45,
        "actualPaymentTerms": 52,
    }
