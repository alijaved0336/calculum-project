from __future__ import annotations

import re

from domain.entities.brief import NegotiationBrief
from domain.entities.facts import StrategyBenchmark
from utils.prompts.summary_money import summary_money

# ── Labels ─────────────────────────────────────────────────────────────────
#
# The exact strings the client's markup kept. `summary_draft_problems` reads
# them back out of the draft, so a renamed label is a failed check, not a
# stylistic choice the model made.

LABEL_OVERVIEW = "Overview"
LABEL_SUPPLIER = "Supplier"
LABEL_INDUSTRY = "Industry"
LABEL_CREDIT_RATING = "Credit Rating"
LABEL_PAYMENT_TERMS = "Payment Terms"
LABEL_REGULATORY_CAP = "Regulatory Cap"
LABEL_SPEND = "Spend Volume"
LABEL_CASH_FLOW = "Cash Flow Opportunity"
LABEL_PROBABILITY = "Probability of Success"
LABEL_BUYER_LEVERAGE = "Buyer Leverage"
LABEL_COMPANY_SIZE = "Supplier Company Size"
LABEL_PRIORITY = "Priority"
LABEL_SUPPLIER_FINANCING_RATE = "Supplier Financing Rate"
LABEL_ARGUMENTS = "Arguments Supporting Term Extension"
LABEL_BATNA = "BATNA (Best Alternative to a Negotiated Agreement)"


def bold_field(label: str, value: str) -> str:
    """``**Label**: value`` - colon outside the bold, space after the colon."""
    return f"**{label.rstrip(':')}**: {value}"

# Every label the skeleton can emit, in document order. The validator checks
# only the ones a given skeleton actually rendered.
ALL_LABELS: tuple[str, ...] = (
    LABEL_OVERVIEW,
    LABEL_SUPPLIER,
    LABEL_INDUSTRY,
    LABEL_CREDIT_RATING,
    LABEL_PAYMENT_TERMS,
    LABEL_REGULATORY_CAP,
    LABEL_SPEND,
    LABEL_CASH_FLOW,
    LABEL_PROBABILITY,
    LABEL_BUYER_LEVERAGE,
    LABEL_COMPANY_SIZE,
    LABEL_PRIORITY,
    LABEL_ARGUMENTS,
    LABEL_BATNA,
)

# The sections the client struck out. A draft that reintroduces one has gone
# back to the old shape, whatever else it got right.
BANNED_PHRASES: tuple[str, ...] = (
    "Falls short",
    "No data on",
    "Stakes:",
    "Read:",
    "Outlook:",
    "Signals:",
    "Internal confidence builder",
    "INTERNAL ONLY",
    "STRONGEST",
)

# ── Country flags ──────────────────────────────────────────────────────────

_COUNTRY_NAMES_TO_ISO: dict[str, str] = {
    "united states": "US", "united states of america": "US", "usa": "US",
    "u.s.": "US", "u.s.a.": "US",
    "united kingdom": "GB", "uk": "GB", "great britain": "GB", "england": "GB",
    "netherlands": "NL", "the netherlands": "NL", "holland": "NL",
    "germany": "DE", "france": "FR", "spain": "ES", "italy": "IT",
    "belgium": "BE", "switzerland": "CH", "austria": "AT", "ireland": "IE",
    "sweden": "SE", "norway": "NO", "denmark": "DK", "finland": "FI",
    "poland": "PL", "portugal": "PT", "czech republic": "CZ", "czechia": "CZ",
    "canada": "CA", "mexico": "MX", "brazil": "BR", "argentina": "AR",
    "china": "CN", "japan": "JP", "india": "IN", "south korea": "KR",
    "korea": "KR", "singapore": "SG", "australia": "AU", "new zealand": "NZ",
    "united arab emirates": "AE", "uae": "AE", "saudi arabia": "SA",
    "south africa": "ZA", "turkey": "TR", "türkiye": "TR", "israel": "IL",
    "luxembourg": "LU", "hungary": "HU", "romania": "RO", "greece": "GR",
    "hong kong": "HK", "taiwan": "TW", "thailand": "TH", "vietnam": "VN",
    "malaysia": "MY", "indonesia": "ID", "philippines": "PH", "pakistan": "PK",
}


def country_flag(country: str | None) -> str:
    """The flag emoji for a country, from its ISO-2 code or its English name.

    Empty string when it cannot be resolved — an unknown country gets no flag
    rather than a wrong one. The payload carries either form ("US",
    "Netherlands"), so both are accepted.
    """
    if not country:
        return ""
    raw = country.strip()
    iso = raw.upper() if len(raw) == 2 and raw.isalpha() else _COUNTRY_NAMES_TO_ISO.get(raw.lower())
    if not iso:
        return ""
    return "".join(chr(0x1F1E6 + ord(c) - ord("A")) for c in iso)


# ── Rendering ──────────────────────────────────────────────────────────────


def _days(value: float | int) -> str:
    return str(int(value)) if float(value).is_integer() else f"{value:.1f}"


def _rate(value: float | None) -> str | None:
    return None if value is None else f"{value * 100:.2f}%"


def _title(text: str | None) -> str | None:
    """``LARGE`` / ``large`` → ``Large``. Payload casing varies."""
    return text.strip().capitalize() if text else None


def _benchmark(brief: NegotiationBrief, key: str) -> StrategyBenchmark | None:
    for b in brief.facts.strategy_benchmarks:
        if b.name == key:
            return b
    return None


def description_lead(description: str | None) -> str | None:
    """The supplier's own description (``supplier.description``), bounded to
    two sentences / 60 words, for the top of every summary tier.

    ``None`` when the payload has no description — the caller shows nothing in
    its place; no description is ever written for the supplier.
    """
    # Payload text is data, not Markdown instructions or new summary sections.
    text = re.sub(r"[\r\n\t]+", " ", description or "").replace("**", "").strip()
    if not text:
        return None
    lead = " ".join(re.split(r"(?<=[.!?])\s+(?=[A-Z])", text)[:2])
    words = lead.split()
    if len(words) > 60:
        lead = " ".join(words[:60]).rstrip(".,;") + "…"
    return lead


def _overview_lines(brief: NegotiationBrief) -> list[str]:
    facts = brief.facts
    lines = [f"**{LABEL_OVERVIEW}**"]

    identity: list[str] = []
    if facts.supplier_name:
        flag = country_flag(facts.country)
        identity.append(bold_field(LABEL_SUPPLIER, f"{facts.supplier_name}{' ' + flag if flag else ''}"))
    if facts.industry:
        identity.append(bold_field(LABEL_INDUSTRY, facts.industry))
    if facts.credit_rating:
        identity.append(bold_field(LABEL_CREDIT_RATING, facts.credit_rating))
    if identity:
        lines.append(", ".join(identity))

    if brief.current_term is not None or brief.ask is not None:
        lines.append(f"**{LABEL_PAYMENT_TERMS}**:")
        if brief.current_term is not None:
            lines.append(f"Current: **{brief.current_term} days**")
        if brief.ask is not None:
            approved = " (negotiator-set)" if facts.target_is_user_set else ""
            lines.append(f"Target: **{brief.ask} days**{approved}")
        if brief.batna_floor is not None:
            lines.append(f"BATNA: **{brief.batna_floor} days**")

    if facts.regulatory_applied and facts.regulatory_max_term_days is not None:
        kind = "enforced by law" if facts.regulatory_enforced else "regulatory guidance"
        lines.append(
            bold_field(
                LABEL_REGULATORY_CAP,
                f"{facts.regulatory_max_term_days} days ({kind}) - the target is capped to this limit.",
            )
        )

    money: list[str] = []
    if facts.spend_volume is not None:
        money.append(bold_field(LABEL_SPEND, f"**{summary_money(facts.spend_volume)}**"))
    if facts.target_cash_flow is not None:
        money.append(bold_field(LABEL_CASH_FLOW, f"**{summary_money(facts.target_cash_flow)}**"))
    if money:
        lines.append(" → ".join(money))

    return lines


def _probability_lines(brief: NegotiationBrief) -> list[str]:
    """The probability block. A signal the payload lacks is left out, not
    written as "not provided"; without a probability the signals stand alone."""
    facts = brief.facts
    signals: list[str] = []
    leverage = _title(facts.buyer_leverage_level)
    if leverage:
        signals.append(f"  • {bold_field(LABEL_BUYER_LEVERAGE, leverage)}")
    size = _company_size_sentence(brief)
    if size:
        signals.append(f"  • {bold_field(LABEL_COMPANY_SIZE, size)}")
    relationship = _relationship_sentence(brief)
    if relationship:
        signals.append(f"  • {bold_field(LABEL_PRIORITY, relationship)}")

    probability = _title(facts.success_probability)
    return ([bold_field(LABEL_PROBABILITY, probability)] if probability else []) + signals


def _company_size_sentence(brief: NegotiationBrief) -> str | None:
    """``Large`` / ``Large (supplier financing rate: 4.23%).`` — size and rate
    only. Sensitivity to longer terms was dropped (Carlos, 2026-09-17)."""
    facts = brief.facts
    size = _title(facts.company_size)
    if not size:
        return None
    rate = _rate(facts.supplier_financing_rate)
    if rate:
        return f"{size} (supplier financing rate: **{rate}**)."
    return f"{size}."
_LEVERAGE_CLAUSE = {
    "low": ", but limited buyer leverage",
    "medium": ", with balanced buyer leverage",
    "high": ", and strong buyer leverage",
}


def _relationship_sentence(brief: NegotiationBrief) -> str | None:
    """``High priority ($908K spend), but limited buyer leverage.``"""
    facts = brief.facts
    level = _title((brief.priority or {}).get("level"))
    if not level:
        return None
    spend = (
        f" (**{summary_money(facts.spend_volume)}** spend)"
        if facts.spend_volume is not None
        else ""
    )
    clause = _LEVERAGE_CLAUSE.get(str(facts.buyer_leverage_level or "").lower(), "")
    return f"{level} priority{spend}{clause}."


def _argument_bullet(brief: NegotiationBrief, argument: dict) -> str:
    """One supporting benchmark, in the client's shape:

        - **Supplier Standard**: 67 days → Represents payment terms the supplier
          accepts on average across its customer base and 75 days by top
          3rd-quartile clients (n=16 occurrences in Calculum's database).

    The sentence is the catalogue ``meaning`` — nothing here is invented — with
    the benchmark's own statistics appended where the payload carries them.
    Day figures, ``n=``, and rates are left plain so the chat renderer can bold
    them consistently.
    """
    title = argument.get("title") or argument.get("key")
    value = argument.get("value_days")
    benchmark = _benchmark(brief, argument.get("key", ""))
    meaning = (argument.get("meaning") or "").rstrip(".")

    q3 = benchmark.q3 if benchmark else None
    n = benchmark.occurrences if benchmark else None
    if argument.get("key") == "supplierStandard":
        # The client's approved sentence for this argument.
        sentence = "Represents payment terms the supplier accepts on average across its customer base"
        if q3 is not None:
            sentence += f" and {_days(q3)} days by top 3rd-quartile clients"
    else:
        sentence = meaning
        if q3 is not None:
            sentence += f"; top 3rd-quartile clients accept {_days(q3)} days"
    if n is not None:
        sentence += f" (n={n} occurrences in Calculum's database)"
    return f"- {bold_field(str(title), f'**{value} days** → {sentence}.')}"


def _argument_lines(brief: NegotiationBrief) -> list[str]:
    """Empty when no benchmark supports the ask: the section is left out."""
    evidence = brief.evidence
    if not evidence:
        return []
    lines = [f"**{LABEL_ARGUMENTS}**"]
    lines += [_argument_bullet(brief, a) for a in evidence]
    if brief.is_stretch_target and brief.ask is not None:
        lines.append(
            f"- None of these reaches the {brief.ask}-day target itself - "
            "they show longer terms exist, not that the target is market-backed."
        )
    return lines


def _batna_lines(brief: NegotiationBrief) -> list[str]:
    """Empty when there is no BATNA: the section is left out."""
    floor = brief.batna_floor
    if floor is None:
        return []
    return [f"**{LABEL_BATNA}**", f"  • BATNA is **{floor} days**"]


def render_summary_skeleton(brief: NegotiationBrief | None) -> str:
    """The complete summary, rendered from the brief. Empty when no supplier
    is loaded."""
    if brief is None or brief.facts is None:
        return ""
    blocks = [
        description_lead(brief.facts.description) or "",
        "\n".join(_overview_lines(brief) + _probability_lines(brief)),
        "\n".join(_argument_lines(brief)),
        "\n".join(_batna_lines(brief)),
    ]
    return "\n\n".join(b for b in blocks if b)


# ── Legacy offline validation ─────────────────────────────────────────────────────────────

_DAY_FIGURE_RE = re.compile(r"\b(\d{1,3})\s*[- ]?days?\b", re.IGNORECASE)
_MONEY_RE = re.compile(r"-?\$\d[\d,]*(?:\.\d+)?[KMB]?")
_PERCENT_RE = re.compile(r"\b\d+(?:\.\d+)?%")


def _plain(text: str) -> str:
    """Markdown emphasis stripped, so a label the model un-bolded still matches."""
    return text.replace("**", "").replace("__", "")


def _figures(text: str) -> dict[str, set[str]]:
    return {
        "days": {m.group(1) for m in _DAY_FIGURE_RE.finditer(text)},
        "money": set(_MONEY_RE.findall(text)),
        "percent": set(_PERCENT_RE.findall(text)),
    }


def missing_summary_labels(draft: str | None, skeleton: str) -> list[str]:
    """Labels the skeleton rendered that the draft dropped, in document order."""
    present = _plain(draft or "")
    rendered = _plain(skeleton)
    return [label for label in ALL_LABELS if label in rendered and label not in present]


def summary_draft_problems(draft: str | None, skeleton: str) -> list[str]:
    """Everything wrong with a draft, each as one sentence the model can act on.

    This legacy diagnostic is retained for offline callers; production summary
    tiers render directly without a model draft. Checked, in order: every label survived; every
    day, money and percentage figure survived; no figure was added; none of the
    struck-out sections came back.
    """
    problems: list[str] = []
    text = draft or ""
    if not text.strip():
        return ["The draft is empty."]

    for label in missing_summary_labels(text, skeleton):
        problems.append(f"The label '{label}' is missing.")

    want, have = _figures(_plain(skeleton)), _figures(_plain(text))
    for kind, unit in (("days", " days"), ("money", ""), ("percent", "")):
        for figure in sorted(want[kind] - have[kind]):
            problems.append(f"The figure '{figure}{unit}' from the briefing is missing.")
        for figure in sorted(have[kind] - want[kind]):
            problems.append(
                f"'{figure}{unit}' is not in the briefing — never add or derive a figure."
            )

    lowered = text.lower()
    for phrase in BANNED_PHRASES:
        if phrase.lower() in lowered:
            problems.append(f"'{phrase}' is not part of the summary — remove it.")
    return problems
