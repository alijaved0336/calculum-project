from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from domain.entities.facts import SupplierFacts
from domain.entities.opening_strategy import OpeningStrategyAnalysis


@dataclass(frozen=True)
class SupplierContext:
    """The negotiation context for a single supplier.

    ``raw`` keeps the original Adabot/Calculum payload (camelCase keys such as
    ``waccPreTax``, ``scfRate``, ``supplierFinancingRate``) so no fields are
    lost.

    The rest is what agents should actually reason over, all computed exactly
    once by :func:`domain.services.context_builder.build_supplier_context`:
      * ``facts``               — Tier-1: verbatim, source-tagged values the
                                   upstream system already decided (target term,
                                   benchmarks, financial figures, ratings, ...).
                                   Quote these as-is.
      * ``argument_analysis``   — Tier-2: everything we can argue —
                                   terms in play, the argument buckets, the four
                                   assessments, the posture judgments (leverage,
                                   financial sensitivity, risk, priority) and the
                                   argument sequence. See
                                   :func:`domain.services.negotiation_arguments.build_argument_analysis`.
      * ``opening_strategy``    — Tier-2: judgments specific to framing the
                                   opening move (primary anchor, benchmark
                                   ladder, stretch ceiling, phased-approach flag,
                                   SCF reserve lever).

    ``argument_analysis`` is the ONLY representation of the computed judgments.
    A typed ``analysis`` object used to sit here as well, carrying the same
    posture judgments the bundle already carried; two representations of one
    computation is two things to keep in step, and prompts reading different ones
    could describe the same supplier differently.

    A second bundle, ``negotiation_strength``, sat here until 2026-08-20. It
    scored spend volume, buyer leverage, credit rating, cost impact and company
    size into one composite verdict. The client dropped the composite: how likely
    the ask is to be agreed is ``facts.success_probability``, straight from the
    payload, and the five inputs reach prompts as the plain facts they are.

    Computing these once at build time — rather than per-node or per-intent —
    is what lets every intent (`summarize_supplier_position`,
    `recommend_opening_strategy`, `generate_negotiation_playbook`, ...) reuse the
    same numbers and judgments instead of re-deriving (and potentially
    disagreeing on) them.
    """

    supplier_id: str
    raw: dict[str, Any] = field(default_factory=dict)
    facts: SupplierFacts | None = None
    argument_analysis: dict[str, Any] | None = None
    opening_strategy: OpeningStrategyAnalysis | None = None

    @property
    def supplier(self) -> dict[str, Any]:
        return self.raw.get("supplier", {})

    @property
    def target(self) -> dict[str, Any]:
        return self.raw.get("target", {})

    @property
    def agreement(self) -> dict[str, Any]:
        return self.raw.get("agreement", {})

    @property
    def negotiation_strategy(self) -> dict[str, Any]:
        return self.raw.get("negotiationStrategy", {})
