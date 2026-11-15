"""The BATNA position — the fallback figure and the evidence that backs it.

Section 3 of the playbook is the client's simplest section and was its worst:
it used to be a free-form assessment (strength / primary alternative / why /
risks / recommendation / confidence) written by the model out of the leverage
ratings, and it "always hallucinates and says non-sense". The client's
replacement spec (2026-08-25) is deliberately narrow — the section carries the
BATNA VALUE and the benchmark arguments that support THAT VALUE, and nothing
else:

    Target Payment Term: 90 days
    BATNA: 75 days

    Supporting Arguments:

    Supplier Standard
    "The supplier already accepts longer payment terms from other customers,
     with an average accepted term of 76 days. A BATNA of 75 days is
     therefore aligned with demonstrated supplier acceptance."
    ...

So the section is built HERE, in code, and only rendered by the model — the
same rule the rest of the playbook already follows. The figures come from the
turn's facts (:func:`negotiation_ask_term`, :func:`resolve_effective_batna`)
and every justification sentence is written from a fixed template with those
figures substituted in. There is no judgment left for the model to get wrong.

WHICH BENCHMARKS SUPPORT THE FALLBACK
-------------------------------------
The pool is :func:`citable_support_benchmarks` — benchmarks STRICTLY ABOVE
:func:`benchmark_support_bar`, the same citability bar every other surface uses, so the BATNA
section can never argue from a figure the rest of the playbook calls
non-supporting. Two bands within it, because they support the fallback
differently and the wording has to say which:

  * ``value >= fallback`` — the fallback is already at or below a term this
    source shows in the market: DEMONSTRATED support.
  * ``bar < value < fallback`` — the fallback sits above the figure but the
    figure still proves the market has moved past our current term: it supports
    the fallback as REALISTIC, and may never be said to have conceded it.

``buyerStandard`` is excluded. It is the buyer's own AP policy, not evidence
about what this supplier or its market accepts, and as backing for a floor
BELOW our own ask it reads backwards ("our standard is 90, so 75 is fine").

Relationship Alignment used to pad the support list when the floor beat the
current term. Client 2026-09-10: remove it — it was not a real argument.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from domain.entities.argument_catalog import ARGUMENT_CATALOG, argument_display_name
from domain.entities.facts import (
    StrategyBenchmark,
    SupplierFacts,
    negotiation_ask_term,
    resolve_effective_batna,
)
from domain.services.negotiation_arguments import citable_support_benchmarks

# The buyer's own standard is not evidence about this supplier — see module doc.
_EXCLUDED_SOURCES = frozenset({"buyerStandard"})

# One sentence per source, in two bands: `at_or_above` when the benchmark
# already reaches the fallback, `below` when it sits between the current term
# and the fallback. Every template takes `value` (the benchmark, in days),
# `fallback` and `current`. Wording follows the client's examples; a source
# with no template falls back to `_GENERIC`.
_STATEMENTS: dict[str, dict[str, str]] = {
    "supplierStandard": {
        "at_or_above": (
            "The supplier already accepts longer payment terms from other "
            "customers, with an average accepted term of {value} days. A "
            "BATNA of {fallback} days is therefore aligned with "
            "demonstrated supplier acceptance."
        ),
        "below": (
            "The supplier already accepts payment terms averaging {value} days "
            "from other customers — well beyond our current {current}-day "
            "terms — which supports {fallback} days as a realistic BATNA."
        ),
    },
    "parentOrSupplierMax": {
        "at_or_above": (
            "This supplier has already accepted payment terms of {value} days "
            "within our existing relationship, so a BATNA of {fallback} days "
            "sits inside a precedent they have previously agreed to."
        ),
        "below": (
            "This supplier has already accepted payment terms of {value} days "
            "within our existing relationship, ahead of our current "
            "{current}-day terms, supporting {fallback} days as a realistic "
            "BATNA."
        ),
    },
    "peerGroupStandard": {
        "at_or_above": (
            "Comparable suppliers with similar characteristics accept payment "
            "terms around {value} days, placing a {fallback}-day BATNA "
            "within established peer practice."
        ),
        "below": (
            "Similar suppliers in the same industry and region accept payment "
            "terms around {value} days, supporting {fallback} days as a "
            "realistic alternative."
        ),
    },
    "industryRegionStandard": {
        "at_or_above": (
            "Suppliers across this industry and region operate on payment terms "
            "around {value} days, so a {fallback}-day BATNA remains within "
            "normal market practice."
        ),
        "below": (
            "Suppliers across this industry and region operate on payment terms "
            "around {value} days, already beyond our current {current}-day "
            "terms, supporting {fallback} days as a realistic alternative."
        ),
    },
}

_GENERIC = {
    "at_or_above": (
        "This benchmark stands at {value} days, at or above the {fallback}-day "
        "BATNA, so the BATNA is supported by an observed market term."
    ),
    "below": (
        "This benchmark stands at {value} days, above our current {current}-day "
        "terms, supporting {fallback} days as a realistic alternative."
    ),
}


@dataclass(frozen=True)
class BatnaSupport:
    """One argument that backs the BATNA.

    ``statement`` is the finished sentence — written here, never by the model.
    ``internal_only`` carries the source's existing disclosure rule through:
    the playbook is the negotiator's own document, so the sentence is written
    either way, but a source that may not be quoted to the supplier is marked so
    the negotiator does not read it as a line to deliver.
    """

    key: str
    name: str
    value_days: int | None
    statement: str
    internal_only: bool = False


@dataclass(frozen=True)
class BatnaPosition:
    """The whole of playbook section 3, decided.

    ``note`` is set when there is No BATNA (floor failed the contractual+5
    gate, or collapsed onto the ask). Missing support is left as an empty
    list; invent nothing and add no "unsupported" disclaimer.
    """

    target_term_days: int | None
    batna_term_days: int | None
    current_term_days: int | None
    supports: list[BatnaSupport] = field(default_factory=list)
    note: str | None = None

    @property
    def has_support(self) -> bool:
        return bool(self.supports)


def build_batna_position(facts: SupplierFacts) -> BatnaPosition:
    """The fallback figure and every argument that supports it, in order.

    Order is the client's SOURCE hierarchy (``ArgumentDefinition.rank`` — the
    supplier's own behaviour outranks a bigger industry number).
    """
    target = negotiation_ask_term(facts)
    fallback, note = resolve_effective_batna(facts)
    current = facts.current_term_days

    if fallback is None:
        # No ask, or BATNA failed the contractual+5 gate / collapsed onto the
        # ask. Null means No BATNA — hold the target or stay on current terms.
        return BatnaPosition(
            target_term_days=target,
            batna_term_days=None,
            current_term_days=current,
            note=note,
        )

    supports = [
        support
        for support in (
            _benchmark_support(b, fallback, current)
            for b in citable_support_benchmarks(facts)
            if b.name not in _EXCLUDED_SOURCES
        )
        if support is not None
    ]
    supports.sort(key=lambda s: _rank(s.key))

    return BatnaPosition(
        target_term_days=target,
        batna_term_days=fallback,
        current_term_days=current,
        supports=supports,
        note=None,
    )


def _rank(key: str) -> int:
    definition = ARGUMENT_CATALOG.get(key)
    return definition.rank if definition is not None else 99


def _benchmark_support(
    benchmark: StrategyBenchmark, fallback: int, current: int | None
) -> BatnaSupport | None:
    """One benchmark as a fallback argument, or None when it cannot be one."""
    if benchmark.value is None:
        return None
    value = int(benchmark.value)
    band = "at_or_above" if value >= fallback else "below"
    template = _STATEMENTS.get(benchmark.name, _GENERIC)[band]
    definition = ARGUMENT_CATALOG.get(benchmark.name)
    return BatnaSupport(
        key=benchmark.name,
        name=argument_display_name(benchmark.name),
        value_days=value,
        statement=template.format(value=value, fallback=fallback, current=current),
        internal_only=bool(definition is not None and definition.internal_only),
    )
