"""Unit tests for spend-alias lookup in the answer_spends_question node.

Aliases are stored as ``Spend <zero-padded number>`` ("Spend 098") but the
negotiator asks about "spend 098" / "spend 98" / "line 98". The model's literal
therefore carries neither the prefix nor a reliable padding, so the predicate is
normalised in CODE (_normalize_alias_predicates) rather than trusted to the
prompt — a verbatim `alias ILIKE '098'` matches nothing and the empty result
gets misreported to the negotiator as a mistyped alias.

The rewrite is only ever applied inside the supplier/tenant-scoped subquery,
where alias padding is consistent — `Spend 1` / `Spend 01` / `Spend 001` are
globally distinct but never share a supplier.
"""
from __future__ import annotations

import re

import pytest

from agents.nodes.spends import _normalize_alias_predicates, _validate_and_scope_sql

ROWS_SELECT = (
    "SELECT alias, commodity, procurement_team, spend_volume, transaction_currency, "
    "actual_payment_terms, target_opportunity_payment_terms, negotiation_status, "
    "currently_on_scf FROM spends"
)


def _matches(sql: str, stored_alias: str) -> bool:
    """Evaluate the rewritten predicate the way Postgres would, in Python.

    Mirrors `regexp_replace(alias, '\\D', '', 'g') ~ '^0*<n>$'`.
    """
    m = re.search(r"regexp_replace\(alias, '\\D', '', 'g'\) ~ '(\^0\*\d+\$)'", sql)
    assert m, f"no normalised alias predicate in: {sql}"
    digits = re.sub(r"\D", "", stored_alias)
    return re.search(m.group(1), digits) is not None


# ── the reported bug: `alias ILIKE '098'` never matches `Spend 098` ──────────


def test_bare_number_finds_prefixed_alias():
    """The exact failure from the log: ILIKE '098' vs stored 'Spend 098'."""
    sql = _normalize_alias_predicates(f"{ROWS_SELECT} WHERE alias ILIKE '098'")
    assert _matches(sql, "Spend 098")


@pytest.mark.parametrize("literal", ["098", "98", "Spend 98", "Spend 098", "spend 098"])
def test_padding_and_prefix_are_irrelevant(literal):
    """However the model writes the literal, it finds the stored line."""
    sql = _normalize_alias_predicates(f"{ROWS_SELECT} WHERE alias = '{literal}'")
    assert _matches(sql, "Spend 098")


@pytest.mark.parametrize("stored", ["Spend 98", "Spend 098", "Spend 0098"])
def test_matches_whatever_padding_the_supplier_uses(stored):
    sql = _normalize_alias_predicates(f"{ROWS_SELECT} WHERE alias = '098'")
    assert _matches(sql, stored)


def test_match_is_anchored_not_a_substring():
    """'98' must not also pull in 'Spend 980' / 'Spend 198'."""
    sql = _normalize_alias_predicates(f"{ROWS_SELECT} WHERE alias = '98'")
    assert _matches(sql, "Spend 098")
    assert not _matches(sql, "Spend 980")
    assert not _matches(sql, "Spend 198")


def test_wildcards_in_the_literal_are_reduced_to_the_number():
    sql = _normalize_alias_predicates(f"{ROWS_SELECT} WHERE alias ILIKE '%098%'")
    assert _matches(sql, "Spend 098")
    assert not _matches(sql, "Spend 980")


# ── what must NOT be rewritten ──────────────────────────────────────────────


def test_textual_alias_literal_is_left_alone():
    """No digits to normalise — keep the model's text match verbatim."""
    sql = f"{ROWS_SELECT} WHERE alias ILIKE 'legacy tooling'"
    assert _normalize_alias_predicates(sql) == sql


def test_other_columns_are_untouched():
    sql = f"{ROWS_SELECT} WHERE commodity ILIKE 'steel' AND actual_payment_terms >= 76"
    assert _normalize_alias_predicates(sql) == sql


def test_negation_is_not_rewritten():
    """`alias <> '...'` would need inverting — leave it rather than get it wrong."""
    sql = f"{ROWS_SELECT} WHERE alias <> 'Spend 098'"
    assert _normalize_alias_predicates(sql) == sql


# ── the rewrite survives (and does not weaken) validation + scoping ─────────


def test_normalised_predicate_passes_validation_and_stays_scoped():
    scoped = _validate_and_scope_sql(f"{ROWS_SELECT} WHERE alias ILIKE '098'", "rows")
    assert scoped is not None
    assert "supplier_uuid = :supplier_uuid" in scoped
    assert "tenant_id = :tenant_id" in scoped
    assert "alias ILIKE '098'" not in scoped
    assert _matches(scoped, "Spend 098")


def test_alias_rewrite_does_not_bypass_the_safety_checks():
    """A rejected query is still rejected — the rewrite runs after validation."""
    assert _validate_and_scope_sql("SELECT alias FROM spends WHERE alias = '098'; DROP TABLE spends", "rows") is None
    assert _validate_and_scope_sql("SELECT alias FROM suppliers WHERE alias = '098'", "rows") is None
