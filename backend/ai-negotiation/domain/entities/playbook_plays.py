"""The client's approved plays — what each one is called, how it is worded,
and which playbook section it belongs in.

This is the client's own list, kept verbatim. The playbook may frame the ask,
argue it, answer an objection or concede ground only in these terms, and the
wording here is the benchmark for how each is pitched.

It is deliberately a plain registry: adding a play is one `PlaybookPlay(...)`
entry in `PLAYBOOK_PLAYS` and nothing else. Nothing downstream is keyed to the
current membership — the prompt block, the section grouping and the tests all
read the registry.

Two kinds of play, and the difference decides whether one may be used at all:

  * A play with ``requires_arguments`` is EVIDENCE. It may only be used when
    the argument engine put one of those sources in the supporting set for this
    supplier — the figures are what make the claim true, and without them the
    play is a claim about a supplier we have no data on. Several sources can
    back one play: the client treats peer-group and industry/region figures as
    a single benchmarking move, so either one makes it live.
  * A play without one is FRAMING, an objection response, or a concession.
    Those are things the buyer decides to say, not things the data proves, so
    they are always available.

Related: :mod:`domain.entities.argument_catalog` holds the per-source wording
for the evidence arguments themselves (what each one MEANS and the sentence to
say). A play is the client's name for the move; the catalogue entry is the
sentence. Where a play maps to an argument, both apply.
"""
from __future__ import annotations

from dataclasses import dataclass

# Sections that hold plays. Target/BATNA and Rationale are stamped by prompt
# blocks, not by plays - so they have no constant here.
SECTION_OPENING_AND_ARGUMENTATION = "Opening Position and Argumentation"
SECTION_OBJECTIONS_AND_CONCESSIONS = "Objections and Concessions"

# The client writes their term placeholder this way in every play description.
TERM_PLACEHOLDER = "[Proposed Payment Terms]"


@dataclass(frozen=True)
class PlaybookPlay:
    """One approved play: the client's name for it, wording, and where it goes."""

    key: str
    # The client's own name. This is what the negotiator sees in the playbook.
    title: str
    # The client's own wording, verbatim — the condition the play is used under.
    description: str
    # Which playbook sections this play may appear in.
    sections: tuple[str, ...]
    # THE LINE ITSELF: the sentence that goes into the playbook, in the client's
    # wording, ready to say. Where this is set, the playbook reproduces it — the
    # description explains WHEN, this IS the wording. None where the sentence
    # comes from the argument catalogue instead (see `pitch_from_argument`),
    # because that one is filled in with the supplier's real figures.
    say: str | None = None
    # ARGUMENT_CATALOG key whose approved supplier pitch is this play's wording.
    # The brief already carries that sentence with this supplier's numbers in
    # it, so it is pointed at rather than copied — one wording, one place.
    pitch_from_argument: str | None = None
    # ARGUMENT_CATALOG keys, any ONE of which must be in this supplier's
    # supporting arguments before the play may be used. Empty = always available.
    requires_arguments: tuple[str, ...] = ()
    # A limit on how the play may be put, where using it carelessly would state
    # something the buyer has not approved.
    caution: str | None = None

    def render(self, proposed_term_days: int | None = None) -> str:
        """The description with the client's term placeholder filled in."""
        return self._fill(self.description, proposed_term_days)

    def spoken_line(self, proposed_term_days: int | None = None) -> str | None:
        """The literal sentence to write into the playbook, term filled in."""
        return self._fill(self.say, proposed_term_days) if self.say else None

    def _fill(self, text: str, proposed_term_days: int | None) -> str:
        if TERM_PLACEHOLDER not in text:
            return text
        replacement = (
            str(proposed_term_days) if proposed_term_days is not None else "the proposed term"
        )
        return text.replace(TERM_PLACEHOLDER, replacement)


PLAYBOOK_PLAYS: tuple[PlaybookPlay, ...] = (
    PlaybookPlay(
        key="mandatoryTreasuryPolicy",
        title="Opening Line",
        description=(
            "Our global treasury board has mandated a standard policy of Net "
            f"{TERM_PLACEHOLDER} across all vendor categories starting this quarter. "
            "All active contracts must be updated to maintain company compliance."
        ),
        sections=(SECTION_OPENING_AND_ARGUMENTATION,),
        # The client wrote this as the line to say, so it is the line to say.
        # Client 2026-09-10: company compliance, not ERP system compliance.
        say=(
            "Our global treasury board has mandated a standard policy of Net "
            f"{TERM_PLACEHOLDER} across all vendor categories starting this quarter. "
            "All active contracts must be updated to maintain company compliance."
        ),
    ),
    PlaybookPlay(
        key="parentOrSupplierMax",
        title="Parent/Supplier Maximum Precedent",
        description=(
            "Use when the supplier or parent organization has already accepted longer "
            "payment terms elsewhere within the same client–supplier relationship, "
            "demonstrating that the requested terms are workable."
        ),
        sections=(SECTION_OPENING_AND_ARGUMENTATION,),
        pitch_from_argument="parentOrSupplierMax",
        requires_arguments=("parentOrSupplierMax",),
    ),
    PlaybookPlay(
        key="supplierStandard",
        title="Supplier Standard / Existing Relationship Precedent",
        description=(
            "Use when the supplier already provides similar payment terms elsewhere "
            "within the existing relationship and the current agreement can be aligned "
            "with those accepted terms."
        ),
        sections=(SECTION_OPENING_AND_ARGUMENTATION,),
        pitch_from_argument="supplierStandard",
        requires_arguments=("supplierStandard",),
    ),
    PlaybookPlay(
        key="peerGroupBenchmarking",
        title="Peer Group Standard / Industry Benchmarking",
        description=(
            "If Peer Group Standard Average or 3rd Quartile is higher than Contractual "
            "Terms and can be used to confirm the proposed or target payment terms."
        ),
        sections=(SECTION_OPENING_AND_ARGUMENTATION,),
        # One client play, either source behind it — peer-group and
        # industry/region are the same benchmarking move to them.
        pitch_from_argument="peerGroupStandard",
        requires_arguments=("peerGroupStandard", "industryRegionStandard"),
    ),
    PlaybookPlay(
        key="relationshipValue",
        title="Relationship Value / Strategic Partnership",
        description=(
            "Use the strength of the existing relationship and strategic importance of "
            "the partnership to support alignment on payment terms and continued "
            "collaboration."
        ),
        sections=(SECTION_OPENING_AND_ARGUMENTATION,),
        pitch_from_argument="relationship",
        requires_arguments=("relationship",),
    ),
    PlaybookPlay(
        key="costImpact",
        title="Cost Impact / Working Capital Impact",
        description=(
            "Use when supplier raises concerns about the financial impact of extending "
            "payment terms. Explain the invoice-level impact of the requested change "
            "and address cost concerns."
        ),
        # BOTH sections. It is evidence for the ask (deck p9: Carlos annotated
        # it "Good argument how did you calculate?" while it sat in Key
        # Arguments) AND the prepared response to a cost objection. No client
        # ever asked for it to be routed out of Key Arguments.
        sections=(SECTION_OPENING_AND_ARGUMENTATION, SECTION_OBJECTIONS_AND_CONCESSIONS),
        pitch_from_argument="costImpact",
        requires_arguments=("costImpact",),
    ),
    PlaybookPlay(
        key="pricingThreat",
        title="Pricing Threat / Discount Equivalent",
        description=(
            "Only used if the supplier rejects the payment-term change and requests "
            "commercial compensation. Payment terms remain a commercial lever and any "
            "adjustment requires an equivalent commercial offset."
        ),
        sections=(SECTION_OBJECTIONS_AND_CONCESSIONS,),
        # The client's second sentence is already the answer to give; it is
        # lifted as the line and left in their words.
        say=(
            "Payment terms remain a commercial lever, and any adjustment to them "
            "requires an equivalent commercial offset."
        ),
        caution=(
            "A response to a demand for compensation, never an opening offer. State "
            "that an offset would be required; never name a price, a percentage or a "
            "discount figure the buyer has not approved."
        ),
    ),
    PlaybookPlay(
        key="multiPhaseTransition",
        title="Multi-Phase Transition",
        description=(
            f"If moving to {TERM_PLACEHOLDER} days immediately creates an operational "
            "roadblock, use a phased rollout that allows the supplier to transition "
            "gradually toward the required payment terms."
        ),
        sections=(SECTION_OBJECTIONS_AND_CONCESSIONS,),
        say=(
            f"If moving to Net {TERM_PLACEHOLDER} immediately creates an operational "
            "roadblock, we can phase the rollout so you transition gradually toward "
            f"the required terms, with Net {TERM_PLACEHOLDER} as the end position."
        ),
        caution=(
            "The destination is still the proposed term — a phased rollout changes "
            "when it lands, never what it lands on."
        ),
    ),
    PlaybookPlay(
        key="discountOffering",
        title="Discount Offering",
        description=(
            "Used as a commercial trade-off when payment-term alignment cannot be "
            "achieved immediately and an approved alternative arrangement is required."
        ),
        sections=(SECTION_OBJECTIONS_AND_CONCESSIONS,),
        say=(
            "Where alignment on payment terms cannot be achieved immediately, we can "
            "look at an alternative arrangement of agreed cash-discount in place of "
            "the full move."
        ),
        caution=(
            "Only where a cash-discount arrangement is actually on file for this "
            "supplier. Never invent a discount rate, and never offer one as the first "
            "concession."
        ),
    ),
)


def plays_for_section(
    section: str,
    supporting_keys: frozenset[str] | set[str] | None = None,
) -> list[PlaybookPlay]:
    """The approved plays for one playbook section, in registry order.

    Evidence plays are dropped unless their argument is in ``supporting_keys``:
    the playbook never names a source this supplier has no data for, and never
    lists what could not be argued (see the Key Arguments rules in the guide
    prompt). Pass None to get every play defined for the section, which is what
    a catalogue view wants rather than a drafting surface.
    """
    available = None if supporting_keys is None else frozenset(supporting_keys)
    return [
        play
        for play in PLAYBOOK_PLAYS
        if section in play.sections
        and (
            not play.requires_arguments
            or available is None
            or any(key in available for key in play.requires_arguments)
        )
    ]


def play_by_key(key: str) -> PlaybookPlay | None:
    return next((play for play in PLAYBOOK_PLAYS if play.key == key), None)
