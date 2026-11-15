"""The ANALYSIS block — the POSTURE half of the brief, one renderer for every intent.

Each drafting prompt used to carry its own ``_analysis_block`` copy. They drifted:
some intents got the argument sequence and some didn't, only two showed the
"claims to avoid" list, and payment reliability reached the opening-strategy
prompt alone — so the same supplier could be described one way in the playbook
and another way in a pushback answer.

What this block covers is deliberately narrower than it once was. The four
ASSESSMENTS — payment reliability, DSO alignment, cost impact, the relationship
— are arguments, and they are rendered as arguments, in
:mod:`utils.prompts.brief.arguments`, with the same disclosure flags and the
same ranking as every other argument. They used to be printed here as well,
which meant a playbook prompt carried the cost-impact and relationship approved
wordings TWICE, verbatim: the model was handed one argument as if it were two.

How likely the ask is to be AGREED is not a judgment at all: it is
``facts.success_probability``, carried on the FACTS block, and rendered on its
own (:mod:`utils.prompts.brief.success_probability`) only for the surfaces that
show no facts.

So this block now carries only what the other renderers do not:

  * the BATNA and the rule that produced it;
  * the three posture judgments — leverage, financial sensitivity,
    business priority;
  * the recommended negotiation posture (a posture, not a wording style);
  * the argument SEQUENCE — the order and the moment to deploy each argument,
    which is the one thing the argument block does not say;
  * the claims to avoid.

Everything here is read off ONE place: the ``argument_analysis`` bundle carried
by the brief (``brief.posture``, ``brief.sequence``, ``brief.batna_floor``).
It used to be read off a second, typed ``NegotiationAnalysis`` object that held
the same judgments — two representations of one computation, and two ways for
one supplier to be described. The judgments themselves are made in
:mod:`domain.services.negotiation_arguments`; this module only formats them.
"""
from __future__ import annotations

from domain.entities.brief import NegotiationBrief
from utils.constants import format_camel_label

APPLY_HEADING = "## ANALYSIS — already computed, apply, do not recompute"
EXPLAIN_HEADING = "## ANALYSIS — already computed, explain and apply, do not recompute"
RATIONALE_HEADING = "## ANALYSIS RATIONALE — already computed, do not recompute"

DEFAULT_AVOID_CLAIMS_HEADING = "Claims to avoid in any suggested supplier-facing wording:"

# How the BATNA is introduced. INTERNAL on the surfaces that draft
# supplier-facing wording, so the figure is never repeated back to the supplier
# (see [[project_buyer_internal_economics_disclosure]]).
FLOOR_NONE = "none"
FLOOR_PLAIN = "plain"
FLOOR_INTERNAL = "internal"


def _floor_lines(brief: NegotiationBrief, mode: str) -> list[str]:
    if mode == FLOOR_NONE:
        return []
    floor = brief.batna_floor
    if mode == FLOOR_INTERNAL:
        lines = [
            "- [INTERNAL ONLY, do not state to the supplier]: "
            f"BATNA = {floor} days"
        ]
    else:
        lines = [f"- BATNA: {floor} days"]
    if brief.batna_note:
        lines.append(f"  ({brief.batna_note})")
    return lines


def _judgment_lines(brief: NegotiationBrief) -> list[str]:
    """The three posture judgments, each with the rationale that produced it.

    A judgment absent from the bundle is skipped rather than printed with a
    ``None`` — a printed None reads as a value, and these are exactly the lines a
    negotiator asks "why?" about.
    """
    leverage = brief.leverage or {}
    sensitivity = brief.financial_sensitivity or {}
    priority = brief.priority or {}

    lines = []
    if leverage:
        lines.append(
            # `posture` is an internal enum value (`buyer_favored`); the
            # negotiator reads this line, so it is spelled out.
            f"- Leverage: {format_camel_label(str(leverage.get('posture') or ''))} / "
            f"{format_camel_label(str(leverage.get('strength') or ''))} strength - "
            f"{leverage.get('rationale')}"
        )
    if sensitivity:
        lines.append(
            f"- Financial Sensitivity: {format_camel_label(str(sensitivity.get('level') or ''))} - "
            f"{sensitivity.get('rationale')}"
        )
    if priority:
        lines.append(
            f"- Business Priority: {format_camel_label(str(priority.get('level') or ''))} - "
            f"{priority.get('rationale')}"
        )
    return lines


def _step_label(step: dict) -> str:
    """A sequence step, named in words.

    The step labels are internal snake_case (``cost_impact``,
    ``spend_line_opportunity``) and this list is read by the negotiator, so they
    are spaced out the same way every other source name is. `format_camel_label`
    handles the underscores.
    """
    return format_camel_label(str(step.get("label", "")))


def _step_tag(step: dict, floor_mode: str) -> str:
    """The internal marker on the sequence's fallback step, where one is due.

    The ``batna`` step's term IS the BATNA. On a surface that was
    just told the floor is INTERNAL, the same number then arrived a few lines
    later as a plain instruction — "hold 50 days in reserve as the BATNA" —
    and that is the readable one, so the floor came back out as a position to
    take. The marker travels with the step rather than being restated in prose
    by each prompt, for the same reason the rank tags do.
    """
    if floor_mode != FLOOR_INTERNAL or step.get("label") != "batna":
        return ""
    return (
        "  [INTERNAL ONLY — this is the BATNA. It is where you STOP "
        "conceding, never a term to propose. Never state it, offer it, or "
        "reveal that a floor exists.]"
    )


def _recommended_posture_lines(brief: NegotiationBrief) -> list[str]:
    """The recommended posture the leverage suggests.

    This is a recommendation, NOT the wording style — the negotiator picks that
    in the UI and their selection governs how the text reads. Saying so here
    stops the model treating a computed "assertive" as licence to override a
    tone the negotiator explicitly chose.

    The relationship as an ARGUMENT (whether it may be leaned on, and the
    approved sentence for doing so) lives in the argument block; only the
    posture it implies belongs with the other posture judgments.
    """
    relationship = brief.relationship
    if not relationship:
        return []
    return [
        f"- Recommended Posture: {relationship.get('negotiation_tone')} (from a "
        f"{relationship.get('strength')} relationship). This is a posture, not a "
        "wording style — the negotiator's selected TONE still governs the words."
    ]


def render_posture(
    brief: NegotiationBrief | None,
    *,
    heading: str = APPLY_HEADING,
    floor: str = FLOOR_PLAIN,
    include_sequence: bool = False,
    sequence_note: str = "",
    include_term_days: bool = False,
    avoid_claims_heading: str = DEFAULT_AVOID_CLAIMS_HEADING,
) -> str:
    """Render the computed posture for a prompt.

    ``floor`` picks how the BATNA is shown (:data:`FLOOR_PLAIN`,
    :data:`FLOOR_INTERNAL`, or :data:`FLOOR_NONE` when the prompt states it
    elsewhere). ``sequence_note`` is appended to the argument-sequence heading so
    an intent can say what the sequence is for in its own terms.
    """
    if brief is None:
        return ""
    lines = [heading]
    lines += _floor_lines(brief, floor)
    lines += _judgment_lines(brief)
    lines += _recommended_posture_lines(brief)

    sequence = brief.sequence
    if include_sequence and sequence:
        note = f" {sequence_note}" if sequence_note else ""
        lines.append(f"- Argument sequence{note}:")
        for step in sequence:
            term = (
                f" ({step['term_days']} days)"
                if include_term_days and step.get("term_days") is not None
                else ""
            )
            lines.append(
                f"  • [{_step_label(step)}]{term} {step['argument']}{_step_tag(step, floor)}"
            )

    avoid_claims = brief.avoid_claims
    if avoid_claims:
        lines.append(f"- {avoid_claims_heading}")
        for claim in avoid_claims:
            lines.append(f"  • {claim}")

    return "\n".join(lines)
