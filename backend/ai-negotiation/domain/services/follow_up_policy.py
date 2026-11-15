"""Fixed follow-up chip sets for the core negotiation journeys.

Product requirement: for the main journeys (opening offer, playbook,
opportunity summary, opening strategy, supplier-standard caution, supplier
pushback, N-day term impact, email drafting) the follow-up chips must be
PREDICTABLE — the same curated list every time — instead of the contextual
LLM-generated set. Everything else keeps the LLM flow.

Resolution is fully deterministic (no LLM), in three tiers, first hit wins:

1. Exact match (after normalisation) against a canonical catalogue: the
   starter questions, every chip in the fixed sets, and the product's example
   phrasings. Chips are sent back verbatim when clicked, so this covers most
   real turns.
2. Intent defaults for intents that map 1:1 onto a journey (playbook, email,
   pushback, scenario).
3. Keyword rules for intents that span two journeys (opening offer vs opening
   strategy, supplier-standard caution within explain_recommendation,
   opportunity summary within summarize_supplier_position, email rewrites
   classified as meta_operation).

Pure module: no I/O, no LLM, safe to call from the follow-up generator on
every turn.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from domain.entities.follow_up import FollowUpTopic
from domain.entities.intent import Intent

# ── Fixed chip sets (verbatim per product spec) ─────────────────────────────


@dataclass(frozen=True)
class Chip:
    """One fixed follow-up chip.

    ``requires_scf`` marks chips that lead to a Supply Chain Finance action —
    dropped (without backfill) when SCF cannot be offered this turn. Explicit
    flag rather than the ``scf_policy.mentions_scf`` regex because "Reframe
    with financing options" does not contain any SCF keyword yet routes to
    ``reframe_with_financing`` (see domain.services.agent_capabilities).
    """

    text: str
    requires_scf: bool = False


FIXED_FOLLOW_UPS: dict[FollowUpTopic, tuple[Chip, ...]] = {
    FollowUpTopic.OPENING_OFFER: (
        Chip("Generate negotiation playbook"),
        Chip("Draft email for payment term optimization."),
        Chip("Show additional arguments to optimize payment terms."),
        Chip("Show key facts about the supplier."),
    ),
    FollowUpTopic.PLAYBOOK: (
        Chip("Recommend negotiation arguments."),
        Chip("Provide summary of payment terms opportunity."),
        Chip("Prepare potential push backs."),
        Chip("Show key facts about the supplier."),
    ),
    FollowUpTopic.OPPORTUNITY_SUMMARY: (
        Chip("Draft email for payment term optimization."),
        Chip("Recommend negotiation arguments."),
        Chip("Prepare potential push backs."),
        Chip("Show key facts about the supplier."),
    ),
    FollowUpTopic.OPENING_STRATEGY: (
        Chip("Why to be careful with the Supplier Standard as Argumentation?"),
        Chip("Draft email for payment term optimization."),
        Chip("Prepare potential push backs."),
        Chip("Show key facts about the supplier."),
    ),
    FollowUpTopic.SUPPLIER_STANDARD_CAUTION: (
        Chip("Draft email for payment term optimization."),
        Chip("Prepare potential push backs."),
        Chip("Show key facts about the supplier."),
        Chip("Generate negotiation playbook"),
    ),
    FollowUpTopic.SUPPLIER_PUSHBACK: (
        Chip("Generate negotiation playbook"),
        Chip("Draft opening email"),
        Chip("Reframe with financing options", requires_scf=True),
    ),
    FollowUpTopic.TERM_IMPACT: (
        Chip("Draft opening email"),
        Chip("Handle supplier pushback"),
        Chip("Generate negotiation playbook"),
    ),
    FollowUpTopic.EMAIL: (
        Chip("Write longer email."),
        Chip("Write another email version with a more negotiable, collaborative tone."),
        Chip("Write another email version with Supply Chain Finance.", requires_scf=True),
        Chip("Suggest formal message from senior management about term initiative."),
        Chip("Generate negotiation playbook"),
    ),
}


# ── Normalisation ───────────────────────────────────────────────────────────

_WS_RE = re.compile(r"\s+")
_TRAILING_PUNCT_RE = re.compile(r"[.?!\s]+$")


def normalise_message(text: str) -> str:
    """Lowercase, collapse whitespace, strip trailing ``.?!`` — the exact-match
    key used by the canonical catalogue."""
    return _TRAILING_PUNCT_RE.sub("", _WS_RE.sub(" ", (text or "").strip().lower()))


# ── Known recurring paraphrase pair ─────────────────────────────────────────

_FACTS_WORD_RE = re.compile(r"\bfacts?\b", re.IGNORECASE)


def mentions_key_supplier_facts(text: str) -> bool:
    """True if ``text`` is a "key facts about the supplier" ask, any wording."""
    words = set(re.findall(r"[a-z']+", (text or "").lower()))
    return "key" in words and "supplier" in words and bool(_FACTS_WORD_RE.search(text or ""))


def shares_known_topic(text: str, references: list[str] | None) -> bool:
    """True if ``text`` asks the same known-paraphrase-pair topic as any of ``references``."""
    if not mentions_key_supplier_facts(text):
        return False
    return any(mentions_key_supplier_facts(r) for r in (references or []))


# ── Tier 1: canonical catalogue ─────────────────────────────────────────────

# Phrasings that resolve by exact match. Chips from the fixed sets above are
# added below automatically; this dict carries the starter questions, the
# product's example phrasings and a few near-verbatim variants clients send.
# Deliberately ABSENT (they keep the LLM flow, per spec): "Show key facts
# about the supplier", "Recommend negotiation arguments", "Show additional
# arguments to optimize payment terms", "Reframe with financing options".
_CANONICAL_PHRASES: dict[str, FollowUpTopic] = {
    # Starter questions (application.services.starter_questions) — kept in
    # sync by tests/unit/test_follow_up_policy.py.
    "generate negotiation playbook": FollowUpTopic.PLAYBOOK,
    "provide summary of payment terms opportunity": FollowUpTopic.OPPORTUNITY_SUMMARY,
    "draft email for payment term optimization": FollowUpTopic.EMAIL,
    # Product example phrasings.
    "suggest a strong opening offer": FollowUpTopic.OPENING_OFFER,
    "suggest an opening offer": FollowUpTopic.OPENING_OFFER,
    "opening offer": FollowUpTopic.OPENING_OFFER,
    "recommend opening strategy": FollowUpTopic.OPENING_STRATEGY,
    "opening strategy": FollowUpTopic.OPENING_STRATEGY,
    "why to be careful with the supplier standard as argumentation": FollowUpTopic.SUPPLIER_STANDARD_CAUTION,
    "draft an email": FollowUpTopic.EMAIL,
    "draft email": FollowUpTopic.EMAIL,
    "draft an opening email": FollowUpTopic.EMAIL,
    "draft opening email": FollowUpTopic.EMAIL,
    # Chip variants.
    "generate playbook": FollowUpTopic.PLAYBOOK,
    "generate full playbook": FollowUpTopic.PLAYBOOK,
    "prepare potential push backs": FollowUpTopic.SUPPLIER_PUSHBACK,
    "prepare potential pushbacks": FollowUpTopic.SUPPLIER_PUSHBACK,
    "handle supplier pushback": FollowUpTopic.SUPPLIER_PUSHBACK,
}

# Chips that are themselves catalogue entries. Not every chip maps to a fixed
# topic (e.g. "Show key facts about the supplier." stays on the LLM flow), so
# this is an explicit allow-list rather than "every chip of set X → X".
_CHIP_TOPICS: dict[str, FollowUpTopic] = {
    # The chip sets all render the canonical "Generate negotiation playbook"
    # (see FIXED_FOLLOW_UPS); the other two spellings are kept here because a
    # stored thread or an older client can still send one back verbatim.
    "Generate negotiation playbook.": FollowUpTopic.PLAYBOOK,
    "Generate negotiation playbook": FollowUpTopic.PLAYBOOK,
    "Generate Playbook": FollowUpTopic.PLAYBOOK,
    "Draft email for payment term optimization.": FollowUpTopic.EMAIL,
    "Draft opening email": FollowUpTopic.EMAIL,
    "Write longer email.": FollowUpTopic.EMAIL,
    "Write another email version with a more negotiable, collaborative tone.": FollowUpTopic.EMAIL,
    "Write another email version with Supply Chain Finance.": FollowUpTopic.EMAIL,
    "Suggest formal message from senior management about term initiative.": FollowUpTopic.EMAIL,
    "Provide summary of payment terms opportunity.": FollowUpTopic.OPPORTUNITY_SUMMARY,
    "Why to be careful with the Supplier Standard as Argumentation?": FollowUpTopic.SUPPLIER_STANDARD_CAUTION,
    "Prepare potential push backs.": FollowUpTopic.SUPPLIER_PUSHBACK,
    "Handle supplier pushback": FollowUpTopic.SUPPLIER_PUSHBACK,
}

_CATALOGUE: dict[str, FollowUpTopic] = {
    **_CANONICAL_PHRASES,
    **{normalise_message(text): topic for text, topic in _CHIP_TOPICS.items()},
}


# ── Tier 2: intent defaults ─────────────────────────────────────────────────

_INTENT_DEFAULT_TOPIC: dict[str, FollowUpTopic] = {
    Intent.GENERATE_NEGOTIATION_PLAYBOOK.value: FollowUpTopic.PLAYBOOK,
    Intent.DRAFT_EMAIL.value: FollowUpTopic.EMAIL,
    Intent.HANDLE_SUPPLIER_PUSHBACK.value: FollowUpTopic.SUPPLIER_PUSHBACK,
    Intent.RUN_SCENARIO.value: FollowUpTopic.TERM_IMPACT,
}


# ── Tier 3: keyword sub-topic rules ─────────────────────────────────────────

_OPENING_OFFER_RE = re.compile(
    r"\b(opening|first|initial|strong|starting)\s+(offer|anchor|bid|position|number|ask)\b",
    re.IGNORECASE,
)
_SUPPLIER_STANDARD_RE = re.compile(r"\bsupplier(?:'s|s)?\s+standard\b", re.IGNORECASE)
_OPPORTUNITY_RE = re.compile(r"\bopportunit(?:y|ies)\b", re.IGNORECASE)
_EMAIL_REWRITE_RE = re.compile(r"\b(e-?mail|message|mail|version|draft|tone)\b", re.IGNORECASE)


def resolve_follow_up_topic(
    message: str,
    intent_value: str | None,
    previous_intent: str | None = None,
) -> FollowUpTopic | None:
    """Return the fixed-chip topic for this turn, or ``None`` for the LLM flow.

    ``previous_intent`` is the classified intent of the PREVIOUS turn (kept in
    the session store next to ``last_follow_ups``) — it lets a free-typed
    rewrite of an email ("make it shorter", classified ``meta_operation``)
    keep the email chip set.
    """
    key = normalise_message(message)
    if not key:
        return None

    # Tier 1 — exact catalogue.
    topic = _CATALOGUE.get(key)
    if topic is not None:
        return topic

    intent = (intent_value or "").strip().lower()

    # Tier 2 — 1:1 intent defaults.
    topic = _INTENT_DEFAULT_TOPIC.get(intent)
    if topic is not None:
        return topic

    # Tier 3 — intents that span two journeys.
    if intent == Intent.RECOMMEND_OPENING_STRATEGY.value:
        return FollowUpTopic.OPENING_OFFER if _OPENING_OFFER_RE.search(message) else FollowUpTopic.OPENING_STRATEGY
    if intent == Intent.EXPLAIN_RECOMMENDATION.value:
        return FollowUpTopic.SUPPLIER_STANDARD_CAUTION if _SUPPLIER_STANDARD_RE.search(message) else None
    if intent == Intent.SUMMARIZE_SUPPLIER_POSITION.value:
        return FollowUpTopic.OPPORTUNITY_SUMMARY if _OPPORTUNITY_RE.search(message) else None
    if intent == Intent.META_OPERATION.value:
        previous = (previous_intent or "").strip().lower()
        if previous == Intent.DRAFT_EMAIL.value and _EMAIL_REWRITE_RE.search(message):
            return FollowUpTopic.EMAIL
        return None

    return None


def render_fixed_follow_ups(
    topic: FollowUpTopic,
    message: str,
    scf_offerable: bool = True,
    previous_follow_ups: list[str] | None = None,
) -> list[str]:
    """Materialise the fixed chip list for ``topic``.

    - Drops ``requires_scf`` chips when SCF cannot be offered. No backfill —
      a shorter list is preferable to a chip that leads to a refusal.
    - Drops a chip identical (after normalisation) to the message just sent,
      so clicking a chip never re-suggests itself — or a chip that asks the
      same thing in different words (``shares_known_topic``, e.g. "Show key
      facts about the supplier." vs "Show key supplier facts" — see its
      docstring; deliberately narrow, not a general paraphrase detector).
    - Drops any chip already shown last turn (``previous_follow_ups``), so an
      unchanged topic (e.g. the same fixed question asked twice in a row)
      doesn't repeat itself turn after turn. No backfill — 2 fresh chips beat
      4 with duplicates — but if every chip would be dropped this way, the
      full set is kept rather than showing nothing.
    """
    current = normalise_message(message)
    previous = {normalise_message(s) for s in (previous_follow_ups or [])}
    out: list[str] = []
    for chip in FIXED_FOLLOW_UPS[topic]:
        if chip.requires_scf and not scf_offerable:
            continue
        text = chip.text
        if normalise_message(text) == current:
            continue
        if normalise_message(text) in previous:
            continue
        if shares_known_topic(text, [message, *(previous_follow_ups or [])]):
            continue
        out.append(text)
    if not out:
        out = [
            chip.text for chip in FIXED_FOLLOW_UPS[topic]
            if not (chip.requires_scf and not scf_offerable)
            and normalise_message(chip.text) != current
            and not shares_known_topic(chip.text, [message])
        ]
    return out
