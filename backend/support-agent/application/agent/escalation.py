from __future__ import annotations

import hashlib
import logging
import time
from typing import Awaitable, Callable

from domain.entities.escalation import EscalationOutcome
from domain.entities.user import User

logger = logging.getLogger(__name__)


def _sanitize_header(value: str) -> str:
    """Strip CR/LF to prevent email header injection."""
    return value.replace("\r", " ").replace("\n", " ").strip()


class EscalationService:
    """Automatic, guardrailed email escalation.

    Guardrail order (first match wins): resolved → transient-error → not-configured
    → per-thread rate-limit → duplicate-transcript → send. Escalations go only to the
    configured support recipients (``SUPPORT_EMAIL_TO``, comma-separated). No CC.
    """

    def __init__(
        self,
        sender,
        support_email_to: str,
        max_per_thread: int,
        window_seconds: int,
        clock: Callable[[], float] | None = None,
        user_lookup: Callable[[str], Awaitable[dict | None]] | None = None,
    ) -> None:
        self._sender = sender
        self._user_lookup = user_lookup
        self._recipients = [
            _sanitize_header(a.strip()) for a in support_email_to.split(",") if a.strip()
        ]
        self._max_per_thread = max_per_thread
        self._window = window_seconds
        self._clock = clock or time.time
        self._state: dict[str, list[tuple[float, str]]] = {}

    def _recent(self, thread_id: str, now: float) -> list[tuple[float, str]]:
        records = [r for r in self._state.get(thread_id, []) if now - r[0] <= self._window]
        self._state[thread_id] = records
        return records

    async def maybe_escalate(
        self, user: User, thread_id: str, transcript: str, resolved: bool, is_transient_error: bool
    ) -> EscalationOutcome:
        if resolved:
            return EscalationOutcome(False, "resolved")
        if is_transient_error:
            return EscalationOutcome(False, "transient_error")
        if not self._recipients or not getattr(self._sender, "enabled", True):
            logger.info("escalation.not_configured thread=%s", thread_id)
            return EscalationOutcome(False, "not_configured")

        now = self._clock()
        records = self._recent(thread_id, now)
        if len(records) >= self._max_per_thread:
            logger.info("escalation.rate_limited thread=%s", thread_id)
            return EscalationOutcome(False, "rate_limited")

        transcript_hash = hashlib.sha256(transcript.encode("utf-8")).hexdigest()
        if any(h == transcript_hash for _ts, h in records):
            return EscalationOutcome(False, "duplicate")

        if (not user.name or not user.email) and self._user_lookup is not None:
            try:
                contact = await self._user_lookup(user.id)
            except Exception:
                logger.exception("escalation.user_lookup_failed user=%s", user.id)
                contact = None
            if contact:
                user.name = user.name or contact.get("name")
                user.email = user.email or contact.get("email")

        name = _sanitize_header(user.name or "") or "Unknown name"
        email = _sanitize_header(user.email or "") or "no email on file"
        subject = _sanitize_header(f"Support escalation from {name} ({email})")
        body = (
            f"User: {name} <{email}>\n"
            f"User ID: {user.id}\n\n"
            f"Unresolved conversation:\n{transcript}"
        )

        # Best-effort: a mail-server outage (SMTP unreachable, auth failure, etc.) must
        # never bubble up and turn the user's answer into a 500. Log and carry on; the
        # user still receives the "couldn't answer" response. Don't record the attempt,
        # so a later working send isn't blocked by the rate limit / dedupe.
        logger.info(
            "escalation.sending thread=%s to=%s\nSubject: %s\n\n%s",
            thread_id,
            ", ".join(self._recipients),
            subject,
            body,
        )
        try:
            await self._sender.send(to=", ".join(self._recipients), subject=subject, body=body)
        except Exception:
            logger.exception("escalation.send_failed thread=%s user=%s", thread_id, user.id)
            return EscalationOutcome(False, "send_failed")

        records.append((now, transcript_hash))
        logger.info("escalation.sent thread=%s user=%s", thread_id, user.id)
        return EscalationOutcome(True, None)
