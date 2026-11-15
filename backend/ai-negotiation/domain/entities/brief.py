"""The negotiation brief — everything one turn knows, in one object.

Before this existed, each intent assembled its own view of the supplier: some
read a typed ``NegotiationAnalysis``, some read the ``argument_analysis``
bundle, and some got a scored verdict only because it happened to be printed
inside a shared analysis block. Same supplier, six different pictures.

The brief is that picture, resolved ONCE per turn from the context the route has
already overridden and SCF-stripped, and read — never rebuilt — by everything
downstream. There is exactly one computed part:

  * ``arguments`` — WHAT WE CAN ARGUE (``build_argument_analysis``): the terms
                    in play, which sources back the ask, which fall at or below
                    the current term, which have no data, the four
                    assessments, the posture judgments and the argument
                    sequence, plus the catalogue wording for each.

A second part, ``strength``, sat beside it until 2026-08-20: a composite scored
from spend volume, buyer leverage, credit rating, cost impact and company size.
The client dropped it. How likely the ask is to be agreed is
``facts.success_probability`` — decided upstream, carried verbatim — and the
five inputs the composite consumed reach a prompt as the plain facts they are.

alongside the Tier-1 inputs it was computed from:

  * ``facts``     — verbatim, source-tagged. Quote as-is.
  * ``opening_strategy`` — the opening-move signals, where the turn loaded them.

There is deliberately no third, typed "analysis" object on the brief. One used
to sit here as well, carrying the same posture judgments the ``arguments``
bundle already carries, and the two could drift: a prompt reading the typed copy
and a prompt reading the bundle could describe the same supplier's leverage
differently. The bundle is now the only representation.

Per-turn, not per-session: a negotiator overriding the target moves the ask, and
every bucket with it. Derived and never authoritative — nothing mutates a brief;
a changed input produces a new one.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from domain.entities.facts import SupplierFacts
from domain.entities.opening_strategy import OpeningStrategyAnalysis


@dataclass(frozen=True)
class NegotiationBrief:
    """One turn's complete, resolved view of a supplier negotiation."""

    facts: SupplierFacts

    # The JSON-shaped bundle, kept in the shape it is printed and asserted in
    # (see `build_argument_analysis`). It stays a dict rather than becoming
    # typed here on purpose: that shape is the one the debug output, the state
    # keys and the existing tests all speak, and a parallel typed copy would be
    # one more thing to keep in step — which is exactly what the removed
    # `analysis` field turned out to be.
    arguments: dict[str, Any] = field(default_factory=dict)

    # Opening-move specific judgments. Only the intents that need them load
    # them, so this is None on most turns.
    opening_strategy: OpeningStrategyAnalysis | None = None

    # Whether Supply Chain Finance is available for this turn. Carried on the
    # brief so a renderer can gate SCF content without reaching for graph state.
    scf_enabled: bool = False

    # Whether SCF may actually be OFFERED to this supplier: enabled for the
    # session AND offerable on rate (see `domain.services.scf_analysis`).
    # `scf_enabled` alone was the gate on every chat surface, so a session with
    # the programme switched on pitched it to suppliers whose SCF rate was not
    # on file at all, or ran so far above their own borrowing that the offer
    # could not be made. Anything that PROPOSES SCF reads this; anything that
    # merely reports the rate to the negotiator reads `scf_enabled`.
    scf_offerable: bool = False

    # Why it is not offerable — one of `ScfViability.inviable_reason`, or None
    # when it is offerable (or when the session has SCF off entirely, where the
    # programme is never named at all).
    scf_inviable_reason: str | None = None

    # ── The three terms every surface compares against ─────────────────────

    @property
    def terms(self) -> dict[str, Any]:
        return self.arguments.get("terms") or {}

    @property
    def ask(self) -> int | None:
        """The term actually on the table — the opportunity term when the
        upstream system modelled one, else the target."""
        return self.terms.get("ask")

    @property
    def current_term(self) -> int | None:
        return self.terms.get("current")

    @property
    def batna_floor(self) -> int | None:
        return self.terms.get("batna_floor")

    @property
    def batna_note(self) -> str | None:
        return self.terms.get("batna_note")

    # ── The argument buckets ───────────────────────────────────────────────
    #
    # `supporting` carries BOTH kinds of argument in one ranked list: the
    # benchmarks that reach the ask and the assessments that are usable for this
    # supplier. The rest are the position around it — which matters as much,
    # because they are what say how firm the ask really is.

    @property
    def supporting(self) -> list[dict]:
        return list(self.arguments.get("supporting") or [])

    @property
    def non_supporting(self) -> list[dict]:
        """At or below the CURRENT TERM — the supplier's potential
        counter-evidence, never ours."""
        return list(self.arguments.get("non_supporting") or [])

    @property
    def unavailable(self) -> list[str]:
        """Argument-eligible sources with no value at all for this supplier."""
        return list(self.arguments.get("unavailable") or [])

    @property
    def evidence(self) -> list[dict]:
        """The supporting arguments that actually argue for a NUMBER.

        Benchmarks — every entry carrying a ``value_days``. These are what
        justifies the ask, and the only things that should ever be introduced
        as such.
        """
        return [a for a in self.supporting if a.get("value_days") is not None]

    @property
    def objection_answers(self) -> list[dict]:
        """The supporting arguments that remove an OBJECTION rather than
        evidencing the ask.

        The four assessments — DSO alignment, pay-on-terms, cost impact,
        relationship. None carries a term, because none of them argues for one:
        they answer "we cannot afford this", "you pay late anyway", "why should
        we?". Held apart from :attr:`evidence` so a drafting surface cannot
        present them as though they backed the number, which is exactly what
        happened while both shared one heading and one "cite every one of
        these" instruction.
        """
        return [a for a in self.supporting if a.get("value_days") is None]

    @property
    def is_stretch_target(self) -> bool:
        """True when no BENCHMARK reaches the ask.

        The soft arguments (relationship, payment reliability, cost impact) can
        still be present and still be worth making — they remove objections.
        None of them evidences the number, so a surface that reads a full-looking
        supporting list and writes as if the market backed the ask is wrong, and
        this is the flag that says so.

        Compared against the ASK, not merely "does any benchmark exist". Since
        the two-bucket change every benchmark above the CURRENT term sits in
        ``supporting``, so a supplier can now have several supporting benchmarks
        and still have nothing that reaches the ask — which is exactly the
        stretch target this flag names. Testing for the presence of a figure
        would silently return False for every such supplier.
        """
        ask = self.ask
        if ask is None:
            return not any(a.get("value_days") is not None for a in self.supporting)
        return not any(
            a.get("value_days") is not None and a["value_days"] >= ask
            for a in self.supporting
        )

    # ── The four assessments ───────────────────────────────────────────────
    #
    # EVERY assessment that was run, including the ones that came back unusable
    # and the reason why. A surface reads `usable_as_argument` off these rather
    # than inferring usability from an argument's presence in `supporting`.

    @property
    def assessments(self) -> dict[str, Any]:
        return self.arguments.get("assessments") or {}

    @property
    def relationship(self) -> dict[str, Any] | None:
        return self.assessments.get("relationship")

    # ── The posture judgments ──────────────────────────────────────────────
    #
    # Leverage, financial sensitivity and business priority, each with the
    # rationale that produced it. These used to live on a separate typed
    # `analysis` object; they are the same judgments, read from the one bundle
    # that computes them.

    @property
    def posture(self) -> dict[str, Any]:
        return self.arguments.get("posture") or {}

    @property
    def leverage(self) -> dict[str, Any] | None:
        return self.posture.get("leverage")

    @property
    def financial_sensitivity(self) -> dict[str, Any] | None:
        return self.posture.get("financial_sensitivity")

    @property
    def priority(self) -> dict[str, Any] | None:
        return self.posture.get("priority")

    @property
    def avoid_claims(self) -> list[str]:
        """Claims no supplier-facing wording may make for this supplier."""
        sensitivity = self.financial_sensitivity or {}
        return list(sensitivity.get("avoid_claims") or [])

    @property
    def sequence(self) -> list[dict]:
        """The ordered case — which argument to deploy at which moment.

        The one thing the argument buckets do not say: they rank arguments by
        source credibility, this says when to play each.
        """
        return list(self.arguments.get("sequence") or [])

    # ── How likely the ask is to be agreed ─────────────────────────────────

    @property
    def success_probability(self) -> str | None:
        """The upstream read on whether this ask lands — "low"/"medium"/"high".

        Not computed here and not computed anywhere: it arrives on the payload.
        The composite that used to be scored in its place is gone (client,
        2026-08-20), so ``None`` means the payload carried nothing, and a
        surface must say the read is unavailable rather than infer one.
        """
        return self.facts.success_probability if self.facts else None

    # ── Legacy state views ─────────────────────────────────────────────────

    def state_views(self) -> dict[str, Any]:
        """The bundle under the graph-state key that carries it.

        The brief is the single object; this key remains because it is what the
        per-turn debug output prints and what the state schema documents.
        """
        return {"argument_analysis": self.arguments}
