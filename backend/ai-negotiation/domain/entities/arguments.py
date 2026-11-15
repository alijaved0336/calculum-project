from __future__ import annotations

from dataclasses import dataclass, field

# Source-credibility precedence for negotiation arguments — LOWER rank = more
# persuasive, cited first. This is the client's authoritative ordering: the
# supplier's OWN history is the strongest lever, industry/region the weakest,
# and the spend-file opportunity is supporting evidence that ranks AFTER every
# market benchmark. Ordering here is by SOURCE, never by the day-value.
ARGUMENT_SOURCE_PRECEDENCE: dict[str, int] = {
    "supplierStandard": 1,       # same supplier's historical terms with other buyers
    "parentOrSupplierMax": 2,    # the supplier's parent already accepts longer terms
    "peerGroupStandard": 3,      # comparable suppliers with similar characteristics
    "industryRegionStandard": 4, # industry/region comparison (lowest benchmark)
}

# How strongly an argument backs the target ask. TWO values, not three: the
# middle `partial` tier (floor < value < ask — "hold in reserve") was removed on
# the client's instruction, 2026-08-18. See `_classify` for the quotes.
SUPPORT_FULL = "full"        # value ABOVE THE CURRENT TERM — a supporting benchmark
SUPPORT_NONE = "none"        # value at or below the current term — never argue from it


@dataclass(frozen=True)
class Argument:
    """One negotiation argument: an external, checkable term figure — a market
    benchmark — that can be put to the supplier to justify a payment-term ask.

    ``support`` places it against the CURRENT TERM (see ``_classify``);
    ``precedence`` ranks it by source credibility (see
    ``ARGUMENT_SOURCE_PRECEDENCE``). ``undermines`` marks a figure below the
    current term — the supplier could cite it against us, so it is never
    volunteered.
    """

    source: str        # raw key, e.g. "supplierStandard" | "peerGroupStandard"
    label: str         # human-readable, e.g. "this supplier's own segment"
    value: int         # the term, in days
    precedence: int    # ARGUMENT_SOURCE_PRECEDENCE rank (1 = strongest source)
    support: str       # SUPPORT_FULL | SUPPORT_NONE
    undermines: bool   # value < current term — supplier's potential counter-evidence
    rationale: str     # why it lands in this bucket, phrased for the negotiator
    occurrences: int | None = None  # sample size, for the benchmarks that carry one
    # The underlying record this argument points at, named the way the
    # negotiator refers to it. VESTIGIAL as of the spendLineOpportunity removal
    # (2026-08-18): its only ever producer was the max spend line, whose figure
    # came from ONE identifiable row of the spend file. Market benchmarks are
    # population statistics with no single record behind them, so every argument
    # built today carries None. Kept — plumbed through ``_rationale``, the
    # bundle and ``utils.prompts.brief.arguments._line`` — because the next
    # single-record source needs exactly this, not because anything sets it.
    reference: str | None = None


@dataclass(frozen=True)
class NegotiationArguments:
    """Every usable negotiation argument, segregated by whether it supports the
    ask and ordered WITHIN each bucket by source precedence (then value).

    TWO buckets, split at the support bar ``B``
    (:func:`domain.services.negotiation_arguments.benchmark_support_bar` — the
    midpoint of current and ask when they are within 15 days, else current + 15;
    client, 2026-08-18 and 2026-09-17 — see ``_classify`` for the quotes):

      * ``full_support`` — value > B. A supporting benchmark: it proves longer
        terms exist in this market. Lead with these, strongest SOURCE first. One
        that falls short of the ask is still supporting; what it may not do is
        claim to justify the full ask, and that is a wording rule (``_rationale``,
        and ``P4_INSUFFICIENT_EVIDENCE`` on the output), not a lower bucket.
      * ``non_support`` — value <= B. Never argue from these; the ones flagged
        ``undermines`` (value < current term) are the supplier's potential
        counter-evidence.

    There is NO middle "hold in reserve" tier (floor < value < ask) any more, and
    no per-source exception to the split: the spend-line opportunity, which was
    the one argument bucketed against the ask instead, was removed with it.

    ``unavailable`` is a different kind of thing: display labels for the
    argument-eligible sources (see ``ARGUMENT_SOURCE_PRECEDENCE``) that carry NO
    value at all for this supplier — dropped upstream at extraction because
    ``negotiationStrategy.<name>.value`` was null. Without this, a source with no
    value is simply invisible everywhere else (it never becomes an ``Argument``),
    so a negotiator asking "should I use X or Y?" gets an answer that silently
    omits X instead of saying plainly that X has no data.

    This is a Tier-2 judgment: built once from :class:`SupplierFacts` in
    :func:`domain.services.negotiation_arguments.build_negotiation_arguments`,
    and surfaced everywhere through the ``argument_analysis`` bundle
    (``brief.supporting`` / ``non_supporting`` / ``unavailable``) — never
    recomputed per node.
    """

    target_term_days: int | None
    batna_term_days: int | None
    current_term_days: int | None
    full_support: list[Argument] = field(default_factory=list)
    non_support: list[Argument] = field(default_factory=list)
    unavailable: list[str] = field(default_factory=list)

    @property
    def has_full_support(self) -> bool:
        return bool(self.full_support)

    @property
    def all(self) -> list[Argument]:
        """Every argument, supporting first. Used by negotiator-facing summaries
        that show the whole picture."""
        return [*self.full_support, *self.non_support]
