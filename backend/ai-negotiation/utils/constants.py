from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from domain.entities.rag_context import RAGContext

# Transcript truncation limits for chat summary generation.
SUMMARY_TRANSCRIPT_HEAD = 5
SUMMARY_TRANSCRIPT_TAIL = 20
SUMMARY_TRANSCRIPT_MAX_CHARS = 12_000  # ~3k tokens safety cap

# Human-readable labels for every raw SupplierFacts/analysis/calculation field
# name that can appear as a key in a node's `source` dict (the "Source
# details" attribution panel shown to the negotiator). Every `collect_*_sources`
# function in utils/prompts/ routes its keys through `format_source_label` so
# the panel never shows a raw snake_case field name.
SOURCE_FIELD_LABELS: dict[str, str] = {
    # Term decision
    "target_term_days": "Target Payment Term (days)",
    "current_term_days": "Current Payment Term (days)",
    # Canonical label for the BATNA. Across the app this always
    # carries the *effective* (computed) floor value — see the guide/summarize/
    # data-question source builders, which set the value to
    # `effective_batna_term_days` under this one label.
    "batna_term_days": "BATNA (days)",
    "benchmark_term_days": "Industry Benchmark Term (days)",
    "regulatory_max_term_days": "Regulatory Term (days)",
    "regulatory_limit_type": "Regulatory Limit Type",
    "regulatory_applied": "Regulatory Limit Applied",
    # Financial figures
    "spend_volume": "Annual Spend Volume",
    "target_cash_flow": "Cash Flow Unlock at Target Term",
    # Buyer-side economic-profit scenario (domain.services.economic_profit).
    # The two rates are ASSUMPTIONS, not payload figures, and are labelled as
    # such: they move the answer, so a negotiator reading the result is
    # entitled to see what was assumed to produce it.
    "applicable_tax_rate": "Applicable Tax Rate (assumed)",
    "buyer_wacc": "Buyer WACC (assumed)",
    "break_even_price_change": "Break-Even Price Change",
    "compensating_price_change": "Compensating Price Change",
    "wacc_pre_tax": "WACC (Pre-Tax)",
    "wacc_after_tax": "WACC (After-Tax)",
    "scf_rate": "Supply Chain Finance Rate",
    "supplier_financing_rate": "Supplier Financing Rate",
    # Leverage / risk signals
    "buyer_leverage_level": "Buyer Leverage Level",
    "success_probability": "Success Probability",
    "nine_box_term_extension": "Nine-Box Position",
    # Benchmark / peer-comparison figures
    "pay_on_terms_term_days": "Pay-on-Terms Benchmark (days)",
    "buyer_standard_term_days": "Buyer Standard Term (days)",
    "buyer_standard_description": "Buyer Standard Description",
    "supplier_segment_term_days": "Supplier Segment Term (days)",
    "supplier_segment_avg_term_days": "Supplier Segment Average Term (days)",
    "supplier_segment_q3_term_days": "Supplier Segment Q3 Term (days)",
    "supplier_segment_occurrences": "Supplier Segment Sample Size",
    "peer_group_term_days": "Peer Group Term (days)",
    "peer_group_avg_term_days": "Peer Group Average Term (days)",
    "peer_group_q3_term_days": "Peer Group Q3 Term (days)",
    "peer_group_occurrences": "Peer Group Sample Size",
    # Opening-strategy specific signals
    "dso": "Days Sales Outstanding (DSO)",
    "opportunity_term_days": "Payment Terms Opportunity (days)",
    "agreed_terms_with_cash_discounts": "Agreed Term with Cash Discount (days)",
    "agreed_cash_discount_percentage": "Agreed Cash Discount (%)",
    "primary_anchor": "Primary Anchor Term",
    "opening_anchor": "Opening Anchor Term (days)",
    "applied_benchmark": "Applied Strategy Benchmark",
    # Counter-offer calculated figures
    "gross_unlock": "Gross Cash Unlock",
    "cash_gap_vs_target": "Cash Gap vs. Target",
    "ramp_foregone_unlock": "Unlock Foregone During Ramp",
    # Scenario calculation inputs/result
    "extension_days": "Term Extension (days)",
    "term_a": "Term A (days)",
    "term_b": "Term B (days)",
    "target_amount": "Target Cash Amount",
    "ramp_months": "Ramp Period (months)",
    "full_extension_days": "Full Term Extension (days)",
    "modeled_unlock": "Modeled Cash Unlock",
    "result": "Calculated Result",
    # Identity
    "supplier_name": "Supplier Name",
    "country": "Country",
    "industry": "Industry",
    "company_size": "Company Size",
    "rag_results": "RAG Results",
    "formula": "Calculation Formula",
}


def format_camel_label(key: str) -> str:
    """Turn a raw payload key into a spaced Title-Case label.

    e.g. ``industryRegionStandard`` -> ``Industry Region Standard``,
    ``actualPaymentTerms`` -> ``Actual Payment Terms``. Splits camelCase
    boundaries (and acronym→word boundaries like ``WACCPreTax`` -> ``WACC Pre
    Tax``), and treats ``_`` as a word break.
    """
    spaced = re.sub(r"(?<=[a-z0-9])(?=[A-Z])", " ", key)
    spaced = re.sub(r"(?<=[A-Z])(?=[A-Z][a-z])", " ", spaced)
    return spaced.replace("_", " ").strip().title()


# Raw-payload sections whose scalar entries are surfaced verbatim in the source
# panel. ``negotiationStrategy`` is handled separately (its entries are
# ``{value, applied, ...}`` objects, so we surface each one's ``.value``).
_SUPPLIER_DATA_SECTIONS = ("supplier", "target", "agreement", "spend")

# Raw payload keys hidden from the source panel — identifiers/metadata that
# aren't negotiation data the negotiator needs to see.
_SUPPLIER_DATA_EXCLUDE = frozenset({
    "uuid",
    "externalId",
    "providedInternalId",
    "updatedAt",
    "programApplied",
    "url",
    "mainIndustryCode",
    "creditRatingSource",
    "address",
    "entityType",
})


def collect_supplier_data_sources(raw: dict | None) -> dict[str, dict[str, object]]:
    """Flatten the raw supplier payload into source-panel entries.

    Surfaces every non-null scalar under supplier/target/agreement/spend, plus
    each ``negotiationStrategy`` benchmark's ``.value`` — keyed by a formatted
    label (``format_camel_label``) and tagged with its payload path. Null
    values and nested objects/lists are skipped so the panel stays meaningful.
    """
    if not raw:
        return {}

    sources: dict[str, dict[str, object]] = {}

    for section in _SUPPLIER_DATA_SECTIONS:
        data = raw.get(section)
        if not isinstance(data, dict):
            continue
        for key, value in data.items():
            if key in _SUPPLIER_DATA_EXCLUDE or value is None or isinstance(value, (dict, list)):
                continue
            sources[format_camel_label(key)] = {"path": f"{section}.{key}", "value": value}

    strategy = raw.get("negotiationStrategy")
    if isinstance(strategy, dict):
        for key, entry in strategy.items():
            if not isinstance(entry, dict):
                continue
            value = entry.get("value")
            if value is None:
                continue
            sources[format_camel_label(key)] = {
                "path": f"negotiationStrategy.{key}.value",
                "value": value,
            }

    return sources


def format_source_label(name: str) -> str:
    """Human-readable label for a source-attribution field name.

    Looks up `SOURCE_FIELD_LABELS` first; falls back to title-casing the raw
    name (underscores -> spaces) so a field added later without a mapping
    entry still renders as readable text instead of raw snake_case.
    """
    label = SOURCE_FIELD_LABELS.get(name)
    if label is not None:
        return label
    return name.replace("_", " ").strip().title()


def _clean_passage(text: str) -> str:
    """Collapse runs of whitespace/newlines so a passage renders as one clean,
    readable block instead of the source PDF's ragged line breaks. The full
    text is preserved — nothing is truncated."""
    return " ".join((text or "").split())


def collect_rag_source(rag_context: "RAGContext | None") -> dict[str, dict[str, object]]:
    """Source-attribution entry for the retrieved knowledge-base context.

    Returns an empty dict when RAG wasn't run or found nothing, so nodes can
    unconditionally `sources.update(collect_rag_source(rag_context))` without
    an extra branch — only adds the "RAG Results" card when chunks were
    actually retrieved to ground the response.

    Like every other entry in this panel, the card shows a single value — here,
    the single highest-ranked passage (`chunk_file_info[0]`; the list is ordered
    by rerank score, highest first), tagged with its page numbers and
    whitespace-cleaned so it reads as one tidy block rather than the source
    document's ragged line breaks. Nothing is truncated; this is a readability
    pass over the same passage, not a preview.
    """
    if rag_context is None or rag_context.chunk_count == 0:
        return {}

    # `chunk_file_info` is always populated when chunk_count > 0, but fall back
    # to the cleaned full block if a caller ever omits it.
    if rag_context.chunk_file_info:
        top = rag_context.chunk_file_info[0]
        page_numbers = top.get("page_numbers") or []
        pages = ", ".join(str(p) for p in page_numbers) if page_numbers else "N/A"
        value = f"pages {pages}:\n{_clean_passage(str(top.get('text', '')))}"
    else:
        value = _clean_passage(rag_context.context_text)

    return {
        format_source_label("rag_results"): {
            "path": f"rag_query: {rag_context.query!r}",
            "value": value,
        }
    }
