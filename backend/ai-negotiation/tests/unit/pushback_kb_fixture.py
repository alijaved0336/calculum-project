"""A slice of the client's pushback playbook, as the knowledge base stores it.

Text copied from the live KB (categories 4, 13, 15 and 16 of
"20260602_AI- Negotiation Playbook.pdf"), shortened, with the extraction's
artefacts left in on purpose: private-use glyphs for brackets and parentheses
(``\\ue083Proposed Term]``, ``\\ue081SCF\\ue082``), curly/modifier quotes, bare
page-number lines, a glued footnote marker, and chunks that overlap the way the
recursive splitter overlaps them.
"""
from __future__ import annotations

from domain.entities.pushback import PushbackCategory
from domain.entities.retrieval_result import RetrievalResult
from domain.services.pushback_playbook_parser import (
    parse_pushback_categories,
    stitch_chunks,
)

FILE_ID = "59056fa1-9013-4566-acde-ec6386e35ecb"
FILENAME = "20260602_AI- Negotiation Playbook.pdf"

DOCUMENT = (
    "Persona\n"
    "4 Inventory\n"
    "The supplier is highlighting a liquidity gap where they have already spent cash on raw materials long before you even receive the finished goods.\n"
    "Tags:\n"
    "Inventory, Finished Goods, Pre-Fund Raw Material, Warehouse\n"
    "4.S Supplier Pushback Argument\n"
    "4.S.1 “We must pre-fund raw material before production. By, increasing payment terms, you extend our total cash-outlay period, creating a liquidity gap we cannot financially sustain.ˮ\n"
    "4.B Buyer Counter Arguments\n"
    "4.B.1 Total Cost of Ownership\n"
    "Acknowledge the cost of the cash gap but trade it for other high-value concessions like high future and stable spend volumes with the supplier.\n"
    "The Argument:\n"
    "\"We recognize the financing burden, and we are willing to offer a commitment for future and stable spend volume with you as a strategic supplier in exchange for the Proposed Term] days terms, giving you a security to\n"
    "support your business.\"\n"
    "13 Raw Material Volatility\n"
    "Suppliers often have to pay for raw materials at the spot price on early terms; they will argue they cannot carry that cost for longer payment terms.\n"
    "13.S Supplier Pushback Argument\n"
    "13.S.1 “Because we must purchase commodities at fluctuating spot prices, we cannot carry that high-cost debt for the Proposed Term] days.ˮ\n"
    "13.B Buyer Counter Arguments - Add more arguments\n"
    "13.B.1 Pass-Through Payments\n"
    "You could pay the portion of the raw materials almost immediately, but keep the supplierʼs labor, and overhead on your long terms.\n"
    "The Argument:\n"
    "\"To solve the price problem, we can settle the raw material costs on the same terms based on verified market rates, provided the remaining value-add and margin portion of the invoice remains on Proposed Term] days.\"\n"
    "15 DSO Days Sales Outstanding\n"
    "Suppliers often have KPIs tied to keeping DSO Days Sales Outstanding low.\n"
    "15.S Supplier Pushback Argument\n"
    "15.S.1 “Our KPIs and financial targets are tied to our DSO; formally moving to Proposed Term] days would cause us to miss our KPIs and negatively impact our valuation.ˮ\n"
    "15.B Buyer Counter Arguments\n"
    "15.B.1 Early Payments\n"
    "Offer to make one-time early payments at the end of their fiscal year or quarter, while keeping Proposed Term] days for the rest of the year.\n"
    "The Argument:\n"
    "\"We can agree to early payments at the close of your financial year, provided our new standard Proposed Term] days remain in place for all other months.\"\n"
    "15.B.SCF Non-Recourse Receivables Purchase\n"
    "Use a specific type of Supply Chain Finance SCF where a bank \"buys\" the invoice from the supplier without the right to return it.\n"
    "The Argument:\n"
    "\"We can implement Non-Recourse Supply Chain Finance; because the bank 'purchases' the asset from you immediately, you can de-recognize the receivable from your balance sheet.\"\n"
    "16 Cost of Factoring\n"
    "If the supplier sells its invoices to a financial institution to get early payment, the fee increases as the payment term lengthens.\n"
    "16.S Supplier Pushback Argument\n"
    "10\n"
    "16.S.1 “Our factoring company charges us a fee for every additional day an invoice is outstanding; moving to Proposed Term] days increases our financing cost.ˮ1\n"
    "16.B Buyer Counter Arguments Add more arguments\n"
    "16.B.1 Volume-Based Margin Recovery\n"
    "Offer a small increase in volume that generates enough profits to cover the interest costs they are paying to get paid early.\n"
    "The Argument:\n"
    "\"We will increase our annual spend by X% to ensure your total profit with us grows, while we maintain our global Proposed Term] days standard.\"\n"
    "16.B.SCF Rate Arbitrage\n"
    "Traditional factoring is often the \"last resort\" for cash-strapped companies; offer our SCF program instead.\n"
    "The Argument:\n"
    "\"Your financial partner is most likely charging you a high financing rate. By using our SCF program, you can liquidate our invoices at our prime corporate rate.\"\n"
)

# (start marker, end marker, overlap with the previous chunk, pages)
_CUTS = (
    (None, "13.S Supplier", 0, [4]),
    ("13.S Supplier", "15.B.SCF", 64, [9, 10]),
    ("15.B.SCF", None, 41, [10, 11]),
)


def fixture_chunks() -> list[RetrievalResult]:
    """The document as three overlapping chunks, linked, listed out of order."""
    chunks: list[RetrievalResult] = []
    for index, (start_marker, end_marker, overlap, pages) in enumerate(_CUTS):
        start = DOCUMENT.index(start_marker) - overlap if start_marker else 0
        end = DOCUMENT.index(end_marker) if end_marker else len(DOCUMENT)
        chunks.append(RetrievalResult(
            id=f"chunk-{index}",
            score=0.0,
            text=DOCUMENT[start:end],
            file_id=FILE_ID,
            chunk_type="recursive",
            page_numbers=pages,
            prev_id=f"chunk-{index - 1}" if index else None,
            next_id=f"chunk-{index + 1}" if index + 1 < len(_CUTS) else None,
            metadata={"filename": FILENAME},
        ))
    return list(reversed(chunks))


def fixture_kb() -> dict[str, PushbackCategory]:
    """The parsed categories, keyed as the knowledge service keys them."""
    text, spans = stitch_chunks(fixture_chunks())
    return {
        category.key: category
        for category in parse_pushback_categories(
            text, spans, file_id=FILE_ID, filename=FILENAME
        )
    }
