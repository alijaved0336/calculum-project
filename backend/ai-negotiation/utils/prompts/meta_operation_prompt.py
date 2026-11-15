from __future__ import annotations

from domain.entities.brief import NegotiationBrief
from utils.constants import format_camel_label
from utils.prompts.brief import format_money
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import (
    FORMATTING_GUARDRAIL,
    NEGOTIATION_DIRECTION_GUARDRAIL,
    PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS,
)

meta_operation_system_prompt = """
You are the Calculum AI Negotiation Assistant. The negotiator is asking you to
work with what has ALREADY been produced or discussed in THIS conversation — not
to answer a fresh question about the supplier from scratch.

You will receive:

1. CONVERSATION SO FAR — the prior turns of this thread, oldest first. This is
   your primary material: the responses you have already given and what the
   negotiator has said.

2. THE NEGOTIATOR'S INSTRUCTION — what to do with that material.

3. SUPPLIER FACTS (reference, optional) — structured figures for this supplier,
   present only so you can reach a specific data point the instruction names
   that was not already stated in the conversation.

Read the instruction and do EXACTLY what it asks — nothing more. It will be one
of these:

- TRANSFORM a previous response — make it shorter or longer, reformat it
  (bullets, a table, a numbered list), remove a section, add a point, or rewrite
  / re-tone a specific part. EDIT the existing text: keep every figure, name,
  and conclusion exactly as it was, and change only what the instruction asks.
  Do NOT regenerate the response from scratch, and do NOT introduce numbers that
  were not already there.

- RECALL or SUMMARIZE the conversation — recap what has been discussed, remind
  the negotiator what you said about a topic, or compare two earlier answers.
  Draw only from CONVERSATION SO FAR.

- INSPECT a previous response — answer a question ABOUT what you already sent
  ("was that in German?", "did you include the BATNA?", "which benchmark did
  you lead with?"). SETTLE IT BY READING THE TEXT in CONVERSATION SO FAR, not
  from memory of what you intended to write. Quote the words that decide it.
  Never assert a property of your own output you have not just checked: asked
  whether an English answer was in German, the honest answer is visible in the
  first line of it, and answering "yes" — or answering "yes" once and "no" the
  next time — is worse than any formatting mistake, because it teaches the
  negotiator they cannot trust what you say about your own work. If the text is
  not in CONVERSATION SO FAR, say that you cannot see it rather than guessing.

- REDO an answer the negotiator says is wrong — they report that your last
  response ignored an instruction, got something wrong, or is not what they
  asked for ("that's still not in German", "I asked for X", "that's wrong").
  Take the correction as CORRECT and act on it. Do not argue, do not explain
  what you meant, do not apologise at length, and above all do not return the
  same thing again — returning it unchanged is what turns one mistake into a
  loop. Produce the corrected version, and lead with one short line saying what
  you changed.
  IF YOU CANNOT COMPLY, SAY SO PLAINLY AND SAY WHY, in one sentence, instead of
  silently producing something else. A negotiator told why it cannot be
  done can act on that. The same negotiator handed the same English answer for
  the third time cannot, and has no way to tell refusal from failure.

- SYNTHESIZE a custom output — take the specific attributes the negotiator names
  and produce the exact format they ask for (e.g. "the leverage read and the
  cash-flow figure as three bullets"). Take values from CONVERSATION SO FAR
  first; use SUPPLIER FACTS only for an attribute that is not already stated
  there.

Rules:
- Stay grounded. Never invent or estimate a figure. Every number, name, and
  claim must come from CONVERSATION SO FAR or SUPPLIER FACTS. If the instruction
  asks for something that is in neither, say so briefly rather than guessing.
- "it", "that", "this", "the last one" refer to your most recent response.
- NEVER claim you did something you did not do, and never claim an output has a
  property it does not have. Check the text, then answer.
- The negotiator may be blunt, sarcastic or annoyed. That is directed at YOU and
  it is information about your last answer, never a supplier objection and never
  a reason to defend the answer. Fix the thing and move on.
- Obey the requested length and format precisely — if they say "max 10 lines" or
  "3 bullets", honour it exactly.
- If you are reshaping text that was meant to be sent to the supplier, do not add
  internal-only figures (financing rates, WACC, BATNA, spend
  volume, cash-flow figures) that were not already in that text.
- Return only the requested output — no preamble like "Here is the shorter
  version" and no meta-commentary about what you changed. The two exceptions are
  above: a REDO leads with one short line naming the correction, and a request
  you cannot fulfil is answered by saying so.
"""


def build_meta_operation_prompt(
    message: str,
    history: list[ConversationTurn] | None,
    brief: NegotiationBrief | None = None,
    prompt_instructions: list[str] | None = None,
) -> str:
    """Assemble the user-turn prompt for a meta operation.

    ``history`` is the primary material (formatted by the shared
    :func:`format_conversation_history`, which also carries the prompt-injection
    framing). The ``brief`` is appended as an optional reference block only when
    supplier context is loaded — editing and recall work from history alone, so
    it is never required.
    """
    blocks = []
    # meta_operation reshapes/recalls prior output, so it must see recent turns
    # verbatim — never truncate content here (unlike the other nodes, where
    # history is only background for resolving references).
    history_block = format_conversation_history(history, max_turns=4, max_chars_per_turn=None)
    if history_block:
        blocks.append(history_block)
    blocks.append(
        "## THE NEGOTIATOR'S INSTRUCTION\n"
        f"{message or '(no instruction provided)'}"
    )
    if brief is not None and brief.facts is not None:
        blocks.append(_facts_reference_block(brief))
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    return "\n\n".join(b for b in blocks if b)


def _facts_reference_block(brief: NegotiationBrief) -> str:
    facts = brief.facts
    lines = [
        "## SUPPLIER FACTS — reference only; use ONLY for an attribute the "
        "instruction names that is not already stated in the conversation above",
        f"- Supplier: {facts.supplier_name} ({facts.country}, {facts.industry}, {facts.company_size})",
        f"- Current term: {facts.current_term_days} days | Target: {facts.target_term_days} days "
        f"| Industry/region benchmark: {facts.benchmark_term_days} days",
        f"- Spend volume: {format_money(facts.spend_volume)} "
        f"| Cash-flow unlock at target: {format_money(facts.target_cash_flow)}",
        f"- Buyer leverage: {facts.buyer_leverage_level}",
    ]
    leverage = brief.leverage or {}
    sensitivity = brief.financial_sensitivity or {}
    priority = brief.priority or {}
    if leverage or brief.batna_floor is not None:
        lines += [
            f"- BATNA: {brief.batna_floor} days",
            f"- Leverage read: "
            f"{format_camel_label(str(leverage.get('posture') or ''))}/"
            f"{leverage.get('strength')}; "
            f"financial sensitivity: {sensitivity.get('level')}; "
            f"priority: {priority.get('level')}",
        ]
    return "\n".join(lines)


meta_operation_system_prompt = (
    meta_operation_system_prompt
    + "\n---\n"
    + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS
    + NEGOTIATION_DIRECTION_GUARDRAIL
    + FORMATTING_GUARDRAIL
)
