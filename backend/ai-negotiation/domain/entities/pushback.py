"""Supplier pushback categories, as the client's knowledge base defines them.

The client's Negotiation Playbook PDF (uploaded to the knowledge base) lists
supplier pushback categories in a fixed shape: a numbered heading, tags, one or
more supplier pushback arguments (``N.S.k``), and buyer counter-arguments
(``N.B.x``), each with a coaching note and a ready-to-say script ("The
Argument:"). These entities are that shape, parsed from the retrieved chunks by
:mod:`domain.services.pushback_playbook_parser` — never written in code.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CounterArgument:
    """One buyer counter-strategy against a pushback category."""

    name: str
    # Coaching note to the negotiator — not said aloud.
    strategy: str
    # Ready-to-use wording the negotiator can say or send. Empty when the
    # document gives the strategy without a scripted argument.
    script: str


@dataclass(frozen=True)
class PushbackCategory:
    """One pushback category, with the chunks it was parsed from."""

    # Stable slug of the category name ("erosion_of_margins"); the objection
    # scan refers to categories by it.
    key: str
    # The document's own numbering. Display/debug only: a re-upload may renumber.
    number: int
    name: str
    description: str
    tags: tuple[str, ...]
    # Every supplier pushback argument the document lists for this category.
    supplier_args: tuple[str, ...]
    counter_args: tuple[CounterArgument, ...]
    # Provenance, for the source panel and for mapping a retrieved chunk back
    # to the category it belongs to.
    file_id: str = ""
    filename: str | None = None
    chunk_ids: tuple[str, ...] = ()
    page_numbers: tuple[int, ...] = ()
    # The category's cleaned source text, shown as the cited passage.
    text: str = field(default="", repr=False)

    @property
    def supplier_arg(self) -> str:
        """The representative supplier statement — the first one listed."""
        return self.supplier_args[0] if self.supplier_args else ""

    def match_text(self) -> str:
        """What a relayed objection is scored against: the name and the supplier's own words.

        The objection arrives restated in the supplier's voice, so it is
        compared with the supplier arguments. Measured on the live KB
        (2026-09-24, 15 labelled objections): name + supplier arguments put the
        right category in the top two 14 times; adding the description or tags
        dropped it to 13, because the descriptions are written to the buyer and
        dilute the match. The counters are left out too: they answer the
        objection, and scoring against our own answers rewards categories whose
        counters happen to share words with it.
        """
        return "\n".join(p for p in (self.name, *self.supplier_args) if p)
