"""The argument catalogue — what each argument IS, and how to put it.

One entry per argument the assistant can make, carrying the client-approved
wordings:

  * ``meaning``        — what the argument is, for surfaces that explain rather
                         than persuade (summary, "what is X?", data questions);
  * ``supplier_pitch`` — how it is put TO the supplier, for the surfaces that
                         draft (playbook Key Arguments, opening, email);
  * ``rationale``      — INTERNAL-facing: why the argument is being used,
                         translating its raw figures (sample size, average,
                         upper quartile, cost impact) into what they mean for
                         the negotiator. Rendered in the playbook Rationale.

``rank`` is the client's strength order for when everything supports the ask —
1 is the strongest argument available, and it is a SOURCE ranking, not a
day-count one: a bigger number from a weaker source is still the weaker
argument.

This module holds wording only. Whether an argument is available, supports the
ask, or may be said to the supplier at all is decided in
:mod:`domain.services.negotiation_arguments`.
"""
from __future__ import annotations

from dataclasses import dataclass

from utils.constants import format_camel_label


def argument_display_name(key: str) -> str:
    """The name an argument is called by in front of a negotiator.

    Every surface the negotiator reads — the playbook above all — names
    arguments in words: "Parent / Supplier Max", never
    `parentOrSupplierMax`. The camelCase keys are payload identifiers; they are
    how the code refers to a source, and they leaked into drafted documents for
    a long time because the brief lines led with them.

    Falls back to spacing the key itself, so a source added upstream without a
    catalogue entry still reads as words rather than as a payload field.
    """
    definition = ARGUMENT_CATALOG.get(key)
    if definition is not None:
        return definition.title
    return format_camel_label(key)


def _format_days(value: float | int) -> str:
    """67, not 67.0."""
    number = float(value)
    return str(int(number)) if number.is_integer() else f"{number:g}"


@dataclass(frozen=True)
class BenchmarkRationaleWording:
    """Why a benchmark is used, from the figures its payload entry carries.

    ``negotiationStrategy.<name>`` always gives ``value`` and sometimes
    ``occurrences`` (n), ``avg`` and ``q3`` (upper quartile). Each statistic has
    a sentence of its own for when it is the only one present; two or more are
    joined into one sentence, led by the sample size when there is one. With no
    statistics — or no statistics wording, for a source that has none (a
    maximum has no average) — the ``value`` sentence explains the day figure
    itself, so every benchmark cited under Argumentation still gets its why.
    A figure that is absent is left out — never estimated, never a placeholder.
    """

    value: str  # {value_days}
    # Single-statistic sentences.
    occurrences: str | None = None  # {occurrences}
    average: str | None = None  # {average_days}
    upper_quartile: str | None = None  # {upper_quartile_days}
    # Combined form: a lead clause, then ", with an average of … and an upper
    # quartile of …", then the closing sentence. No trailing period on leads.
    combined_occurrences_lead: str | None = None  # {occurrences}
    combined_average_lead: str | None = None  # {average_days} — lead when n is absent
    combined_close: str | None = None
    # Client-worded average + upper quartile form (Supplier Standard,
    # 2026-09-21). When set, the wording speaks in average and third quartile
    # only: the sample size is not part of it, and ``combined_*`` are unused.
    average_and_upper_quartile: str | None = None  # {average_days}, {upper_quartile_days}
    # Appended after every rendered sentence - the definition the client wants
    # stated alongside the figures.
    close: str | None = None

    @property
    def _has_statistics_wording(self) -> bool:
        return self.occurrences is not None

    def render(
        self,
        *,
        value_days: float | None,
        occurrences: int | None = None,
        average_days: float | None = None,
        upper_quartile_days: float | None = None,
    ) -> str | None:
        """The rationale for the figures present, or None when there are none."""
        sentence = self._render(
            value_days=value_days,
            occurrences=occurrences,
            average_days=average_days,
            upper_quartile_days=upper_quartile_days,
        )
        if sentence is None or self.close is None:
            return sentence
        return f"{sentence} {self.close}"

    def _render(
        self,
        *,
        value_days: float | None,
        occurrences: int | None,
        average_days: float | None,
        upper_quartile_days: float | None,
    ) -> str | None:
        avg = _format_days(average_days) if average_days is not None else None
        q3 = (
            _format_days(upper_quartile_days)
            if upper_quartile_days is not None
            else None
        )
        if self.average_and_upper_quartile is not None:
            if avg is not None and q3 is not None:
                return self.average_and_upper_quartile.format(
                    average_days=avg, upper_quartile_days=q3
                )
            if avg is not None:
                return self.average.format(average_days=avg)
            if q3 is not None:
                return self.upper_quartile.format(upper_quartile_days=q3)
            if value_days is None:
                return None
            return self.value.format(value_days=_format_days(value_days))
        present = [v for v in (occurrences, avg, q3) if v is not None]
        if not present or not self._has_statistics_wording:
            if value_days is None:
                return None
            return self.value.format(value_days=_format_days(value_days))
        if len(present) == 1:
            if occurrences is not None:
                return self.occurrences.format(occurrences=occurrences)
            if avg is not None:
                return self.average.format(average_days=avg)
            return self.upper_quartile.format(upper_quartile_days=q3)

        if occurrences is not None:
            lead = self.combined_occurrences_lead.format(occurrences=occurrences)
            stats = []
            if avg is not None:
                stats.append(f"an average of {avg} days")
            if q3 is not None:
                stats.append(f"an upper quartile of {q3} days")
        else:
            lead = self.combined_average_lead.format(average_days=avg)
            stats = [f"an upper quartile of {q3} days"]
        sentence = f"{lead}, with {' and '.join(stats)}."
        if self.combined_close is None:
            return sentence
        return f"{sentence} {self.combined_close}"


# The verdict closing every benchmark rationale: how far this benchmark carries
# the target. One wording per level of
# :func:`domain.services.negotiation_arguments.benchmark_target_support`;
# assembled by the playbook's rationale renderer. The figure sentences above say
# what the benchmark shows; only these say what it means for the target, so a
# benchmark that falls well short never reads as though it justified the number
# and one a rounding step away never reads as though it fell short. They quote
# only payload figures (value, upper quartile, ask, current term) - never a
# computed gap, which the output verifier's P1 rightly reads as unsourced.
TARGET_SUPPORT_MATCHES = (
    "At {value_days} days, this benchmark matches the {ask}-day target, so it "
    "supports the full target on its own."
)
TARGET_SUPPORT_ABOVE = (
    "At {value_days} days, this benchmark is above the {ask}-day target, so it "
    "supports the full target on its own."
)
TARGET_SUPPORT_AT_TARGET = (
    "At {value_days} days, this benchmark is effectively at the {ask}-day "
    "target{upper_quartile_clause}, so it supports the target."
)
TARGET_SUPPORT_AT_TARGET_Q3_CLAUSE = (
    ", and its upper quartile of {upper_quartile_days} days already goes "
    "beyond it"
)
TARGET_SUPPORT_UPPER_RANGE = (
    "At {value_days} days, this benchmark sits below the {ask}-day "
    "target, but its upper quartile of {upper_quartile_days} days "
    "{upper_quartile_reach}, so the target is already within the range being "
    "accepted. It supports the target as an upper-range term rather than a "
    "typical one."
)
TARGET_SUPPORT_UPPER_RANGE_REACH = {
    "beyond": "goes beyond it",
    "at": "reaches it",
    "near": "is effectively at it",
}
TARGET_SUPPORT_PARTIAL = (
    "At {value_days} days, this benchmark supports moving {extent}above the "
    "current {current}-day term and strengthens the case for an extension, but "
    "it does not by itself fully support the {ask}-day target, {reason}."
)
TARGET_SUPPORT_PARTIAL_Q3_REASON = (
    "because even its upper quartile of {upper_quartile_days} days remains "
    "below that level"
)
TARGET_SUPPORT_PARTIAL_GAP_REASON = (
    "because the benchmark itself remains below that level"
)
# "materially" is only earned by a move of at least one harmonisation step.
TARGET_SUPPORT_PARTIAL_MATERIAL = "materially "


# Regulatory Compliance (client, 2026-09-17) — made only when the regulatory
# term is a recommendation the ask goes beyond; gated by
# :func:`domain.entities.facts.regulatory_recommendation_days`.
REGULATORY_COMPLIANCE_WORDING = (
    "The local {days}-day term is a government recommendation, not a statutory "
    "cap; payment terms can legally be set beyond it by mutual agreement."
)
REGULATORY_COMPLIANCE_RATIONALE = (
    "The {days}-day regulatory term for this supplier is a recommendation that "
    "does not cap this negotiation, so the {ask}-day target is legally sound; "
    "stating that up front removes compliance as a reason for the supplier to "
    "refuse."
)


# Client-Supplier Relationship (client, 2026-09-21) — argued in playbook
# section 2 only when buyer leverage is high, and this is its why in section 4:
# the high leverage IS the reason, so the rationale says so.
RELATIONSHIP_RATIONALE = (
    "Buyer leverage over this supplier is high: the business we place with "
    "them matters more to them than their business matters to us, so they "
    "have a real stake in keeping the relationship. That is what makes "
    "invoking the partnership credible - it gives the supplier a reason to "
    "accommodate the change rather than risk the relationship. It supports "
    "raising the subject, not a particular number."
)


@dataclass(frozen=True)
class CostImpactRationaleWording:
    """Why the cost impact is used, from the figures the calculation produced.

    Both come from ``assess_cost_impact``, the client's formula:

      * ``supplier_economic_profit`` — cash-flow opportunity x supplier WACC:
        the return the supplier forgoes by financing that cash for longer.
        The formula calls it "Supplier Economic Profit"; to the supplier it is
        a LOSS, and that is how it is worded.
      * ``cost_impact_percent`` — that figure / spend volume, as a percentage.
        The denominator is spend volume, so the wording says spend volume.

    Only rendered while the argument is usable, i.e. the percentage is inside
    the "limited impact" ceiling — which is what licenses the word "limited".
    """

    percent: str  # {percent}
    economic_profit: str  # {economic_profit}
    combined: str  # {economic_profit}, {percent}

    def render(
        self, *, percent: float | None, economic_profit: float | None
    ) -> str | None:
        money = f"{economic_profit:,.0f}" if economic_profit is not None else None
        if percent is not None and money is not None:
            return self.combined.format(economic_profit=money, percent=percent)
        if percent is not None:
            return self.percent.format(percent=percent)
        if money is not None:
            return self.economic_profit.format(economic_profit=money)
        return None


# Supplier Standard's "How to pitch it" in the playbook (client, 2026-09-21).
# The one surface where the source is said out loud; everywhere else it stays
# internal-only. Rendered by `render_supplier_standard_pitch`.
SUPPLIER_STANDARD_PLAYBOOK_PITCH = (
    "As you know, we're reviewing and standardizing our payment terms across our "
    "supplier base as part of a company-wide initiative. We've been conducting a "
    "comprehensive analysis to ensure our terms are fair and aligned with market "
    "practices. As part of this, we've looked at the payment terms identical "
    "suppliers including your company have accepted with other customers who are "
    "very similar to us in terms of size, business type, and other key "
    "characteristics. We've observed that, on average, these payment terms are "
    "{average_days} days.{upper_quartile_sentence} {closing}"
)
_SUPPLIER_STANDARD_Q3_SENTENCE = (
    " In fact, the third quartile of accepted terms is even higher at "
    "{upper_quartile_days} days."
)


def render_supplier_standard_pitch(
    *,
    value_days: float | None,
    average_days: float | None = None,
    upper_quartile_days: float | None = None,
    ask_days: float | None = None,
) -> str | None:
    """The client's Supplier Standard pitch, filled with this supplier's figures.

    The average falls back to the benchmark value (the payload's ``value`` IS
    the average where ``avg`` is not given separately). The third-quartile
    sentence is dropped when there is no quartile, or when it is not above the
    average - "even higher" would then be false. The close states the target
    term; with none, it states the change without a number rather than
    inventing one. None when there is no figure at all.
    """
    average = average_days if average_days is not None else value_days
    if average is None:
        return None
    q3_sentence = ""
    if upper_quartile_days is not None and upper_quartile_days > average:
        q3_sentence = _SUPPLIER_STANDARD_Q3_SENTENCE.format(
            upper_quartile_days=_format_days(upper_quartile_days)
        )
    closing = (
        f"Therefore, we're introducing payment terms of {_format_days(ask_days)} days."
        if ask_days is not None
        else "Therefore, we're introducing longer payment terms."
    )
    return SUPPLIER_STANDARD_PLAYBOOK_PITCH.format(
        average_days=_format_days(average),
        upper_quartile_sentence=q3_sentence,
        closing=closing,
    )


@dataclass(frozen=True)
class ArgumentDefinition:
    key: str
    title: str
    meaning: str
    supplier_pitch: str
    rank: int
    # Set where the argument is not freely sayable. ``internal_only`` withholds
    # the pitch entirely; the note explains the condition to the negotiator.
    internal_only: bool = False
    disclosure_note: str | None = None
    # What to do when this argument was ASSESSED for the supplier and came back
    # unusable. Only the four assessment-driven arguments (payOnTerms, dso,
    # costImpact, relationship) have one: a benchmark that does not reach the ask
    # is still a supporting benchmark, but an assessment that fails its gate
    # disappears from the supporting set entirely — and "absent" is not an
    # instruction. Without this the model is free to make the claim anyway,
    # which is exactly the claim it must not make.
    unusable_note: str | None = None
    # INTERNAL-facing "why this argument" wording (see module docstring). Set
    # only where the payload carries figures to translate; never shown to the
    # supplier and never carried on `PresentedArgument.as_dict()`.
    rationale: BenchmarkRationaleWording | CostImpactRationaleWording | None = None


@dataclass(frozen=True)
class PresentedArgument:
    """A catalogue entry bound to this supplier's actual figures."""

    definition: ArgumentDefinition
    # The benchmark day-count, where the argument is one. None for the
    # assessment-driven arguments (DSO, Pay-on-Terms, cost impact, relationship).
    value_days: int | None = None
    # Negotiator-facing specifics — the figures behind the argument.
    detail: str | None = None
    # The sayable wording. Usually the catalogue pitch; the assessments that
    # compute their own (cost impact carries a percentage, the relationship
    # varies by posture) override it. None when nothing may be said.
    supplier_pitch: str | None = None
    # The underlying record this argument was read off, named the way the
    # negotiator refers to it. VESTIGIAL alongside ``Argument.reference``: its
    # only producer was the max spend line, removed 2026-08-18. Market
    # benchmarks are population statistics with no single record behind them, so
    # everything built today carries None. Kept as its own field rather than
    # folded into ``detail`` so a consumer can ask whether a record reference
    # exists without pattern-matching prose. Negotiator-facing only — never
    # disclosed to the supplier.
    reference: str | None = None

    @property
    def key(self) -> str:
        return self.definition.key

    @property
    def title(self) -> str:
        return self.definition.title

    @property
    def meaning(self) -> str:
        return self.definition.meaning

    @property
    def rank(self) -> int:
        return self.definition.rank

    @property
    def sayable(self) -> bool:
        return bool(self.supplier_pitch) and not self.definition.internal_only

    def as_dict(self) -> dict:
        """JSON-serialisable form — the shape carried on the graph state.

        Flattened deliberately: consumers want ``title``/``meaning``/``rank``
        directly, and a nested ``definition`` would make every prompt formatter
        reach through two levels for the wording.
        """
        return {
            "key": self.key,
            "title": self.title,
            "rank": self.rank,
            "meaning": self.meaning,
            "supplier_pitch": self.supplier_pitch,
            "sayable": self.sayable,
            "internal_only": self.definition.internal_only,
            "disclosure_note": self.definition.disclosure_note,
            "value_days": self.value_days,
            "detail": self.detail,
            "reference": self.reference,
        }


# Client ranking (strongest first when every argument supports the ask):
#   1 buyerStandard · 2 supplierStandard · 3 parentOrSupplierMax
#   4 peerGroupStandard · 5 industryRegionStandard
#   6 dso · 7 payOnTerms · 8 costImpact
# `relationship` is not in that list; it is ranked last here (9) — it justifies
# raising the subject rather than a number, so it is the argument that carries
# the case when nothing above it is available.
#
# The numbers are CONTIGUOUS and must stay that way. Sorting only ever reads
# their relative order, but `rank` is also published through
# `PresentedArgument.as_dict()` into the brief, and a hole where a deleted
# argument used to sit reads as a missing source rather than as an absent one.
# When an argument is removed, renumber the ones below it.
ARGUMENT_CATALOG: dict[str, ArgumentDefinition] = {
    "buyerStandard": ArgumentDefinition(
        key="buyerStandard",
        title="Buyer Standard",
        rank=1,
        meaning=(
            "Represents the buyer's internal payment-term policy or standard applied "
            "across a supplier category, showing that the requested extension aligns "
            "with broader company practices."
        ),
        supplier_pitch=(
            "Our organization is aligning suppliers in this category with our standard "
            "payment-term structure. This adjustment is intended to create consistency "
            "across our supplier base while maintaining a predictable commercial "
            "relationship."
        ),
        # Value-only, like parentOrSupplierMax: our own policy is a single
        # figure with no sample behind it - there is no average or quartile of
        # a standard we set ourselves. Added 2026-09-18: buyerStandard reaches
        # the playbook's Argumentation section (it is not in
        # `_ARGUMENT_BENCHMARK_NAMES`, but it does reach `brief.evidence`), and
        # without wording here it was the one argument the Rationale section
        # never explained - listed among the reasons for the ask on one page
        # and absent from the page that says why.
        rationale=BenchmarkRationaleWording(
            value=(
                "Our own standard for this supplier category is {value_days} days, so "
                "the proposed term applies a policy we already hold across the "
                "supplier base rather than a concession negotiated with this supplier "
                "alone."
            ),
        ),
    ),
    "supplierStandard": ArgumentDefinition(
        key="supplierStandard",
        title="Supplier Standard",
        rank=2,
        # Client definition, 2026-09-21.
        meaning=(
            "The Supplier Standard shows what identical suppliers (companies "
            "sharing over 95% of the same characteristics and attributes) on the "
            "Platform are accepting."
        ),
        # No catalogue pitch: outside the playbook the source stays
        # internal-only (`_INTERNAL_ONLY_FIELDS`, excluded from the
        # supplier-facing benchmark selection, NOT SAYABLE in the chat briefs).
        # The playbook is the one surface with a client-approved wording for it
        # (2026-09-21) - `SUPPLIER_STANDARD_PLAYBOOK_PITCH`, filled with the
        # figures by `render_supplier_standard_pitch`.
        supplier_pitch="",
        internal_only=True,
        disclosure_note=(
            "INTERNAL outside the negotiation playbook - in chat and drafted "
            "supplier text it is evidence for your own confidence, not something "
            "to say. The playbook carries the client-approved wording for it."
        ),
        # Client wording, 2026-09-21: the average and the third quartile, then
        # the definition. The sample size is not part of it.
        rationale=BenchmarkRationaleWording(
            value="The supplier is accepting on average {value_days} days.",
            average="The supplier is accepting on average {average_days} days.",
            upper_quartile=(
                "The supplier is accepting {upper_quartile_days} days (3rd quartile)."
            ),
            average_and_upper_quartile=(
                "The supplier is accepting on average {average_days} days and "
                "{upper_quartile_days} days (3rd quartile)."
            ),
            close=(
                "The Supplier Standard shows what identical suppliers (companies "
                "sharing over 95% of the same characteristics and attributes) on "
                "the Platform are accepting."
            ),
        ),
    ),
    "parentOrSupplierMax": ArgumentDefinition(
        key="parentOrSupplierMax",
        title="Parent / Supplier Max",
        rank=3,
        meaning=(
            "Represents evidence that this supplier has previously accepted longer "
            "payment terms within the same buyer-supplier relationship. It is a "
            "precedent, not a supplier standard or corporate policy."
        ),
        supplier_pitch=(
            "Within our existing relationship, your organization has accepted longer "
            "payment terms on other arrangements with us. We are looking to align this "
            "arrangement with an established precedent that has already been workable "
            "between our organizations."
        ),
        disclosure_note=(
            "The precedent is inside OUR OWN relationship with this supplier — never "
            "phrase it as knowing what terms they give other buyers, and keep the "
            "day-figure out of the sentence."
        ),
        # A maximum: no sample size, average or quartile to translate.
        rationale=BenchmarkRationaleWording(
            value=(
                "This supplier has already accepted payment terms of {value_days} days "
                "on other arrangements within our relationship, so the extension "
                "builds on a precedent that already works between our organizations "
                "rather than asking for something new."
            ),
        ),
    ),
    "peerGroupStandard": ArgumentDefinition(
        key="peerGroupStandard",
        title="Peer Group Standard",
        rank=4,
        meaning=(
            "Represents the payment terms observed across comparable suppliers serving "
            "similar customers, showing where the proposed term sits against that peer "
            "set."
        ),
        supplier_pitch=(
            "Comparable suppliers serving similar customers are generally aligned around "
            "the terms we are proposing. Our objective is to keep this arrangement "
            "consistent with that broader pattern."
        ),
        disclosure_note=(
            "A peer comparison, not an industry standard. Never disclose sample or "
            "record counts, which companies were compared, or the methodology."
        ),
        # Internal: the sample count is quotable here, never to the supplier.
        rationale=BenchmarkRationaleWording(
            value=(
                "Comparable suppliers serving similar customers are at {value_days} "
                "days, showing the payment terms peers already work with."
            ),
            occurrences=(
                "This benchmark is supported by {occurrences} comparable "
                "observations, providing evidence that this payment-term behavior "
                "is seen across multiple comparable cases."
            ),
            average=(
                "Comparable suppliers have an average payment term of {average_days} "
                "days, showing the payment terms peers already work with."
            ),
            upper_quartile=(
                "The upper quartile reaches {upper_quartile_days} days, showing that "
                "longer payment terms are already observed among comparable suppliers."
            ),
            combined_occurrences_lead=(
                "This benchmark is supported by {occurrences} comparable observations"
            ),
            combined_average_lead=(
                "Comparable suppliers have an average payment term of {average_days} "
                "days"
            ),
        ),
    ),
    "industryRegionStandard": ArgumentDefinition(
        key="industryRegionStandard",
        title="Industry Region Standard",
        rank=5,
        meaning=(
            "The buyer's own average payment terms for this industry and region "
            "inside their spend - internal policy data, not an external market "
            "or Calculum industry benchmark."
        ),
        supplier_pitch=(
            "Other suppliers we buy from in the same industry and region are already accepting longer payment terms,"
            "so we are aligning/standardizing our terms across that industry and region."
        ),
        disclosure_note=(
            "INTERNAL client spend for this industry+region — never present it "
            "as an external market standard, a Calculum industry benchmark, or "
            "a global/universal rate, and never use it to justify a term above "
            "its own value."
        ),
        # The buyer's own spend, not the market — the wording must not call it
        # market practice (see `meaning` and `disclosure_note`).
        rationale=BenchmarkRationaleWording(
            value=(
                "Our suppliers in this industry and region average {value_days} days "
                "in our own spend, which is the term our internal policy already "
                "applies to similar suppliers."
            ),
            occurrences=(
                "This benchmark is supported by {occurrences} observations in our own "
                "spend for this industry and region, providing evidence that this "
                "payment-term behavior is seen across multiple suppliers in our base."
            ),
            average=(
                "Our suppliers in this industry and region have an average payment "
                "term of {average_days} days, which is the term our internal policy "
                "already applies to similar suppliers."
            ),
            upper_quartile=(
                "The upper quartile reaches {upper_quartile_days} days, showing that "
                "longer payment terms are already observed among our suppliers in "
                "this industry and region."
            ),
            combined_occurrences_lead=(
                "This benchmark is supported by {occurrences} observations in our own "
                "spend for this industry and region"
            ),
            combined_average_lead=(
                "Our suppliers in this industry and region have an average payment "
                "term of {average_days} days"
            ),
        ),
    ),
    "dso": ArgumentDefinition(
        key="dso",
        title="DSO Alignment",
        rank=6,
        meaning=(
            "Shows that DSO already sits above the contractual current terms - "
            "payment timing already runs past the contract - and uses that gap "
            "as leverage toward the target."
        ),
        supplier_pitch=(
            "Although contractual terms are shorter, DSO already sits higher - "
            "payment timing already runs past the contract. That DSO baseline "
            "is leverage toward the longer target terms."
        ),
        disclosure_note=(
            "State the contractual current, the DSO figure, and the ask — the "
            "leverage is the gap between contract and DSO. NOT a payment-term "
            "benchmark and not market evidence; a long DSO alone does not "
            "entitle longer terms."
        ),
        unusable_note=(
            "DO NOT claim payment already runs past the contract on DSO — DSO "
            "is not above the current contractual terms. Do not use DSO as "
            "leverage toward the ask."
        ),
    ),
    "payOnTerms": ArgumentDefinition(
        key="payOnTerms",
        title="Payment Reliability",
        rank=7,
        meaning=(
            "Shows whether the buyer has historically paid according to agreed "
            "contractual payment terms, demonstrating payment discipline and reliability."
        ),
        supplier_pitch=(
            "Our payment history demonstrates consistent adherence to agreed payment "
            "terms. Extending the contractual term would formalize our existing payment "
            "behavior rather than introduce additional payment risk."
        ),
        disclosure_note=(
            "Pay-on-Terms is NOT a benchmark, a supplier standard, a payment-term "
            "target, or a reason to ask for longer terms. It is a trust argument: "
            "it removes the payment-risk objection and never justifies the ask. "
            "Never state the Pay-on-Terms figure, the actual-payment average, or "
            "the variance."
        ),
        unusable_note=(
            "DO NOT use our payment record as an argument, and do not mention "
            "it. If the supplier raises payment history, commit to predictable "
            "payment under the new terms instead."
        ),
    ),
    "costImpact": ArgumentDefinition(
        key="costImpact",
        title="Cost Impact",
        rank=8,
        meaning=(
            "Quantifies the estimated economic impact of extending payment terms - the "
            "cash-flow opportunity valued at the supplier's own cost of capital, as a "
            "share of spend - to demonstrate that the impact is limited."
        ),
        supplier_pitch=(
            "We recognize that extending payment terms has an impact; however, the "
            "estimated financial effect represents a limited adjustment relative to the "
            "overall commercial relationship."
        ),
        disclosure_note=(
            "The impact percentage may be stated — that is the argument. The supplier's "
            "financing rate behind it may not."
        ),
        unusable_note=(
            "DO NOT quantify the cost to the supplier, and never tell them the "
            "impact is small."
        ),
        rationale=CostImpactRationaleWording(
            percent=(
                "The economic loss associated with this change represents {percent}% "
                "of the spend volume, helping quantify the financial impact of the "
                "proposed term on the supplier. A share that small supports the "
                "argument that the change is a limited adjustment for them."
            ),
            economic_profit=(
                "The supplier's estimated economic loss from this change is "
                "{economic_profit} (the return it forgoes by financing the cash-flow "
                "opportunity at its own cost of capital), helping quantify the "
                "financial impact of the proposed term on the supplier."
            ),
            combined=(
                "The supplier's estimated economic loss from this change is "
                "{economic_profit} (the return it forgoes by financing the cash-flow "
                "opportunity at its own cost of capital), which represents {percent}% "
                "of the spend volume. This helps quantify the financial impact of the "
                "proposed term on the supplier, and a share that small supports the "
                "argument that the change is a limited adjustment for them."
            ),
        ),
    ),
    "regulatoryCompliance": ArgumentDefinition(
        key="regulatoryCompliance",
        title="Regulatory Compliance",
        rank=10,
        meaning=(
            "Shows that a regulatory payment term is a government recommendation, not "
            "a statutory cap, so the requested term is lawful by mutual agreement."
        ),
        # No separate pitch: the argument's sentence is the approved wording
        # (REGULATORY_COMPLIANCE_WORDING), bound to the regulatory figure.
        supplier_pitch="",
    ),
    "relationship": ArgumentDefinition(
        key="relationship",
        title="Client-Supplier Relationship",
        rank=9,
        meaning=(
            "Uses the strategic importance of the relationship, including business "
            "volume, partnership value, continuity, and future opportunities, to support "
            "a collaborative negotiation."
        ),
        supplier_pitch=(
            "We value our partnership and the importance of our ongoing relationship. "
            "Given the scale and strategic nature of our collaboration, we believe "
            "aligning payment terms creates a more consistent and sustainable commercial "
            "structure for both parties."
        ),
        disclosure_note=(
            "Justifies raising the subject, never a particular number. Never quote the "
            "spend volume or leverage ratings behind it."
        ),
        unusable_note=(
            "DO NOT lean on the relationship: the spend and leverage behind it "
            "do not support the claim, and the supplier can price an overstated "
            "one."
        ),
    ),
}
