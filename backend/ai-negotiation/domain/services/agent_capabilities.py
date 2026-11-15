"""Single source of truth for what each LLM-backed intent/agent can do.

Two different callers need the same facts about each intent — `agents/graph.py`
(to decide whether a turn must be routed to `no_opportunity`/`scf_blocked`
instead of the real node) and the follow-up generator (to never suggest an
action the system cannot currently perform). Defining the list once here means
both stay in sync by construction instead of by two people remembering to
update two files.
"""
from __future__ import annotations

from dataclasses import dataclass

from domain.entities.intent import Intent


@dataclass(frozen=True)
class AgentCapability:
    """One LLM-backed intent's responsibility and gating constraints."""

    label: str
    description: str
    # How a follow-up SUGGESTION for this capability tends to be worded. The
    # follow-up generator uses these as an allow-list: a suggestion that
    # matches no available capability is out of scope for this system and is
    # dropped (see utils.prompts.follow_up_suggestions_prompt.
    # strip_out_of_scope_follow_ups). None = never recognised from wording.
    follow_up_pattern: str | None = None
    # Set when the node produces a FIXED document from stored facts and
    # ignores any qualifier in the request — a chip promising a variant
    # ("Generate playbook for 60 days", "Generate playbook with SCF") is then
    # a promise the node cannot keep, so a suggestion recognised as this
    # capability is rewritten to exactly this text. None = the wording may
    # carry specifics (pushback, explanation, data questions), which is what
    # makes those suggestions useful.
    canonical_follow_up: str | None = None
    # Whether this capability may be OFFERED as a follow-up chip at all.
    # False for capabilities the product deliberately keeps off the chip row
    # (scenario/what-if, session-level operations) even though the graph
    # happily serves them when typed.
    offerable: bool = True
    # Gated on there being an improvement opportunity (§2, see
    # domain.services.improvement_opportunity) — with the ask at or below the
    # current terms, none of these can reach an LLM.
    requires_opportunity: bool = False
    # Gated on Supply Chain Finance being enabled for this session/turn.
    requires_scf: bool = False


# The intents that PRODUCE a negotiation strategy, argument set, opening
# position or supplier-facing draft — moved here from `agents/graph.py` so the
# routing gate and the follow-up filter read the same set.
STRATEGY_INTENTS: frozenset[Intent] = frozenset({
    Intent.GENERATE_NEGOTIATION_PLAYBOOK,
    Intent.RECOMMEND_OPENING_STRATEGY,
    Intent.DRAFT_EMAIL,
    Intent.HANDLE_SUPPLIER_PUSHBACK,
    Intent.REFRAME_WITH_FINANCING,
})

AGENT_CAPABILITIES: dict[Intent, AgentCapability] = {
    Intent.GENERATE_NEGOTIATION_PLAYBOOK: AgentCapability(
        "playbook", "Full negotiation playbook/strategy document", requires_opportunity=True,
        follow_up_pattern=r"\bplay ?book\b",
        # The playbook is a fixed four-section document built entirely from
        # the turn's brief (target, BATNA, SCF gating) — see
        # agents.nodes.negotiation_guide. The negotiator's wording reaches the
        # prompt but changes nothing: "Generate playbook for 60 days" returns
        # the playbook for the STORED target, and "with SCF" returns whatever
        # the SCF gate allows. Changing the numbers is a different capability
        # (APPLY_OVERRIDE), so the only honest playbook chip is the plain ask.
        canonical_follow_up="Generate negotiation playbook",
    ),
    Intent.RECOMMEND_OPENING_STRATEGY: AgentCapability(
        "opening strategy", "Suggests an opening offer/anchor", requires_opportunity=True,
        follow_up_pattern=(
            r"\b(opening|anchor|anchoring|batna|negotiation (strategy|approach|arguments?)|"
            r"strategy|argue|arguments?|leverage|concession|trade[- ]?off|walk[- ]?away)\b"
        ),
    ),
    Intent.DRAFT_EMAIL: AgentCapability(
        "supplier email", "Drafts or edits a supplier email from an approved template",
        requires_opportunity=True,
        follow_up_pattern=r"\b(e-?mail|letter|message to (the )?supplier)\b",
    ),
    Intent.HANDLE_SUPPLIER_PUSHBACK: AgentCapability(
        "pushback", "Counters a specific supplier objection", requires_opportunity=True,
        follow_up_pattern=(
            r"\b(push ?backs?|objection|reject|rejects|refuses?|resist|counters?|"
            r"hold firm|stand firm|if (the )?supplier)\b"
        ),
    ),
    Intent.REFRAME_WITH_FINANCING: AgentCapability(
        "financing", "Reframes the ask using SCF/early-payment financing",
        requires_opportunity=True, requires_scf=True,
        follow_up_pattern=r"\b(scf|supply chain finance|early[- ]payment|financing|reverse factoring)\b",
    ),
    Intent.RUN_SCENARIO: AgentCapability(
        "scenario", "Models a specific term change",
        # Product decision: never offered as a chip (see strip_scenario_follow_ups).
        follow_up_pattern=r"\b(scenario|what[- ]?if|model the impact|simulate)\b",
        offerable=False,
    ),
    Intent.EVALUATE_COUNTER_OFFER: AgentCapability(
        "counter-offer", "Assesses a supplier counter-offer",
        follow_up_pattern=r"\b(counter[- ]?offer|evaluate|assess|accept(ing)? (the|their)\b)",
    ),
    Intent.SUMMARIZE_SUPPLIER_POSITION: AgentCapability(
        "summary", "Summarizes the current supplier stance",
        follow_up_pattern=(
            r"\b(summar(y|ise|ize|ized|ised)|recap|overview|supplier position|"
            r"current (payment )?(terms|position|stance))\b"
        ),
    ),
    Intent.EXPLAIN_RECOMMENDATION: AgentCapability(
        "explanation", "Explains a prior recommendation",
        follow_up_pattern=(
            r"\b(explain|explanation|why\b|rationale|reasoning|justif|clarify why|"
            r"basis|what drives|break ?down)\b"
        ),
    ),
    Intent.ANSWER_DATA_QUESTION: AgentCapability(
        "data question", "Answers a factual question from supplier data",
        follow_up_pattern=(
            r"\b(show|display|list|facts?|figures?|numbers?|benchmark|peer group|"
            r"industry standard|dpo|payment terms?|days\b|history|invoices?)\b"
        ),
    ),
    Intent.ANSWER_SPENDS_QUESTION: AgentCapability(
        "spend question", "Answers a spend-figure question",
        follow_up_pattern=r"\b(spend|spending|annual value|working capital|cash (impact|flow) impact)\b",
    ),
    Intent.META_OPERATION: AgentCapability(
        "meta operation", "Session/thread-level operations (e.g. tone)", offerable=False,
    ),
    Intent.APPLY_OVERRIDE: AgentCapability(
        "override", "Sets/resets the target or BATNA values",
        follow_up_pattern=r"\b(set|reset|override|adjust) (the )?(target|batna|goal)\b",
    ),
}


def available_follow_up_capabilities(
    has_opportunity: bool = True,
    scf_offerable: bool = True,
    blocked_by: str | None = None,
) -> list[AgentCapability]:
    """The capabilities that may be SUGGESTED as a follow-up on this turn.

    This is the system's general rule set expressed positively — what the
    assistant can actually do right now — rather than a list of phrases that
    happen to have been banned after showing up in production. A capability is
    available when it is offerable at all, and when its gates (improvement
    opportunity, SCF availability) are satisfied for this turn.
    """
    gated_out_of_opportunity = bool(blocked_by) or not has_opportunity
    return [
        cap
        for cap in AGENT_CAPABILITIES.values()
        if cap.offerable
        and cap.follow_up_pattern
        and not (cap.requires_opportunity and gated_out_of_opportunity)
        and not (cap.requires_scf and not scf_offerable)
    ]


def render_capability_menu(
    has_opportunity: bool = True,
    scf_offerable: bool = True,
    blocked_by: str | None = None,
) -> str:
    """Render the available capabilities as prompt bullets.

    Used by the follow-up prompt so the model is told what this system CAN do
    (and therefore what a suggestion is allowed to be), instead of being told
    to avoid a hand-maintained list of things it once suggested wrongly.
    """
    caps = available_follow_up_capabilities(has_opportunity, scf_offerable, blocked_by)
    return "\n".join(f"- {cap.label}: {cap.description}" for cap in caps)
