from __future__ import annotations

import asyncio
import json
import logging
import re

from domain.ports.llm_port import LLMPort
from domain.services.follow_up_policy import render_fixed_follow_ups, resolve_follow_up_topic
from utils.prompts.conversation_history import format_conversation_history
from utils.prompts.follow_up_suggestions_prompt import (
    build_follow_up_prompt,
    canonicalise_follow_ups,
    follow_up_system_prompt,
    get_blocked_fallback_follow_ups,
    get_fallback_follow_ups,
    strip_current_message_follow_ups,
    strip_meta_clarify_follow_ups,
    strip_playbook_day_count_follow_ups,
    strip_repeated_follow_ups,
    strip_scenario_follow_ups,
    strip_out_of_scope_follow_ups,
    strip_unbacked_follow_ups,
    strip_tone_follow_ups,
    strip_unavailable_follow_ups,
)

logger = logging.getLogger(__name__)

_JSON_ARRAY_RE = re.compile(r"\[.*?\]", re.DOTALL)

_SIMPLE_INTENTS = {"greeting", "unclear", "out_of_scope", "unknown"}


async def generate_follow_ups(
    llm: LLMPort,
    user_message: str,
    assistant_response: str,
    intent_value: str | None,
    conversation_history: list[dict[str, str]] | None = None,
    timeout: float = 8.0,
    blocked_by: str | None = None,
    source: dict | None = None,
    previous_follow_ups: list[str] | None = None,
    has_opportunity: bool = True,
    current_term_days: int | None = None,
    scf_offerable: bool = True,
    previous_intent: str | None = None,
) -> list[str]:
    """Generate follow-up suggestions for this turn.

    Core journeys (playbook, email, pushback, scenario, opening offer/strategy,
    opportunity summary, supplier-standard caution — see
    `domain.services.follow_up_policy`) return a FIXED curated chip set with
    no LLM call, so the suggestions are identical every time. Everything else
    gets 3 contextual suggestions via a lightweight LLM call.

    ``scf_offerable``/``previous_intent`` only affect the fixed path: the
    former drops SCF-dependent chips, the latter lets a ``meta_operation``
    rewrite of an email keep the email chip set. ``previous_follow_ups`` also
    reaches the fixed path (in addition to the LLM path below) — a chip shown
    last turn is dropped rather than repeated, with no backfill (see
    `domain.services.follow_up_policy.render_fixed_follow_ups`).

    LLM path — grounded in the current exchange (user message + assistant response);
    ``conversation_history`` is included only as background context (last 5
    turns = 10 messages, tightly truncated) for continuity/avoiding repeats —
    it never overrides the current exchange. Simple intents (greeting,
    unclear, out_of_scope) bypass the LLM and return static entry-point
    suggestions immediately. Returns fallback list on any error so callers
    never raise.

    ``blocked_by`` is set when this turn was short-circuited by
    `no_opportunity`/`scf_blocked` (see agents.state.blocked_by) — it steers
    both the prompt and the deterministic backstop away from re-suggesting
    the exact strategy action the graph just refused to produce.

    ``source`` is the generating node's fact-sourcing dict (e.g. from
    agents.nodes.negotiation_guide) — a long document like a playbook gets
    truncated below before it reaches the model, so this carries the exact
    figures (target/current/BATNA term days, etc.) the response was
    actually built from, independent of where the truncation lands.

    ``previous_follow_ups`` is the 3 chips shown on the prior turn (if any) —
    threaded into the prompt as a "do not repeat" hint and enforced by a
    deterministic backstop, so an unchanged exchange (e.g. a repeated
    clarifying question) doesn't surface the exact same suggestions twice.

    ``has_opportunity``/``current_term_days`` reflect the SAME deterministic
    check the graph itself uses to gate strategy intents (see
    `domain.services.improvement_opportunity`), computed by the caller from
    this turn's resolved facts — NOT from ``blocked_by``, which is only set
    when THIS turn's own intent was gated. A turn can be ungated (e.g.
    `run_scenario`, which is never gated) while the supplier still has no
    stored ask above current terms, in which case a suggestion to draft/pursue
    a DIFFERENT day-count would fail the moment it's clicked — these two
    params let both the prompt and the backstop steer away from that
    regardless of what produced this turn's response.
    """
    normalised = (intent_value or "").lower()

    # blocked_by never co-occurs with a simple intent (no_opportunity/scf_blocked
    # only fire for the gated strategy intents), but the check is written this
    # way so a blocked turn always gets a fresh, grounded call regardless.
    if not blocked_by and (normalised in _SIMPLE_INTENTS or not assistant_response):
        return _fallback(user_message, normalised or None, None, has_opportunity, previous_follow_ups)

    # Fixed curated chip sets for the core journeys — deterministic, no LLM.
    # Skipped when the graph refused this turn (blocked_by) or there is no
    # improvement opportunity at all: the fixed sets name strategy/drafting
    # actions the graph would refuse if clicked, so those turns keep the
    # existing gated flow below. Fixed sets are NOT run through the LLM-path
    # backstops (tone/meta/scenario/unbacked) — they are curated by product —
    # except repeat-dropping, which render_fixed_follow_ups applies itself
    # against previous_follow_ups so the same chip isn't shown twice in a row.
    if not blocked_by and has_opportunity:
        topic = resolve_follow_up_topic(user_message, intent_value, previous_intent)
        if topic is not None:
            fixed = render_fixed_follow_ups(topic, user_message, scf_offerable, previous_follow_ups)
            logger.info(
                "follow_up_generator: fixed set topic=%s intent=%r count=%d",
                topic.value, intent_value, len(fixed),
            )
            return fixed

    history_block = format_conversation_history(
        conversation_history, max_turns=10, max_chars_per_turn=300
    )
    prompt = build_follow_up_prompt(
        user_message, assistant_response, intent_value, history_block, blocked_by, source,
        previous_follow_ups, has_opportunity, current_term_days, scf_offerable,
    )
    try:
        raw = await asyncio.wait_for(
            llm.complete(
                prompt,
                system=follow_up_system_prompt,
                temperature=0.3,
                max_tokens=96,
                enable_thinking=False,
                stream_to_client=False,
            ),
            timeout=timeout,
        )
    except asyncio.TimeoutError:
        logger.warning("follow_up_generator: timed out for intent=%r", intent_value)
        return _fallback(user_message, intent_value, blocked_by, has_opportunity, previous_follow_ups)
    except Exception as exc:
        logger.warning("follow_up_generator: LLM call failed (%s)", exc)
        return _fallback(user_message, intent_value, blocked_by, has_opportunity, previous_follow_ups)

    result = _parse_follow_ups(
        raw, user_message, intent_value, blocked_by, previous_follow_ups, has_opportunity,
        current_term_days, scf_offerable,
    )
    logger.debug("follow_up_generator: intent=%r blocked_by=%r suggestions=%s", intent_value, blocked_by, result)
    return result


def safe_fallback_follow_ups(
    user_message: str,
    intent_value: str | None,
    blocked_by: str | None,
    has_opportunity: bool = True,
    previous_follow_ups: list[str] | None = None,
) -> list[str]:
    """Public entry point for a caller that needs a fallback list OUTSIDE
    ``generate_follow_ups`` itself — e.g. the WS route's bounded wait on the
    background follow-up task, which used to call ``get_fallback_follow_ups``
    directly on timeout, bypassing every dedup/gating guard this module
    applies everywhere else (the raw intent-keyed list ignores blocked_by/
    has_opportunity and can repeat the current message or the previous
    turn's chips verbatim)."""
    return _fallback(user_message, intent_value, blocked_by, has_opportunity, previous_follow_ups)


def _fallback(
    user_message: str,
    intent_value: str | None,
    blocked_by: str | None,
    has_opportunity: bool = True,
    previous_follow_ups: list[str] | None = None,
) -> list[str]:
    if blocked_by:
        result = get_blocked_fallback_follow_ups(blocked_by)
    elif not has_opportunity:
        result = get_blocked_fallback_follow_ups("no_extension")
    else:
        result = get_fallback_follow_ups(intent_value)
    # Static lists themselves can collide with what was shown last turn (e.g.
    # the no_extension fallback's "Show key supplier facts" repeating when two
    # consecutive turns both land on this same static path) — dedup against
    # previous_follow_ups here too, not just on the successful-LLM-call path.
    result = strip_repeated_follow_ups(result, previous_follow_ups, intent_value, blocked_by, has_opportunity)
    return strip_current_message_follow_ups(
        result, user_message, intent_value, blocked_by, has_opportunity, previous_follow_ups
    )


def _parse_follow_ups(
    raw: str,
    user_message: str,
    intent_value: str | None,
    blocked_by: str | None,
    previous_follow_ups: list[str] | None = None,
    has_opportunity: bool = True,
    current_term_days: int | None = None,
    scf_offerable: bool = True,
) -> list[str]:
    match = _JSON_ARRAY_RE.search(raw or "")
    if not match:
        logger.warning("follow_up_generator: no JSON array found in: %r", (raw or "")[:120])
        return _fallback(user_message, intent_value, blocked_by, has_opportunity, previous_follow_ups)
    try:
        items = json.loads(match.group(0))
        valid = [str(s).strip() for s in items if isinstance(s, str) and s.strip()]
        if len(valid) < 2:
            return _fallback(user_message, intent_value, blocked_by, has_opportunity, previous_follow_ups)
        # Deterministic backstops, applied in order: never a tone suggestion,
        # never a scenario/what-if suggestion, never a chip that just restates
        # a clarifying question instead of answering it, never a repeat of
        # what was shown last turn, never a playbook chip with a day-count
        # attached (playbook takes no day parameter), never a suggestion with
        # no backing capability (cross-supplier, vague "other levers"), never
        # a suggestion that maps onto no capability this system HAS at all
        # (strip_out_of_scope_follow_ups — the general rule the deny-lists
        # above are each a special case of), then never an action the graph
        # already refused (or WOULD refuse) this turn, and finally never a
        # chip that just restates the message this turn sent.
        #
        # strip_repeated/strip_current_message run LAST, after every other
        # backstop's own backfill has had a chance to run — a content filter
        # (unbacked/unavailable/tone/...) backfilling from a static list can
        # reintroduce something equal to a previous-turn chip or the current
        # message just as easily as the raw LLM output can, so the dedup
        # passes have to see the fully-backfilled result, not an intermediate
        # one, to actually catch that.
        # Canonicalisation runs FIRST: a fixed-output capability's chip is
        # rewritten to its plain ask ("Generate playbook for 60 days" →
        # "Generate negotiation playbook"), so every backstop below — the
        # capability allow-list, the gating filter, and both dedup passes —
        # sees the text the negotiator will actually click, not a variant
        # wording that hides a repeat or a gated action behind a qualifier.
        result = canonicalise_follow_ups(valid[:3])
        result = strip_tone_follow_ups(result, intent_value)
        result = strip_scenario_follow_ups(result, intent_value)
        result = strip_meta_clarify_follow_ups(result, intent_value)
        result = strip_playbook_day_count_follow_ups(result, intent_value)
        result = strip_unbacked_follow_ups(result, intent_value)
        result = strip_out_of_scope_follow_ups(
            result, intent_value, blocked_by, has_opportunity, scf_offerable
        )
        result = strip_unavailable_follow_ups(
            result, blocked_by, has_opportunity, current_term_days, intent_value
        )
        result = strip_repeated_follow_ups(result, previous_follow_ups, intent_value, blocked_by, has_opportunity)
        return strip_current_message_follow_ups(
            result, user_message, intent_value, blocked_by, has_opportunity, previous_follow_ups
        )
    except (json.JSONDecodeError, TypeError):
        logger.warning("follow_up_generator: JSON parse error on: %r", (raw or "")[:120])
        return _fallback(user_message, intent_value, blocked_by, has_opportunity, previous_follow_ups)
