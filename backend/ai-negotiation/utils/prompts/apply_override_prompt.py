from __future__ import annotations

from domain.entities.facts import SupplierFacts
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history
from utils.prompts.security_guidance import PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS

# Extraction-only prompt: turn the negotiator's free text into a structured
# override request. The NODE does all validation and phrasing deterministically
# (like the scenario node) so the numbers and wording are exact — this call only
# classifies the ask and pulls out the explicit day figures.
apply_override_extraction_system_prompt = """
You extract a negotiator's request to change or reset the TARGET term and/or the
BATNA (Best Alternative to a Negotiated Agreement; reserve floor) for one
supplier in a payment-term extension.
Return JSON only — no prose.

The negotiator is the BUYER, extending terms (longer = pay later). They may:
- SET the target and/or the BATNA to a specific number of days
  ("let's target 85 days", "set our BATNA to 50", "aim for 90, floor 55").
- RESET one or both back to the system-CALCULATED default
  ("go back to the recommended target", "reset the BATNA", "use defaults").

Return EXACTLY this shape:
{"action": "set" | "reset" | "unclear",
 "target_term_days": <integer or null>,
 "batna_term_days": <integer or null>,
 "reset_scope": "target" | "batna" | "all" | null,
 "reasoning": "<one short sentence>"}

Rules:
- "set": fill the day value(s) the user explicitly gave; null for whichever they
  did not mention. reset_scope must be null.
- "reset": set reset_scope to what they want reverted ("all" if unspecified or
  they say "both"/"everything"); target_term_days and batna_term_days null.
- "unclear": the message is not actually asking to set or reset the target or
  BATNA. Both day fields null, reset_scope null.
- Extract ONLY explicit whole-day figures the user stated. NEVER infer or invent
  a number they did not give. If they name a change but no number, use "unclear".
- Word → field: "target"/"aim for"/"push for"/"go for"/"ask" N → target_term_days.
  "BATNA"/"floor"/"reserve"/"minimum"/"don't go below" N → batna_term_days.
  If they use an older synonym for BATNA (including walkaway or fallback), still
  map it to batna_term_days / reset_scope "batna". Never invent other field names.
""" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS


def build_apply_override_extraction_prompt(
    message: str,
    facts: SupplierFacts,
    history: list[ConversationTurn] | None = None,
) -> str:
    blocks = [format_conversation_history(history)] if history else []
    blocks += [
        f"## Negotiator's message\n{message}",
        # Context only — helps resolve which term they mean; the model must still
        # extract only the numbers actually present in the message.
        "## CONTEXT (for reference — do not treat as the requested values)\n"
        f"- Current agreed term: {facts.current_term_days} days\n"
        f"- Current target term in use: {facts.target_term_days} days",
    ]
    return "\n\n".join(b for b in blocks if b)
