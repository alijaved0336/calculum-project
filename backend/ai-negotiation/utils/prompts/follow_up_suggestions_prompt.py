import re

from domain.services.follow_up_policy import shares_known_topic

follow_up_system_prompt = """\
You generate follow-up action suggestions for a B2B procurement negotiation assistant.

Output exactly 3 short follow-up actions the negotiator might take next, as a JSON array of 3 strings — nothing else.

THE ONE RULE THAT OVERRIDES EVERY OTHER: every suggestion must be something THIS system can
actually do. The prompt below lists the assistant's capabilities for this turn under
"This assistant can do ONLY the following". A suggestion that does not map onto one of those
capabilities — however sensible it sounds as procurement advice — is a dead end: clicking it
produces a refusal or an irrelevant answer. This assistant only ever works on the PAYMENT TERMS
of the ONE supplier in this session, using the data already in this session.

Examples of the failure mode (all reasonable advice, none of them things this system can do):
sourcing or comparing alternative/second-source suppliers, total cost of ownership analysis,
documenting or managing the supplier relationship, legal/compliance review, contract levers
other than payment terms, pricing or volume negotiation, market research.

Rules:
- Each suggestion must be 3–7 words, no punctuation at the end.
- Output ONLY a valid JSON array of exactly 4 strings — no explanation, no markdown.
- Ground every suggestion in the specific content of this exchange: reference actual payment term lengths, supplier names, figures, or situations mentioned. Never use a vague label alone.
- NEVER suggest changing, adjusting, or setting the tone (e.g. "Make tone assertive", "Switch to collaborative tone"). Tone is controlled separately by the user via UI buttons — tone suggestions are always wrong here.
- If suggesting pushback handling, describe what the supplier might specifically push back on.
- Never repeat the action just taken (e.g. don't suggest "Recommend strategy" if that was just done).
- Vary the 4 suggestions: one to refine the current response, one to explore a different action, one that escalates or pivots, one document action.
- Never suggest drafting or writing an email — that capability is not available.
- Never suggest running a scenario or what-if (e.g. "Run scenario", "Run 90-day payment scenario") — that capability is not offered as a follow-up.
- The playbook is a fixed document built from the stored target and BATNA — it takes no day-count parameter and cannot be generated "for" another number or "with SCF". Suggest it only as the bare "Generate negotiation playbook", NEVER "Generate playbook for N days", "Generate playbook with SCF" or "Update the playbook"; to change the numbers, suggest the override instead ("Set BATNA to 45 days").
- Good examples: "Handle if supplier rejects 60 days", "Add SCF option to proposal", "Generate negotiation playbook", "Recommend opening strategy".
- Bad examples (never output these): "Make tone assertive", "Switch to collaborative tone", "Refine tone", "Test pushback", "Run scenario", "Run 90-day payment scenario", "Generate playbook for 60 days", "Generate playbook with SCF", "Update the playbook", "Draft email", "Recommend strategy".

Good: ["Handle if supplier rejects 60 days", "Generate negotiation playbook", "Recommend opening strategy"]
Bad: ["Make tone assertive", "Test pushback", "Run 90-day scenario", "Generate playbook for 60 days", "Review other contract levers", "Compare against other suppliers"]
"""

_FALLBACK_BY_INTENT: dict[str, list[str]] = {
    "generate_negotiation_playbook": [
        "Handle likely supplier pushback",
        "Recommend opening strategy",
        "Summarize supplier position",
    ],
    "recommend_opening_strategy": [
        "Set BATNA to 45 days",
        "Handle likely supplier pushback",
        "Generate negotiation playbook",
    ],
    "handle_supplier_pushback": [
        "Hold firm on proposed terms",
        "Offer SCF as compromise",
        "Generate negotiation playbook",
    ],
    "run_scenario": [
        "Generate negotiation playbook",
        "Recommend opening strategy",
        "Summarize supplier position",
    ],
    "summarize_supplier_position": [
        "Generate negotiation playbook",
        "Recommend opening strategy",
        "Explain this recommendation further",
    ],
    "explain_recommendation": [
        "Generate negotiation playbook",
        "Handle supplier pushback",
        "Recommend opening strategy",
    ],
    "evaluate_counter_offer": [
        "Reject and counter with original terms",
        "Generate negotiation playbook",
        "Recommend opening strategy",
    ],
    # Every entry must NAME the programme, because `strip_scf_follow_ups`
    # recognises an SCF dead end by wording alone. "Add early payment discount"
    # read as an ordinary cash discount, and a bare "financing offer" leaned on
    # the word "financing" — which the detector deliberately ignores, since it
    # is also the supplier's own borrowing rate. Both survived the filter and
    # offered the negotiator a lever that cannot be pulled.
    # `test_every_scf_intent_follow_up_is_strippable` guards this list.
    "reframe_with_financing": [
        "Add early payment financing",
        "Explain the SCF rate impact",
        "Discuss SCF terms with supplier",
    ],
    "answer_data_question": [
        "Generate negotiation playbook",
        "Summarize supplier position",
        "Recommend opening strategy",
    ],
    "meta_operation": [
        "Generate negotiation playbook",
        "Summarize supplier position",
        "Recommend opening strategy",
    ],
    "greeting": [
        "Generate negotiation playbook",
        "Recommend opening strategy",
        "Summarize supplier position",
    ],
    "unclear": [
        "Generate negotiation playbook",
        "Recommend opening strategy",
        "Summarize supplier position",
    ],
    "out_of_scope": [
        "Generate negotiation playbook",
        "Recommend opening strategy",
        "Summarize supplier position",
    ],
}

_DEFAULT_FALLBACK = [
    "Generate negotiation playbook",
    "Recommend opening strategy",
    "Summarize supplier position",
]

# Used instead of the intent-keyed fallback above whenever the turn was
# short-circuited by no_opportunity/scf_blocked (agents.state.blocked_by) —
# the intent-keyed list assumes a real strategy node ran, which is exactly
# wrong here (it would re-suggest the playbook/strategy that was just refused).
_FALLBACK_WHEN_BLOCKED: dict[str, list[str]] = {
    "no_extension": [
        "Summarize the current supplier position",
        "Show key supplier facts",
        "Explain this recommendation further",
    ],
    "regulatory_cap": [
        "Summarize the regulatory cap basis",
        "Show key supplier facts",
        "Explain this recommendation further",
    ],
    "scf_disabled": [
        "Summarize supplier position instead",
        "Ask about non-SCF payment options",
        "Show key supplier facts",
    ],
}


def get_fallback_follow_ups(intent_value: str | None) -> list[str]:
    """Return static fallbacks keyed by intent, used when the LLM call fails."""
    if not intent_value:
        return _DEFAULT_FALLBACK
    return _FALLBACK_BY_INTENT.get(intent_value.lower(), _DEFAULT_FALLBACK)


def get_blocked_fallback_follow_ups(blocked_by: str) -> list[str]:
    """Return static fallbacks for a turn short-circuited by blocked_by."""
    return _FALLBACK_WHEN_BLOCKED.get(blocked_by, _DEFAULT_FALLBACK)


def _select_fallback(
    intent_value: str | None, blocked_by: str | None = None, has_opportunity: bool = True
) -> list[str]:
    """Pick the correct static fallback family for this turn's gating state.

    Shared by every backstop below that needs a backfill source, so a backfill
    can never reintroduce a gated capability (e.g. "Generate negotiation
    playbook") that ``strip_unavailable_follow_ups`` specifically removed for
    a blocked/no-opportunity turn — the intent-keyed fallback assumes a real
    strategy node ran, which is exactly wrong on those turns.
    """
    if blocked_by:
        return get_blocked_fallback_follow_ups(blocked_by)
    if not has_opportunity:
        return get_blocked_fallback_follow_ups("no_extension")
    return get_fallback_follow_ups(intent_value)


# Words that carry no distinguishing weight when comparing two chips.
_STOPWORDS = frozenset({
    "a", "an", "the", "to", "for", "of", "on", "in", "with", "and", "or", "if",
    "this", "that", "these", "those", "it", "its", "our", "their", "them", "us",
    "is", "are", "be", "at", "as", "from", "by", "about", "further", "instead",
})


def _content_words(text: str) -> frozenset[str]:
    return frozenset(w for w in re.findall(r"[a-z0-9]+", text.lower()) if w not in _STOPWORDS)


def _leading_word(text: str) -> str | None:
    """The chip's first content word — the action it names."""
    for word in re.findall(r"[a-z0-9]+", text.lower()):
        if word not in _STOPWORDS:
            return word
    return None


def _is_near_duplicate(text: str, existing: list[str]) -> bool:
    """True if ``text`` asks the same thing as something already in ``existing``.

    Exact-string dedup is not enough once a backfill can pull a curated
    fallback in beside a model-written chip: a live turn returned both
    "Summarize current supplier stance" (the model's) and "Summarize the
    current supplier position" (the fallback's) — one click, offered twice in
    different words. This compares content words rather than characters, so
    wording differences that do not change the ask collapse together.

    The VERB decides, then the object: two chips are the same ask only when
    they open with the same action word AND what follows is the same thing
    said twice. A raw word-overlap score cannot make that call — "Extend the
    term to 75 days" and "Set the term to 75 days" score identically to
    "Summarize current supplier stance" and "Summarize the current supplier
    position", yet the first pair is two different answers to a clarifying
    question and the second is one ask written twice. The leading verb is what
    separates them.

    Within a shared verb the comparison is blunt on purpose: a subset or a
    half-overlap counts as the same. Two chips differing only in a figure
    ("...rejects 60 days" vs "...rejects 90 days") therefore collapse, which
    is the intended reading — a chip row has three slots and should spend them
    on three different actions.
    """
    words = _content_words(text)
    if not words:
        return False
    verb = _leading_word(text)
    rest = words - {verb} if verb else words
    for other in existing:
        other_words = _content_words(other)
        if not other_words or _leading_word(other) != verb:
            continue
        other_rest = other_words - {verb} if verb else other_words
        if not rest or not other_rest:
            return True
        if rest <= other_rest or other_rest <= rest:
            return True
        if len(rest & other_rest) / len(rest | other_rest) >= 0.5:
            return True
    return False


def _capability_of(text: str) -> str | None:
    """The capability ``text`` reads as an ask for, or None.

    First match in registry order, so the answer is stable for a given string.
    """
    from domain.services.agent_capabilities import AGENT_CAPABILITIES

    for cap in AGENT_CAPABILITIES.values():
        if cap.follow_up_pattern and re.search(cap.follow_up_pattern, text, re.IGNORECASE):
            return cap.label
    return None


def _backfill(
    kept: list[str], fallback_source: list[str], exclude: set[str] | None = None
) -> list[str]:
    """Top `kept` up to 3 items from `fallback_source`, skipping duplicates.

    `exclude` (already-lowercased) additionally blocks candidates that aren't
    in `kept` but were deliberately removed by the caller — e.g. a string
    just stripped for repeating the previous turn should never be silently
    reintroduced here just because it also appears in the fallback source.
    """
    if len(kept) >= 3:
        return kept[:3]
    seen = {s.lower() for s in kept} | (exclude or set())
    # Never top up with a SECOND chip for a capability the row already offers.
    # The fallbacks are generic by design, so once "Summarize supplier stance"
    # is in the row, adding "Summarize the current supplier position" beside it
    # spends a slot on the same click. `_is_near_duplicate` cannot see that
    # pair — "stance" and "position" are synonyms, so the two share only one
    # content word — but both plainly ask for the summary capability, and for
    # a generic backfill candidate that is enough. This applies to backfill
    # only: a model-written chip carrying real specifics ("Handle if supplier
    # rejects 60 days") legitimately shares a capability with another.
    covered = {c for c in (_capability_of(s) for s in kept) if c}
    for candidate in fallback_source:
        if len(kept) >= 3:
            break
        if candidate.lower() in seen or _is_near_duplicate(candidate, kept):
            continue
        capability = _capability_of(candidate)
        if capability and capability in covered:
            continue
        kept.append(candidate)
        seen.add(candidate.lower())
        if capability:
            covered.add(capability)
    return kept[:3]


# Tone is controlled by the user via a dedicated UI button, so a tone suggestion
# is always wrong here. The prompts instruct the LLM to avoid them, but this is
# the deterministic backstop so a leaked tone follow-up never reaches the client.
_TONE_RE = re.compile(r"\btone\b", re.IGNORECASE)


def strip_tone_follow_ups(
    follow_ups: list[str], intent_value: str | None
) -> list[str]:
    """Drop any tone-related follow-up and backfill from static fallbacks to 3."""
    kept = [s for s in follow_ups if not _TONE_RE.search(s)]
    return _backfill(kept, get_fallback_follow_ups(intent_value))


# Running a scenario/what-if is not offered as a follow-up suggestion (product
# decision — clients reported it appearing at random, disconnected from where
# the negotiation stood). The prompt instructs the LLM to avoid it, but this is
# the deterministic backstop so a leaked scenario follow-up never reaches the
# client. The curated fallback lists are themselves scenario-free (see
# `tests/unit/test_follow_up_generator.py`'s fallback-list scan), so backfill
# can never reintroduce what this just removed.
_SCENARIO_RE = re.compile(r"\bscenario\b", re.IGNORECASE)


def strip_scenario_follow_ups(
    follow_ups: list[str], intent_value: str | None
) -> list[str]:
    """Drop any scenario/what-if follow-up and backfill from static fallbacks to 3."""
    kept = [s for s in follow_ups if not _SCENARIO_RE.search(s)]
    return _backfill(kept, get_fallback_follow_ups(intent_value))


# A follow-up that just restates the assistant's own clarifying question
# ("Clarify if...", "Ask for clarification on...") is a dead end — sending it
# as the next message tells the pipeline nothing it doesn't already know. The
# prompt instructs the model to answer the question instead, but this is the
# deterministic backstop so a leaked meta-clarify follow-up never reaches the
# client.
_META_CLARIFY_RE = re.compile(
    r"^(clarify\b|ask (for )?clarification\b|confirm (whether|which|if)\b|"
    r"check (which|whether|if)\b)",
    re.IGNORECASE,
)


def strip_meta_clarify_follow_ups(
    follow_ups: list[str], intent_value: str | None
) -> list[str]:
    """Drop any follow-up that restates a question instead of answering it.

    Backfill avoids duplicating suggestions already present (case-insensitive)
    and, being drawn from the curated fallbacks, is guaranteed meta-free.
    """
    kept = [s for s in follow_ups if not _META_CLARIFY_RE.search(s.strip())]
    return _backfill(kept, get_fallback_follow_ups(intent_value))


# Phrases with no backing capability in this system — clicking them sends a
# message the graph can only answer with a poor/irrelevant response:
#   - cross-supplier comparisons: this session only has data for the CURRENT
#     supplier, and the intent classifier's own rules route "other/cross-
#     supplier" to out_of_scope (see utils/prompts/intent_classifier_prompt.py).
#   - "contract lever"/"non-term" framing: no node in this system handles
#     non-payment-term contract terms (quality, volume, warranty, etc.) — it
#     was seen verbatim in production ("Review non-term contract levers") as a
#     static fallback string that itself violated this rule.
#   - legal/compliance review: also not a capability this assistant has.
# The prompt instructs the model to avoid these (see follow_up_system_prompt),
# but this is the deterministic backstop so a leaked one never reaches the
# client — see tests/unit/test_follow_up_generator.py's fallback-list scan for
# the regression guard that keeps them out of the STATIC lists too.
_UNBACKED_RE = re.compile(
    r"\b(other suppliers?|another supplier|competitors?|cross-supplier|switch suppliers?|"
    r"non-term (contract )?levers?|contract levers?|legal review|compliance review)\b",
    re.IGNORECASE,
)


def strip_unbacked_follow_ups(
    follow_ups: list[str], intent_value: str | None
) -> list[str]:
    """Drop any follow-up with no backing capability, and backfill to 3.

    See ``_UNBACKED_RE`` for what counts as unbacked. Backfill is drawn from
    the curated intent-keyed fallbacks, which are themselves covered by the
    same regression guard, so this can never re-introduce what it just removed.
    """
    kept = [s for s in follow_ups if not _UNBACKED_RE.search(s)]
    return _backfill(kept, get_fallback_follow_ups(intent_value))


# Kept alongside `canonicalise_follow_ups` below, which rewrites a
# day-counted playbook chip to the plain ask rather than dropping it: the
# canonicaliser runs first, so in the LLM path this is a second line of
# defence — but `_playbook_mentions_number` is also the fixed-chip regression
# guard's definition of a violation (tests/unit/test_follow_up_policy.py), so
# it stays the single place that says what one looks like.
# Generating a playbook takes no day-count parameter — unlike a scenario/
# draft, there is no "N-day playbook" variant, so a suggestion pairing
# "playbook" with a day-count is never valid, regardless of whether that
# number happens to match the current or target term. This is stricter than
# `_mentions_unactionable_ask` below (which only flags a MISMATCHED day-count
# for drafting/strategy verbs generally) and runs unconditionally rather than
# only when blocked/no-opportunity.
_PLAYBOOK_RE = re.compile(r"\bplaybook\b", re.IGNORECASE)
_PLAYBOOK_DAY_RE = re.compile(r"\d{1,4}\s*-?\s*days?\b", re.IGNORECASE)


def _playbook_mentions_number(text: str) -> bool:
    """True if ``text`` pairs "playbook" with a day-count, e.g. "Generate
    playbook for 60 days" — never valid, since playbook takes no day-count
    parameter. Shared by the fixed-chip regression guard (see
    ``tests/unit/test_follow_up_policy.py``) and the strip function below, so
    the two can never drift apart on what counts as a violation."""
    return bool(_PLAYBOOK_RE.search(text) and _PLAYBOOK_DAY_RE.search(text))


def strip_playbook_day_count_follow_ups(
    follow_ups: list[str], intent_value: str | None
) -> list[str]:
    """Drop any playbook suggestion that names a day-count, and backfill to 3."""
    kept = [s for s in follow_ups if not _playbook_mentions_number(s)]
    return _backfill(kept, get_fallback_follow_ups(intent_value))

def canonicalise_follow_ups(follow_ups: list[str]) -> list[str]:
    """Rewrite a suggestion for a fixed-output capability to its canonical ask.

    Some nodes build a FIXED document from the turn's stored brief and ignore
    every qualifier in the request — the playbook is the case
    (agents.nodes.negotiation_guide). A chip like "Generate playbook for 60
    days" or "Generate playbook with SCF" therefore promises a variant that
    cannot be produced: clicking it returns the ordinary playbook for the
    STORED target, which reads as the system ignoring what was clicked.
    Overriding the numbers is a separate capability (``apply_override``), and
    a chip that wants that should say so ("Set BATNA to 45 days").

    Rewriting rather than dropping keeps the negotiator's route to the action
    and just tells the truth about what it does. Duplicates that collapse out
    of the rewrite (two playbook variants in one list) are removed; the list
    is NOT backfilled — running the canonicaliser before every dedup backstop
    is what lets those passes see the real, collapsed list.
    """
    from domain.services.agent_capabilities import AGENT_CAPABILITIES

    canonical = [
        (cap.follow_up_pattern, cap.canonical_follow_up)
        for cap in AGENT_CAPABILITIES.values()
        if cap.follow_up_pattern and cap.canonical_follow_up
    ]
    out: list[str] = []
    seen: set[str] = set()
    for suggestion in follow_ups:
        text = suggestion
        for pattern, replacement in canonical:
            if re.search(pattern, suggestion, re.IGNORECASE):
                text = replacement
                break
        if text.lower() in seen or _is_near_duplicate(text, out):
            continue
        seen.add(text.lower())
        out.append(text)
    return out


def _matches_available_capability(suggestion: str, capabilities) -> bool:
    """True if ``suggestion`` reads as an ask for one of ``capabilities``."""
    return any(re.search(cap.follow_up_pattern, suggestion, re.IGNORECASE) for cap in capabilities)


def strip_out_of_scope_follow_ups(
    follow_ups: list[str],
    intent_value: str | None,
    blocked_by: str | None = None,
    has_opportunity: bool = True,
    scf_offerable: bool = True,
) -> list[str]:
    """Keep only suggestions that map onto something this system can do now.

    The generic form of every phrase-specific backstop above. Those are
    DENY-lists: each one was added after a particular wrong suggestion reached
    a client ("Review non-term contract levers", "Run 90-day scenario"), and
    each only catches the wording that was seen. The model keeps inventing new
    ones — "Review alternative suppliers for better terms", "Analyze total
    cost of ownership impact", "Document current supplier relationship status"
    are all sound procurement advice and all dead ends here, and none of them
    matched a deny-list.

    So this inverts the test: a suggestion survives only if it reads as an ask
    for one of the capabilities this system actually has for THIS turn (see
    ``domain.services.agent_capabilities.available_follow_up_capabilities`` —
    the same registry the graph gates on, so scope and gating stay in sync by
    construction). Anything else is dropped and backfilled from the curated
    fallbacks, which are themselves capability-matching (guarded by
    ``tests/unit/test_follow_up_generator.py``).

    Gating is honoured too: on a blocked/no-opportunity turn the strategy
    capabilities are not in the available set, so "Generate negotiation
    playbook" is out of scope here for the same reason and by the same
    mechanism as "Review alternative suppliers" — no separate rule needed.
    """
    from domain.services.agent_capabilities import available_follow_up_capabilities

    capabilities = available_follow_up_capabilities(has_opportunity, scf_offerable, blocked_by)
    if not capabilities:
        return follow_ups
    kept = [s for s in follow_ups if _matches_available_capability(s, capabilities)]
    if len(kept) == len(follow_ups):
        return follow_ups
    fallback = _select_fallback(intent_value, blocked_by, has_opportunity)
    return _backfill(kept, fallback)


def strip_scf_follow_ups(
    follow_ups: list[str],
    scf_offerable: bool,
    intent_value: str | None,
    blocked_by: str | None = None,
    has_opportunity: bool = True,
    user_message: str | None = None,
    previous_follow_ups: list[str] | None = None,
) -> list[str]:
    """Drop SCF-related follow-ups and backfill to 3 when SCF can't be offered.

    A no-op when ``scf_offerable`` is True, or when nothing mentions SCF —
    in particular it must never truncate a fixed curated set (4-5 chips, see
    domain.services.follow_up_policy) that has already had its SCF chips
    removed. Offerability, not the session setting: "Add SCF option" is a
    dead end for a supplier with no programme rate on file just as surely as
    for an account without the programme.

    This runs at the API layer, AFTER ``generate_follow_ups`` has already
    applied its own final dedup against the current message and the previous
    turn's chips — so a backfill here must repeat those same exclusions
    (``user_message``/``previous_follow_ups``, both optional to keep this
    callable without them) and must pick a gating-aware fallback family via
    ``_select_fallback``, or it can silently undo that dedup, or reintroduce a
    gated capability on a blocked/no-opportunity turn.
    """
    if scf_offerable:
        return follow_ups
    from domain.services.scf_policy import mentions_scf

    kept = [s for s in follow_ups if not mentions_scf(s)]
    if len(kept) == len(follow_ups):
        return follow_ups
    if len(kept) >= 3:
        return kept[:3]
    fallback = [c for c in _select_fallback(intent_value, blocked_by, has_opportunity) if not mentions_scf(c)]
    exclude = {s.strip().lower() for s in (previous_follow_ups or [])}
    if user_message and user_message.strip():
        exclude.add(user_message.strip().lower())
    return _backfill(kept, fallback, exclude=exclude)


# Capability labels that must never appear in a suggestion once the graph has
# already refused to act on them this turn (see domain.services.agent_capabilities).
# Built from each capability's `label` so the two stay in sync — a new gated
# capability only needs an entry there, not a second regex list here.
def _capability_phrase_pattern(requires_opportunity: bool = False, requires_scf: bool = False) -> re.Pattern[str]:
    from domain.services.agent_capabilities import AGENT_CAPABILITIES

    labels = [
        cap.label
        for cap in AGENT_CAPABILITIES.values()
        if (requires_opportunity and cap.requires_opportunity)
        or (requires_scf and cap.requires_scf)
    ]
    return re.compile("|".join(re.escape(label) for label in labels), re.IGNORECASE)


def strip_repeated_follow_ups(
    follow_ups: list[str],
    previous_follow_ups: list[str] | None,
    intent_value: str | None,
    blocked_by: str | None = None,
    has_opportunity: bool = True,
) -> list[str]:
    """Drop any follow-up that repeats one shown last turn, and backfill to 3.

    A no-op when ``previous_follow_ups`` is empty/None. Matching is
    case-insensitive exact string comparison — the same normalisation used by
    every other backstop's dedup logic (see ``_backfill``). Backfill also
    excludes ``previous_follow_ups``: some intents' fallback lists include a
    string that also happens to be the one just stripped (e.g.
    ``handle_supplier_pushback``'s fallback starts with "Hold firm on
    proposed terms" — exactly the kind of chip a negotiator clicks and then
    sees re-suggested), and without this exclusion `_backfill` would put it
    right back in.

    ``blocked_by``/``has_opportunity`` pick the backfill source via
    ``_select_fallback`` — without them, backfill always drew from the plain
    intent-keyed fallback regardless of gating state, which could reintroduce
    a gated action (e.g. "Generate negotiation playbook") on a turn that was
    just blocked from suggesting exactly that.

    Also drops (and never backfills) a chip that asks the same thing as a
    previous-turn chip in different words — see
    ``domain.services.follow_up_policy.shares_known_topic``. Exact-string
    matching alone misses this: "Show key facts about the supplier." (the
    fixed chip) and "Show key supplier facts" (this module's own
    ``_FALLBACK_WHEN_BLOCKED`` entries) are the same ask, independently
    worded, so a negotiator shown one last turn must never see the other.
    """
    if not previous_follow_ups:
        return follow_ups
    previous = {s.strip().lower() for s in previous_follow_ups}
    kept = [
        s for s in follow_ups
        if s.strip().lower() not in previous and not shares_known_topic(s, previous_follow_ups)
    ]
    fallback = _select_fallback(intent_value, blocked_by, has_opportunity)
    fallback = [c for c in fallback if not shares_known_topic(c, previous_follow_ups)]
    return _backfill(kept, fallback, exclude=previous)


def strip_current_message_follow_ups(
    follow_ups: list[str],
    user_message: str,
    intent_value: str | None,
    blocked_by: str | None = None,
    has_opportunity: bool = True,
    previous_follow_ups: list[str] | None = None,
) -> list[str]:
    """Drop any follow-up that just restates the message the negotiator sent this turn.

    Distinct from ``strip_repeated_follow_ups`` (which only guards against the
    PRIOR turn's chips): a chip identical to what the negotiator just asked or
    clicked is wrong the very first time it's shown, too. The static
    ``blocked_by`` fallback lists are the concrete failure case — e.g.
    ``_FALLBACK_WHEN_BLOCKED["no_extension"]`` starts with "Summarize the
    current supplier position" verbatim, which is exactly wrong when that IS
    the message that just triggered the block. Backfill draws from the same
    fallback family this call is guarding (blocked/no-opportunity/intent) and
    also excludes the current message AND ``previous_follow_ups`` — without
    the latter, this function's own backfill could reintroduce a chip that a
    prior ``strip_repeated_follow_ups`` pass had just deliberately removed.

    Also drops (and never backfills) a chip that asks the same thing as the
    current message in different words — see
    ``domain.services.follow_up_policy.shares_known_topic``. This is the
    concrete case a negotiator hits by clicking a suggested chip that was
    itself a paraphrase of what they just asked: "Show key facts about the
    supplier." answered, then "Show key supplier facts" offered right back —
    exact-string comparison alone doesn't see these as the same ask.
    """
    current = user_message.strip().lower()
    if not current:
        return follow_ups
    kept = [
        s for s in follow_ups
        if s.strip().lower() != current and not shares_known_topic(s, [user_message])
    ]
    fallback = _select_fallback(intent_value, blocked_by, has_opportunity)
    fallback = [c for c in fallback if not shares_known_topic(c, [user_message])]
    exclude = {current} | {s.strip().lower() for s in (previous_follow_ups or [])}
    return _backfill(kept, fallback, exclude=exclude)


# A follow-up pairing a drafting/strategy verb with a day-count is the concrete
# signature of a suggestion that WILL fail the improvement-opportunity gate
# (domain.services.improvement_opportunity) the moment it's clicked, if that
# day-count isn't where the negotiation already stands: e.g. "Draft email to
# Flextronics requesting 120 days" when the stored target/current are both 90.
# Scenario/what-if exploration ("Run scenario: extend to 90 days") is
# deliberately NOT in this verb list — running a what-if is always safe;
# committing to a draft/strategy for an unattained number is not.
_ACTION_VERB_RE = re.compile(r"\b(draft|generate|handle|reframe|recommend|propose)\b", re.IGNORECASE)
# "60 days", "60-day", and the "Net 75" / "net-75" form a negotiator writes
# just as often — "Recommend opening strategy for Net 75" was produced in a
# live session and carried its day-count entirely in the Net form.
_DAY_NUMBER_RE = re.compile(r"(?:(\d{1,4})\s*-?\s*days?\b|\bnet\s*-?\s*(\d{1,4})\b)", re.IGNORECASE)


def _day_numbers(suggestion: str) -> set[int]:
    """Every day-count named in ``suggestion``, in either notation."""
    return {
        int(group)
        for match in _DAY_NUMBER_RE.findall(suggestion)
        for group in match
        if group
    }


# An override chip ("Set BATNA to 45 days") names a number the negotiator is
# asking the system to STORE, so it is read against a different rule than a
# drafting ask — see `_mentions_unactionable_ask`.
_OVERRIDE_VERB_RE = re.compile(r"\b(set|reset|adjust|override|raise|lower|change)\b", re.IGNORECASE)
_OVERRIDE_TARGET_RE = re.compile(r"\b(target|batna|goal)\b", re.IGNORECASE)


def _mentions_unactionable_override(suggestion: str, current_term_days: int | None) -> bool:
    """True if ``suggestion`` proposes storing a target/BATNA that is no move.

    The system's own definition of an opportunity is an ask ABOVE current terms
    (domain.services.improvement_opportunity), so "Set BATNA to 75 days" on a
    supplier already at 75 — and "Set BATNA to 60 days" on that same supplier —
    store a number that leaves nothing to negotiate. Both were produced by the
    live model on a no-opportunity turn, where the override is otherwise the
    one genuinely useful next step, which is exactly why the number matters.
    """
    if current_term_days is None:
        return False
    if not (_OVERRIDE_VERB_RE.search(suggestion) and _OVERRIDE_TARGET_RE.search(suggestion)):
        return False
    numbers = _day_numbers(suggestion)
    return bool(numbers) and all(n <= current_term_days for n in numbers)


def _mentions_unactionable_ask(
    suggestion: str, current_term_days: int | None, has_opportunity: bool = False
) -> bool:
    """True if ``suggestion`` commits to a day-count the negotiation isn't pursuing.

    One rule, read from whichever side the gate is on — a drafting/strategy
    suggestion must name the number actually in play:

    - No improvement opportunity: the negotiation isn't going anywhere, so any
      number OTHER than current terms is a commitment the graph will refuse
      ("Draft email requesting 120 days" when target and current are both 90).
    - An opportunity DOES exist: the target is above current terms, so a
      suggestion naming CURRENT terms proposes negotiating for what we already
      have. This is the inverse dead end and the one seen in a live session —
      "Recommend opening strategy for Net 75" offered on a supplier already at
      75 days.
    - An override chip ("Set BATNA to 75 days") is read against the same rule
      from the storage side — see ``_mentions_unactionable_override``. It
      applies whichever side of the gate the turn is on, because storing a
      target at or below current terms is a no-move in both.

    A no-op (returns False) when there's no action verb, or ``current_term_days``
    is unknown (a missing figure is not evidence of anything — same principle as
    ``domain.services.improvement_opportunity.has_improvement_opportunity``).
    """
    if _mentions_unactionable_override(suggestion, current_term_days):
        return True
    if current_term_days is None or not _ACTION_VERB_RE.search(suggestion):
        return False
    numbers = _day_numbers(suggestion)
    if has_opportunity:
        return current_term_days in numbers
    return any(n != current_term_days for n in numbers)


def strip_unavailable_follow_ups(
    follow_ups: list[str],
    blocked_by: str | None,
    has_opportunity: bool = True,
    current_term_days: int | None = None,
    intent_value: str | None = None,
) -> list[str]:
    """Deterministic backstop: never surface an action the system will refuse.

    Two related but distinct closures, both keyed off the same opportunity
    gate (domain.services.improvement_opportunity):

    - ``blocked_by`` set: THIS turn was short-circuited by no_opportunity/
      scf_blocked. Drop any candidate matching an opportunity-gated capability
      label (playbook, opening strategy, opening email, pushback, financing).
    - ``has_opportunity`` False (regardless of ``blocked_by``): the supplier
      has no stored ask above current terms at all, so a drafting/strategy
      suggestion naming any OTHER day-count (e.g. from a same-turn scenario
      what-if) would fail if clicked, even though nothing was blocked THIS
      turn (run_scenario itself is never gated). Same capability-label check,
      PLUS ``_mentions_unactionable_ask`` to catch phrasing that doesn't use a
      literal capability label (e.g. "Draft email requesting 120 days").

    The day-count check is skipped for ``blocked_by == "scf_disabled"``
    specifically — that closure is about SCF availability, not a term-day
    mismatch, so a day-count backfill there would be irrelevant.

    On the NORMAL case (nothing blocked, an opportunity exists) the capability
    labels are all fine, but the day-count check still runs — in its inverted
    form: a strategy/drafting chip naming CURRENT terms is a dead end exactly
    when there IS something better to pursue (see ``_mentions_unactionable_ask``).
    """
    if not blocked_by and has_opportunity:
        kept = [
            s for s in follow_ups
            if not _mentions_unactionable_ask(s, current_term_days, has_opportunity=True)
        ]
        if len(kept) == len(follow_ups):
            return follow_ups
        return _backfill(kept, _select_fallback(intent_value, None, True))

    gated = _capability_phrase_pattern(requires_opportunity=True)
    kept = [s for s in follow_ups if not gated.search(s)]

    if blocked_by != "scf_disabled":
        kept = [s for s in kept if not _mentions_unactionable_ask(s, current_term_days)]

    return _backfill(kept, get_blocked_fallback_follow_ups(blocked_by or "no_extension"))


def _format_known_figures(source: dict | None) -> str:
    """Render a node's `source` dict (fact name -> {"path", "value"}, see
    e.g. agents.nodes.negotiation_guide) as a compact "Known figures:" line.

    A long generated document (a playbook can run several thousand
    characters) gets truncated below before reaching the prompt, which
    reliably cuts it off before the section carrying the BATNA/benchmark
    figures. `source` is small, exact, and never truncated, so it grounds
    suggestions in the REAL numbers the response was built from even when
    the prose itself got cut short.
    """
    if not source:
        return ""
    parts = [
        f"{key}={entry['value']}"
        for key, entry in source.items()
        if isinstance(entry, dict)
        and isinstance(entry.get("value"), (int, float, str, bool))
        and entry.get("value") not in (None, "")
        and len(str(entry["value"])) <= 50
    ]
    return f"Known figures: {', '.join(parts)}\n\n" if parts else ""


def build_follow_up_prompt(
    user_message: str,
    assistant_response: str,
    intent_value: str | None,
    history_block: str = "",
    blocked_by: str | None = None,
    source: dict | None = None,
    previous_follow_ups: list[str] | None = None,
    has_opportunity: bool = True,
    current_term_days: int | None = None,
    scf_offerable: bool = True,
) -> str:
    from domain.services.agent_capabilities import render_capability_menu

    intent_line = f"Intent: {intent_value}" if intent_value else "Intent: unknown"
    truncated_response = assistant_response[:600].rstrip()
    if len(assistant_response) > 600:
        truncated_response += "…"
    prefix = f"{history_block}\n\n" if history_block else ""
    figures = _format_known_figures(source)

    constraint = ""
    if blocked_by:
        constraint = (
            f"This negotiation has been declared closed (reason: {blocked_by}) — do NOT suggest "
            "generating a playbook, an opening strategy, a new scenario, or any further negotiation "
            "on payment terms. Only suggest non-term actions.\n\n"
        )
    elif not has_opportunity:
        # No same-turn block (run_scenario etc. are never gated), but the
        # supplier has no stored ask above current terms — a suggestion that
        # commits to drafting/pursuing any OTHER day-count would fail the
        # moment it's clicked (see domain.services.improvement_opportunity).
        day_note = f" (currently {current_term_days} days)" if current_term_days is not None else ""
        constraint = (
            f"This supplier has no stored ask above the current payment terms{day_note} — do NOT "
            "suggest generating a playbook, an opening strategy, pushback "
            "handling, or a financing reframe for any other day-count. Running a scenario/what-if "
            "on a different number is fine; committing to draft or pursue that number is not.\n\n"
        )

    already_suggested = ""
    if previous_follow_ups:
        quoted = ", ".join(f'"{s}"' for s in previous_follow_ups)
        already_suggested = (
            f"Already suggested last turn — do not repeat these: {quoted}\n\n"
        )

    menu = render_capability_menu(has_opportunity, scf_offerable, blocked_by)
    capability_block = (
        "This assistant can do ONLY the following for THIS supplier's payment terms — every "
        "suggestion must be one of these, applied to the specifics of this exchange:\n"
        f"{menu}\n"
        "Anything outside this list (other/alternative suppliers, total cost of ownership, "
        "relationship management, legal or compliance review, non-payment-term contract levers, "
        "pricing or volume) is NOT something this assistant can do — never suggest it.\n\n"
    )

    return (
        f"{prefix}{intent_line}\n{constraint}\n"
        f"{capability_block}"
        f"{figures}"
        f"{already_suggested}"
        f"Negotiator asked: {user_message[:200]}\n\n"
        f"Assistant responded: {truncated_response}\n\n"
        "Generate 3 follow-up actions grounded in the above exchange. Output ONLY the JSON array."
    )
