"""The two supplier summary depths, rendered from the resolved turn brief.

small — key facts: who the supplier is, plus current / target terms and BATNA.
large — the full negotiation position (``summary_template``).


No model chooses fields or edits these figures. The classifier chooses the
category; only narrow questions need generation. Every row comes from the
supplier payload (or the brief's resolved terms), and a field the payload
lacks is omitted — never a placeholder, never filled from model knowledge.
"""
from __future__ import annotations

import json
from typing import Any

from domain.entities.brief import NegotiationBrief
from utils.constants import format_source_label
from utils.prompts.summary_template import (
    LABEL_ARGUMENTS,
    _argument_bullet,
    country_flag,
    description_lead,
)

# Persisted on the message so thread reload can rebuild the facts card without
# a new DB column. The chat UI strips this marker before display.
SUMMARY_CARD_START = "<!--summary-card:"
SUMMARY_CARD_END = "-->"


# Timeline dots under the terms bar. Short labels so the UI never truncates.
_STANDARD_LABELS: dict[str, str] = {
    "peerGroupStandard": "Peer Group",
    "supplierStandard": "Supplier Standard",
    "industryRegionStandard": "Industry Region",
    "buyerStandard": "Buyer Standard",
    "parentOrSupplierMax": "Parent / Supplier Max",
    "scfPeerStandard": "SCF Peer",
}
_MAX_TIMELINE_STANDARDS = 3


def _level(value: str | None) -> str | None:
    text = " ".join(str(value).replace("**", "").split()).strip() if value else ""
    return text.capitalize() if text else None


def _as_days(value: float | int | None) -> int | None:
    if value is None:
        return None
    return int(value) if float(value).is_integer() else int(round(float(value)))


def _timeline_standards(brief: NegotiationBrief) -> list[dict]:
    """Up to three benchmarks for the terms axis.

    Skip figures at/below current (they support staying put). Skip the lower
    third of the current→target span (too close to current to justify the ask;
    mid-range can still sit as a BATNA / middle step). Prefer figures closer to
    the target.
    """
    current = brief.current_term
    target = brief.ask
    span_low = None
    if current is not None and target is not None and target > current:
        # Lower quarter is "really much closer to current" - drop those.
        # Mid-range (e.g. 45 on a 30→90 span) stays as a BATNA / middle step.
        span_low = current + (target - current) / 4

    candidates: list[dict] = []
    seen: set[str] = set()
    for bench in brief.facts.strategy_benchmarks:
        if bench.name not in _STANDARD_LABELS or bench.value is None:
            continue
        days = _as_days(bench.value)
        if days is None or bench.name in seen:
            continue
        if current is not None and days <= current:
            continue
        if span_low is not None and days < span_low:
            continue
        seen.add(bench.name)
        candidates.append({
            "key": bench.name,
            "label": _STANDARD_LABELS[bench.name],
            "days": days,
        })

    if target is not None:
        candidates.sort(key=lambda row: (abs(row["days"] - target), -row["days"]))
    else:
        candidates.sort(key=lambda row: -row["days"])
    return candidates[:_MAX_TIMELINE_STANDARDS]


def attach_summary_card(text: str, card: dict[str, Any] | None) -> str:
    """Append a compact HTML comment so thread reload can recover the card."""
    if not card:
        return text
    payload = json.dumps(card, separators=(",", ":"), ensure_ascii=False)
    return f"{text.rstrip()}\n\n{SUMMARY_CARD_START}{payload}{SUMMARY_CARD_END}"


def extract_summary_card(text: str | None) -> tuple[str, dict[str, Any] | None]:
    """Split persisted message into display body + card. Body loses the marker."""
    if not text:
        return "", None
    start = text.rfind(SUMMARY_CARD_START)
    if start < 0:
        return text, None
    end = text.find(SUMMARY_CARD_END, start)
    if end < 0:
        return text, None
    raw = text[start + len(SUMMARY_CARD_START) : end]
    body = (text[:start] + text[end + len(SUMMARY_CARD_END) :]).rstrip()
    try:
        card = json.loads(raw)
    except json.JSONDecodeError:
        return text, None
    if not isinstance(card, dict):
        return text, None
    return body, card


def build_summary_card(brief: NegotiationBrief, tier: str = "large") -> dict:
    """Typed values for the supplier-position card UI.

    Both summary tiers get the terms progress bar. ``small`` keeps the key-facts
    surface (identity, terms, BATNA, leverage, spend, size, credit). ``large``
    adds benchmarks, cash-flow, financing, success probability, and regulatory.
    """
    f = brief.facts
    current = brief.current_term
    target = brief.ask
    batna = brief.batna_floor
    flag = country_flag(f.country)
    # Caption under the bar when there is no BATNA and nothing past current.
    batna_note = None
    if batna is None and current is not None and target is not None and current >= target:
        batna_note = "No BATNA"

    card: dict = {
        "supplier_name": f.supplier_name,
        "country_flag": flag or None,
        # Carlos, 2026-09-17: country as its own key-value fact (not only the flag).
        "country": f.country or None,
        "industry": f.industry or None,
        "credit_rating": f.credit_rating,
        "description": description_lead(f.description),
        "current_term_days": current,
        "target_term_days": target,
        "batna_days": batna,
        "spend_volume": f.spend_volume,
        "buyer_leverage": _level(f.buyer_leverage_level),
        "company_size": _level(f.company_size),
        # Carlos, 2026-09-17: Priority replaces relationship-value wording in the UI.
        "priority": _level((brief.priority or {}).get("level")),
        "batna_note": batna_note,
        "standards": [],
        "cash_flow_opportunity": None,
        # Carlos, 2026-09-17: financing rate is a key-fact row (small + large).
        "supplier_financing_rate": f.supplier_financing_rate,
        "probability_of_success": None,
        "regulatory_cap_days": None,
        "regulatory_enforced": None,
    }
    if tier != "small":
        regulatory_cap = (
            f.regulatory_max_term_days if f.regulatory_applied else None
        )
        card["standards"] = _timeline_standards(brief)
        card["cash_flow_opportunity"] = f.target_cash_flow
        card["probability_of_success"] = _level(f.success_probability)
        card["regulatory_cap_days"] = regulatory_cap
        card["regulatory_enforced"] = (
            bool(f.regulatory_enforced) if regulatory_cap is not None else None
        )
    return card


def render_card_companion(brief: NegotiationBrief, tier: str = "large") -> str:
    """Notes under the facts card.

    Card owns identity, terms, BATNA, tiles (size / spend / priority / leverage /
    industry / country / financing rate), and (for large) timeline dots /
    regulatory. Body keeps ``Arguments Supporting Term Extension`` (large).
    """
    from utils.prompts.brief.rules import normalize_chat_formatting

    blocks: list[str] = []
    if tier != "small":
        # Supporting first, then below-current benchmarks (e.g. Industry Region Standard)
        # so the negotiator still sees the full position context.
        arg_lines: list[str] = []
        seen: set[str] = set()
        for argument in list(brief.evidence) + list(brief.non_supporting):
            key = argument.get("key") or argument.get("title")
            if argument.get("value_days") is None or key in seen:
                continue
            seen.add(str(key))
            arg_lines.append(_argument_bullet(brief, argument))
        if arg_lines:
            blocks.append("\n".join([f"**{LABEL_ARGUMENTS}**", *arg_lines]))

    return normalize_chat_formatting("\n\n".join(blocks))


def render_supplier_summary(brief: NegotiationBrief, tier: str = "large") -> str:
    # Tier still drives card depth and sources; body is the companion notes.
    return render_card_companion(brief, tier)


_PROFILE_FIELDS = {
    "supplier_name", "description", "country", "industry", "company_size", "credit_rating",
    "current_term_days", "target_term_days", "opportunity_term_days",
    "buyer_leverage_level", "spend_volume", "is_sme", "protected_flags",
    "nine_box_term_extension",
}
_LARGE_FIELDS = {
    "supplier_name", "description", "current_term_days", "target_term_days", "opportunity_term_days",
    "spend_volume", "target_cash_flow", "success_probability", "buyer_leverage_level",
    "regulatory_max_term_days", "industry", "credit_rating",
    "nine_box_term_extension",
}


def collect_summary_sources(brief: NegotiationBrief, tier: str) -> dict:
    from utils.prompts.summarize_prompt import collect_summarize_sources

    fields = _PROFILE_FIELDS if tier == "small" else _LARGE_FIELDS
    sources = {}
    if tier == "large":
        sources.update(collect_summarize_sources(brief))
    for name in sorted(fields):
        value = getattr(brief.facts, name)
        path = brief.facts.source_paths.get(name)
        if path and value is not None and value not in ((), {}, ""):
            sources[format_source_label(name)] = {"path": path, "value": value}
    if brief.batna_floor is not None:
        sources["BATNA (days)"] = {
            "path": "calculated: session BATNA override or harmonise(target − 15); none below contractual + 5",
            "value": brief.batna_floor,
        }
    # Carlos, 2026-09-15: Priority from nine-box - show in Data Inputs.
    priority = (brief.priority or {}).get("level")
    if priority:
        box = brief.facts.nine_box_term_extension
        sources["Priority"] = {
            "path": (
                f"calculated: nine-box {box} → {priority}"
                if box is not None
                else "calculated: nine-box missing → low"
            ),
            "value": priority,
        }
    return sources
