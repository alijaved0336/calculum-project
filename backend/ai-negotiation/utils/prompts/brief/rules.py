"""The standing rules about how the brief's figures may be used.

Each of these exists because a model reliably gets the same thing wrong without
it. They live here, once, and are emitted CONDITIONALLY — a rule about brackets
the model will never see, or about ranking a single argument, is pure prompt
weight and one more instruction competing for attention.
"""
from __future__ import annotations

import re

# ── Group headings ─────────────────────────────────────────────────────────
#
# One vocabulary for the four argument buckets, across every voice. There used
# to be three — "FULL SUPPORT / PARTIAL SUPPORT / NON-SUPPORTING", "USE TO
# JUSTIFY THE ASK / HOLD IN RESERVE / NOT ARGUMENTS", and "SUPPORTING / IN
# RESERVE / NOT USABLE / NO DATA" — for the same four buckets, so a system
# prompt that told the model to read a group by name was pointing at a heading
# only some of its surfaces actually emitted.

GROUP_SUPPORTING = "USE TO JUSTIFY THE ASK"
# The four assessments (DSO, pay-on-terms, cost impact, relationship) get their
# own heading rather than being flattened into the supporting set. They are
# objection-ANSWERS, not evidence: none of them argues for a term, and the
# catalogue says so in its own notes — "a long DSO is never a reason they should
# grant longer terms", "it is a trust argument… never justifies the ask". Filed
# under USE TO JUSTIFY THE ASK and introduced with "cite every one of these",
# the model had no choice but to present four objection-answers as though they
# evidenced the number. That is the "this is not an argument" complaint, and it
# was manufactured here rather than chosen by the model.
GROUP_OBJECTION_ANSWERS = "ANSWER THEIR OBJECTIONS"
GROUP_RESERVE = "HOLD IN RESERVE"
GROUP_NOT_ARGUMENTS = "NOT ARGUMENTS"
GROUP_UNAVAILABLE = "NOT AVAILABLE"


# ── Rank tags ──────────────────────────────────────────────────────────────
#
# The bucket is ALREADY ordered by source credibility, so rank is just position.
# It is computed here rather than left to the model, which otherwise ranks by
# the day-figure and calls the biggest number the strongest argument.

_ORDINALS = ("", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th")

TAG_STRONGEST = "[STRONGEST]"
TAG_WEAKEST = "[WEAKEST OF THE SUPPORTING SET]"


def rank_tag(position: int, total: int) -> str:
    """Where this argument sits in the strength order.

    A single argument gets no tag: there is nothing to rank it against, and
    "strongest" reads as a comparison the negotiator cannot see.
    """
    if total < 2:
        return ""
    if position == 0:
        return f"  {TAG_STRONGEST}"
    if position == total - 1:
        return f"  {TAG_WEAKEST}"
    ordinal = _ORDINALS[position] if position < len(_ORDINALS) else f"{position + 1}th"
    return f"  [{ordinal} STRONGEST]"


# Every shape `rank_tag` can produce. These are PROMPT annotations — an
# instruction to the model about which argument to lead with — and were never
# meant to be readable output, but `RELATIVE_STRENGTH_RULE` telling the model
# "never print the tags" did not stop it copying them straight into a summary:
#
#   120 days (Parent / Supplier Max) — [STRONGEST]
#   0.26% of invoice value over 21 days (Cost Impact) — [3rd STRONGEST]
#
# So they are removed from generated text deterministically. Safe to strip
# blind: the tokens are fixed, bracketed and appear nowhere in real prose, so
# deleting one can never damage a sentence around it.
RANK_TAG_RE = re.compile(
    r"\s*\[(?:STRONGEST|\d*(?:1st|2nd|3rd|\d?th) STRONGEST|WEAKEST OF THE SUPPORTING SET)\]",
    re.IGNORECASE,
)


def normalize_chat_formatting(text: str) -> str:
    """Enforce ``**Label**: value`` and ASCII hyphens on model output.

    Prompts already ask for this; the model still emits ``**Label:**`` and
    em/en dashes. Split on ``**`` (no regex) and move a trailing colon out of
    closed bold spans that look like short field labels. Also insert a space
    when prose is glued to an opening or closing ``**`` (``argument**Existing``
    / ``Precedent-**to``).
    """
    if not text:
        return text
    text = text.replace("\u2014", "-").replace("\u2013", "-")
    parts = text.split("**")
    # Bold spans are odd indices. The last index is an unclosed span when the
    # ``**`` count is odd (len(parts) even) — leave that one alone mid-stream.
    last_closed_bold = len(parts) - 1
    if len(parts) % 2 == 0:
        last_closed_bold = len(parts) - 2
    for i in range(1, last_closed_bold + 1, 2):
        bold = parts[i]
        if not bold.endswith(":"):
            continue
        if "\n" in bold or len(bold) > 80 or len(bold) < 2:
            continue
        body = bold[:-1]
        if not body or body[0].isdigit():
            continue
        parts[i] = body
        nxt_i = i + 1
        if nxt_i >= len(parts):
            parts.append(":")
            continue
        nxt = parts[nxt_i]
        if nxt.startswith(":"):
            continue
        if nxt.startswith(" "):
            parts[nxt_i] = ":" + nxt
        else:
            parts[nxt_i] = ": " + nxt
    # Space when a letter/digit sits flush against a ``**`` boundary.
    for i in range(len(parts) - 1):
        left, right = parts[i], parts[i + 1]
        if not left or not right:
            continue
        if left[-1].isalnum() and right[0].isalnum():
            parts[i] = left + " "
    return "**".join(parts)


def ensure_pushback_labels(text: str) -> str:
    """Force ``**Read**:`` / ``**Say**:`` / ``**If they hold**:`` on each part.

    Models often emit ``**Read** The…`` (bold label, no colon) or a bare
    ``Read The…``. The chat highlighter needs the colon form.
    """
    if not text:
        return text
    labels = ("If they hold", "Read", "Say")
    out: list[str] = []
    for line in text.splitlines():
        stripped = line.lstrip()
        indent = line[: len(line) - len(stripped)]
        fixed = stripped
        for label in labels:
            bold = f"**{label}**"
            if fixed.startswith(bold + ":"):
                # Already ``**Label**:`` — keep, but ensure one space after.
                rest = fixed[len(bold) + 1 :]
                if rest and not rest.startswith(" "):
                    fixed = f"{bold}: {rest}"
                break
            if fixed.startswith(bold):
                rest = fixed[len(bold) :].lstrip(" :")
                fixed = f"**{label}**: {rest}" if rest else f"**{label}**:"
                break
            if fixed.startswith(label + ":"):
                rest = fixed[len(label) + 1 :].lstrip()
                fixed = f"**{label}**: {rest}" if rest else f"**{label}**:"
                break
            if fixed.startswith(label + " "):
                nxt = fixed[len(label) + 1 : len(label) + 2]
                if nxt and (nxt.isupper() or nxt in "\"'“"):
                    rest = fixed[len(label) + 1 :]
                    fixed = f"**{label}**: {rest}"
                    break
        out.append(indent + fixed)
    return "\n".join(out)


def strip_rank_tags(text: str) -> str:
    """Remove any rank tag the model copied out of the brief.

    Also tidies an orphaned em/en dash left in front of a removed tag —
    ``(Cost Impact) — [3rd STRONGEST]`` would otherwise end on a dangling dash.
    ASCII hyphens are left alone: compound words like ``limited-impact`` must
    survive, including when this runs on a partial stream buffer that happens
    to end on the hyphen.
    """
    if not text:
        return text
    cleaned = RANK_TAG_RE.sub("", text)
    # Only em/en dashes (and a bare colon) — never ASCII "-", which is a real
    # letter in compound words and gets chopped mid-stream otherwise.
    cleaned = re.sub(r"[ \t]*[—–:]+[ \t]*(?=\n|$)", "", cleaned)
    return ensure_pushback_labels(normalize_chat_formatting(cleaned))



# ── Standing rules ─────────────────────────────────────────────────────────

SOURCE_ORDER_NOTE = (
    "Ranked by SOURCE credibility, not day-count — a bigger number from a weaker "
    "source is still the weaker argument. Keep this order; never present them as "
    "equals."
)


# The playbook's version. Same order, no ranking language: the document goes into
# the room with the negotiator, and a bullet introduced as "the weakest of the
# three" is an argument they have already half-conceded before making it. The
# order still carries the priority — lead with the first — it just is not
# narrated. Every other surface is conversational and keeps SOURCE_ORDER_NOTE.
PLAYBOOK_ORDER_NOTE = (
    "Ordered by SOURCE credibility, strongest first — keep this order and lead "
    "with the first. Do NOT state, rank, score, hedge or hint at how strong any "
    "argument is: no \"the strongest argument here\", \"a step weaker\", \"the "
    "weakest\", \"reinforcement only\", \"keep it for last\", no ordinals and no "
    "strength adjectives. Each one is put as evidence on its own terms; the "
    "order carries the priority silently."
)


# Scoped to the EVIDENCE list — the benchmarks. The four assessments are not
# day-counts and are not in that list any more (see GROUP_OBJECTION_ANSWERS), so
# the paragraph that used to explain them here is gone with them. It said "quote
# those figures, exactly as the line gives them" while the notes rendered
# immediately beneath said "never state their DSO figure" and "never state the
# Pay-on-Terms figure" — two instructions that cannot both be obeyed, on
# adjacent lines, in the highest-prohibition-density block in the stack. A model
# told to quote a figure and never to state it does one of the two arbitrarily,
# which is the likeliest mechanical source of the contradictory output the
# client reported.
#
# An argument named without its day-count is useless to the negotiator: "the
# established precedent within your existing relationship" and "the modelled
# headroom on that spend line" read as evidence but say nothing about how much
# room they actually buy — the one thing the negotiator is deciding on. Models
# drop the figure readily, especially where a nearby rule keeps a number out of
# SUPPLIER-facing wording (parentOrSupplierMax, the spend line), so the
# requirement is stated positively and separately from every such restriction.
FIGURE_CITATION_RULE = (
    "STATE THE FIGURE — EVERY TIME: every mention of an argument in "
    "negotiator-facing text carries its day-count and its NAME as this brief "
    "gives it — \"an 80-day precedent elsewhere in the relationship (Existing "
    "Relationship Precedent)\". Never name one qualitatively instead (\"the "
    "established precedent\", \"the market comparison\"), and never by a payload "
    "key: names are written in words (\"Max Spend Opportunity\"), never as "
    "camelCase or snake_case identifiers. Applies to the first mention, to "
    "one-line summaries, "
    "and to the current term / ask / floor you compare against. "
    "INTERNAL means "
    "kept out of SUPPLIER-facing wording only — never withheld from the "
    "negotiator, who is deciding how hard to push. Only a sentence meant to be "
    "said or sent to the supplier is exempt; that follows the disclosure rules."
)


# The negotiator has to know which argument to LEAD with and which is only
# reinforcement — a reply that lists supporting arguments as if they were
# interchangeable hides the one decision the ranking exists to make.
RELATIVE_STRENGTH_RULE = (
    "ARGUMENT STRENGTH — USE IT, NEVER LABEL IT: each supporting argument below "
    f"ends with a rank tag ({TAG_STRONGEST} / [2nd STRONGEST] / ... / "
    f"{TAG_WEAKEST}). These are MACHINE ANNOTATIONS FOR YOU, not text. They tell "
    "you which argument to lead with; they are not a label to reproduce, and a "
    "reply that prints one is broken output.\n"
    "Never write a tag, a bracketed rank, an ordinal ranking, or a bare strength "
    "label after an argument — not \"[STRONGEST]\", not \"(strongest)\", not "
    "\"— 2nd strongest\", not \"ranked 3rd\". A negotiator reading \"the weakest "
    "of the supporting set\" has half-conceded the argument before making it.\n"
    "Carry the ranking in the SENTENCE instead, where it reads as advice: \"lead "
    "with the 80-day precedent elsewhere in the relationship; the cost figure is "
    "reinforcement once they raise price\". Order the list so the first item is "
    "the one to lead with, and let the order do the rest.\n"
    "Never list them as equals and never re-rank them: the order is source "
    "credibility, so the biggest number is often NOT the strongest. "
    "Negotiator-only — it never reaches supplier-facing wording."
)


NOTHING_SUPPORTS_LINE = (
    "  (none — nothing at all backs the proposed term. This is a STRETCH TARGET: "
    "never imply market support that does not exist.)"
)


# Emitted whenever no BENCHMARK reaches the ask even though softer arguments
# (relationship, payment reliability, cost impact) are available. Without it a
# drafter reads a full-looking list and writes as if the market backed the ask —
# the soft arguments remove objections, they do not evidence the number.
STRETCH_TARGET_NOTE = (
    "  STRETCH TARGET — no benchmark reaches the proposed term. The arguments "
    "above remove objections to the ask; none of them evidences the number "
    "itself, so do NOT imply market support, and expect to concede toward the "
    "floor if the supplier holds."
)


# Sources at or below the BATNA, named WITHOUT their figures on the
# drafting surfaces. They used to be handed over with full values, on the theory
# that the negotiator should know the supplier's potential counter-evidence. In
# practice the figure got used the other way round: a supplierStandard of 22
# days — below the supplier's OWN current 34-day term — came back as "their
# segment terms are shorter than what you already pay, so you can confidently
# hold the line", turning counter-evidence into a reason to hold firm. No
# wording forbids that reliably, because the inversion is a plausible sentence
# to write once the number is on the page. So the number is not on the page.
NOT_ARGUMENTS_RULE = (
    "at or below the BATNA, so their figures are deliberately NOT "
    "shown: {names}. Do not cite them, quote a value for them, or reason from "
    "them in EITHER direction — a source below our own current term is the "
    "SUPPLIER's evidence, never proof that our position is generous or that we "
    "can hold firm. If the negotiator asks about one by name, say it sits below "
    "the floor and is not used."
)


# Emitted on the PLAYBOOK voice, which is handed the supporting set and nothing
# else. Without it the model notices the block only has one group and invents the
# missing ones: a real playbook listed `dso` and `payOnTerms` under "Not used"
# with their do-not-say notes copied in as if they were analysis, and named three
# sources as having no data. An absent bucket reads as an omission to fill unless
# the brief says it was withheld on purpose.
SUPPORTING_ONLY_NOTE = (
    "  COMPLETE SET — these are the ONLY arguments for this supplier. Sources "
    "that fall short of the ask, were ruled out, or have no data are "
    "deliberately withheld from this brief. Do NOT list, name, count, or "
    "speculate about them, and never write a \"not used\" / \"unavailable\" / "
    "\"ruled out\" group: an argument you cannot see here does not belong in "
    "this document."
)


# The recommend-arguments voice (user, 2026-09-17): a "Recommend negotiation
# arguments" answer printed a "Not available" group and a catch-all line naming
# every ruled-out assessment. Prompt wording did not hold it back (4 of 5 live
# runs still named them), so the brief withholds both and says so.
RECOMMEND_SET_NOTE = (
    "  COMPLETE SET — the arguments above are everything to recommend. Sources "
    "with no data and assessments ruled out for this supplier are deliberately "
    "withheld. Do NOT name, count or speculate about them, and never write a "
    "\"not available\" / \"unavailable\" / \"ruled out\" group or line."
)

NOT_ARGUMENTS_EXPLAIN_RULE = (
    "at or below the BATNA. State these as position context only; "
    "never argue from them in either direction — a source below our own current "
    "term is NOT evidence that our position is generous or that we can hold firm:"
)


UNAVAILABLE_RULE = (
    "no value at all in this supplier's data — not low, not excluded, simply "
    "nothing to compare: {names}. For your reference only: never list these, "
    "and never write a \"Not available\" heading, group, label or bullet. Only "
    "when the negotiator asks about one of them by name, say plainly it has no "
    "data for this supplier; never substitute a different source."
)
