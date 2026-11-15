from __future__ import annotations

import re

from domain.entities.facts import SupplierFacts

_REDACTED = "[internal — withheld]"

# Paired markers the MIXED-SURFACE advice prompts (pushback, opening_strategy,
# reframe_with_scf) wrap around the ONLY span meant to be said or sent to the
# supplier. They let the guard scope its redaction to that span, so the
# negotiator-facing analysis around it — which legitimately names internal
# figures like the supplier's WACC, financing rate, spend, or the BATNA
# floor — is left intact instead of being blanked to "[internal — withheld]".
#
# A fully supplier-facing output (the opening email) emits NO markers, so the
# guard falls back to redacting the whole text. That fallback is also the
# fail-closed default for a mixed surface whose markers are missing or
# malformed: when in doubt, redact everything rather than risk a leak.
SUPPLIER_FACING_OPEN = "[[SUPPLIER_FACING]]"
SUPPLIER_FACING_CLOSE = "[[/SUPPLIER_FACING]]"

_ANY_MARKER = re.compile(
    "|".join(re.escape(m) for m in (SUPPLIER_FACING_OPEN, SUPPLIER_FACING_CLOSE))
)

# Numeric facts the negotiator is allowed to state outright. If an
# internal-only figure happens to share a value with one of these (e.g. the
# fallback term coincides with the target term), we can't tell a legitimate
# mention from a leak by literal value alone — so we skip redacting that
# value rather than risk corrupting a sentence that's actually fine to keep.
_SHAREABLE_TERM_FIELDS = (
    "target_term_days",
    "current_term_days",
    "benchmark_term_days",
    "regulatory_max_term_days",
)


def strip_supplier_facing_markers(text: str) -> str:
    """Remove the supplier-facing markers, leaving their contents in place.

    Used on the live token stream so the raw ``[[SUPPLIER_FACING]]`` markers
    never flash to the negotiator mid-generation; the guard drops them from the
    final (stored) text separately, as part of :func:`enforce_asymmetry_guard`.
    """
    return _ANY_MARKER.sub("", text)


def enforce_asymmetry_guard(text: str, facts: SupplierFacts) -> tuple[str, list[str]]:
    """Strip any internal-only figures that leaked into a drafted guide/message.

    `facts.internal_only_fields` names exactly which extracted values (fallback
    position, financing economics, spend, success probability, ...) must never
    reach the supplier. This is the deterministic backstop: prompt instructions
    alone aren't reliable enough to stop an LLM from restating a number it was
    told to withhold, so every literal value (and common numeric renderings of
    it — raw, percentage, formatted) is matched and redacted here regardless of
    what the prompt asked for.

    Scope: when the draft delimits its sayable, supplier-facing span with a
    single well-formed ``[[SUPPLIER_FACING]]`` / ``[[/SUPPLIER_FACING]]`` pair,
    redaction is confined to THAT span — the surrounding negotiator-facing
    analysis keeps its internal figures. With no such pair (a fully
    supplier-facing output like the opening email, or a mixed surface whose
    markers the model failed to emit) the guard fails closed and redacts the
    whole text. Either way the markers themselves are removed from the result.

    Returns the guarded text plus the list of fields that had to be redacted
    (empty if nothing leaked) so callers can log/alert on near-misses.
    """
    region = _sole_marker_region(text)

    if region is None:
        # Fail closed: no usable markers, so redact everything, then drop any
        # stray marker token that leaked without a well-formed pair.
        guarded, flagged = _redact_internal_fields(text, facts)
        return strip_supplier_facing_markers(guarded), flagged

    open_start, close_end, inner = region
    guarded_inner, flagged = _redact_internal_fields(inner, facts)
    # Reassemble without the markers: prefix + redacted sayable span + suffix.
    guarded = text[:open_start] + guarded_inner + text[close_end:]
    return guarded, flagged


def _sole_marker_region(text: str) -> tuple[int, int, str] | None:
    """Locate the single supplier-facing span, or None if it isn't well-formed.

    Well-formed means exactly one open marker and one close marker, with the
    open strictly before the close. Zero markers, a lone marker, a reversed
    pair, or multiple pairs all return None so the caller fails closed
    (whole-text redaction) rather than guess which span is sayable.

    Returns ``(open_start, close_end, inner)`` — the index where the open
    marker begins, the index just past the close marker, and the text between
    the two markers (markers excluded).
    """
    opens = [m.start() for m in re.finditer(re.escape(SUPPLIER_FACING_OPEN), text)]
    closes = [m.start() for m in re.finditer(re.escape(SUPPLIER_FACING_CLOSE), text)]
    if len(opens) != 1 or len(closes) != 1:
        return None

    open_start = opens[0]
    open_end = open_start + len(SUPPLIER_FACING_OPEN)
    close_start = closes[0]
    close_end = close_start + len(SUPPLIER_FACING_CLOSE)
    if open_end > close_start:  # reversed or overlapping
        return None

    return open_start, close_end, text[open_end:close_start]


def _redact_internal_fields(text: str, facts: SupplierFacts) -> tuple[str, list[str]]:
    """Redact every internal-only field value found in ``text``.

    The core matcher shared by both the scoped and fail-closed paths of
    :func:`enforce_asymmetry_guard`.
    """
    guarded = text
    flagged: list[str] = []

    shareable_values = {
        getattr(facts, name)
        for name in _SHAREABLE_TERM_FIELDS
        if getattr(facts, name, None) is not None
    }

    for field_name in facts.internal_only_fields:
        value = getattr(facts, field_name, None)
        if value in (None, "", False):
            continue
        if value in shareable_values:
            continue

        redacted_here = False
        for needle in _value_variants(value):
            # Lookarounds (rather than \b) so e.g. redacting "60" never
            # clobbers part of "160" or "608" — and a short token like "6"
            # never matches inside "60" in the first place (filtered below).
            pattern = re.compile(rf"(?<!\d){re.escape(needle)}(?!\d)")
            new_text, count = pattern.subn(_REDACTED, guarded)
            if count:
                guarded = new_text
                redacted_here = True

        if redacted_here:
            flagged.append(field_name)

    return guarded, flagged


def _value_variants(value: object) -> list[str]:
    """Numeric renderings of a value that are specific enough to redact
    safely. Short, generic tokens (a bare "6" or "9") are dropped — matching
    them would clobber unrelated numbers elsewhere in the drafted text."""
    if isinstance(value, bool):
        return []
    if isinstance(value, float):
        candidates = {
            f"{value:.4f}", f"{value:.2f}",
            f"{value:,.2f}", f"{value:,.0f}",
            f"{value:.1%}", f"{value:.2%}",
            f"{value * 100:.1f}", f"{value * 100:.2f}",
        }
    else:
        candidates = {str(value)}

    # Longest first: a shorter rendering (e.g. "6.10") can be a literal prefix
    # of a longer one ("6.10%") — matching it first would redact the prefix
    # and leave a dangling "%" behind.
    return sorted((c for c in candidates if _is_specific(c)), key=len, reverse=True)


def _is_specific(token: str) -> bool:
    return sum(ch.isdigit() for ch in token) >= 2
