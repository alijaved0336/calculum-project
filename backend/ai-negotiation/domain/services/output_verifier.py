"""One deterministic check over every generated output (Phase 2, §3.4).

Two bespoke validators used to run on two of nineteen nodes. Everything else
shipped unchecked: a benchmark written into a prompt was never read back, so
"peer group standard of 78 days" against a payload that said 68 reached the
negotiator unchallenged — the one sentence they repeat to the supplier.

This replaces the enumeration ("never write 'weakest of the supporting set'")
with the principles themselves, expressed as checks a machine can settle:

    P1  every day-figure in the output appears in the brief
    P2  every negotiating POSITION sits on the 15-day ladder
    P4  a benchmark below the ask is never described as justifying the ask
    P6  every argument named is one the closed catalogue knows

P3 (nothing internal in supplier-facing text) is deliberately NOT here: it
already has a working deterministic implementation in
:func:`domain.services.asymmetry_guard.enforce_asymmetry_guard`, which redacts
rather than reports. Duplicating it would give two answers to one question.

Every check is cheap and pure — no LLM, no I/O. The verdict is advisory to the
caller: a node decides whether to regenerate, label, or ignore. Nothing here
rewrites the text.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from domain.entities.argument_catalog import ARGUMENT_CATALOG
from domain.entities.brief import NegotiationBrief
from domain.entities.facts import TERM_HARMONISATION_STEP_DAYS
from domain.services.negotiation_arguments import (
    TARGET_SUPPORT_PARTIAL,
    benchmark_target_support,
)

# A day-figure as it is actually written in prose: "90 days", "90-day",
# "90 calendar days". Bare integers are NOT matched — a playbook is full of
# ordinary numbers (section numbers, percentages, counts) and treating those as
# term claims produced noise that buried the real findings.
_DAY_FIGURE_RE = re.compile(
    r"\b(\d{1,3})\s*[- ]?(?:calendar\s+)?days?\b", re.IGNORECASE
)

# The claim P4 is about: a figure being offered as justification for the ask.
# Matched on the sentence containing the figure, not the whole document.
_JUSTIFIES_RE = re.compile(
    r"\b(justif\w*|supports?\s+(?:the|our)\s+(?:ask|target|request)|"
    r"evidence\s+for\s+(?:the|our)\s+(?:ask|target)|backs?\s+(?:the|our)\s+ask)\b",
    re.IGNORECASE,
)

# Text inside square brackets is scaffolding — placeholders the negotiator
# fills in, and the labels this module's own callers append on failure. Reading
# figures out of them would make a labelled output fail its own re-check.
_BRACKETED_RE = re.compile(r"\[[^\]]*\]")

_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n+")


@dataclass(frozen=True)
class Violation:
    """One failed check, in the negotiator's language rather than the code's."""

    code: str        # stable identifier, e.g. "P1_UNSOURCED_FIGURE"
    principle: str   # "P1" | "P2" | "P4" | "P6"
    detail: str      # one sentence, quotable back to the model as feedback

    def __str__(self) -> str:
        return f"[{self.code}] {self.detail}"


@dataclass(frozen=True)
class VerificationResult:
    violations: list[Violation] = field(default_factory=list)

    def __bool__(self) -> bool:
        """Truthy when the output PASSED — reads as `if verify(...)`."""
        return not self.violations

    @property
    def codes(self) -> list[str]:
        return [v.code for v in self.violations]


def _strip_scaffolding(text: str) -> str:
    return _BRACKETED_RE.sub(" ", text)


def _figures_in(text: str) -> list[int]:
    return [int(m.group(1)) for m in _DAY_FIGURE_RE.finditer(text)]


def known_day_figures(brief: NegotiationBrief) -> set[int]:
    """Every day-figure the brief actually put in front of the model.

    This is the P1 allowlist: the ask, the current term, the BATNA, the
    EXTENSION those two imply, every argument's value, any figure written into
    an argument's rendered text, and the raw benchmark values. A term figure in
    the output that is not in this set was invented — there is no field it could
    have come from.
    """
    known: set[int] = set()
    ask, current = brief.ask, brief.current_term
    for value in (ask, current, brief.batna_floor):
        if value is not None:
            known.add(int(value))

    # The EXTENSION — ask minus current term. Not a field anywhere, which is
    # exactly why this was missing, but the playbook is INSTRUCTED to state it:
    # section 4 opens with "the current-vs-target term gap", and the cost-impact
    # argument is rendered as "0.61% of invoice value over 40 days". Flagging it
    # as unsourced told the model to delete the sentence the spec asks for.
    if ask is not None and current is not None and ask > current:
        known.add(int(ask) - int(current))

    for bucket in (brief.supporting, brief.non_supporting):
        for argument in bucket:
            value = argument.get("value_days")
            if value is not None:
                known.add(int(value))
            # Figures the brief PRINTED inside an argument's own text — the DSO
            # line ("supplier's 72-day receivables cycle vs the 90-day ask"),
            # the pay-on-terms variance, the cost-impact window. The model is
            # told to copy those lines; a figure it copied is sourced by
            # definition, and reading them back is what makes that true.
            for field_name in ("detail", "supplier_pitch", "meaning", "rationale"):
                rendered = argument.get(field_name)
                if isinstance(rendered, str):
                    known.update(_figures_in(rendered))

    facts = brief.facts
    if facts is not None:
        for benchmark in facts.strategy_benchmarks:
            # The value, and the statistics that now travel with it on the
            # argument line ("67 days (avg 65, top quartile 75, n=16)") — a
            # narrow summary answer that quotes the average or the third
            # quartile is quoting the brief, not inventing a figure.
            for figure in (benchmark.value, benchmark.avg, benchmark.q3):
                if figure is not None:
                    known.add(int(figure))
        for name in (
            "target_term_days", "current_term_days", "opportunity_term_days",
            "batna_term_days", "benchmark_term_days", "regulatory_max_term_days",
            "pay_on_terms_term_days", "buyer_standard_term_days",
            "supplier_segment_term_days", "supplier_segment_avg_term_days",
            "supplier_segment_q3_term_days", "peer_group_term_days",
            "peer_group_avg_term_days", "peer_group_q3_term_days",
            "actual_payment_terms_days", "agreed_terms_with_cash_discounts", "dso",
        ):
            value = getattr(facts, name, None)
            if value is not None:
                known.add(int(value))
    return known


def _check_p1(text: str, brief: NegotiationBrief) -> list[Violation]:
    """Every day-figure stated appears somewhere in the brief."""
    known = known_day_figures(brief)
    if not known:
        # Nothing to check against. Reporting every figure as unsourced here
        # would be noise, not a finding.
        return []
    unknown = sorted({f for f in _figures_in(text) if f not in known})
    return [
        Violation(
            code="P1_UNSOURCED_FIGURE",
            principle="P1",
            detail=(
                f"'{value} days' does not appear anywhere in the supplier's data. "
                "State only figures the brief gave you; never derive or round one "
                "of your own."
            ),
        )
        for value in unknown
    ]


def _check_p2(_text: str, brief: NegotiationBrief) -> list[Violation]:
    """Every negotiating POSITION sits on the 15-day ladder.

    A BRIEF-INTEGRITY check, not a scan of the generated text — the ``_text``
    argument is taken only to keep the check signature uniform, and is
    deliberately unread. The two positions (the ask and the BATNA) are
    read off the brief, which is the only place the output is allowed to get
    them from: P1 already fails any day-figure in the text that is not in the
    brief's allowlist, so a position in the prose is by then a brief figure, and
    re-finding it in prose would only misread benchmarks as positions.

    That is also why the ladder is NOT applied to the text. Benchmarks are
    evidence and are quoted exactly; checking every figure in the output against
    the ladder would forbid the very thing Carlos asked for ("we can say the
    supplier standard is 83").

    ``harmonise_term_days`` owns both values upstream, so in practice this never
    fires. That is the point: it is a standing assertion that the upstream
    guarantee holds, and it fires the day a new path sets a position without
    going through it.
    """
    violations: list[Violation] = []
    step = TERM_HARMONISATION_STEP_DAYS
    positions = [("ask", brief.ask), ("BATNA", brief.batna_floor)]
    for label, value in positions:
        if value is None or int(value) % step == 0:
            continue
        violations.append(Violation(
            code="P2_UNHARMONISED_POSITION",
            principle="P2",
            detail=(
                f"The {label} is {value} days, which is not a multiple of "
                f"{step}. Negotiating positions move in {step}-day steps."
            ),
        ))
    return violations


def _check_p4(text: str, brief: NegotiationBrief) -> list[Violation]:
    """A BENCHMARK short of the ask is never described as justifying the ask.

    Sentence-scoped: a figure and a justification verb have to appear together
    before this fires. "The peer group sits at 60 days" is a fine statement;
    "the peer group at 60 days justifies our 90-day ask" is the error.

    Scoped to actual BENCHMARK VALUES, and never the current term. Sentence
    proximity alone is far too coarse: "We request a 40-day extension from the
    current 50-day term to 90 days, justified by internal precedent" contains a
    justification verb and two figures under the ask, and neither is a benchmark
    being offered as evidence — the 40 is the extension and the 50 is what we
    pay today. That sentence, which the playbook spec asks for, was reported to
    a client as two violations. Only a figure the brief carries AS a benchmark
    can be a benchmark used wrongly.
    """
    ask = brief.ask
    if ask is None:
        return []
    # Only a benchmark that falls SHORT of the ask may not be said to support
    # it. One within a rounding step of the ask, or whose upper quartile
    # reaches it, does support it - and the playbook Rationale says so
    # (:func:`benchmark_target_support`), so it must not be flagged here.
    q3_by_key = {
        b.name: b.q3
        for b in (brief.facts.strategy_benchmarks if brief.facts is not None else ())
    }
    benchmarks = {
        int(argument["value_days"])
        for bucket in (brief.supporting, brief.non_supporting)
        for argument in bucket
        if argument.get("value_days") is not None
        and benchmark_target_support(
            argument["value_days"], q3_by_key.get(argument.get("key")), ask
        ) == TARGET_SUPPORT_PARTIAL
    }
    current = None if brief.current_term is None else int(brief.current_term)
    violations: list[Violation] = []
    seen: set[int] = set()
    for sentence in _SENTENCE_SPLIT_RE.split(text):
        if not _JUSTIFIES_RE.search(sentence):
            continue
        for value in _figures_in(sentence):
            if value >= int(ask) or value in seen:
                continue
            if value not in benchmarks or value == current:
                continue
            seen.add(value)
            violations.append(Violation(
                code="P4_INSUFFICIENT_EVIDENCE",
                principle="P4",
                detail=(
                    f"'{value} days' is below the {ask}-day ask, so it cannot "
                    "justify the ask. It supports MOVEMENT off the current term "
                    "— say that instead, and do not present it as backing the "
                    "full request."
                ),
            ))
    return violations


def _check_p6(text: str, brief: NegotiationBrief) -> list[Violation]:
    """Every argument NAMED is one the closed catalogue knows.

    Catches the invented composite — "Negotiation Strength", "Payment Risk
    Index" — by looking for the payload keys and titles that should never be
    invented around. The catalogue and the play registry are closed sets, so
    this is exact matching, not fuzzy judgement.
    """
    violations: list[Violation] = []
    # A camelCase payload key in prose is always wrong: the negotiator reads
    # words ("Parent / Supplier Max"), never `parentOrSupplierMax`.
    #
    # Only the camelCase ones. `relationship` and `dso` are catalogue keys too,
    # but they are also ordinary words a playbook uses correctly all the time —
    # "the relationship justifies raising the subject" is good prose, not a
    # leaked identifier, and flagging it made every draft mentioning the
    # relationship fail. A key is recognisable as an identifier by its
    # mixed case; an all-lowercase one is indistinguishable from English.
    for key in ARGUMENT_CATALOG:
        if key.islower():
            continue
        if re.search(rf"\b{re.escape(key)}\b", text):
            violations.append(Violation(
                code="P6_RAW_IDENTIFIER",
                principle="P6",
                detail=(
                    f"'{key}' is a payload field name, not something to write. "
                    f"Call it '{ARGUMENT_CATALOG[key].title}'."
                ),
            ))
    return violations


# Grading an argument in front of the negotiator. The playbook voice already
# withholds the rank tags, so the model has nothing to COPY — but nothing stopped
# it inventing the language, and it did: "the weakest of the supporting set"
# reached a client playbook and Carlos asked "What does it mean by 'the weakest
# of our supporting set'??". Withholding the input removes the easy path; this
# closes the rest, and is what lets ~500 characters of prohibition prose leave
# the prompt.
_GRADING_RE = re.compile(
    r"\b(weakest|strongest|second[- ]strongest|a step weaker|less compelling|"
    r"secondary argument|weaker argument|strongest argument|"
    r"our (?:second|third|fourth) argument|softer point|"
    r"worth keeping for last)\b",
    re.IGNORECASE,
)

# Naming what was NOT used. The playbook voice is never shown the reserve,
# non-supporting or unavailable buckets, so it cannot name a specific source —
# but it can still write "other benchmarks were considered", which tells the
# negotiator they are walking in with a partial case. Deck p.3/p.14 show exactly
# this ("peerGroupStandard: no data for this supplier"), and Carlos's rule is
# blunt: "No need to mention this if not useful."
_MISSING_SOURCE_RE = re.compile(
    r"\b(no data (?:for|on) this supplier|not used(?:\s*[—–-]\s*and why)?|"
    r"were (?:not )?(?:considered|ruled out)|no benchmark (?:data )?(?:is )?available|"
    r"other benchmarks (?:were|are)|unavailable sources?|"
    r"insufficient benchmark)\b",
    re.IGNORECASE,
)


def _check_no_grading(text: str, brief: NegotiationBrief) -> list[Violation]:
    """The negotiator must not be told which of their own arguments is weak."""
    m = _GRADING_RE.search(text)
    if not m:
        return []
    return [Violation(
        code="P3_ARGUMENT_GRADED",
        principle="P3",
        detail=(
            f"'{m.group(0)}' grades an argument in front of the negotiator. "
            "Present each one as evidence in its own right — they read this in "
            "the room, and an argument introduced as the weak one is one they "
            "have already half-conceded. The order carries the priority."
        ),
    )]


def _check_no_missing_sources(text: str, brief: NegotiationBrief) -> list[Violation]:
    """Never narrate what could NOT be argued."""
    m = _MISSING_SOURCE_RE.search(text)
    if not m:
        return []
    return [Violation(
        code="P3_NAMES_MISSING_SOURCE",
        principle="P3",
        detail=(
            f"'{m.group(0)}' tells the negotiator what we could not argue. "
            "State the case that exists and stop; a list of what is missing "
            "primes them to concede."
        ),
    )]


def verify_output(text: str, brief: NegotiationBrief | None) -> VerificationResult:
    """Check one generated output against the brief it was generated from.

    Returns a :class:`VerificationResult` that is truthy when the output
    passed, so callers read ``if not verify_output(draft, brief):``.

    With no brief there is nothing to verify against and the result is a pass:
    a surface that was given no data cannot be accused of contradicting it.
    """
    if not text or brief is None:
        return VerificationResult()

    body = _strip_scaffolding(text)
    return VerificationResult(
        violations=[
            *_check_p1(body, brief),
            *_check_p2(body, brief),
            *_check_p4(body, brief),
            *_check_p6(body, brief),
            *_check_no_grading(body, brief),
            *_check_no_missing_sources(body, brief),
        ]
    )


def format_verification_feedback(violations: list[Violation]) -> str:
    """The corrective block appended to a prompt for one bounded retry.

    Quotes the failures back rather than restating the rules: the model already
    had the rules and broke them, so what it is missing is which line was
    wrong.
    """
    lines = [
        "## REGENERATE — THE PREVIOUS DRAFT FAILED THESE CHECKS",
        "Fix each of these exactly, and change nothing else:",
    ]
    lines += [f"  - {v.detail}" for v in violations]
    return "\n".join(lines)


# There is deliberately NO `failure_label` here any more (client, 2026-08-25).
# A draft that failed twice used to ship with the violations stapled to the end
# of the document — "[Check before using — this draft did not pass the data
# checks: …]". It reached a client playbook on three FALSE POSITIVES (the term
# gap, and the current term inside a sentence containing the word "justified"),
# which is what a banner made of heuristics will always eventually do. The
# verdict is internal now: logs and the node's `errors` field. Do not
# reintroduce a user-visible label — fix the check instead.
