"""Rendering the negotiation brief for a prompt.

One renderer per part of :class:`domain.entities.brief.NegotiationBrief`, each
taking the brief and a voice or level. Every intent composes its prompt from
these, so two surfaces can no longer describe the same supplier differently —
which is what happened when each prompt carried its own copy: the argument
buckets grew three different vocabularies, the assessments were rendered twice
in the same prompt, and four intents never saw how likely the ask was to land.

The judgments themselves are made in
:mod:`domain.services.negotiation_arguments`. Nothing here decides anything; it
only presents what the brief already carries.
"""
from __future__ import annotations

from utils.prompts.brief.arguments import (
    VOICE_COUNTER,
    VOICE_EMAIL,
    VOICE_EXPLAIN,
    VOICE_PITCH,
    VOICE_PLAYBOOK,
    VOICE_RECOMMEND,
    render_arguments,
)
from utils.prompts.brief.facts import (
    FACTS_HEADING,
    LEVEL_FULL,
    LEVEL_MINIMAL,
    LEVEL_STANDARD,
    collect_fact_sources,
    fact_fields,
    format_money,
    render_facts,
)
from utils.prompts.brief.posture import (
    APPLY_HEADING,
    DEFAULT_AVOID_CLAIMS_HEADING,
    EXPLAIN_HEADING,
    FLOOR_INTERNAL,
    FLOOR_NONE,
    FLOOR_PLAIN,
    RATIONALE_HEADING,
    render_posture,
)
from utils.prompts.brief.profiles import INTENT_PROFILES, BriefProfile, render_brief
from utils.prompts.brief.success_probability import render_success_probability

__all__ = [
    "APPLY_HEADING",
    "BriefProfile",
    "DEFAULT_AVOID_CLAIMS_HEADING",
    "EXPLAIN_HEADING",
    "FLOOR_INTERNAL",
    "FLOOR_NONE",
    "FLOOR_PLAIN",
    "INTENT_PROFILES",
    "RATIONALE_HEADING",
    "collect_fact_sources",
    "FACTS_HEADING",
    "LEVEL_FULL",
    "LEVEL_MINIMAL",
    "LEVEL_STANDARD",
    "VOICE_COUNTER",
    "VOICE_EMAIL",
    "VOICE_EXPLAIN",
    "VOICE_PITCH",
    "VOICE_PLAYBOOK",
    "VOICE_RECOMMEND",
    "fact_fields",
    "format_money",
    "render_arguments",
    "render_brief",
    "render_facts",
    "render_posture",
    "render_success_probability",
]
