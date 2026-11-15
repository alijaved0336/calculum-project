"""Compact amounts for summaries.

Always prefixed with ``$`` so the chat highlighter treats the figure as money
(same convention as ``format_money`` / MONEY AS GIVEN). The payload often has
no ISO currency code; ``$`` is the display marker, not a claim that the amount
is USD.
"""
from __future__ import annotations


def summary_money(value: float) -> str:
    magnitude = abs(value)
    for divisor, suffix in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if magnitude >= divisor:
            return f"${value / divisor:.1f}".rstrip("0").rstrip(".") + suffix
    return f"${value:,.2f}".rstrip("0").rstrip(".")
