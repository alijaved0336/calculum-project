#!/usr/bin/env python3
"""
DSO Impact Calculator — replicates the Calculum Back-End per-supplier strategy
computation and cash-flow opportunity per strategy.

Source of truth (Back-End paths, for cross-reference):
- src/Statics/Calculations/CashFlowCalculations.php (CF opportunity formula)
- src/Statics/Calculations/CashDiscount/CashDiscountStrategyCalculations.php
- src/Statics/Calculations/Financing/FinancingStrategyCalculations.php
- src/Statics/Calculations/BuyerStandard/BuyerStandardStrategyCalculations.php
- src/Statics/Calculations/CappedStrategy/CappedStrategyCalculations.php
- src/Statics/Calculations/VCard/VCardCalculations.php
- src/Statics/Calculations/ProposedTermsCalculations.php (post-processing order)

Cluster-based strategies (Supplier Standard, Peer Group, SCF, Industry/Region,
Supplier Max, Parent Supplier Max, Regulatory) are NOT recomputed here — they are
read from MongoDB clusters in the Back-End. Pass them as precomputed inputs.


Usage:
cd e2e/test-scripts
source venv/bin/activate
python test-dso-impact.py --input sample-supplier.json
python test-dso-impact.py --input sample-supplier.json --dso-delta 15
python test-dso-impact.py --volume 500000 --actual-payment-terms 45 \
    --supplier-standard 90 --peer-group-avg 75 --buyer-leverage-level HIGH

JSON Format (every key below maps 1:1 to a SupplierInputs field; extras are
silently dropped by from_dict()). The fields below are NOT included because
this example uses financing_method=FINANCIAL_RATE and is_auto_base_rate=false;
add them when needed:
  - "pre_tax_wacc": float    (only if financing_method == "WACC_BEFORE_TAX")
  - "after_tax_wacc": float  (only if financing_method == "WACC_AFTER_TAX")
  - "cpt_base_rate": float   (only if financing_is_auto_base_rate == true)

{
  "pre_tax_wacc": 0.04,
  "after_tax_wacc": 0.03,
  "cpt_base_rate": 0.05,
  "volume": 1000000,
  "currency_rate": 1.0,
  "period": 365,
  "actual_payment_terms": 30,
  "contractual_actual": 30,
  "contractual_pt_without_cd": 45,
  "contractual_pt_with_cd": 30,
  "cash_discount": 0.02,
  "avg_days_to_approve_invoice": 5,
  "financing_enabled": true,
  "financing_method": "FINANCIAL_RATE",
  "funding_cost": 0.10,
  "financing_base_rate": 5.0,
  "financing_funding_spread": 3.0,
  "financing_is_auto_base_rate": false,
  "supplier_standard": 75,
  "peer_group_avg": 60,
  "industry_region_standard": 70,
  "industry_group": 65,
  "region_group": 55,
  "scf_standard": 90,
  "supplier_max": 60,
  "parent_supplier_max": 75,
  "regulatory_terms": 120,
  "buyer_standard_terms": 60,
  "buyer_standard_behavior": "LOW_LIMIT",
  "buyer_leverage_level": "MEDIUM",
  "capped_allowed": true,
  "vcard_applied": false,
  "vcard_avg_term_reduction": 0,
  "vcard_allows_term_extension": true,
  "program_excluded": false
}
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, Any

try:
    from tabulate import tabulate
except ImportError:
    tabulate = None  # falls back to plain text


# Confirmed constant in Back-End: CashFlowCalculations uses period=365 in tests,
# DsoStrategyCalculations defines DAYS_PER_YEAR=365. APPROVAL_TIME_VALUE_DEFAULT
# is the fallback when avg_days_to_approve_invoice is null in the SQL.
DAYS_PER_YEAR = 365
APPROVAL_TIME_VALUE_DEFAULT = 0  # placeholder — set via CLI if your Program differs


class FinancingMethod(str, Enum):
    FINANCIAL_RATE = "FINANCIAL_RATE"
    WACC_BEFORE_TAX = "WACC_BEFORE_TAX"
    WACC_AFTER_TAX = "WACC_AFTER_TAX"


class BuyerStandardBehavior(str, Enum):
    LOW_LIMIT = "LOW_LIMIT"
    HIGH_LIMIT = "HIGH_LIMIT"
    EXACT_NUMBER = "EXACT_NUMBER"
    ONLY_REFERENCE = "ONLY_REFERENCE"


class BuyerLeverageLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


@dataclass
class SupplierInputs:
    # --- Spend baseline (used by CF opportunity formula) ---
    volume: float
    actual_payment_terms: int  # current DSO baseline. Shifted by --dso-delta.
    currency_rate: float = 1.0
    period: int = DAYS_PER_YEAR

    # --- Fields feeding closed-form strategies ---
    contractual_actual: Optional[int] = None       # Capped + IRS reference fallback
    contractual_pt_without_cd: Optional[int] = None  # POT + FN reference
    contractual_pt_with_cd: Optional[int] = None     # CD strategy input
    cash_discount: float = 0.0                       # 0..1
    avg_days_to_approve_invoice: Optional[int] = None

    # --- Financing strategy inputs ---
    financing_enabled: bool = False
    financing_method: FinancingMethod = FinancingMethod.FINANCIAL_RATE
    pre_tax_wacc: Optional[float] = None       # fraction, e.g. 0.10 = 10%
    after_tax_wacc: Optional[float] = None
    funding_cost: Optional[float] = None       # from CalculatedPaymentTerms.funding_cost
    financing_base_rate: Optional[float] = None     # percent points, e.g. 5.0 = 5%
    financing_funding_spread: Optional[float] = None  # percent points
    financing_is_auto_base_rate: bool = False
    cpt_base_rate: Optional[float] = None      # fraction; multiplied by 100 if auto

    # --- Precomputed cluster / lookup strategy values (days) ---
    supplier_standard: Optional[int] = None
    peer_group_avg: Optional[int] = None
    industry_region_standard: Optional[int] = None
    industry_group: Optional[int] = None
    region_group: Optional[int] = None
    scf_standard: Optional[int] = None
    supplier_max: Optional[int] = None
    parent_supplier_max: Optional[int] = None
    regulatory_terms: Optional[int] = None

    # --- Buyer Standard (post-processing) ---
    buyer_standard_terms: Optional[int] = None
    buyer_standard_behavior: Optional[BuyerStandardBehavior] = None

    # --- Capped (post-processing) ---
    buyer_leverage_level: Optional[BuyerLeverageLevel] = None
    capped_allowed: bool = True

    # --- VCard (post-processing) ---
    vcard_applied: bool = False
    vcard_avg_term_reduction: int = 0
    vcard_allows_term_extension: bool = True

    # --- Program flags ---
    program_excluded: bool = False  # if true, post-processing resets to contractual_actual

    @classmethod
    def from_dict(cls, data: dict) -> "SupplierInputs":
        # Convert enum strings if present
        if "financing_method" in data and isinstance(data["financing_method"], str):
            data["financing_method"] = FinancingMethod(data["financing_method"])
        if "buyer_standard_behavior" in data and isinstance(data["buyer_standard_behavior"], str):
            data["buyer_standard_behavior"] = BuyerStandardBehavior(data["buyer_standard_behavior"])
        if "buyer_leverage_level" in data and isinstance(data["buyer_leverage_level"], str):
            data["buyer_leverage_level"] = BuyerLeverageLevel(data["buyer_leverage_level"])
        # Drop unknown keys to be permissive
        known = {f for f in cls.__dataclass_fields__}
        clean = {k: v for k, v in data.items() if k in known}
        return cls(**clean)


# ============================================================================
# Strategy calculators (closed-form replicas of the PHP logic)
# ============================================================================

def calc_actual_terms(s: SupplierInputs) -> int:
    """AT — actual payment terms passthrough (== current DSO baseline)."""
    return s.actual_payment_terms


def calc_contractual_terms(s: SupplierInputs) -> Optional[int]:
    """CT — contractual_actual (or actual_payment_terms fallback)."""
    return s.contractual_actual if s.contractual_actual is not None else s.actual_payment_terms


def calc_pay_on_terms(s: SupplierInputs) -> Optional[int]:
    """POT — contractual_payment_terms_without_cash_discounts passthrough."""
    return s.contractual_pt_without_cd


def _financing_rate(s: SupplierInputs) -> Optional[float]:
    """Returns the supplier financial rate per the company financing method.
    Replicates getFinancingRate() in CashDiscountStrategyCalculations.php."""
    if s.financing_method == FinancingMethod.FINANCIAL_RATE:
        return s.funding_cost
    if s.financing_method == FinancingMethod.WACC_BEFORE_TAX:
        return s.pre_tax_wacc
    if s.financing_method == FinancingMethod.WACC_AFTER_TAX:
        return s.after_tax_wacc
    return None


def calc_cash_discount_conversion(s: SupplierInputs) -> Optional[int]:
    """CD — replicates CashDiscountStrategyCalculations.getStrategyTermsOnSpend().

    Formula (when applicable):
        gross_spend = volume / (1 - cash_discount)
        rate        = supplier financial rate (per financing_method)
        conversion  = (cash_discount * gross_spend * 365) / (gross_spend * rate)
                      + contractual_pt_with_cd
        result      = clamp(round(conversion), 0, 365)
    """
    cwcd = s.contractual_pt_with_cd
    cd = s.cash_discount

    if cd == 0.0:
        return None if cwcd is None else max(min(cwcd, 365), 0)

    if cwcd is None or s.volume == 0:
        return None

    gross_spend = s.volume / (1.0 - cd)
    rate = _financing_rate(s)

    if rate is None or gross_spend * rate == 0.0:
        return max(min(cwcd, 365), 0)

    conversion = (cd * gross_spend * 365.0) / (gross_spend * rate) + cwcd
    return max(min(int(round(conversion)), 365), 0)


def calc_financing(s: SupplierInputs) -> Optional[int]:
    """FN — replicates FinancingStrategyCalculations SQL.

    SQL (default = FINANCIAL_RATE):
        CASE
          WHEN financing_group_id IS NULL THEN NULL
          WHEN coalesce(contractual_pt_without_cd, actual_payment_terms)
               > coalesce(avg_days_to_approve_invoice, default) THEN
            greatest(least(ceil(
              (coalesce(contractual_pt_without_cd, actual_payment_terms)
               - coalesce(avg_days_to_approve_invoice, default)
              ) * rate / ((funding_spread + base_rate) / 100)
            ) + coalesce(avg_days_to_approve_invoice, default), 365), 0)
          ELSE 0
        END
    """
    if not s.financing_enabled:
        return None

    rate = _financing_rate(s)
    if rate is None or rate == 0.0:
        return None
    if s.financing_funding_spread is None or s.financing_base_rate is None:
        return None
    # SQL guards: cpt.funding_cost != 0 is required for the row to enter the update.
    if s.financing_method == FinancingMethod.FINANCIAL_RATE and (s.funding_cost or 0) == 0:
        return None

    contractual_or_actual = s.contractual_pt_without_cd if s.contractual_pt_without_cd is not None else s.actual_payment_terms
    approval = s.avg_days_to_approve_invoice if s.avg_days_to_approve_invoice is not None else APPROVAL_TIME_VALUE_DEFAULT

    base_rate_pct = (
        (s.cpt_base_rate * 100.0) if (s.financing_is_auto_base_rate and s.cpt_base_rate is not None)
        else s.financing_base_rate
    )
    divisor = (s.financing_funding_spread + base_rate_pct) / 100.0
    if divisor == 0:
        return None

    if contractual_or_actual <= approval:
        return 0

    raw = (contractual_or_actual - approval) * rate / divisor
    days = math.ceil(raw) + approval
    return max(min(days, 365), 0)


def calc_buyer_standard(s: SupplierInputs, proposed: int) -> int:
    """BS post-processing — replicates BuyerStandardStrategyCalculations."""
    if s.buyer_standard_terms is None or s.buyer_standard_behavior is None:
        return proposed
    strategy = s.buyer_standard_terms
    b = s.buyer_standard_behavior
    if b == BuyerStandardBehavior.LOW_LIMIT:
        return max(proposed, strategy)
    if b == BuyerStandardBehavior.HIGH_LIMIT:
        return min(proposed, strategy)
    if b == BuyerStandardBehavior.EXACT_NUMBER:
        return strategy
    if b == BuyerStandardBehavior.ONLY_REFERENCE:
        return proposed
    return proposed


# Reproduced 1:1 from CappedStrategyCalculations::OPPORTUNITY_ARRAY
CAPPED_OPPORTUNITY_ARRAY = [
    # >=    <=     LOW   MED   HIGH
    (105, 99999, 150, 150, 150),
    (90, 104, 135, 150, 150),
    (75, 89, 120, 120, 150),
    (60, 74, 90, 120, 120),
    (45, 59, 75, 90, 120),
    (30, 44, 60, 75, 120),
    (15, 29, 45, 60, 90),
    (0, 14, 30, 45, 60),
]


def _guess_capped(level: Optional[BuyerLeverageLevel], proposed: int,
                  contractual_actual: int) -> Optional[int]:
    """Replicates CappedStrategyCalculations::guessCappedTermsStrategy().
    NOTE: the PHP lookup uses `row[1] <= contractualActual` (upper-bound check),
    so values that sit on a bucket boundary map to the bucket directly BELOW.
    This is faithful to current Back-End behavior."""
    if level is None:
        return None
    if contractual_actual > 150:
        return 150 if proposed > 150 else None
    found = next((r for r in CAPPED_OPPORTUNITY_ARRAY if r[1] <= contractual_actual), None)
    if found is None:
        return None
    cap_index = {BuyerLeverageLevel.LOW: 2,
                 BuyerLeverageLevel.MEDIUM: 3,
                 BuyerLeverageLevel.HIGH: 4}[level]
    cap = found[cap_index]
    return cap if proposed > cap else None


def calc_capped(s: SupplierInputs, proposed: int) -> tuple[int, Optional[int]]:
    """Capped post-processing — returns (adjusted_terms, capped_strategy_value)."""
    if not s.capped_allowed:
        return proposed, None
    contractual_actual = s.contractual_actual if s.contractual_actual is not None else s.actual_payment_terms
    cap = _guess_capped(s.buyer_leverage_level, proposed, contractual_actual)
    if cap is not None and cap < proposed:
        return cap, cap
    return proposed, cap


def calc_regulatory(s: SupplierInputs, proposed: int) -> tuple[int, Optional[int]]:
    """RT post-processing — applies regulatory_terms cap if smaller than proposed.
    NOTE: real Back-End logic considers ENFORCE/PROMOTED modality and methods,
    not modeled here. Pass the precomputed regulatory_terms as the cap."""
    if s.regulatory_terms is None:
        return proposed, None
    if s.regulatory_terms < proposed:
        return s.regulatory_terms, s.regulatory_terms
    return proposed, None


def calc_vcard(s: SupplierInputs, proposed: int) -> tuple[int, Optional[int]]:
    """VCard post-processing — replicates VCardCalculations.tryApplyRegulationOnTerms()."""
    # Apply rule: use contractual/actual instead of max when extension is blocked
    if s.vcard_applied and not s.vcard_allows_term_extension:
        contractual_actual = s.contractual_actual if s.contractual_actual is not None else s.actual_payment_terms
        proposed = contractual_actual

    if not s.vcard_applied:
        return proposed, None

    adjusted = max(0, proposed - s.vcard_avg_term_reduction)
    return adjusted, adjusted


# ============================================================================
# Cash Flow Opportunity (CashFlowCalculations::cashFlowOpportunity)
# ============================================================================

def cash_flow_opportunity(volume: float, period: Optional[int],
                          actual_terms: Optional[int],
                          strategy_value: Optional[int],
                          currency_rate: float) -> Optional[float]:
    """Replicates CashFlowCalculations::cashFlowOpportunity exactly.

    Returns round((volume * currency_rate / period) * (strategy_value - actual_terms), 1).
    Returns None when strategy_value or period is None; returns 0 when period <= 0.
    """
    if strategy_value is None or period is None:
        return None
    if period <= 0:
        return 0.0
    actual = actual_terms if actual_terms is not None else 0
    return round((volume * currency_rate / period) * (strategy_value - actual), 1)


# ============================================================================
# Orchestration
# ============================================================================

# Order matches the PHP STRATEGY_NAME_INDEXES_VALID winning-strategy iteration.
# Post-processing strategies (BS, Capped, RT, VCard) are computed AFTER the max.
MAIN_STRATEGIES = [
    ("actualTerms", calc_actual_terms),
    ("contractualTerms", calc_contractual_terms),
    ("payOnTerms", calc_pay_on_terms),
    ("supplierMax", lambda s: s.supplier_max),
    ("parentSupplierMax", lambda s: s.parent_supplier_max),
    ("industryGroup", lambda s: s.industry_group),
    ("regionGroup", lambda s: s.region_group),
    ("industryRegionStandard", lambda s: s.industry_region_standard),
    ("supplierStandard", lambda s: s.supplier_standard),
    ("peerGroupAvg", lambda s: s.peer_group_avg),
    ("financing", calc_financing),
    ("scfStandard", lambda s: s.scf_standard),
    ("cashDiscountConversion", calc_cash_discount_conversion),
]


def compute(s: SupplierInputs) -> dict:
    """Returns a dict with:
      - per_strategy: list of {name, days, cash_flow_opportunity}
      - proposed_terms_max: max of valid strategy days (pre post-processing)
      - winning_strategy: name of the first strategy matching the max
      - post_processing: ordered list of {step, terms_after, cash_flow_opportunity}
      - final_terms: terms after the full post-processing chain
      - final_cash_flow_opportunity: CF at final_terms
    """
    main_results = []
    for name, fn in MAIN_STRATEGIES:
        days = fn(s)
        cf = cash_flow_opportunity(s.volume, s.period, s.actual_payment_terms, days, s.currency_rate)
        main_results.append({"name": name, "days": days, "cash_flow_opportunity": cf})

    valid_days = [r["days"] for r in main_results if r["days"] is not None]
    proposed = max(valid_days) if valid_days else None
    winner = next((r["name"] for r in main_results if r["days"] == proposed), None) if proposed is not None else None

    post = []
    current = proposed if proposed is not None else 0

    # 1) Buyer Standard
    bs_after = calc_buyer_standard(s, current)
    post.append({
        "step": "buyerStandard",
        "input": current,
        "output": bs_after,
        "applied": bs_after != current,
        "cash_flow_opportunity": cash_flow_opportunity(s.volume, s.period, s.actual_payment_terms, bs_after, s.currency_rate),
    })
    current = bs_after

    # 2) Capped
    capped_after, capped_value = calc_capped(s, current)
    post.append({
        "step": "cappedTerms",
        "input": current,
        "output": capped_after,
        "applied": capped_after != current,
        "strategy_value": capped_value,
        "cash_flow_opportunity": cash_flow_opportunity(s.volume, s.period, s.actual_payment_terms, capped_after, s.currency_rate),
    })
    current = capped_after

    # 3) Regulatory
    reg_after, reg_value = calc_regulatory(s, current)
    post.append({
        "step": "regulatoryTerms",
        "input": current,
        "output": reg_after,
        "applied": reg_after != current,
        "strategy_value": reg_value,
        "cash_flow_opportunity": cash_flow_opportunity(s.volume, s.period, s.actual_payment_terms, reg_after, s.currency_rate),
    })
    current = reg_after

    # 4) VCard
    vcard_after, vcard_value = calc_vcard(s, current)
    post.append({
        "step": "vCard",
        "input": current,
        "output": vcard_after,
        "applied": vcard_after != current,
        "strategy_value": vcard_value,
        "cash_flow_opportunity": cash_flow_opportunity(s.volume, s.period, s.actual_payment_terms, vcard_after, s.currency_rate),
    })
    current = vcard_after

    # 5) Excluded program override (resets to contractual_actual)
    if s.program_excluded:
        contractual_actual = s.contractual_actual if s.contractual_actual is not None else s.actual_payment_terms
        post.append({
            "step": "programExcluded",
            "input": current,
            "output": contractual_actual,
            "applied": contractual_actual != current,
            "cash_flow_opportunity": cash_flow_opportunity(s.volume, s.period, s.actual_payment_terms, contractual_actual, s.currency_rate),
        })
        current = contractual_actual

    return {
        "inputs": {
            "actual_payment_terms": s.actual_payment_terms,
            "volume": s.volume,
            "currency_rate": s.currency_rate,
            "period": s.period,
        },
        "per_strategy": main_results,
        "proposed_terms_max": proposed,
        "winning_strategy": winner,
        "post_processing": post,
        "final_terms": current,
        "final_cash_flow_opportunity": cash_flow_opportunity(
            s.volume, s.period, s.actual_payment_terms, current, s.currency_rate
        ),
    }


# ============================================================================
# CLI / output
# ============================================================================

def _fmt_money(x):
    if x is None:
        return "—"
    return f"{x:,.1f}"


def _fmt_days(x):
    if x is None:
        return "—"
    return str(x)


def render_text(result: dict, label: str = "") -> str:
    lines = []
    if label:
        lines.append(f"\n=== {label} ===")
    inp = result["inputs"]
    lines.append(
        f"DSO baseline: {inp['actual_payment_terms']} d | "
        f"volume: {_fmt_money(inp['volume'])} | "
        f"FX: {inp['currency_rate']} | period: {inp['period']}"
    )
    lines.append("")

    rows = [
        (r["name"], _fmt_days(r["days"]), _fmt_money(r["cash_flow_opportunity"]))
        for r in result["per_strategy"]
    ]
    headers = ["Strategy", "Days", "Cash Flow Opportunity"]
    if tabulate:
        lines.append(tabulate(rows, headers=headers, tablefmt="github"))
    else:
        lines.append(" | ".join(headers))
        for row in rows:
            lines.append(" | ".join(row))

    lines.append("")
    lines.append(f"Proposed (max of strategies): {_fmt_days(result['proposed_terms_max'])} d "
                 f"→ winner: {result['winning_strategy']}")
    lines.append("")
    lines.append("Post-processing chain:")
    pp_rows = []
    for step in result["post_processing"]:
        applied = "✓" if step["applied"] else ""
        pp_rows.append((
            step["step"],
            _fmt_days(step["input"]),
            _fmt_days(step["output"]),
            applied,
            _fmt_money(step["cash_flow_opportunity"]),
        ))
    pp_headers = ["Step", "In (d)", "Out (d)", "Applied", "CF Opportunity"]
    if tabulate:
        lines.append(tabulate(pp_rows, headers=pp_headers, tablefmt="github"))
    else:
        lines.append(" | ".join(pp_headers))
        for row in pp_rows:
            lines.append(" | ".join(str(c) for c in row))
    lines.append("")
    lines.append(f"FINAL terms: {_fmt_days(result['final_terms'])} d   |   "
                 f"FINAL CF opportunity: {_fmt_money(result['final_cash_flow_opportunity'])}")
    return "\n".join(lines)


def render_delta(before: dict, after: dict, delta: int) -> str:
    lines = [f"\n=== DSO impact: Δ = {delta:+d} days ==="]
    rows = []
    by_name_before = {r["name"]: r for r in before["per_strategy"]}
    by_name_after = {r["name"]: r for r in after["per_strategy"]}
    for r in after["per_strategy"]:
        b = by_name_before[r["name"]]
        d_days = (r["days"] - b["days"]) if (r["days"] is not None and b["days"] is not None) else None
        d_cf = (r["cash_flow_opportunity"] - b["cash_flow_opportunity"]) if (
            r["cash_flow_opportunity"] is not None and b["cash_flow_opportunity"] is not None) else None
        rows.append((
            r["name"],
            _fmt_days(b["days"]), _fmt_days(r["days"]),
            (f"{d_days:+d}" if d_days is not None else "—"),
            _fmt_money(b["cash_flow_opportunity"]), _fmt_money(r["cash_flow_opportunity"]),
            (f"{d_cf:+,.1f}" if d_cf is not None else "—"),
        ))
    headers = ["Strategy", "Days (pre)", "Days (post)", "Δd",
               "CF (pre)", "CF (post)", "ΔCF"]
    if tabulate:
        lines.append(tabulate(rows, headers=headers, tablefmt="github"))
    else:
        lines.append(" | ".join(headers))
        for row in rows:
            lines.append(" | ".join(str(c) for c in row))
    lines.append("")
    bp = before["proposed_terms_max"]
    ap = after["proposed_terms_max"]
    bf = before["final_terms"]
    af = after["final_terms"]
    bcf = before["final_cash_flow_opportunity"]
    acf = after["final_cash_flow_opportunity"]
    lines.append(f"Proposed (max): {_fmt_days(bp)} → {_fmt_days(ap)} "
                 f"(Δ {ap-bp if (ap is not None and bp is not None) else '—'})")
    lines.append(f"Winner: {before['winning_strategy']} → {after['winning_strategy']}")
    lines.append(f"FINAL terms: {_fmt_days(bf)} → {_fmt_days(af)} "
                 f"(Δ {af-bf if (af is not None and bf is not None) else '—'})")
    lines.append(f"FINAL CF opportunity: {_fmt_money(bcf)} → {_fmt_money(acf)} "
                 f"(Δ {f'{acf-bcf:+,.1f}' if (acf is not None and bcf is not None) else '—'})")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
        description="Calculum DSO impact calculator (per-strategy days + CF opportunity).",
    )
    p.add_argument("--input", type=str, help="Path to JSON file with supplier inputs (alternative to CLI flags).")
    p.add_argument("--format", choices=["text", "json"], default="text")
    p.add_argument("--dso-delta", type=int, default=0,
                   help="Shift actualPaymentTerms by this many days and show before/after.")

    # Required when not using --input
    p.add_argument("--volume", type=float)
    p.add_argument("--actual-payment-terms", type=int, dest="actual_payment_terms")

    # Optional spend fields
    p.add_argument("--currency-rate", type=float, default=1.0, dest="currency_rate")
    p.add_argument("--period", type=int, default=DAYS_PER_YEAR)
    p.add_argument("--contractual-actual", type=int, dest="contractual_actual")
    p.add_argument("--contractual-pt-without-cd", type=int, dest="contractual_pt_without_cd")
    p.add_argument("--contractual-pt-with-cd", type=int, dest="contractual_pt_with_cd")
    p.add_argument("--cash-discount", type=float, default=0.0, dest="cash_discount")
    p.add_argument("--avg-days-to-approve-invoice", type=int, dest="avg_days_to_approve_invoice")

    # Financing
    p.add_argument("--financing-enabled", action="store_true", dest="financing_enabled")
    p.add_argument("--financing-method", choices=[m.value for m in FinancingMethod],
                   default=FinancingMethod.FINANCIAL_RATE.value, dest="financing_method")
    p.add_argument("--pre-tax-wacc", type=float, dest="pre_tax_wacc")
    p.add_argument("--after-tax-wacc", type=float, dest="after_tax_wacc")
    p.add_argument("--funding-cost", type=float, dest="funding_cost")
    p.add_argument("--financing-base-rate", type=float, dest="financing_base_rate")
    p.add_argument("--financing-funding-spread", type=float, dest="financing_funding_spread")
    p.add_argument("--financing-is-auto-base-rate", action="store_true", dest="financing_is_auto_base_rate")
    p.add_argument("--cpt-base-rate", type=float, dest="cpt_base_rate")

    # Precomputed cluster / lookup values
    p.add_argument("--supplier-standard", type=int, dest="supplier_standard")
    p.add_argument("--peer-group-avg", type=int, dest="peer_group_avg")
    p.add_argument("--industry-region-standard", type=int, dest="industry_region_standard")
    p.add_argument("--industry-group", type=int, dest="industry_group")
    p.add_argument("--region-group", type=int, dest="region_group")
    p.add_argument("--scf-standard", type=int, dest="scf_standard")
    p.add_argument("--supplier-max", type=int, dest="supplier_max")
    p.add_argument("--parent-supplier-max", type=int, dest="parent_supplier_max")
    p.add_argument("--regulatory-terms", type=int, dest="regulatory_terms")

    # Buyer Standard
    p.add_argument("--buyer-standard-terms", type=int, dest="buyer_standard_terms")
    p.add_argument("--buyer-standard-behavior", choices=[b.value for b in BuyerStandardBehavior],
                   dest="buyer_standard_behavior")

    # Capped
    p.add_argument("--buyer-leverage-level", choices=[l.value for l in BuyerLeverageLevel],
                   dest="buyer_leverage_level")
    p.add_argument("--capped-disabled", action="store_false", dest="capped_allowed")

    # VCard
    p.add_argument("--vcard-applied", action="store_true", dest="vcard_applied")
    p.add_argument("--vcard-avg-term-reduction", type=int, default=0, dest="vcard_avg_term_reduction")
    p.add_argument("--vcard-blocks-extension", action="store_false", dest="vcard_allows_term_extension")

    # Program
    p.add_argument("--program-excluded", action="store_true", dest="program_excluded")

    return p


def args_to_inputs(args: argparse.Namespace) -> SupplierInputs:
    if args.input:
        with open(args.input) as f:
            data = json.load(f)
        return SupplierInputs.from_dict(data)

    if args.volume is None or args.actual_payment_terms is None:
        raise SystemExit("--volume and --actual-payment-terms are required when --input is not used.")

    return SupplierInputs(
        volume=args.volume,
        actual_payment_terms=args.actual_payment_terms,
        currency_rate=args.currency_rate,
        period=args.period,
        contractual_actual=args.contractual_actual,
        contractual_pt_without_cd=args.contractual_pt_without_cd,
        contractual_pt_with_cd=args.contractual_pt_with_cd,
        cash_discount=args.cash_discount,
        avg_days_to_approve_invoice=args.avg_days_to_approve_invoice,
        financing_enabled=args.financing_enabled,
        financing_method=FinancingMethod(args.financing_method),
        pre_tax_wacc=args.pre_tax_wacc,
        after_tax_wacc=args.after_tax_wacc,
        funding_cost=args.funding_cost,
        financing_base_rate=args.financing_base_rate,
        financing_funding_spread=args.financing_funding_spread,
        financing_is_auto_base_rate=args.financing_is_auto_base_rate,
        cpt_base_rate=args.cpt_base_rate,
        supplier_standard=args.supplier_standard,
        peer_group_avg=args.peer_group_avg,
        industry_region_standard=args.industry_region_standard,
        industry_group=args.industry_group,
        region_group=args.region_group,
        scf_standard=args.scf_standard,
        supplier_max=args.supplier_max,
        parent_supplier_max=args.parent_supplier_max,
        regulatory_terms=args.regulatory_terms,
        buyer_standard_terms=args.buyer_standard_terms,
        buyer_standard_behavior=BuyerStandardBehavior(args.buyer_standard_behavior) if args.buyer_standard_behavior else None,
        buyer_leverage_level=BuyerLeverageLevel(args.buyer_leverage_level) if args.buyer_leverage_level else None,
        capped_allowed=args.capped_allowed,
        vcard_applied=args.vcard_applied,
        vcard_avg_term_reduction=args.vcard_avg_term_reduction,
        vcard_allows_term_extension=args.vcard_allows_term_extension,
        program_excluded=args.program_excluded,
    )


def main(argv=None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    base = args_to_inputs(args)
    before = compute(base)

    if args.dso_delta != 0:
        shifted_dict = asdict(base)
        # Strip enum values (asdict converts them to instances, fine for re-construction)
        shifted_dict["actual_payment_terms"] = base.actual_payment_terms + args.dso_delta
        shifted = SupplierInputs(**{k: v for k, v in shifted_dict.items()})
        after = compute(shifted)

        if args.format == "json":
            print(json.dumps({
                "delta_days": args.dso_delta,
                "before": before,
                "after": after,
            }, indent=2, default=str))
        else:
            print(render_text(before, label=f"BEFORE — DSO = {base.actual_payment_terms} d"))
            print(render_text(after, label=f"AFTER  — DSO = {base.actual_payment_terms + args.dso_delta} d"))
            print(render_delta(before, after, args.dso_delta))
    else:
        if args.format == "json":
            print(json.dumps(before, indent=2, default=str))
        else:
            print(render_text(before))

    return 0


if __name__ == "__main__":
    sys.exit(main())
