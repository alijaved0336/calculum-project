"""Extract the first JSON object from LLM text output.

Extraction prompts (apply_override, scenario, evaluate_counter_offer) ask for
JSON-only output, but a model can still wrap the object in prose. A greedy
``\\{.*\\}`` regex over-captures when that prose contains extra braces, and a
non-greedy one breaks on any nested object — so this uses a brace-balanced
parse (``json.JSONDecoder.raw_decode``) from each ``{`` instead: nesting,
leading/trailing prose, and multiple brace pairs are all handled, and the
first valid object wins.
"""
from __future__ import annotations

import json

_decoder = json.JSONDecoder()


def extract_first_json_object(raw: str | None) -> dict | None:
    """Return the first valid JSON object in ``raw``, or None if there is none.

    Non-dict JSON values (arrays, strings, numbers) are skipped — the callers
    all expect an object.
    """
    text = raw or ""
    idx = text.find("{")
    while idx != -1:
        try:
            obj, _ = _decoder.raw_decode(text, idx)
        except json.JSONDecodeError:
            obj = None
        if isinstance(obj, dict):
            return obj
        idx = text.find("{", idx + 1)
    return None
