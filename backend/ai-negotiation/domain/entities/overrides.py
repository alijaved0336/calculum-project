from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class NegotiationOverrides:
    """Negotiator-set overrides for the target and BATNA terms.

    By default both the target term and the BATNA floor are
    *calculated* by the system (see
    :func:`domain.services.supplier_facts.extract_supplier_facts` and
    :func:`domain.entities.facts.resolve_effective_batna`). A negotiator can
    override either of them in chat ("let's target 85 days", "set our BATNA
    to 50"); the override then applies to every intent for the rest of the
    session until they change it again or reset to the calculated defaults.

    ``None`` on a field means "no override — use the calculated value". The two
    are independent: overriding the target does NOT recalculate the BATNA
    (product decision) — the BATNA only changes when it is overridden itself.
    """

    target_term_days: int | None = None
    batna_term_days: int | None = None

    @property
    def has_any(self) -> bool:
        return self.target_term_days is not None or self.batna_term_days is not None
