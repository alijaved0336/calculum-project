from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from domain.entities.context import SupplierContext

SUMMARY_SYSTEM = (
    "You are a procurement negotiation analyst. "
    "Given a conversation transcript, produce a concise structured briefing card. "
    "Reply with a short thread title line first, then exactly 4 bullet points in this order:\n"
    "Title: <short thread name, max 8 words, no quotes>\n"
    "• Goal: <the buyer's primary payment-term objective>\n"
    "• Anchor: <the opening position or anchor stated or implied>\n"
    "• Tone: <the tone/style used in the conversation>\n"
    "• Open risk: <the biggest unresolved risk or uncertainty>"
)


def build_session_prompt(context: "SupplierContext | None", thread_tone: str | None) -> str | None:
    if context is None:
        return None
    supplier_name = context.supplier.get("name", "the supplier")
    target_days = context.target.get("opportunityPaymentTerms") or context.target.get("targetPaymentTerms")
    parts = [f"You are a procurement negotiation assistant helping negotiate payment terms with {supplier_name}."]
    if target_days:
        parts.append(f"Target payment terms: {target_days} days.")
    if thread_tone:
        parts.append(f"Use a {thread_tone} tone.")
    return " ".join(parts)
