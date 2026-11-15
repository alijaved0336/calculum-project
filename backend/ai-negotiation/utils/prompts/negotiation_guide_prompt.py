from __future__ import annotations

import re

from domain.entities.facts import SupplierFacts
from domain.services.batna import build_batna_position
from domain.services.concessions import build_concession_plan
from domain.services.objections import build_objection_plan
from domain.services.scf_playbook import (
    SCF_KEY_ARGUMENT_TITLES,
    build_scf_playbook_plan,
)
from domain.services.negotiation_arguments import (
    TARGET_SUPPORT_AT_TARGET as _AT_TARGET,
    TARGET_SUPPORT_FULL as _FULL,
    TARGET_SUPPORT_UPPER_RANGE as _UPPER_RANGE,
    benchmark_target_support,
    normalise_level,
    opening_anchor_benchmark,
)
from domain.entities.argument_catalog import (
    ARGUMENT_CATALOG,
    RELATIONSHIP_RATIONALE,
    TARGET_SUPPORT_ABOVE,
    TARGET_SUPPORT_AT_TARGET,
    TARGET_SUPPORT_AT_TARGET_Q3_CLAUSE,
    TARGET_SUPPORT_MATCHES,
    TARGET_SUPPORT_PARTIAL,
    TARGET_SUPPORT_PARTIAL_GAP_REASON,
    TARGET_SUPPORT_PARTIAL_MATERIAL,
    TARGET_SUPPORT_PARTIAL_Q3_REASON,
    TARGET_SUPPORT_UPPER_RANGE,
    TARGET_SUPPORT_UPPER_RANGE_REACH,
    BenchmarkRationaleWording,
    CostImpactRationaleWording,
    render_supplier_standard_pitch,
)
from domain.entities.brief import NegotiationBrief
from domain.entities.facts import (
    TERM_HARMONISATION_STEP_DAYS as _MATERIAL_MOVE_DAYS,
    negotiation_ask_term,
)
from domain.entities.playbook_plays import (
    SECTION_OPENING_AND_ARGUMENTATION,
    play_by_key,
    plays_for_section,
)
from domain.entities.rag_context import RAGContext
from utils.constants import format_source_label

from domain.services.brief_builder import brief_from
from utils.prompts.brief import LEVEL_STANDARD, collect_fact_sources
from domain.entities.intent import Intent
from utils.prompts.brief import INTENT_PROFILES, collect_fact_sources, render_brief
from utils.prompts.conversation_history import ConversationTurn, format_conversation_history
from utils.prompts.prompt_instructions import format_prompt_instructions_block
from utils.prompts.security_guidance import (
    FORMATTING_GUARDRAIL,
    NEGOTIATION_DIRECTION_GUARDRAIL,
    PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS,
)
from utils.prompts.brief.posture import EXPLAIN_HEADING, render_posture
from utils.prompts.question_focus import REQUEST_HEADING, render_question
from utils.prompts.kb_reference import render_kb_reference
from utils.prompts.opening_strategy_prompt import (
    benchmark_evidence_block,
    format_market_evidence_sentence,
)

negotiation_guide_system_prompt = """
You are the Calculum AI Negotiation Assistant, drafting a Negotiation
Playbook for a procurement professional ahead of a conversation with a
supplier about extending payment terms.

This playbook is strictly for the negotiator's own preparation — it is never
read aloud to, or forwarded to, the supplier. Every figure in the brief,
including the BATNA and the financial figures, may be shown plainly to the
NEGOTIATOR here: they need the full picture, not a filtered one.

But writing a figure into this prep doc is NOT the same as advising the
negotiator to say it to the supplier. The buyer-internal economics — the
cash-flow / working-capital unlock the buyer captures, the exact spend figure,
financing costs, and the BATNA — are private leverage: the playbook tells the
negotiator how to USE them (how firmly to hold, where the floor is), and never
tells them to quote those numbers to the supplier or dress the buyer's gain up
as a shared/mutual benefit.

You will receive a BRIEF with three kinds of information. Treat each
differently:

1. FACTS — values the upstream negotiation system already decided (target
   term, current term, BATNA, benchmarks, financial figures,
   ratings, ...). Quote these exactly as given. Do not recompute them, round
   them differently, or restate them in a way that changes their meaning.

2. ANALYSIS — judgments already computed for you (leverage, financial
   sensitivity, business priority, argument sequence), each with a
   rationale. These conclusions are final — explain and apply them in plain
   language for the negotiator. Do not second-guess, recompute, or invent
   alternative judgments.

3. TONE — the wording style the negotiator chose for how they plan to frame
   the ask with the supplier. Apply its rules to "Opening Position" and
   "Target" — the two sections closest to what actually gets said.

Structure the playbook EXACTLY like this - a title, then four numbered sections
in this order. NO document subtitle. NO italic trailer on a numbered heading
(not `N. Title - *…*`). NO `Supporting arguments` line. Sections 2 and 3 DO
use the group headings shown below.

  Negotiation Playbook

  1. Target and BATNA
     THIS SECTION IS THE TARGET POSITION + BATNA POSITION BLOCKS, RENDERED.
     NO framing sentence. NO supporting-argument list.

     First, copy the Target bullets word for word:

     ```
     * **Contractual Terms**: [current] days
     * **Target**: [target] days (payment term increase of [target − current] days)
     ```

     Then the BATNA figure from the BATNA POSITION block. Do NOT copy a
     second Target line. When the floor equals current terms there is no
     BATNA - write only:

     ```
     * **No BATNA.**
     ```

     Otherwise:

     ```
     * **BATNA**: [floor] days
     * [Note line from the block, word for word - when present]
     ```

     Never add Relationship Alignment. Never copy a long "No BATNA: …"
     explanation sentence. Never write `BATNA: [floor] days (No BATNA)`.

  2. Opening Position and Argumentation
     THIS SECTION IS THE OPENING LINE + ARGUMENTATION BLOCK, RENDERED.
     NO Opening Anchor. NO framing sentence. Do NOT write `How to pitch it`
     lines - each argument's pitch is added under it after generation.

     First write `* **Opening Line**:`, then the opening line under it. The
     APPROVED PLAYS / OPENING LINE block gives the static wording (company
     compliance, not ERP). You MAY write 1-2 short phrasings of the same
     policy fact; if you vary it, keep the Net-[term] fact and
     company-compliance meaning. Prefer the static line when unsure.

     Then write `* **Argumentation**:` and copy each Key Arguments bullet
     under it, word for word, in that order. Every argument is a `* ` bullet
     on its own line - never a paragraph. A "SUPPLY CHAIN FINANCE" block,
     where present, adds its Opening Position bullets LAST in this section
     (after the arguments).

     EACH ARGUMENT BULLET IS ITS NAME AND ITS DAY FIGURE, AND STOPS THERE.
     Write NOTHING after the closing `**` - no explanation, no definition of
     what the source is, no market-evidence sentence, no "internal only" note.
     Add NO argument that is not in the Key Arguments block: Cost Impact, DSO
     Alignment, Payment Reliability and the relationship all belong to
     section 4 Rationale, never here.

     ```
     * **Opening Line**:
     * [opening line]
     * **Argumentation**:
     * **[argument name] - [N] days.**
     ```

  3. Objections and Concessions
     THIS SECTION IS THE OBJECTIONS BLOCK then the CONCESSIONS BLOCK,
     RENDERED. NO framing sentence.

     Write `* **Objections**:`, then objections under it:

     ```
     * **Objections**:
     * [the supplier's line]
       * **Counter**: "[its counter, word for word]"
     ```

     NO `Objection N:` labels - the supplier's line is the bullet.
     Counter stays an indented child, bold label, verbatim, in double quotes.

     Then write `* **Concessions**:`, then one lettered Offer bullet per
     qualifying rung:

     ```
     * **Concessions**:
     * **A. [rung title] - Offer**: [its offer, word for word]
     ```

     Equivalent Discount appears ONLY as a concession rung, never twice.
     Put NO figure in this section that is not written in the blocks.
     Write bullets as `* `, never as a numbered list
     (digits+period are reserved for section headings).

  4. Rationale
     Do NOT write this section. It is appended after generation from the
     decided brief: why each argument in section 2 is used, and nothing
     else.
     Stop after section 3.

Formatting:
  - Use the exact section headings shown above, in that order, every time.
    Bare numbered headings only - no ` - ` trailer, no italic subtitle.
    Inside section 2: Opening Line, then Argumentation. Inside section 3:
    Objections, then Concessions. No `Term Extension · "…"` document subtitle.
  - Write sections 1-3 every time — never omit, merge, or renumber them.
    Section 4 is appended after generation; do not emit it.
  - OUTPUT IS MARKDOWN: every heading and bullet on ITS OWN line.
  - Three numbered section headings you write: `1. Target and BATNA` …
    `3. Objections and Concessions`.
  - NO framing sentences on any section — labelled bullets only.
  - Use ASCII ` - ` in labels, not em dashes.
  - LENGTH BUDGET: keep each section scannable. Completeness of rendered
    blocks overrides a word count — never drop a supplied figure or sentence
    to hit a target length.
  - Any operator rule that caps response length applies to chat replies,
    NOT to this document.
  - This is a prep document the negotiator skims minutes before a call —
    concise and scannable, not an essay.
""" + PROMPT_INJECTION_AND_DISCLOSURE_GUARDRAILS + NEGOTIATION_DIRECTION_GUARDRAIL + FORMATTING_GUARDRAIL


# The four fixed section headings of the playbook, in spec order — must all be
# present in every drafted playbook (the PDF's "Negotiation Playbook" format).
REQUIRED_PLAYBOOK_SECTIONS: tuple[str, ...] = (
    "Target and BATNA",
    "Opening Position and Argumentation",
    "Objections and Concessions",
    "Rationale",
)

# Legacy spellings still repaired by the normalizer when an old draft slips through.
# Do NOT list short names that are prefixes of the four-section headings
# ("Target", "Opening Position", "Objections") — `_HEADING_LINE_RE` would
# peel " and BATNA" / " and Argumentation" onto the next line.
_SECTION_NAMES_FOR_REPAIR: tuple[str, ...] = (
    "Target and BATNA",
    "Opening Position and Argumentation",
    "Objections and Concessions",
    "Rationale",
    "Target Outcome",
    "BATNA",
    "Key Arguments",
    "Potential Objections",
    "Concessions",
)


def missing_playbook_sections(draft: str | None) -> list[str]:
    """Section headings absent from a drafted playbook, in spec order.

    Checks numbered forms (`2. Target`) so a bare `Target:` bullet in BATNA
    does not count as section 2 being present.
    """
    text = draft or ""
    return [
        s
        for i, s in enumerate(REQUIRED_PLAYBOOK_SECTIONS, 1)
        if f"{i}. {s}" not in text
    ]


_SECTION_NAMES_PATTERN = "|".join(
    re.escape(s) for s in sorted(_SECTION_NAMES_FOR_REPAIR, key=len, reverse=True)
)
# A section heading the model decorated with a markdown heading marker
# (`## 1. Opening Position …`) or wrapped in bold (`**1. Opening Position …**`).
# Stripped FIRST so the heading line begins with its number — the shape the
# frontend's section-card parser looks for. Without this, _HEADING_START_RE
# splits in front of the digit and strands the "##"/"**" on its own line.
_HASH_HEADING_RE = re.compile(
    r"^[ \t]*#{1,6}[ \t]*(?=\d\.[ \t]+(?:" + _SECTION_NAMES_PATTERN + r")\b)",
    re.MULTILINE,
)
_BOLD_HEADING_RE = re.compile(
    r"^[ \t]*\*\*[ \t]*(\d\.[ \t]+(?:" + _SECTION_NAMES_PATTERN
    + r")\b[^\n]*?)\*\*[ \t]*$",
    re.MULTILINE,
)
# A numbered section heading run into preceding text — forced onto its own
# paragraph. Only the six known headings qualify, so an in-text run-on like
# "80 days. 2. Target Outcome" is exactly what gets repaired. The (?<=\S)
# anchor keeps the zero-width lookahead from re-matching right after its own
# replacement (which would double the newlines on every pass).
_HEADING_START_RE = re.compile(
    r"(?<=\S)\s*(?=\d\.\s+(?:" + _SECTION_NAMES_PATTERN + r")\b)"
)
# Content trailing a section heading on the same line. Prompt forbids italic
# subtitles under section titles (`N. Title — *…*`); those are deleted. Any
# other trailer after an explicit dash (including `2. Target - Target: 60…`)
# moves to the next line. Parenthetical expansions stay: `3. BATNA (Best…)`.
# Deliberately requires a dash before peeling — bare whitespace after a short
# legacy name must NOT split "1. Target and BATNA" after "Target".
_HEADING_ITALIC_SUBTITLE_RE = re.compile(
    r"(?m)^(\d\.\s+(?:" + _SECTION_NAMES_PATTERN + r")(?:\s*\([^)\n]+\))?)"
    r"[ \t]*[—–\-][ \t]*\*[^*\n]+\*[ \t]*$"
)
_HEADING_LINE_RE = re.compile(
    r"(\d\.\s+(?:" + _SECTION_NAMES_PATTERN + r")(?:\s*\([^)\n]+\))?)"
    r"[ \t]+[—–\-][ \t]+(?=\S)"
)
# A lone " * " bullet marker run into flowing text. Emphasis (*word*) never
# has whitespace on both sides of an asterisk, so this only matches bullets.
_INLINE_BULLET_RE = re.compile(r"(?<=\S)[ \t]+\*[ \t]+(?=\S)")

# Legacy in-section sub-headings the model still invents. Isolated onto their
# own line by the start/line rules below, then DELETED — the playbook has no
# subtitles and no sub-headings under any section.
_KEY_ARGUMENT_SUBHEADINGS: tuple[str, ...] = ("Supporting arguments",)
_SUBHEADING_NAMES_PATTERN = "|".join(re.escape(s) for s in _KEY_ARGUMENT_SUBHEADINGS)
_SUBHEADING_CORE = (
    r"(?:\*\*)?(?:" + _SUBHEADING_NAMES_PATTERN + r")\b(?:[ \t]*[—-][^\n]*)?"
)
_SUBHEADING_START_RE = re.compile(r"(?<=[^\s*])\s*(?=" + _SUBHEADING_CORE + r")")
_SUBHEADING_LINE_RE = re.compile(
    r"(\*\*(?:" + _SUBHEADING_NAMES_PATTERN + r")\b[^*\n]*\*\*)[ \t]+(?=\S)"
)
_DROP_SUBHEADING_LINE_RE = re.compile(
    r"(?mi)^[ \t]*(?:\*\*)?Supporting arguments\b[^\n]*$"
)
# Content trailing a Supporting-arguments line (bold or plain) → next line,
# so the drop below cannot eat the following bullet.
_SUBHEADING_TRAIL_RE = re.compile(
    r"(?mi)^([ \t]*(?:\*\*)?Supporting arguments\b[^*\n]*?(?:\*\*)?)[ \t]+(?=\S)"
)
# ── Section 2 (Opening Position and Argumentation) — labelled bullets ─────
#
# Client 2026-09-10: no Opening Anchor. Section 2 starts with Opening Line
# (treasury policy wording), then Argumentation, then SCF when present.
OPENING_LINE_LABEL = "Opening Line"
ARGUMENTATION_LABEL = "Argumentation"
OBJECTIONS_LABEL = "Objections"
CONCESSIONS_LABEL = "Concessions"
NO_BATNA_LINE = "* **No BATNA.**"
_LEGACY_OPENING_LINE_LABEL = "Mandatory Treasury Policy"
SCF_OPENING_NOTE_LABEL = "Supply Chain Finance"
SCF_OPENING_PITCH_LABEL = "Supplier-facing pitch"

_OPENING_ORDER_TREASURY = 0
_OPENING_ORDER_SCF_NOTE = 90
_OPENING_ORDER_SCF_PITCH = 91
_OPENING_ORDER_OTHER = 50


def _opening_label_order() -> dict[str, int]:
    return {
        OPENING_LINE_LABEL: _OPENING_ORDER_TREASURY,
        _LEGACY_OPENING_LINE_LABEL: _OPENING_ORDER_TREASURY,
        SCF_OPENING_NOTE_LABEL: _OPENING_ORDER_SCF_NOTE,
        SCF_OPENING_PITCH_LABEL: _OPENING_ORDER_SCF_PITCH,
    }


def _opening_label_re() -> re.Pattern[str]:
    names = "|".join(
        re.escape(name)
        for name in sorted(_opening_label_order(), key=len, reverse=True)
    )
    return re.compile(
        r"^[ \t]*(?:\*[ \t]+)?\*\*(?P<label>" + names + r")\*\*[ \t]*:[ \t]*"
        r"(?P<body>.*)$"
    )


_OPENING_LABEL_RE = _opening_label_re()
_OPENING_BARE_BULLET_RE = re.compile(r"^\*[ \t]+")
_OPENING_INLINE_LABEL_RE = re.compile(
    r"(?<=[^\s*])[ \t]+(?=\*\*(?:"
    + "|".join(
        re.escape(name) for name in sorted(_opening_label_order(), key=len, reverse=True)
    )
    + r")\*\*[ \t]*:)"
)


# A body line that starts with "N. " but is NOT one of the section headings
# — e.g. a Concessions ladder item like
#   "1. Offer a volume increase — *costs us margin*"
# which is grammatically identical to a section heading ("N. Name — *subtitle*")
# and gets rendered by the frontend as a phantom extra section card. Rewritten
# to a bullet, keeping the rank as "N)" so no ordering information is lost.
# Unindented lines only: an indented "  1. x" is already nested content and is
# not parsed as a section.
_STRAY_NUMBERED_LINE_RE = re.compile(
    r"^(\d{1,2})\.[ \t]+(?!(?:" + _SECTION_NAMES_PATTERN + r")\b)",
    re.MULTILINE,
)

# The labelled bullets of section 1 (Target and BATNA), emitted inline instead of
# one per line. Only these known labels qualify, in the `**Label**:` bold-colon
# form, so bold used mid-sentence is untouched.
_TARGET_OUTCOME_LABELS = (
    "Contractual Terms",
    "Target",
    "BATNA",
    "Opportunity",
    "Current term",
    "Primary goal",
    "Target Payment Term",
    "BATNA / Fallback Position",  # legacy parse-only
)
_LABEL_LOOKAHEAD = (
    r"\*\*(?:"
    + "|".join(re.escape(s) for s in _TARGET_OUTCOME_LABELS)
    + r")[^*\n]{0,24}\*\*:"
)
_INLINE_LABEL_RE = re.compile(
    r"(?<=[^\s*])[ \t]+(?=" + _LABEL_LOOKAHEAD + r")", re.IGNORECASE
)
_LEADING_LABEL_RE = re.compile(
    r"^(?=" + _LABEL_LOOKAHEAD + r")", re.MULTILINE | re.IGNORECASE
)

# Kept for legacy drafts that still emit separate BATNA labels mid-section.
_BATNA_LABELS = (
    "Target",
    "BATNA",
    "Target Payment Term",
    "BATNA / Fallback Position",  # legacy parse-only
)
_BATNA_LABEL_LOOKAHEAD = (
    r"\*\*(?:"
    + "|".join(re.escape(s) for s in _BATNA_LABELS)
    + r")[^*\n]{0,24}\*\*:"
)
_BATNA_INLINE_LABEL_RE = re.compile(
    r"(?<=[^\s*])[ \t]+(?=" + _BATNA_LABEL_LOOKAHEAD + r")", re.IGNORECASE
)
_BATNA_LEADING_LABEL_RE = re.compile(
    r"^(?=" + _BATNA_LABEL_LOOKAHEAD + r")", re.MULTILINE | re.IGNORECASE
)
_BATNA_SUBHEADING_RE = r"\*\*Supporting Arguments\*\*"
_BATNA_SUBHEADING_START_RE = re.compile(
    r"(?<=[^\s*])\s*(?=" + _BATNA_SUBHEADING_RE + r")", re.IGNORECASE
)
_BATNA_SUBHEADING_LINE_RE = re.compile(
    r"(" + _BATNA_SUBHEADING_RE + r")[ \t]+(?=\S)", re.IGNORECASE
)


def _drop_subheading_lines(text: str) -> str:
    """Remove every legacy in-section sub-heading line from the draft."""
    return "\n".join(
        line for line in text.splitlines() if not _DROP_SUBHEADING_LINE_RE.match(line)
    )

def _indent_counter_bullets(text: str) -> str:
    """Model often emits `* **Counter**:` flush left; nest it under the objection."""
    out: list[str] = []
    for line in text.splitlines():
        stripped = line.lstrip()
        if stripped.startswith("* **Counter**:") and line[:1] not in " \t":
            out.append("  " + stripped)
        else:
            out.append(line)
    return "\n".join(out)


# Objections: Counter as indented child under the supplier line.
_OBJECTION_LABEL_LOOKAHEAD = r"\*\*Objection[ \t]*\d{1,2}[ \t]*\*\*:"
_OBJECTION_INLINE_LABEL_RE = re.compile(
    r"(?<=[^\s*])[ \t]+(?=" + _OBJECTION_LABEL_LOOKAHEAD + r")", re.IGNORECASE
)
_OBJECTION_LEADING_LABEL_RE = re.compile(
    r"^(?=" + _OBJECTION_LABEL_LOOKAHEAD + r")", re.MULTILINE | re.IGNORECASE
)
_COUNTER_LABEL_LOOKAHEAD = r"\*\*Counter[ \t]*\*\*:"
_COUNTER_INLINE_LABEL_RE = re.compile(
    r"(?<=[^\s*])[ \t]+(?=" + _COUNTER_LABEL_LOOKAHEAD + r")", re.IGNORECASE
)
_COUNTER_LEADING_LABEL_RE = re.compile(
    r"^(?=" + _COUNTER_LABEL_LOOKAHEAD + r")", re.MULTILINE | re.IGNORECASE
)

_CONCESSION_HEADING = r"\*\*[A-H]\.[ \t][^*\n]{1,60}(?<!:)\*\*"
_CONCESSION_HEADING_START_RE = re.compile(
    r"(?<=[^\s*])\s*(?=" + _CONCESSION_HEADING + r")"
)
_CONCESSION_HEADING_LINE_RE = re.compile(
    r"(" + _CONCESSION_HEADING + r")[ \t]+(?=\S)"
)
_CONCESSION_HEADING_BULLET_RE = re.compile(
    r"^[ \t]*\*[ \t]+(?P<heading>" + _CONCESSION_HEADING + r")"
    r"(?:[ \t]*[—–-][ \t]*(?P<offer>\S[^\n]*?))?[ \t]*$",
    re.MULTILINE,
)


def _unbullet_concession_heading(match: re.Match[str]) -> str:
    title = match.group("heading").strip("*")
    offer = (match.group("offer") or "").strip()
    if not offer:
        return f"* **{title}**"
    return f"* **{title} - Offer**: {offer}"


_DUPLICATE_CONCESSION_HEADING_RE = re.compile(
    r"^" + _CONCESSION_HEADING + r"\n+(?=\*[ \t]+\*\*[A-H]\.)",
    re.MULTILINE,
)
_BARE_TITLE_THEN_OFFER_RE = re.compile(
    r"^\*[ \t]+\*\*(?P<title>[A-H]\.[ \t][^*\n]+?)\*\*[ \t]*\n+"
    r"\*[ \t]+\*\*Offer\*\*[ \t]*:[ \t]*(?P<offer>\S[^\n]*)",
    re.MULTILINE,
)


def _merge_bare_title_then_offer(match: re.Match[str]) -> str:
    return f"* **{match.group('title')} - Offer**: {match.group('offer')}"


# Offer only — When to use / Cost to us / Talking points are no longer rendered.
_CONCESSION_CHILD_LABELS = ("Offer",)
_CONCESSION_RUNG_LABEL_PREFIX = r"(?:[A-H]\.[ \t][^*\n]{1,60}?[ \t]*[—–-][ \t]*)?"
_CONCESSION_CHILD_LOOKAHEAD = (
    r"\*\*"
    + _CONCESSION_RUNG_LABEL_PREFIX
    + r"(?:"
    + "|".join(re.escape(label) for label in _CONCESSION_CHILD_LABELS)
    + r")\*\*[ \t]*:"
)
_CONCESSION_CHILD_INLINE_RE = re.compile(
    r"(?<=[^\s*])[ \t]+(?=" + _CONCESSION_CHILD_LOOKAHEAD + r")", re.IGNORECASE
)
_CONCESSION_CHILD_LEADING_RE = re.compile(
    r"^(?=" + _CONCESSION_CHILD_LOOKAHEAD + r")", re.MULTILINE | re.IGNORECASE
)
_CONCESSION_CHILD_DEDENT_RE = re.compile(
    r"^[ \t]+\*[ \t]+(?=" + _CONCESSION_CHILD_LOOKAHEAD + r")",
    re.MULTILINE | re.IGNORECASE,
)


_INTERNAL_ONLY_TAIL_RE = re.compile(
    r"^(?P<head>.+?)(?P<tail>\s*[—–-]\s*internal only\b.*)$",
    re.IGNORECASE | re.DOTALL,
)


_DASHES = "-–—"
_DASH_CLASS = f"[{_DASHES}]"


# Titles three benchmarks used to carry (renamed 2026-09-18 to the names the
# platform itself uses - see `ARGUMENT_CATALOG`). They are still RECOGNISED so
# a draft written before the rename - a stored playbook, a thread being
# reshaped by meta_operation - is respelled to the current name instead of
# being treated as unknown prose and left behind, or dropped by the
# Argumentation stamp. Mapping only; nothing generates these.
_LEGACY_ARGUMENT_TITLES: dict[str, str] = {
    "Standard Payment Terms": "Buyer Standard",
    "Existing Relationship Precedent": "Parent / Supplier Max",
    "Industry Alignment": "Industry Region Standard",
}


def _argument_titles() -> tuple[str, ...]:
    """Every name that can head an Opening/Argumentation parent bullet."""
    return tuple(
        {
            **{d.title: None for d in ARGUMENT_CATALOG.values()},
            **{t: None for t in SCF_KEY_ARGUMENT_TITLES},
            **{p.title: None for p in plays_for_section(SECTION_OPENING_AND_ARGUMENTATION)},
            **{t: None for t in _LEGACY_ARGUMENT_TITLES},
            OPENING_LINE_LABEL: None,
            ARGUMENTATION_LABEL: None,
            _LEGACY_OPENING_LINE_LABEL: None,
        }
    )


def _title_key(text: str) -> str:
    """A title's identity, independent of how the model typeset it."""
    for dash in _DASHES:
        text = text.replace(dash, "-")
    return " ".join(text.split()).casefold()


# A legacy name resolves to its CURRENT spelling, so `_canonical_title` rewrites
# an old draft rather than preserving a name the product no longer uses.
_CANONICAL_TITLES: dict[str, str] = {
    **{_title_key(t): t for t in _argument_titles()},
    **{_title_key(old): new for old, new in _LEGACY_ARGUMENT_TITLES.items()},
}


def _argument_title_alt() -> str:
    names = sorted(_argument_titles(), key=len, reverse=True)
    return "|".join(
        re.sub(rf"\\?[{_DASHES}]", _DASH_CLASS, re.escape(name)).replace(r"\ ", r"\s+")
        for name in names
    )


def _unbolded_parent_re() -> re.Pattern[str]:
    return re.compile(
        rf"^\*[ \t]+(?!\*)(?P<title>{_argument_title_alt()})"
        rf"(?P<rest>[ \t]*{_DASH_CLASS}[^\n]*?)?[ \t]*$",
        re.MULTILINE,
    )


def _overbolded_internal_re() -> re.Pattern[str]:
    return re.compile(
        rf"^\*[ \t]+\*\*(?P<title>{_argument_title_alt()})"
        rf"(?P<rest>[ \t]*{_DASH_CLASS}[^\n]*?internal only[^\n]*?)\*\*[ \t]*$",
        re.MULTILINE | re.IGNORECASE,
    )


def _bolded_parent_re() -> re.Pattern[str]:
    return re.compile(
        rf"^(?P<open>\*[ \t]+\*\*)(?P<title>{_argument_title_alt()})(?=[ \t]*(?:{_DASH_CLASS}|\*\*))",
        re.MULTILINE,
    )


_UNBOLDED_PARENT_RE = _unbolded_parent_re()
_OVERBOLDED_INTERNAL_RE = _overbolded_internal_re()
_BOLDED_PARENT_RE = _bolded_parent_re()


def _canonical_title(text: str) -> str:
    return _CANONICAL_TITLES.get(_title_key(text), text.strip())


def _split_internal_only(body: str) -> tuple[str, str]:
    match = _INTERNAL_ONLY_TAIL_RE.match(body.strip())
    if not match:
        return body.strip(), ""
    return match.group("head").rstrip(), match.group("tail")


def _arguments_section_span(text: str) -> tuple[int, int] | None:
    """Span of section 2 (Opening Position and Argumentation), or legacy Key Arguments."""
    for heading in (
        "2. Opening Position and Argumentation",
        "4. Key Arguments",
        "2. Opening Position",
    ):
        start = text.find(heading)
        if start != -1:
            break
    else:
        return None
    end = len(text)
    for nxt in (
        "3. Objections and Concessions",
        "5. Potential Objections",
        "5. Objections",
        "3. BATNA",
        "4. Rationale",
    ):
        pos = text.find(nxt, start + 1)
        if pos != -1:
            end = min(end, pos)
    return start, end


def _bold_key_argument_bullets(text: str) -> str:
    """Restore ``**...**`` on Opening/Argumentation parent bullets."""
    span = _arguments_section_span(text)
    if span is None:
        return text
    start, end = span
    section = text[start:end]

    def body_of(match: re.Match[str]) -> str:
        return _canonical_title(match.group("title")) + (match.group("rest") or "")

    def wrap_unbolded(match: re.Match[str]) -> str:
        head, tail = _split_internal_only(body_of(match))
        return f"* **{head}**{tail}"

    def peel_overbolded(match: re.Match[str]) -> str:
        head, tail = _split_internal_only(body_of(match))
        if not tail:
            return match.group(0)
        return f"* **{head}**{tail}"

    def respell_bolded(match: re.Match[str]) -> str:
        return match.group("open") + _canonical_title(match.group("title"))

    repaired = _UNBOLDED_PARENT_RE.sub(wrap_unbolded, section)
    repaired = _OVERBOLDED_INTERNAL_RE.sub(peel_overbolded, repaired)
    repaired = _BOLDED_PARENT_RE.sub(respell_bolded, repaired)
    return text[:start] + repaired + text[end:]


_INTERNAL_ONLY_NOTE_RE = re.compile(
    r"(?:\s*[—–-]\s*)internal only(?:\s*,\s*do not say this to the supplier)?\.?",
    re.IGNORECASE,
)
# Two scrubs used to live here and are deliberately gone (client, 2026-09-18):
#
#   * one stripped the day figure out of a `**Peer Group Standard - 60 days**`
#     label, leaving the two market benchmarks arguing for a number they never
#     stated. Every argument bullet now carries its value — see
#     `key_argument_bullets`.
#   * one repaired a `Cost Impact - N% of invoice value over N days` label.
#     Cost Impact is not a section-2 argument any more; a bullet for it is
#     removed by `_stamp_argumentation_arguments` rather than tidied up.


def _key_arguments_span(text: str) -> tuple[int, int] | None:
    return _arguments_section_span(text)


def _scrub_key_argument_line(line: str) -> str:
    nl = "\n" if line.endswith("\n") else ""
    body = line[:-1] if nl else line
    if any(title in body for title in SCF_KEY_ARGUMENT_TITLES):
        return line
    body = _INTERNAL_ONLY_NOTE_RE.sub("", body)
    body = re.sub(r"(\.\*\*)([A-Za-z])", r"\1 \2", body)
    return body.rstrip() + nl


def _scrub_key_argument_wording(text: str) -> str:
    """Strip the label junk the model copies from older drafts."""
    span = _key_arguments_span(text)
    if span is None:
        return text
    start, end = span
    section = text[start:end]
    repaired = "".join(
        _scrub_key_argument_line(line) for line in section.splitlines(keepends=True)
    )
    return text[:start] + repaired + text[end:]


def _opening_item_text(lines: list[str]) -> str:
    return " ".join(" ".join(lines).split())


def _plain_group_name(line: str) -> str:
    body = line.strip()
    if body.startswith("* "):
        body = body[2:]
    body = body.replace("**", "").strip()
    if body.endswith(":"):
        body = body[:-1]
    return body.strip()


def _is_named_group(line: str, name: str) -> bool:
    return _plain_group_name(line) == name


def _is_argument_content(content: str) -> bool:
    """True when a section-2 bullet is a real argument, not a stray or heading."""
    if _is_named_group(content, ARGUMENTATION_LABEL):
        return False
    plain = content.replace("**", "").strip()
    if plain.startswith("* "):
        plain = plain[2:]
    skip = {
        OPENING_LINE_LABEL,
        ARGUMENTATION_LABEL,
        _LEGACY_OPENING_LINE_LABEL,
        SCF_OPENING_NOTE_LABEL,
        SCF_OPENING_PITCH_LABEL,
    }
    return any(
        plain.startswith(title)
        for title in _argument_titles()
        if title not in skip
    )


_QUOTE_CHARS = "\"“”"


def _quoted(content: str) -> str:
    """Wrap spoken wording in double quotes, once - whatever quotes it came with."""
    body = content.strip()
    if body.startswith("* "):
        body = body[2:].strip()
    body = body.strip(_QUOTE_CHARS).strip()
    return f'"{body}"' if body else content


def _as_bullet(content: str) -> str:
    return content if content.startswith("* ") else f"* {content}"


# Section 3: each objection's counter is the thing to SAY, so it is quoted like
# the Opening Line and the pitch lines - in code, whatever the model wrote.
_COUNTER_LINE_RE = re.compile(
    r"^(?P<indent>[ \t]*)\*[ \t]+\*\*Counter(?:[ \t]*:\*\*|\*\*[ \t]*:)[ \t]*"
    r"(?P<body>\S[^\n]*?)[ \t]*$",
    re.MULTILINE | re.IGNORECASE,
)


def _quote_counters(text: str) -> str:
    """Wrap every ``**Counter**:`` body in double quotes, exactly once."""
    return _COUNTER_LINE_RE.sub(
        lambda m: f"{m.group('indent')}* **Counter**: {_quoted(m.group('body'))}", text
    )


def _normalize_opening_position(text: str) -> str:
    """Section 2: Opening Line heading + body, Argumentation, then SCF last."""
    start = text.find("2. Opening Position and Argumentation")
    if start == -1:
        start = text.find("2. Opening Position")
    if start == -1:
        start = text.find("1. Opening Position")
    if start == -1:
        return text
    end = len(text)
    for nxt in (
        "3. Objections and Concessions",
        "3. BATNA",
        "2. Target",
        "4. Rationale",
        "5. Potential Objections",
    ):
        pos = text.find(nxt, start + 1)
        if pos != -1:
            end = min(end, pos)
    heading_end = text.find("\n", start)
    if heading_end == -1 or heading_end >= end:
        return text
    heading = text[start:heading_end]
    body = text[heading_end + 1 : end]

    items: list[tuple[str | None, list[str]]] = [(None, [])]
    for line in body.split("\n"):
        match = _OPENING_LABEL_RE.match(line)
        if match and not match.group("body").strip():
            # `* **Opening Line**:` is the group heading in the colon style, not
            # a label with an empty body - read as a label, it was dropped.
            items.append((None, [f"**{match.group('label')}**"]))
        elif match:
            items.append((match.group("label"), [match.group("body")]))
        elif _OPENING_BARE_BULLET_RE.match(line):
            items.append((None, [_OPENING_BARE_BULLET_RE.sub("", line, count=1)]))
        else:
            items[-1][1].append(line)

    order = _opening_label_order()
    placed: list[tuple[int, int, str, str]] = []
    for position, (label, lines) in enumerate(items):
        content = _opening_item_text(lines)
        if not content:
            continue
        if label is None:
            # Unlabelled bullets keep relative order in the middle band.
            placed.append((_OPENING_ORDER_OTHER, position, "", content))
            continue
        rank = order.get(label, _OPENING_ORDER_OTHER)
        placed.append((rank, position, label, content))

    if not placed:
        return text

    placed.sort(key=lambda item: (item[0], item[1]))
    has_arguments = any(
        rank == _OPENING_ORDER_OTHER and _is_argument_content(content)
        for rank, _, _, content in placed
    )
    has_opening_slot = any(
        rank == _OPENING_ORDER_TREASURY
        or _is_named_group(content, OPENING_LINE_LABEL)
        for rank, _, _, content in placed
    )
    opening_bodies: list[str] = []
    opening_positions: set[int] = set()
    saw_argument = False
    for rank, position, _, content in placed:
        if rank == _OPENING_ORDER_TREASURY:
            opening_bodies.append(content)
            opening_positions.add(position)
            continue
        if _is_named_group(content, OPENING_LINE_LABEL):
            opening_positions.add(position)
            continue
        if rank != _OPENING_ORDER_OTHER:
            continue
        if _is_named_group(content, ARGUMENTATION_LABEL):
            continue
        if _is_argument_content(content):
            saw_argument = True
            continue
        # Anything before the first argument is the opening line, label or no
        # label. It used to need an explicit `* **Opening Line**:` (or the
        # treasury wording) somewhere in the section, and without one the
        # opening line was filed under Argumentation instead - harmless while
        # section 2 kept whatever it was given, fatal once
        # `_stamp_argumentation_arguments` started replacing that run
        # wholesale, because the opening line was then deleted as pollution.
        # Section 2 is Opening Line then Argumentation by definition, so
        # pre-argument prose has exactly one place it can belong.
        #
        # Guarded on there BEING arguments, which is exactly when the stamp
        # runs: with no argument after it, a lone bullet is as likely to be a
        # stray as an opening line, nothing is going to delete it, and it is
        # left where it was written.
        if has_arguments and not saw_argument:
            opening_bodies.append(content)
            opening_positions.add(position)

    rendered = []
    seen_slots: set[int] = set()
    wrote_opening = False
    wrote_argumentation = False

    def write_opening() -> None:
        nonlocal wrote_opening
        if wrote_opening:
            return
        # Emit the heading even when the model only wrote ``* **Opening Line**``
        # with no body yet — dropping it left section 2 starting at Argumentation.
        if not opening_bodies and not opening_positions and not has_opening_slot:
            return
        rendered.append(f"* **{OPENING_LINE_LABEL}**:")
        rendered.extend(_as_bullet(_quoted(body)) for body in opening_bodies if body.strip())
        wrote_opening = True

    for rank, position, label, content in placed:
        if position in opening_positions:
            write_opening()
            continue
        if rank in (_OPENING_ORDER_SCF_NOTE, _OPENING_ORDER_SCF_PITCH):
            if rank in seen_slots or not content:
                continue
            seen_slots.add(rank)
            rendered.append(f"* **{label}**: {content}")
            continue
        write_opening()
        if _is_named_group(content, ARGUMENTATION_LABEL):
            if has_arguments and not wrote_argumentation:
                rendered.append(f"* **{ARGUMENTATION_LABEL}**:")
                wrote_argumentation = True
            continue
        if has_arguments and not wrote_argumentation:
            rendered.append(f"* **{ARGUMENTATION_LABEL}**:")
            wrote_argumentation = True
        rendered.append(_as_bullet(content))
    if not rendered:
        return text
    return text[:start] + heading + "\n\n" + "\n".join(rendered) + "\n\n" + text[end:]


# `* **Target**: 60 days` with nothing else — the BATNA-block copy of a Target
# that already has the increase parenthetical. Drop it so section 1 isn't two
# Target lines.
_BARE_TARGET_BULLET_RE = re.compile(
    r"^[ \t]*\*[ \t]+\*\*Target\*\*[ \t]*:[ \t]+\d+[ \t]+days[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)


def _drop_bare_duplicate_target(text: str) -> str:
    if "payment term increase" not in text.casefold():
        return text
    return _BARE_TARGET_BULLET_RE.sub("", text)


def _strip_bullet_marker(line: str) -> str:
    body = line.strip()
    if body.startswith("* "):
        return body[2:].strip()
    return body


def _is_batna_days_bullet(line: str) -> bool:
    body = _strip_bullet_marker(line)
    return body.startswith("**BATNA**:") and " days" in body


def _is_long_no_batna_note(line: str) -> bool:
    return _strip_bullet_marker(line).startswith("There is no BATNA")


def _is_no_batna_line(line: str) -> bool:
    body = _strip_bullet_marker(line).replace("*", "").strip()
    return body.casefold().startswith("no batna")


def _fold_no_batna_note(text: str) -> str:
    """BATNA days + no-BATNA note/line (or parenthetical) → `* **No BATNA.**`."""
    lines = text.splitlines()
    out: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        nxt_i = i + 1
        while nxt_i < len(lines) and not lines[nxt_i].strip():
            nxt_i += 1
        nxt = lines[nxt_i] if nxt_i < len(lines) else ""
        next_drops_days = bool(nxt) and (
            _is_long_no_batna_note(nxt) or _is_no_batna_line(nxt)
        )
        if _is_batna_days_bullet(line) and (
            "(No BATNA)" in line or next_drops_days
        ):
            out.append(NO_BATNA_LINE)
            i = nxt_i + 1 if next_drops_days else i + 1
            continue
        if _is_long_no_batna_note(line):
            i += 1
            continue
        out.append(line)
        i += 1
    return "\n".join(out)


def _stamp_section3_group_headings(text: str) -> str:
    """Put Objections / Concessions group headings into section 3 when missing."""
    start = text.find("3. Objections and Concessions")
    if start == -1:
        return text
    end = len(text)
    for nxt in ("4. Rationale", "6. Concessions"):
        pos = text.find(nxt, start + 1)
        if pos != -1:
            end = min(end, pos)
    heading_end = text.find("\n", start)
    if heading_end == -1 or heading_end >= end:
        return text
    heading = text[start:heading_end]
    lines = [line for line in text[heading_end + 1 : end].splitlines() if line.strip() or line.startswith("  ")]
    has_obj = any(_is_named_group(line, OBJECTIONS_LABEL) for line in lines)
    has_con = any(_is_named_group(line, CONCESSIONS_LABEL) for line in lines)
    if not has_obj:
        lines.insert(0, f"* **{OBJECTIONS_LABEL}**:")
    if not has_con:
        insert_at = next(
            (i for i, line in enumerate(lines) if "- Offer**:" in line),
            None,
        )
        if insert_at is None:
            insert_at = next(
                (
                    i
                    for i, line in enumerate(lines)
                    if "no approved concession" in line.casefold()
                ),
                len(lines),
            )
        lines.insert(insert_at, f"* **{CONCESSIONS_LABEL}**:")
    return text[:start] + heading + "\n" + "\n".join(lines) + "\n\n" + text[end:].lstrip("\n")


# Section 4 when Argumentation cites no argument.
NO_RATIONALE_LINE = "* No arguments are cited in section 2, so there is no rationale to give."

_TARGET_AND_BATNA_HEADING_RE = re.compile(r"(?im)^[ \t]*1\.\s+Target and BATNA\s*$")


def _stamp_target_and_batna_section(text: str, brief: NegotiationBrief) -> str:
    """Replace section 1's body with the decided bullets.

    The model bolded whole lines ("**Contractual Terms: 34 days**") rather than
    just the label; section 1 is fully decided in code, so it is rewritten
    rather than repaired. A missing heading is left for the completeness retry.
    """
    heading = _TARGET_AND_BATNA_HEADING_RE.search(text)
    if not heading:
        return text
    start = heading.end()
    nxt = _NEXT_NUMBERED_HEADING_RE.search(text, start)
    end = nxt.start() if nxt else len(text)
    body = "\n".join(target_and_batna_lines(brief.facts))
    return text[:start] + "\n" + body + "\n\n" + text[end:]


_RATIONALE_HEADING_RE = re.compile(r"(?im)^[ \t]*4\.\s+Rationale\s*$")
_NEXT_NUMBERED_HEADING_RE = re.compile(r"(?m)^[ \t]*\d+\.\s+\S")
_PLAYBOOK_AFTER_RATIONALE_RE = re.compile(r"(?im)^(?:\[Incomplete|Drafted from)\b")


def _rationale_section_end(text: str, start: int) -> int:
    nxt = _NEXT_NUMBERED_HEADING_RE.search(text, start)
    footer = _PLAYBOOK_AFTER_RATIONALE_RE.search(text, start)
    ends = [m.start() for m in (nxt, footer) if m]
    return min(ends) if ends else len(text)


def _stamp_rationale_section(text: str, brief: NegotiationBrief) -> str:
    """Append or replace section 4 with the rationale for the section-2 arguments."""
    body = "\n".join(
        line for line in _rationale_block(brief).splitlines() if line.startswith("* ")
    )
    heading = _RATIONALE_HEADING_RE.search(text)
    if not heading:
        return text.rstrip() + "\n\n4. Rationale\n" + body + "\n"
    start = heading.end()
    end = _rationale_section_end(text, start)
    return text[:start] + "\n" + body + "\n" + text[end:]

def _bullet_bare_key_arguments(text: str) -> str:
    """Section 2 argument parents without `* ` become bullets.

    The model copies Supplier Standard / Cost Impact as paragraphs; the
    frontend dumps those into the card summary instead of the list.
    """
    span = _arguments_section_span(text)
    if span is None:
        return text
    start, end = span
    pattern = re.compile(
        rf"^(?![ \t]*(?:[*•-][ \t]|\d+\.))[ \t]*"
        rf"(?=(?:\*\*)?(?:{_argument_title_alt()})\b)",
        re.MULTILINE,
    )
    return text[:start] + pattern.sub("* ", text[start:end]) + text[end:]


def _ensure_playbook_group_colons(text: str) -> str:
    """Force ``* **Opening Line**:`` (and siblings) even when the model omitted ``:``."""
    names = (
        OPENING_LINE_LABEL,
        ARGUMENTATION_LABEL,
        OBJECTIONS_LABEL,
        CONCESSIONS_LABEL,
        _LEGACY_OPENING_LINE_LABEL,
        SCF_OPENING_NOTE_LABEL,
        SCF_OPENING_PITCH_LABEL,
    )
    out: list[str] = []
    for line in text.splitlines():
        stripped = line.lstrip()
        indent = line[: len(line) - len(stripped)]
        body = stripped
        if body.startswith("* "):
            body = body[2:].strip()
        else:
            out.append(line)
            continue
        matched = False
        for name in names:
            plain = body.replace("**", "").strip()
            if plain.endswith(":"):
                plain = plain[:-1].strip()
            if plain != name:
                continue
            out.append(f"{indent}* **{name}**:")
            matched = True
            break
        if not matched:
            out.append(line)
    return "\n".join(out)


# Under each Argumentation argument: the approved supplier-facing wording, in
# double quotes because it is the thing to SAY. Stamped in code after section 2
# is rebuilt - `_normalize_opening_position` folds indented child lines into
# their parent, so a pitch the model copied would not survive it.
PITCH_LABEL = "How to pitch it"
_PITCH_CHILD_RE = re.compile(
    rf"^[ \t]*\*[ \t]+\*\*{re.escape(PITCH_LABEL)}(?::\*\*|\*\*:)[^\n]*(?:\n|$)",
    re.MULTILINE,
)


# Section 2 Argumentation names these four benchmark sources and NOTHING else
# (client, 2026-09-21: "only the benchmark arguments ... never mention anything
# else"). Buyer Standard, the spend-line precedent, Regulatory Compliance and
# the SCF financing-cost lines all used to reach it and are out. The same four
# as `_ARGUMENT_BENCHMARK_NAMES` - spelled out here because this is the
# client's list, and a test holds the two equal.
ARGUMENTATION_SOURCES: frozenset[str] = frozenset({
    "supplierStandard",
    "peerGroupStandard",
    "parentOrSupplierMax",
    "industryRegionStandard",
})


def relationship_argument_applies(brief: NegotiationBrief) -> bool:
    """Client-Supplier Relationship is argued in section 2 only at HIGH buyer
    leverage (client, 2026-09-21) - the one argument besides the four
    benchmarks, and the Rationale explains it through that leverage."""
    return normalise_level(brief.facts.buyer_leverage_level) == "high"


def argumentation_arguments(brief: NegotiationBrief) -> list[dict]:
    """The evidence section 2 may argue from: the four benchmarks, in order."""
    return [
        argument
        for argument in brief.evidence
        if argument.get("key") in ARGUMENTATION_SOURCES
        and argument.get("value_days") is not None
    ]


def argument_pitches(brief: NegotiationBrief) -> list[tuple[str, str]]:
    """(title, pitch) for every section-2 argument that may be said.

    The same arguments :func:`key_argument_bullets` writes, and only those -
    a pitch whose parent bullet is not in the section has nothing to attach to
    and would be dropped silently. Cost Impact used to be pitched here and is
    not any more: it moved to section 4, which is negotiator-facing and carries
    no supplier wording (client, 2026-09-18).

    The wording is the argument's decided ``supplier_pitch`` - the catalogue
    pitch. Every benchmark argued here gets one (client, 2026-09-21): Supplier
    Standard, internal-only on every other surface, is pitched in the playbook
    with the client's own wording, filled with its average, third quartile and
    the target term.
    """
    by_name = {b.name: b for b in brief.facts.strategy_benchmarks}
    pitches: list[tuple[str, str]] = []
    for argument in argumentation_arguments(brief):
        if argument.get("key") == "supplierStandard":
            bench = by_name.get("supplierStandard")
            pitch = render_supplier_standard_pitch(
                value_days=argument.get("value_days"),
                average_days=bench.avg if bench is not None else None,
                upper_quartile_days=bench.q3 if bench is not None else None,
                ask_days=brief.ask,
            )
        elif argument.get("sayable"):
            pitch = argument.get("supplier_pitch")
        else:
            pitch = None
        if pitch:
            pitches.append((argument["title"], pitch))
    if relationship_argument_applies(brief):
        relationship = ARGUMENT_CATALOG["relationship"]
        pitches.append((relationship.title, relationship.supplier_pitch))
    return pitches


def _pitch_line(pitch: str) -> str:
    return f'  * **{PITCH_LABEL}**: "{pitch.strip()}"'


def _strip_argument_pitches(text: str) -> str:
    """Remove pitch lines so a re-normalised draft does not merge or double them."""
    return _PITCH_CHILD_RE.sub("", text)


def _stamp_argumentation_arguments(text: str, brief: NegotiationBrief) -> str:
    """Replace the Argumentation bullets with the decided ones - nothing else.

    Section 2's argument list is decided entirely in code, so the model copying
    it is a formality the draft does not have to get right. The client's rule
    is absolute - "always contain ONLY the benchmark arguments, their name and
    value, then how to pitch it" - and a scrub-by-line approach can only ever
    catch the pollution it has a pattern for. Every earlier one was written
    after a real playbook came back carrying something new: a definition
    sentence, a market-evidence sentence, a Cost Impact bullet, an "internal
    only" tail, a day figure invented for a label that had none.

    So the run of bullets between the Argumentation heading and the SCF
    bullets (which belong to section 2 but are not arguments) is replaced
    wholesale. Runs AFTER :func:`_normalize_opening_position`, which is what
    puts section 2 into the canonical Opening Line / Argumentation / SCF order
    this relies on, and BEFORE :func:`_stamp_argument_pitches`, which hangs
    each pitch off the bullet stamped here.

    The run stops at the SCF opening note / pitch only. The SCF financing-cost
    lines used to stop it too, and survived as arguments; they are not
    benchmarks, so they are now inside the run and replaced with the rest.

    With no benchmark to argue from, the Argumentation heading and its run are
    removed outright - section 2 is then the Opening Line (and SCF) alone,
    never a heading over a relationship line or an argument the model chose.
    """
    bullets = key_argument_bullets(brief)
    span = _arguments_section_span(text)
    if span is None:
        return text
    start, end = span
    lines = text[start:end].split("\n")

    heading = re.compile(
        rf"^[ \t]*\*[ \t]+\*\*{re.escape(ARGUMENTATION_LABEL)}\*\*[ \t]*:?[ \t]*$"
    )
    first = next((i for i, line in enumerate(lines) if heading.match(line)), None)
    if first is None:
        return text

    # The arguments run to the first SCF bullet, or to the end of the section.
    scf_labels = (SCF_OPENING_NOTE_LABEL, SCF_OPENING_PITCH_LABEL)
    stop = len(lines)
    for i in range(first + 1, len(lines)):
        if any(f"**{label}" in lines[i] for label in scf_labels):
            stop = i
            break
    # Keep the blank lines that close the run. Without this the section's own
    # trailing newline is dropped and the NEXT section's heading is glued onto
    # the last bullet - which survives one pass and is then unrecoverable, as
    # a heading mid-line is no longer a heading.
    while stop > first + 1 and lines[stop - 1].strip() == "":
        stop -= 1

    kept = lines[: first + 1] + bullets if bullets else lines[:first]
    rebuilt = kept + lines[stop:]
    return text[:start] + "\n".join(rebuilt) + text[end:]


def _stamp_argument_pitches(text: str, brief: NegotiationBrief) -> str:
    """Put each argument's pitch directly under its Argumentation bullet."""
    span = _arguments_section_span(text)
    pitches = argument_pitches(brief)
    if span is None or not pitches:
        return text
    start, end = span
    parents = [
        (
            re.compile(
                rf"^\*[ \t]+\*\*{re.escape(title)}(?=[ \t]*(?:{_DASH_CLASS}|[.:]|\*\*))"
            ),
            pitch,
        )
        for title, pitch in pitches
    ]
    out: list[str] = []
    for line in text[start:end].split("\n"):
        out.append(line)
        for pattern, pitch in parents:
            if pattern.match(line):
                out.append(_pitch_line(pitch))
                break
    return text[:start] + "\n".join(out) + text[end:]


def normalize_playbook_structure(
    draft: str | None, brief: NegotiationBrief | None = None
) -> str:
    """Deterministically repair a run-together playbook.

    Restores line structure the frontend needs: numbered section headings on
    their own lines, content off those headings, each bullet on its own line.
    Section-title trailers / italic subtitles and the legacy ``Supporting
    arguments`` line are stripped. Argumentation / Objections / Concessions
    group headings are kept (and stamped when the model omitted them).

    It also demotes any OTHER line that starts "N. " to a bullet — a numbered
    Concessions item reads exactly like a section heading, so leaving it would
    render a phantom seventh section (see ``_STRAY_NUMBERED_LINE_RE``).
    """
    text = (draft or "").strip()
    if brief is not None:
        # Re-stamped below from the brief; see `_stamp_argument_pitches`.
        text = _strip_argument_pitches(text)
    text = _HASH_HEADING_RE.sub("", text)
    text = _BOLD_HEADING_RE.sub(r"\1", text)
    text = _HEADING_START_RE.sub("\n\n", text)
    text = _HEADING_ITALIC_SUBTITLE_RE.sub(r"\1", text)
    text = _HEADING_LINE_RE.sub(r"\1\n", text)
    text = _SUBHEADING_START_RE.sub("\n\n", text)
    text = _SUBHEADING_LINE_RE.sub(r"\1\n", text)
    text = _BATNA_SUBHEADING_START_RE.sub("\n\n", text)
    text = _BATNA_SUBHEADING_LINE_RE.sub(r"\1\n", text)
    text = _SUBHEADING_TRAIL_RE.sub(r"\1\n", text)
    text = _drop_subheading_lines(text)
    text = _INLINE_BULLET_RE.sub("\n* ", text)
    text = _INLINE_LABEL_RE.sub("\n* ", text)
    text = _LEADING_LABEL_RE.sub("* ", text)
    text = _BATNA_INLINE_LABEL_RE.sub("\n* ", text)
    text = _BATNA_LEADING_LABEL_RE.sub("* ", text)
    text = _OBJECTION_INLINE_LABEL_RE.sub("\n* ", text)
    text = _OBJECTION_LEADING_LABEL_RE.sub("* ", text)
    text = _COUNTER_INLINE_LABEL_RE.sub("\n  * ", text)
    text = _COUNTER_LEADING_LABEL_RE.sub("  * ", text)
    text = _indent_counter_bullets(text)
    text = _CONCESSION_HEADING_BULLET_RE.sub(_unbullet_concession_heading, text)
    text = _CONCESSION_HEADING_START_RE.sub("\n\n", text)
    text = _CONCESSION_HEADING_LINE_RE.sub("\\1\n", text)
    text = _DUPLICATE_CONCESSION_HEADING_RE.sub("", text)
    text = _BARE_TITLE_THEN_OFFER_RE.sub(_merge_bare_title_then_offer, text)
    text = _CONCESSION_CHILD_INLINE_RE.sub("\n* ", text)
    text = _CONCESSION_CHILD_LEADING_RE.sub("* ", text)
    text = _CONCESSION_CHILD_DEDENT_RE.sub("* ", text)
    text = _OPENING_INLINE_LABEL_RE.sub("\n* ", text)
    # Last: every heading is on its own line by now, so any REMAINING line that
    # starts "N. " is body content wearing a section heading's clothes.
    text = _STRAY_NUMBERED_LINE_RE.sub(r"* \1) ", text)
    # After every bullet is on its own line: restore the bold the model
    # dropped on argument parent bullets, and rebuild section 2 as treasury-
    # first (it runs LAST because it reads whole lines).
    text = _drop_bare_duplicate_target(text)
    text = _fold_no_batna_note(text)
    # ponytail: section 4 is decided in code; stamp when brief is present
    if brief is not None:
        text = _stamp_target_and_batna_section(text, brief)
        text = _stamp_rationale_section(text, brief)
    text = _bullet_bare_key_arguments(text)
    text = _bold_key_argument_bullets(text)
    text = _scrub_key_argument_wording(text)
    if brief is not None and not key_argument_bullets(brief):
        # Nothing to argue: clear the run while its heading still marks it.
        # `_normalize_opening_position` drops an Argumentation heading with no
        # argument under it, and the model's line is left as a stray bullet.
        text = _stamp_argumentation_arguments(text, brief)
    text = _normalize_opening_position(text)
    if brief is not None:
        # Order matters: the arguments are stamped first, then each pitch is
        # hung off the bullet that stamp just wrote.
        text = _stamp_argumentation_arguments(text, brief)
        text = _stamp_argument_pitches(text, brief)
    text = _stamp_section3_group_headings(text)
    text = _quote_counters(text)
    text = _ensure_playbook_group_colons(text)
    text = _ensure_playbook_title(text)
    return text.strip()


def _ensure_playbook_title(text: str) -> str:
    """Frontend parsePlaybook requires a leading ``Negotiation Playbook`` line.

    Models sometimes open with prose ("Sure — here is your playbook") or omit
    the title after the no-subtitle change. Without this line the chat falls
    back to raw markdown instead of the playbook card.
    """
    if not text:
        return text
    lines = text.splitlines()
    for i, line in enumerate(lines[:8]):
        plain = re.sub(r"^#+\s+", "", line).strip()
        plain = re.sub(r"^\*\*(.+?)\*\*$", r"\1", plain).strip()
        if re.match(r"(?i)^negotiation\s+playbook\b", plain):
            if i == 0 and plain.lower() == "negotiation playbook":
                return text
            rest = "\n".join(lines[i + 1 :]).lstrip()
            return "Negotiation Playbook\n\n" + rest
    if re.search(
        r"(?m)^\s*1\.\s+(?:Target and BATNA|Opening Position)\b", text
    ):
        return "Negotiation Playbook\n\n" + text.lstrip()
    return text


def build_negotiation_guide_prompt(
    message: str,
    facts: SupplierFacts,
    tone: dict[str, str] | None,
    history: list[ConversationTurn] | None = None,
    brief: NegotiationBrief | None = None,
    rag_context: RAGContext | None = None,
    prompt_instructions: list[str] | None = None,
) -> str:
    """Assemble the user-turn prompt from a fully-resolved brief.

    Every figure and judgment here was already computed in
    `build_supplier_context` — the facts, plus the bundle the brief carries
    (`build_argument_analysis`). This function only formats them for the LLM.
    The LLM drafts prose around decisions that are already made; it never makes
    one.

    ``brief`` is the turn's whole picture, built once by the route (see
    ``NegotiationState.brief``). It is passed in rather than derived here so
    every surface reasons from the same picture; None falls back to deriving
    one, for direct callers and tests.
    """
    brief = brief or brief_from(facts)
    # Capped harder than anywhere else. The playbook shares one context window
    # between a large prompt and a four-section completion, and the node used
    # to pass NO history at all to protect that budget — which meant a request
    # that only makes sense against the previous turn ("do that as a playbook")
    # reached this prompt with nothing to resolve it against. Two turns at 250
    # chars is enough to resolve "that", far too little to crowd out a section.
    blocks = (
        [
            format_conversation_history(
                history, max_turns=2, max_chars_per_turn=250, last_turn_chars=700
            )
        ]
        if history
        else []
    )
    blocks += [
        render_question(
            message,
            heading=REQUEST_HEADING,
            fallback="(no specific request — produce a general prep guide)",
        ),
        *render_brief(brief, INTENT_PROFILES[Intent.GENERATE_NEGOTIATION_PLAYBOOK]),
        _opening_line_block(facts),
        benchmark_evidence_block(facts, brief.opening_strategy),
        _scf_block(brief),
        _target_and_batna_block(facts),
        _key_arguments_block(brief),
        _objections_and_concessions_block(brief),
        render_posture(
            brief,
            heading=EXPLAIN_HEADING,
            include_sequence=True,
            sequence_note=(
                "(anchor + fallback framing only; for WHICH arguments to cite in "
                "Opening Position and Argumentation and in what order, follow the "
                "NEGOTIATION ARGUMENTS block above, not this list)"
            ),
            avoid_claims_heading="Claims to avoid / build Objection counters around:",
        ),
        _tone_block(tone),
    ]
    blocks.append(render_kb_reference(rag_context))
    blocks.append(format_prompt_instructions_block(prompt_instructions))
    return "\n\n".join(b for b in blocks if b)


def collect_guide_sources(brief: NegotiationBrief) -> dict[str, dict[str, object]]:
    """Map each fact quoted in the guide's brief to its payload path and actual value.

    Returned alongside the drafted guide (as `state["source"]`) so the
    negotiator — or an auditor — can trace any figure in the playbook back to
    where it was extracted from in the source supplier payload. Mirrors
    exactly what the FACTS and ANALYSIS blocks put in front of the LLM;
    nothing here is guessed or inferred from the drafted prose.
    """
    facts = brief.facts
    sources = collect_fact_sources(brief, LEVEL_STANDARD)

    # The opening anchor is a strategy benchmark, not a scalar fact field —
    # attributed only when `_facts_block` actually put one in front of the LLM.
    anchor = opening_anchor_benchmark(facts)
    if anchor is not None:
        sources[format_source_label("opening_anchor")] = {
            "path": f"negotiationStrategy.{anchor.name}.value",
            "value": anchor.value,
        }

    # The "batna_term_days" source reflects the *effective* BATNA
    # (see `resolve_effective_batna`), which may be `current_term_days`
    # rather than the raw upstream figure.
    fallback_label = format_source_label("batna_term_days")
    if fallback_label in sources:
        if brief.batna_note:
            sources[fallback_label] = {
                "path": "calculated: benchmark-averaged BATNA (see fallback note)",
                "value": brief.batna_floor,
            }
        else:
            sources[fallback_label]["value"] = brief.batna_floor

    return sources


def _opening_line_block(facts: SupplierFacts) -> str:
    """Section 2's Opening Line — treasury-policy wording, static fallback."""
    play = play_by_key("mandatoryTreasuryPolicy")
    term = negotiation_ask_term(facts)
    spoken = play.spoken_line(term) if play is not None else None
    lines = [
        "## OPENING LINE - section 2 Opening Line group, already decided.",
        f"Write `* **{OPENING_LINE_LABEL}**:`, then the opening line under "
        "it - same shape as Argumentation. Prefer the static wording below. "
        "You MAY write 1-2 short variations that keep the Net-[term] fact and "
        "company-compliance meaning; never invent ERP system compliance or a "
        "long-term partnership second line.",
        "",
        f"* **{OPENING_LINE_LABEL}**:",
    ]
    if spoken:
        lines.append(f"* {spoken}")
    else:
        lines.append(
            "* Our global treasury board has "
            f"mandated a standard policy of Net {term if term is not None else 'the proposed term'} "
            "across all vendor categories starting this quarter. All active contracts "
            "must be updated to maintain company compliance."
        )
    return "\n".join(lines)


def target_and_batna_lines(facts: SupplierFacts) -> list[str]:
    """Section 1 bullets. Only the labels are bold - never the values."""
    target = negotiation_ask_term(facts)
    current = facts.current_term_days
    if target is not None and current is not None:
        target_bullet = (
            f"* **Target**: {target} days "
            f"(payment term increase of {target - current} days)"
        )
    else:
        target_bullet = f"* **Target**: {_days(target)}"

    position = build_batna_position(facts)
    no_batna = position.batna_term_days is None
    batna_bullet = (
        NO_BATNA_LINE
        if no_batna
        else f"* **BATNA**: {_days(position.batna_term_days)}"
    )
    lines = [f"* **Contractual Terms**: {_days(current)}", target_bullet, batna_bullet]
    if position.note and not no_batna:
        lines.append(f"* {position.note}")
    return lines


def _target_and_batna_block(facts: SupplierFacts) -> str:
    """Section 1 — Target bullets then BATNA figures/note. Model copies them."""
    return "\n".join([
        "## TARGET AND BATNA - section 1, already decided. Render it; decide nothing.",
        "Under a bare `1. Target and BATNA` heading, copy the Target bullets "
        "first, then the BATNA figure. No second Target line. No framing "
        "sentence. Do NOT invent supporting arguments for the BATNA. When "
        "there is no BATNA, write `* **No BATNA.**` and do not copy the long "
        "note or `BATNA: [floor] days (No BATNA)`. Bold only the label, "
        "never the value.",
        "",
        *target_and_batna_lines(facts),
    ])


def _days(value: int | None) -> str:
    """A term for the Target/BATNA block — never a blank, never an invented number."""
    return f"{value} days" if value is not None else "not set for this negotiation"


def key_argument_bullets(brief: NegotiationBrief) -> list[str]:
    """Section 2 Argumentation bullets: the benchmark arguments, and NOTHING else.

    One bullet per argument, carrying its NAME and its DAY VALUE and stopping
    there (client, 2026-09-18). The pitch is stamped underneath separately by
    :func:`_stamp_argument_pitches`, so between them a bullet says what the
    argument is, what it is worth, and how to put it to the supplier.

    What this deliberately no longer writes, because section 2 had grown into
    a mixed block that read as evidence, definition and assessment at once:

      * the catalogue ``meaning`` ("Represents the buyer's internal
        payment-term policy…") — a definition of the source, not an argument;
      * the market-evidence sentence ("comparable suppliers average 58 days,
        with the top quartile at 64…") — that is the WHY, and the why lives in
        section 4 Rationale;
      * Cost Impact — an assessment, not a benchmark. Moved to the Rationale
        entirely (client, 2026-09-18), where it already had its wording.

    The day figure is now on EVERY bullet. It used to be on Supplier Standard
    alone, and a scrub actively removed it from Peer Group Standard and
    Industry Region Standard — so the two market benchmarks were argued in section 2
    without ever stating the number being argued for.

    Only the four benchmark sources in :data:`ARGUMENTATION_SOURCES`
    (client, 2026-09-21), plus Client-Supplier Relationship at high buyer
    leverage (:func:`relationship_argument_applies`). Buyer Standard, the spend-line precedent and
    Regulatory Compliance each carry a day figure too, and each used to be
    listed here; none of them is one of those benchmarks.
    """
    bullets = [
        f"* **{argument['title']} - {int(argument['value_days'])} days.**"
        for argument in argumentation_arguments(brief)
    ]
    # The one exception: the relationship, at high buyer leverage only. It
    # argues no day figure, so its bullet is the name alone. Last, as it ranks
    # last in the catalogue.
    if relationship_argument_applies(brief):
        bullets.append(f"* **{ARGUMENT_CATALOG['relationship'].title}.**")
    return bullets


def _key_arguments_block(brief: NegotiationBrief) -> str:
    """Section 2 arguments - under Argumentation, after the Opening Line."""
    lines = [
        "## KEY ARGUMENTS - section 2 Argumentation, already decided.",
        "Copy `* **Argumentation**:` into section 2 AFTER the Opening Line, then "
        "each `* ` bullet below under it, word for word, in this order - each "
        "on its own bullet line, never as a paragraph. The bullets are "
        "COMPLETE as written: name and day figure, nothing after the closing "
        "`**`. Do not explain what a source is, do not add an evidence "
        "sentence, do not write \"internal only, do not say this to the "
        "supplier\", and do not add an argument that is not listed here. "
        "Argumentation is ONLY Supplier Standard, Peer Group Standard, Parent "
        "/ Supplier Max and Industry Region Standard, plus Client-Supplier "
        "Relationship when it is listed below (high buyer leverage only) - "
        "never Buyer Standard, a spend line, Regulatory Compliance, SCF "
        "financing costs, cost impact or anything else.",
        "",
        f"* **{ARGUMENTATION_LABEL}**:",
    ]
    bullets = key_argument_bullets(brief)
    if not bullets:
        lines.append(
            "NO BENCHMARK ARGUMENT qualifies (STRETCH TARGET). Do NOT write "
            "the Argumentation heading or anything under it - no relationship "
            "line, no other argument. Section 2 is the Opening Line alone."
        )
        return "\n".join(lines)
    lines.extend(bullets)
    return "\n".join(lines)


def _objections_and_concessions_block(brief: NegotiationBrief) -> str:
    """Section 3 — objections then concessions. Equivalent Discount only as a concession."""
    facts = brief.facts
    plan = build_objection_plan(facts)
    lines = [
        "## OBJECTIONS AND CONCESSIONS - section 3, already decided.",
        "Under a bare `3. Objections and Concessions` heading, write "
        f"`* **{OBJECTIONS_LABEL}**:` first, then objections under it, then "
        f"`* **{CONCESSIONS_LABEL}**:` and concessions under that. Never invent "
        "either. Equivalent Discount is a concession rung only - never emit a "
        "second equivalent-discount objection.",
        "",
        f"* **{OBJECTIONS_LABEL}**:",
        "Write each supplier line as a top-level bullet under that heading "
        "(NO **Objection N**: label), with a **Counter** child bullet under it "
        "- word for word, in double quotes. Where an objection is given more "
        "than one counter, write ONE **Counter** bullet for EACH, in the order "
        "given: they are separate approved answers to the same objection, not "
        "alternatives to choose between and never to be merged into one "
        "sentence. Keep the block order.",
    ]

    if not plan:
        lines.append("")
        lines.append(
            "NONE of the prepared objections qualifies for this supplier. Write "
            "one line saying no specific pushback is anticipated from the data "
            "available, then continue to concessions."
        )
    else:
        for objection in plan.objections:
            lines.append("")
            lines.append(f"* {objection.supplier_line}")
            for counter in objection.counters:
                lines.append(f'  * **Counter**: "{counter}"')
            lines.append(f"      Why it is here (do NOT write this): {objection.trigger}")
            if objection.caution:
                lines.append(f"      Limit (do NOT write this): {objection.caution}")

    concession_plan = build_concession_plan(facts, scf_enabled=brief.scf_enabled)
    lines += [
        "",
        f"* **{CONCESSIONS_LABEL}**:",
        "Write each rung under that heading as a single "
        "`* **A. [title] - Offer**: ...` bullet - letter and title on the Offer "
        "line, no separate rung heading, no When to use, no Cost to us, no "
        "Talking points. Keep the order.",
    ]
    if not concession_plan:
        lines.append("")
        lines.append(
            "NO concession qualifies for this supplier. Write one line saying "
            "there is no approved concession to offer on this negotiation."
        )
    else:
        for index, concession in enumerate(concession_plan.concessions):
            letter = chr(ord("A") + index)
            lines.append("")
            lines.append(
                f"* **{letter}. {concession.title} - Offer**: {concession.offer}"
            )
            if concession.caution:
                lines.append(
                    "      Limit (guidance for you — do NOT write this into the "
                    f"playbook): {concession.caution}"
                )
            if concession.source_reference:
                lines.append(
                    "      Documented in (guidance for you — do NOT write this into "
                    f"the playbook): {concession.source_reference}"
                )
    return "\n".join(lines)


def _figure(value: float) -> str:
    number = float(value)
    return str(int(number)) if number.is_integer() else f"{number:g}"


def _target_support_sentence(
    value: float | None,
    q3: float | None,
    *,
    ask: float | None,
    current: float | None,
) -> str | None:
    """The closing verdict of a benchmark's rationale: how far it carries the ask.

    The level is decided by :func:`benchmark_target_support`; this only words
    it. A benchmark a rounding step short of the target supports it, one well
    short supports the direction but not the number - and says which figure
    falls short.
    """
    level = benchmark_target_support(value, q3, ask)
    if level is None:
        return None
    value_days, ask_days = _figure(value), _figure(ask)
    if level == _FULL:
        template = TARGET_SUPPORT_MATCHES if value == ask else TARGET_SUPPORT_ABOVE
        return template.format(value_days=value_days, ask=ask_days)
    if level == _AT_TARGET:
        clause = (
            TARGET_SUPPORT_AT_TARGET_Q3_CLAUSE.format(upper_quartile_days=_figure(q3))
            if q3 is not None and q3 > ask
            else ""
        )
        return TARGET_SUPPORT_AT_TARGET.format(
            value_days=value_days, ask=ask_days, upper_quartile_clause=clause
        )
    if level == _UPPER_RANGE:
        reach = "beyond" if q3 > ask else "at" if q3 == ask else "near"
        return TARGET_SUPPORT_UPPER_RANGE.format(
            value_days=value_days,
            ask=ask_days,
            upper_quartile_days=_figure(q3),
            upper_quartile_reach=TARGET_SUPPORT_UPPER_RANGE_REACH[reach],
        )
    if current is None:
        return None
    reason = (
        TARGET_SUPPORT_PARTIAL_Q3_REASON.format(upper_quartile_days=_figure(q3))
        if q3 is not None
        else TARGET_SUPPORT_PARTIAL_GAP_REASON
    )
    return TARGET_SUPPORT_PARTIAL.format(
        value_days=value_days,
        extent=(
            TARGET_SUPPORT_PARTIAL_MATERIAL
            if value - current >= _MATERIAL_MOVE_DAYS
            else ""
        ),
        current=_figure(current),
        ask=ask_days,
        reason=reason,
    )


def _rationale_argument_lines(brief: NegotiationBrief) -> list[str]:
    """Why each Argumentation argument is used, in the catalogue's rationale wording.

    Covers every argument section 2 makes, in the same order, and then Cost
    Impact - which section 2 no longer carries at all (client, 2026-09-18).
    Argumentation is the benchmark names and their figures; the reasoning that
    used to sit beside them there, and the cost-impact assessment that was
    never a benchmark, are both this section's job.

    So the rule is one-way, and the tests hold it that way: every Argumentation
    argument MUST have a line here, but not every line here has an
    Argumentation bullet. Only the figures the payload carries are translated.
    """
    by_name = {b.name: b for b in brief.facts.strategy_benchmarks}
    lines: list[str] = []
    for argument in argumentation_arguments(brief):
        definition = ARGUMENT_CATALOG.get(argument["key"])
        wording = definition.rationale if definition is not None else None
        if not isinstance(wording, BenchmarkRationaleWording):
            continue
        bench = by_name.get(argument["key"])
        value = argument.get("value_days")
        sentence = wording.render(
            value_days=value,
            occurrences=bench.occurrences if bench is not None else None,
            average_days=bench.avg if bench is not None else None,
            upper_quartile_days=bench.q3 if bench is not None else None,
        )
        if not sentence:
            continue
        verdict = _target_support_sentence(
            value,
            bench.q3 if bench is not None else None,
            ask=brief.ask,
            current=brief.facts.current_term_days,
        )
        if verdict:
            sentence += " " + verdict
        lines.append(f"* **{argument['title']}**: {sentence}")

    if relationship_argument_applies(brief):
        lines.append(
            f"* **{ARGUMENT_CATALOG['relationship'].title}**: {RELATIONSHIP_RATIONALE}"
        )

    # Regulatory Compliance used to be explained here; it left section 2
    # (client, 2026-09-21), and a why for an argument the playbook does not
    # make is exactly the one-way rule broken the other way round.

    cost = brief.assessments.get("cost_impact") or {}
    cost_wording = ARGUMENT_CATALOG["costImpact"].rationale
    if (
        cost.get("usable_as_argument")
        and cost.get("cost_impact_percent") is not None
        and isinstance(cost_wording, CostImpactRationaleWording)
    ):
        sentence = cost_wording.render(
            percent=cost.get("cost_impact_percent"),
            economic_profit=cost.get("supplier_economic_profit"),
        )
        lines.append(f"* **{ARGUMENT_CATALOG['costImpact'].title}**: {sentence}")
    return lines


def _rationale_block(brief: NegotiationBrief) -> str:
    """Section 4: the why behind each section-2 argument, and nothing else.

    No success probability, leverage or DSO - only the rationale for the
    arguments cited under Argumentation. When none are cited there is nothing
    to explain, and the section says so rather than rendering empty.
    """
    lines = _rationale_argument_lines(brief)
    if not lines:
        return NO_RATIONALE_LINE
    return "\n".join(lines)


def _scf_block(brief: NegotiationBrief) -> str:
    """Section 2 SCF content (opening bullets + optional key-argument SCF lines)."""
    plan = build_scf_playbook_plan(
        brief.facts, brief.arguments, scf_enabled=brief.scf_enabled
    )
    if plan is None:
        return ""

    lines = [
        "## SUPPLY CHAIN FINANCE — already decided. Render it; decide nothing.",
        "SCF is enabled for this negotiation AND offerable on rate. It belongs "
        "in section 2 (Opening Position and Argumentation) as the LAST bullets "
        "after the Opening Line and Argumentation. Write the wording "
        "below as given.",
        "",
        f"  * **{SCF_OPENING_NOTE_LABEL}**: {plan.opening_note}",
        "",
        f"  * **{SCF_OPENING_PITCH_LABEL}**: {plan.opening_pitch}",
        "",
    ]
    # The SCF financing-cost lines (supplier financing cost, rate advantage,
    # ...) are not offered any more: section 2's arguments are the four
    # benchmarks and nothing else (client, 2026-09-21), and
    # `_stamp_argumentation_arguments` removes one the model writes anyway.

    if not plan.undercuts_supplier_rate:
        lines.append("")
        lines.append(
            "RATE CLAIM (guidance for you — do NOT write this into the playbook): "
            "our programme does NOT price below this supplier's own borrowing. "
            "Nothing in the playbook may say or imply that SCF is cheaper money "
            "for them."
        )

    return "\n".join(lines)


def _tone_block(tone: dict[str, str] | None) -> str:
    if not tone:
        return (
            "## TONE\n"
            "No tone was selected — default to a balanced, professional, "
            "fact-led tone for 'Opening Position and Argumentation' and "
            "'Target and BATNA'."
        )
    return (
        "## TONE — apply to 'Opening Position and Argumentation' and "
        "'Target and BATNA'\n"
        f"- {tone.get('label', '')}: {tone.get('description', '')}\n"
        f"- Wording rules: {tone.get('wording_rules', '')}"
    )
