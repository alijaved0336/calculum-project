"""Building the per-turn :class:`NegotiationBrief`.

One function, called once per turn by the API route from the context it has
already resolved (session target/BATNA overrides applied, SCF stripped when
the turn disallows it). Everything downstream reads the result.

The brief is assembled from exactly ONE computed part, and nothing else:
``build_argument_analysis(facts)`` — what we can argue. How likely the ask is to
be agreed is not computed at all: it is ``facts.success_probability``, decided
upstream and carried verbatim.

Pure Python: no LLM, no IO. Cheap enough to run on every turn, which is what it
has to do — a negotiator overriding the target moves the ask, and the buckets
and the floor move with it.
"""
from __future__ import annotations

import logging

from domain.entities.brief import NegotiationBrief
from domain.entities.context import SupplierContext
from domain.entities.facts import SupplierFacts
from domain.entities.opening_strategy import OpeningStrategyAnalysis
from domain.services.negotiation_arguments import build_argument_analysis
from domain.services.scf_analysis import analyze_scf_viability

logger = logging.getLogger(__name__)


def _scf_offer_state(
    facts: SupplierFacts, arguments: dict, scf_enabled: bool
) -> tuple[bool, str | None]:
    """Resolve the brief's SCF OFFER gate: enabled for the session AND offerable.

    The session setting says the account has the programme; it does not say the
    programme can be put in front of THIS supplier. The concession ladder, the
    playbook and the pushback scripts already asked both questions
    (:func:`domain.services.scf_analysis.resolve_scf_viability`); the chat
    surfaces asked only the first, and pitched SCF to suppliers with no
    programme rate on file or a rate too far above their own borrowing to offer.
    Resolving it once here puts the same answer on every surface.
    """
    if not scf_enabled:
        return False, None
    viability = analyze_scf_viability(facts, arguments or {})
    return viability.viable, viability.inviable_reason


def build_negotiation_brief(
    context: SupplierContext | None,
    *,
    scf_enabled: bool = False,
) -> NegotiationBrief | None:
    """The whole picture for this turn, or None when no supplier is loaded.

    The context's argument bundle is reused when present — it was computed once
    in :func:`domain.services.context_builder.build_supplier_context`, and kept
    in step with ``context.facts`` by the override and SCF-sanitising passes — and
    only re-derived if a caller hands over a context without it. The
    opening-strategy judgments come along when the context carries them; they are
    loaded per session, not per turn.
    """
    if context is None or context.facts is None:
        return None

    arguments = (
        context.argument_analysis
        if context.argument_analysis is not None
        else build_argument_analysis(context.facts)
    )
    scf_offerable, scf_inviable_reason = _scf_offer_state(
        context.facts, arguments, scf_enabled
    )

    return NegotiationBrief(
        facts=context.facts,
        arguments=arguments,
        opening_strategy=context.opening_strategy,
        scf_enabled=scf_enabled,
        scf_offerable=scf_offerable,
        scf_inviable_reason=scf_inviable_reason,
    )


def brief_from(
    facts: SupplierFacts,
    *,
    opening_strategy: OpeningStrategyAnalysis | None = None,
    scf_enabled: bool = False,
) -> NegotiationBrief:
    """A brief from facts directly, for callers that hold no context.

    Production always goes through :func:`build_negotiation_brief` and hands the
    result down the graph. This is the ONE fallback path — the prompt builders
    accept a brief and derive one here when a direct caller or a test omits it,
    rather than each re-deriving its own argument bundle, which is how three
    surfaces ended up able to disagree about the same supplier.
    """

    arguments = build_argument_analysis(facts)
    scf_offerable, scf_inviable_reason = _scf_offer_state(
        facts, arguments, scf_enabled
    )

    return NegotiationBrief(
        facts=facts,
        arguments=arguments,
        opening_strategy=opening_strategy,
        scf_enabled=scf_enabled,
        scf_offerable=scf_offerable,
        scf_inviable_reason=scf_inviable_reason,
    )
