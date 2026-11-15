from __future__ import annotations

import logging
import threading

from domain.entities.overrides import NegotiationOverrides

logger = logging.getLogger(__name__)


# ============================================================================
# TODO(db): TEMPORARY IN-CODE STORE — MOVE TO THE DATABASE.
# ----------------------------------------------------------------------------
# This holds negotiator-set target/BATNA overrides in a process-local dict,
# keyed by session_id. It is deliberately a thin, self-contained module so the
# migration to a persistent (DB-backed) store is a drop-in: keep this same
# get/set/clear surface, swap the dict for a repository/table keyed by
# session_id (and eventually thread/user). Search this file for "TODO(db)".
#
# Consequences of the in-code version, acceptable ONLY until the DB move:
#   * overrides are lost on process restart;
#   * they are NOT shared across multiple app workers/replicas;
#   * they live for the process lifetime unless clear()/clear_session() runs.
# Scope today is SESSION-ONLY (see the session_id key) per product decision.
# ============================================================================

_overrides: dict[str, NegotiationOverrides] = {}
_lock = threading.Lock()


def get_overrides(session_id: str) -> NegotiationOverrides:
    """Current overrides for a session — empty (both None) when none are set."""
    with _lock:
        result = _overrides.get(session_id, NegotiationOverrides())
    return result


def set_target(session_id: str, target_term_days: int) -> NegotiationOverrides:
    """Override the target term for this session, keeping any BATNA override."""
    with _lock:
        current = _overrides.get(session_id, NegotiationOverrides())
        updated = NegotiationOverrides(
            target_term_days=int(target_term_days),
            batna_term_days=current.batna_term_days,
        )
        _overrides[session_id] = updated
    logger.info("override_store: session=%s target set to %s", session_id, target_term_days)
    return updated


def set_batna(session_id: str, batna_term_days: int) -> NegotiationOverrides:
    """Override the BATNA term for this session, keeping any target override."""
    with _lock:
        current = _overrides.get(session_id, NegotiationOverrides())
        updated = NegotiationOverrides(
            target_term_days=current.target_term_days,
            batna_term_days=int(batna_term_days),
        )
        _overrides[session_id] = updated
    logger.info("override_store: session=%s BATNA set to %s", session_id, batna_term_days)
    return updated


def clear(session_id: str, *, target: bool = True, batna: bool = True) -> NegotiationOverrides:
    """Drop overrides so the calculated defaults are used again.

    ``target``/``batna`` select which to reset — both by default (a full
    "switch back to the defaults"). Clearing a field that wasn't set is a no-op.
    """
    with _lock:
        current = _overrides.get(session_id, NegotiationOverrides())
        updated = NegotiationOverrides(
            target_term_days=None if target else current.target_term_days,
            batna_term_days=None if batna else current.batna_term_days,
        )
        if updated.has_any:
            _overrides[session_id] = updated
        else:
            _overrides.pop(session_id, None)
    logger.info(
        "override_store: session=%s cleared (target=%s, batna=%s)",
        session_id, target, batna,
    )
    return updated


def clear_session(session_id: str) -> None:
    """Remove all overrides for a session — call when the session is deleted."""
    with _lock:
        _overrides.pop(session_id, None)
