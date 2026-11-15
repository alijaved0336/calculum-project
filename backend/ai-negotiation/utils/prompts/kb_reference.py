from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from domain.entities.rag_context import RAGContext


# Kept short on purpose. This block is appended to prompts that already run close
# to the ceilings asserted in tests/unit/test_prompt_size.py — negotiation_guide
# has roughly 550 characters of headroom — so it has to buy its place.
_NOTHING_RETRIEVED = (
    "## KNOWLEDGE BASE REFERENCE\n"
    "No passages were retrieved from the client's documents for this query. Do not "
    "attribute anything to those documents, and do not compose a documented "
    "definition or policy from general knowledge — say plainly that it isn't available."
)

_SEARCH_FAILED = (
    "## KNOWLEDGE BASE REFERENCE\n"
    "The client's knowledge base could not be searched for this request, so it is "
    "unknown whether it covers this. Do not attribute anything to those documents "
    "and do not present a definition or policy as documented."
)


def render_kb_reference(rag_context: "RAGContext | None", *, extra: str = "") -> str:
    """Render the KNOWLEDGE BASE REFERENCE block for a prompt.

    Every builder used to inline ``if rag_context and rag_context.chunk_count > 0``
    and silently omit the section otherwise. An omitted section reads to the model
    as "not checked", which is exactly what invited it to invent a definition — the
    failure this helper exists to close.

    The three-way split matters:

    * ``None`` → **empty string**. The intent never went through ``rag_query`` at
      all (SUMMARIZE_SUPPLIER_POSITION, EXPLAIN_RECOMMENDATION and META_OPERATION
      are in ``_NO_RAG_INTENTS``), so the KB was never consulted. Telling the model
      "no passages were retrieved from the client's documents" here would be a
      false statement about a search that never happened — a *new* invitation to
      invent, not a fix. Gate on ``is not None``, never on falsiness.
    * retrieval ran and failed/timed out → say the KB could not be searched, which
      is materially different from "nothing matched".
    * retrieval ran and found nothing → say so outright.

    ``extra`` appends a caller-specific sentence to the nothing-retrieved case
    (``answer_data_question`` uses it to keep its definition-specific wording).
    """
    if rag_context is None:
        return ""
    if rag_context.chunk_count > 0:
        return rag_context.context_text
    if getattr(rag_context, "status", "ok") in ("failed", "timeout"):
        return _SEARCH_FAILED
    return f"{_NOTHING_RETRIEVED} {extra}".rstrip() if extra else _NOTHING_RETRIEVED
