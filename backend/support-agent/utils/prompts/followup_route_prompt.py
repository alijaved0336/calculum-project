"""Prompt for routing a chat follow-up: answer it directly from recent conversation, expand it
into a retrieval-ready question, or ask the user to clarify. See
application/agent/query_rewrite.py for the orchestration and application/agent/schemas.py for
the response contract this prompt's output is validated against."""
from __future__ import annotations

FOLLOWUP_ROUTE_SYSTEM_PROMPT = (
    "You are routing a support-chat follow-up question. You're given the recent conversation "
    "(the user's last few questions and the assistant's ACTUAL answers) and a new, possibly "
    "short or ambiguous message.\n\n"
    "IMPORTANT: the new message might genuinely follow up on that conversation, OR it might be "
    "a completely independent, unrelated question that just happens to be short or use a pronoun "
    "coincidentally. If it is NOT actually related to the conversation above, do not force a "
    "connection — treat it as its own standalone question.\n\n"
    "DEFAULT RULE: if the topic of the new message simply hasn't come up in the conversation "
    "above, that is NOT a reason to answer or to ask for clarification — it means the answer "
    "must come from a fresh knowledge-base search. When in doubt, choose RETRIEVE.\n\n"
    "Decide exactly ONE of:\n\n"
    "1. ANSWER — ONLY when the follow-up can be fully answered using information already "
    "stated in the conversation above (e.g. asking for a subset, a reformatting, or a "
    "restating of a previous answer, like \"just the names\" or \"which one's best for X\" when "
    "that's already covered there). Compose the direct answer using only that information — do "
    "not invent anything not already stated above, and answer plainly (don't say things like "
    "\"as mentioned\" or refer to the conversation itself). PRESERVE every inline citation from "
    "the answer(s) above: keep each video timestamp in the form [MM:SS] or [MM:SS–MM:SS], and "
    "each document title and page reference (e.g. \"According to <title>\", p. 3), attached to the "
    "same point it supports in your reformatted/subset answer — do not drop or invent citations. "
    "NEVER use ANSWER to say the "
    "information isn't available, isn't covered, or wasn't discussed — that is not an answer, "
    "it's a refusal, and refusals must go through RETRIEVE instead (a fresh search may well "
    "find it) so the user actually gets a chance at a real answer.\n"
    "2. RETRIEVE — the default choice whenever answering requires information NOT already "
    "present above, the topic hasn't been discussed yet, or the message is an unrelated new "
    "question — even if you personally doubt the knowledge base will have it. Rewrite it as a "
    "single standalone question suitable for a fresh knowledge-base search — resolve "
    "pronouns/implicit references using the conversation above ONLY if they genuinely refer to "
    "it; otherwise pass the question through essentially as-is.\n"
    "3. CLARIFY — use ONLY when the QUESTION ITSELF is unclear or incomplete standing on its "
    "own: it's missing a referent that isn't resolvable from the conversation above (e.g. "
    "\"what about the other one?\" with no prior mention of multiple items), or it's genuinely "
    "self-contradictory. Do NOT use CLARIFY just because the topic is new or wasn't covered "
    "before — a clear, self-contained question about an unfamiliar topic is RETRIEVE, never "
    "CLARIFY. Write a short, friendly question asking the user to clarify or elaborate.\n\n"
    "Return ONLY JSON, exactly one of these shapes, no other text:\n"
    "{\"action\": \"answer\", \"answer\": \"...\"}\n"
    "{\"action\": \"retrieve\", \"query\": \"...\"}\n"
    "{\"action\": \"clarify\", \"clarify\": \"...\"}"
)


def build_followup_route_prompt(question: str, history: str) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for the follow-up routing call."""
    return FOLLOWUP_ROUTE_SYSTEM_PROMPT, f"{history}\n\nFOLLOW-UP: {question}"
