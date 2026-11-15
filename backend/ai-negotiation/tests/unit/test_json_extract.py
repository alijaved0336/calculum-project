"""Brace-balanced JSON extraction from LLM output — the cases the old greedy
``\\{.*\\}`` regex (and a non-greedy variant) get wrong."""
from __future__ import annotations

from utils.json_extract import extract_first_json_object


def test_plain_object():
    assert extract_first_json_object('{"action": "set"}') == {"action": "set"}


def test_object_wrapped_in_prose():
    raw = 'Here is the extraction:\n{"action": "set", "target_term_days": 85}\nHope that helps!'
    assert extract_first_json_object(raw) == {"action": "set", "target_term_days": 85}


def test_nested_object():
    # A non-greedy regex would stop at the first "}" and truncate this.
    raw = '{"a": {"b": 1}, "c": 2}'
    assert extract_first_json_object(raw) == {"a": {"b": 1}, "c": 2}


def test_trailing_prose_with_braces():
    # The greedy regex would span to the last "}" and fail to parse.
    raw = '{"action": "reset"} — this resets {target and BATNA}.'
    assert extract_first_json_object(raw) == {"action": "reset"}


def test_leading_prose_with_braces():
    raw = 'In {short}: {"action": "unclear"}'
    assert extract_first_json_object(raw) == {"action": "unclear"}


def test_multiple_objects_first_wins():
    raw = '{"action": "set"} then {"action": "reset"}'
    assert extract_first_json_object(raw) == {"action": "set"}


def test_no_json_returns_none():
    assert extract_first_json_object("no braces here") is None
    assert extract_first_json_object("") is None
    assert extract_first_json_object(None) is None


def test_invalid_json_returns_none():
    assert extract_first_json_object("{not json}") is None


def test_non_object_json_skipped():
    # Arrays/scalars are not what the extraction callers expect.
    assert extract_first_json_object("[1, 2, 3]") is None
