"""Which parts of the brief each intent gets, in one table.

Before this, the answer was spread across seven prompt modules and differed for
reasons nobody had decided: a scored verdict reached six intents because it
happened to be printed inside a shared block, and the four that composed their
prompt differently never saw it. Answering "how likely is this to land?"
therefore worked in a summary and not in a data question — same session, same
supplier.

The table below is that decision, written down. Reading it tells you exactly
what any intent sees, and changing what an intent sees is a one-line edit.

Two intents are deliberately absent, and their absence is the decision:

  * ``answer_spends_question`` is text-to-SQL over the spend table.
  * ``apply_override`` writes a config value.
"""
from __future__ import annotations

from dataclasses import dataclass

from domain.entities.brief import NegotiationBrief
from domain.entities.intent import Intent
from utils.prompts.brief.arguments import (
    VOICE_COUNTER,
    VOICE_EMAIL,
    VOICE_EXPLAIN,
    VOICE_PITCH,
    VOICE_PLAYBOOK,
    render_arguments,
    render_unavailable,
)
from utils.prompts.brief.facts import (
    FACTS_HEADING,
    LEVEL_FULL,
    LEVEL_MINIMAL,
    LEVEL_STANDARD,
    render_facts,
)
from utils.prompts.brief.success_probability import render_success_probability


@dataclass(frozen=True)
class BriefProfile:
    """What one intent is shown. ``None`` means the block is omitted."""

    facts: str | None = LEVEL_STANDARD
    arguments: str | None = None
    # How likely the ask is to be AGREED — `facts.success_probability`, decided
    # upstream. Only for the surfaces that render NO facts block: every level of
    # the facts block already carries the line, and printing it twice in one
    # prompt is how a single signal starts reading as two.
    success_probability: bool = False
    # Which argument sources have NO data at all. Only for a surface that
    # renders facts and NO argument block: everywhere else the list already
    # rides along inside the arguments, and printing it twice makes one signal
    # read as two. The facts block omits a null field rather than printing it,
    # so without this a source with no value is invisible rather than absent.
    unavailable: bool = False
    # How the ask is labelled — each surface names it in its own terms, and the
    # difference is not cosmetic: "target term to propose" and "target term (our
    # ask)" tell the model what it is about to do with the number.
    ask_label: str = "Target term"
    # The BATNA is buyer-internal leverage. A surface that drafts
    # supplier-facing wording gets it marked INTERNAL; one that never does can
    # state it plainly; one that states it elsewhere omits it here.
    include_floor: bool = False
    floor_internal: bool = False
    heading: str = FACTS_HEADING


INTENT_PROFILES: dict[Intent, BriefProfile] = {
    # ── The surfaces that INFORM. Every bucket with its figures, because the
    #    arguments that fall short are what "how firm is this really?" is about.
    Intent.SUMMARIZE_SUPPLIER_POSITION: BriefProfile(
        facts=LEVEL_FULL, arguments=VOICE_EXPLAIN,
        include_floor=True,
    ),
    # NO arguments block. Its own system prompt opens with "this is pure
    # information retrieval: no negotiation strategy, recommendation, or
    # suggested wording is expected" — and it was then handed the full ranked
    # argument set, two thirds of its user turn, telling the model which
    # arguments to lead with. Both instructions cannot be obeyed, so the model
    # picked one, and a factual "what is their DSO?" came back as a pitch.
    #
    # Facts stay, success probability among them: "how likely is this to land?"
    # IS a data question. Which argument to lead with is not — that is
    # EXPLAIN_RECOMMENDATION's job, and it still has the block.
    Intent.ANSWER_DATA_QUESTION: BriefProfile(
        facts=LEVEL_FULL, arguments=None,
        # ...but it DOES get the "no data at all" list. Without it, "what is
        # their supplier standard?" met a facts block that simply had no such
        # line and was answered with the nearest benchmark instead.
        unavailable=True,
        include_floor=True,
    ),
    Intent.EXPLAIN_RECOMMENDATION: BriefProfile(
        facts=LEVEL_STANDARD, arguments=VOICE_EXPLAIN,
        include_floor=True,
    ),

    # ── The one surface that produces a DOCUMENT. Supporting arguments only:
    #    the playbook printed every bucket it was shown, including a "Not used"
    #    list of the sources that fall short and the internal do-not-say notes
    #    behind them. It gets the case FOR the ask and nothing else — see
    #    `render_arguments`. Everything else about it matches the drafting
    #    surfaces below.
    Intent.GENERATE_NEGOTIATION_PLAYBOOK: BriefProfile(
        facts=LEVEL_STANDARD, arguments=VOICE_PLAYBOOK,
        ask_label="Target term to propose",
    ),

    # ── The surfaces that DRAFT. The supporting arguments with how to put them;
    #    the rest by name only, and the floor marked internal.
    Intent.RECOMMEND_OPENING_STRATEGY: BriefProfile(
        facts=LEVEL_STANDARD, arguments=VOICE_PITCH,
        ask_label="Target term to propose",
    ),
    # Pushback drafts too, but it answers ONE objection in a live exchange — so
    # it selects from the supporting set instead of citing all of it. Same
    # buckets, same figures, same disclosure flags; only the instruction differs.
    Intent.HANDLE_SUPPLIER_PUSHBACK: BriefProfile(
        facts=LEVEL_MINIMAL, arguments=VOICE_COUNTER,
    ),
    # The supplier email. Written from an approved template, so the arguments
    # are background it draws on only when the negotiator asks for a
    # justification. No floor: the email is read by the supplier.
    Intent.DRAFT_EMAIL: BriefProfile(
        facts=LEVEL_MINIMAL, arguments=VOICE_EMAIL,
        ask_label="Proposed term",
    ),
    Intent.EVALUATE_COUNTER_OFFER: BriefProfile(
        facts=LEVEL_MINIMAL, arguments=VOICE_PITCH,
        ask_label="Target term (our ask)",
        include_floor=True, floor_internal=True,
    ),

    # ── The narrower surfaces. Neither renders a FACTS block, so each takes the
    #    success-probability signal on its own — it is cheap and it changes the
    #    answer: a scenario run against an ask nobody expects to land reads
    #    differently, and an SCF pitch becomes the primary offer rather than a
    #    sweetener when the term ask is unlikely.
    Intent.RUN_SCENARIO: BriefProfile(
        facts=None, arguments=None, success_probability=True,
    ),
    Intent.REFRAME_WITH_FINANCING: BriefProfile(
        facts=None, arguments=None, success_probability=True,
    ),
}


def render_brief(brief: NegotiationBrief | None, profile: BriefProfile) -> list[str]:
    """The brief's blocks for one intent, in order, ready to join into a prompt.

    Returns a list so a caller can interleave its own blocks (a counter-offer
    calculation, an anchor strategy, a tone) without string surgery. Empty
    blocks are dropped, so a profile that omits a part costs nothing.
    """
    if brief is None:
        return []
    blocks = [
        render_facts(
            brief,
            level=profile.facts,
            heading=profile.heading,
            ask_label=profile.ask_label,
            include_floor=profile.include_floor,
            floor_internal=profile.floor_internal,
        ) if profile.facts else "",
        render_arguments(brief, voice=profile.arguments) if profile.arguments else "",
        # Never alongside the arguments block, which already carries this list.
        render_unavailable(brief)
        if profile.unavailable and not profile.arguments
        else "",
        render_success_probability(brief) if profile.success_probability else "",
    ]
    return [block for block in blocks if block]
