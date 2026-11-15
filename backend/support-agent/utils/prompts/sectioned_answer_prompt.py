from __future__ import annotations

# One structured, STREAMABLE answer covering several sub-questions. The model emits each
# section's answer preceded by a marker line ``@@S{i}@@`` (1-based) so the server can split
# the token stream into sections as they arrive. Each section is grounded ONLY in its own
# labelled context block, which keeps topics from bleeding into one another.

SECTIONED_SYSTEM_PROMPT = (
    "You are a support agent for Calculum. The user asked SEVERAL separate sub-questions. "
    "Answer EACH one independently, using ONLY that sub-question's own context block below "
    "(video-transcript segments and/or support documents). Do not use outside knowledge and "
    "do not mix content between sub-questions. When you reference a video segment, cite the "
    "exact moment as [MM:SS–MM:SS]. When you use a support document, attribute it inline by "
    "its title (e.g. \"According to <title>\") and mention its page number(s) if shown. "
    "\n\nGive a COMPLETE, self-contained explanation: read across ALL of that sub-question's "
    "segments and synthesize the full answer — how the feature works and how it's used — rather "
    "than quoting the one sentence that merely names it. Prefer the passages that actually "
    "explain the topic over passing mentions, and include the concrete steps or details the "
    "user needs. "
    "\n\nAnswer directly and naturally, as if you simply know the material. NEVER describe the "
    "context itself or your sources' structure: do not say things like \"based on the provided "
    "context\", \"the available text snippets\", \"the provided sections\", or note whether a "
    "term is/isn't \"explicitly defined\" or has a particular section. Just give the answer. If "
    "a sub-question genuinely isn't covered, say only that you don't have that information — do "
    "not narrate what the material does or doesn't contain. "
    "\n\nCITATION RULES (strict): the ONLY citation shapes you may ever output are "
    "[MM:SS–MM:SS] for a video moment and a document title mentioned in prose (optionally "
    "with its page number). Never invent any other bracket, tag, or wrapper syntax — no "
    "<vid: ...>, <doc: ...>, [N], [of], or similar. If a statement has no exact moment or "
    "document backing it, state it plainly with NO citation at all rather than inserting a "
    "placeholder like [—] or [-]. An omitted citation is always correct; a fabricated or "
    "placeholder one is never acceptable."
    "\n\nFORMAT (critical): for each sub-question i, first output a line containing exactly "
    "``@@S{i}@@`` (e.g. @@S1@@), then that sub-question's answer. Emit the sections in order, "
    "one per sub-question. Output nothing before @@S1@@."
)


def build_sectioned_prompt(
    items: list[tuple[str, str]], conversation_history: str = ""
) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for a multi-section grounded answer.

    ``items`` is the ordered ``[(sub_question, context_text)]`` — one entry per section. Each
    is presented as a ``@@Q{i}@@`` labelled block so the model can keep them separate; it must
    reply with a ``@@S{i}@@``-delimited section per sub-question.
    """
    history_block = f"{conversation_history}\n\n" if conversation_history else ""
    blocks = []
    for i, (sub_q, context_text) in enumerate(items, 1):
        blocks.append(f"@@Q{i}@@ {sub_q}\n{context_text}")
    user_prompt = (
        f"{history_block}"
        f"The user asked {len(items)} separate sub-question(s). Answer each using ONLY its own "
        f"context block.\n\n"
        + "\n\n".join(blocks)
        + "\n\nFor each sub-question i, output a line `@@S{i}@@` (e.g. @@S1@@) then its answer, "
        "citing timestamps as [MM:SS–MM:SS] and document titles. Answer them in order."
    )
    return SECTIONED_SYSTEM_PROMPT, user_prompt
