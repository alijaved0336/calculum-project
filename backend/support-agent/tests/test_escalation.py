from application.agent.escalation import EscalationService
from domain.entities.user import User


class _FakeSender:
    enabled = True

    def __init__(self):
        self.sent = []

    async def send(self, to, subject, body):
        self.sent.append({"to": to, "subject": subject, "body": body})

    @property
    def sent_count(self):
        return len(self.sent)


class _FailingSender:
    """SMTP is unreachable — send() always raises (e.g. bad host / outage)."""

    enabled = True

    async def send(self, to, subject, body):
        raise OSError("Name or service not known")


class _DisabledSender:
    """SMTP is not configured — enabled is False, so send() must never be called."""

    enabled = False

    async def send(self, to, subject, body):
        raise AssertionError("send() must not be called when the sender is disabled")


def _svc(sender, max_per_thread=1, support_to="support@calculum.com"):
    return EscalationService(
        sender=sender,
        support_email_to=support_to,
        max_per_thread=max_per_thread,
        window_seconds=3600,
        clock=lambda: 1000.0,
    )


_USER = User(id="u1")


async def test_no_escalation_when_resolved():
    s = _FakeSender()
    out = await _svc(s).maybe_escalate(_USER, "t1", "conv", resolved=True, is_transient_error=False)
    assert out.sent is False and out.blocked_reason == "resolved" and s.sent_count == 0


async def test_no_escalation_on_transient_error():
    s = _FakeSender()
    out = await _svc(s).maybe_escalate(_USER, "t1", "conv", resolved=False, is_transient_error=True)
    assert out.sent is False and out.blocked_reason == "transient_error" and s.sent_count == 0


async def test_escalates_when_unresolved():
    s = _FakeSender()
    out = await _svc(s).maybe_escalate(_USER, "t1", "conv", resolved=False, is_transient_error=False)
    assert out.sent is True
    assert s.sent_count == 1
    assert s.sent[0]["to"] == "support@calculum.com"
    assert "cc" not in s.sent[0]  # no CC is ever sent


async def test_sends_to_all_configured_recipients():
    s = _FakeSender()
    svc = _svc(s, support_to="support@calculum.ai,ahmad.khan@codingcops.com")
    out = await svc.maybe_escalate(_USER, "t1", "conv", resolved=False, is_transient_error=False)
    assert out.sent is True
    to = s.sent[0]["to"]
    assert "support@calculum.ai" in to and "ahmad.khan@codingcops.com" in to


async def test_skips_send_when_smtp_unconfigured():
    s = _DisabledSender()
    out = await _svc(s).maybe_escalate(_USER, "t1", "conv", resolved=False, is_transient_error=False)
    assert out.sent is False and out.blocked_reason == "not_configured"


async def test_skips_send_when_no_recipients():
    s = _FakeSender()
    out = await _svc(s, support_to="").maybe_escalate(
        _USER, "t1", "conv", resolved=False, is_transient_error=False
    )
    assert out.sent is False and out.blocked_reason == "not_configured" and s.sent_count == 0


async def test_rate_limited_second_time():
    s = _FakeSender()
    svc = _svc(s, max_per_thread=1)
    await svc.maybe_escalate(_USER, "t1", "conv A", resolved=False, is_transient_error=False)
    out = await svc.maybe_escalate(_USER, "t1", "conv B", resolved=False, is_transient_error=False)
    assert out.sent is False and out.blocked_reason == "rate_limited" and s.sent_count == 1


async def test_dedupes_identical_transcript():
    s = _FakeSender()
    svc = _svc(s, max_per_thread=5)
    await svc.maybe_escalate(_USER, "t1", "same text", resolved=False, is_transient_error=False)
    out = await svc.maybe_escalate(_USER, "t1", "same text", resolved=False, is_transient_error=False)
    assert out.sent is False and out.blocked_reason == "duplicate" and s.sent_count == 1


async def test_send_failure_is_swallowed_not_raised():
    # A mail-server outage must never crash the answer path — best-effort send.
    out = await _svc(_FailingSender()).maybe_escalate(
        _USER, "t1", "conv", resolved=False, is_transient_error=False
    )
    assert out.sent is False and out.blocked_reason == "send_failed"


async def test_send_failure_does_not_consume_rate_limit():
    # A failed send should not count against the per-thread cap, so a later working
    # send can still go through.
    svc = _svc(_FailingSender(), max_per_thread=1)
    await svc.maybe_escalate(_USER, "t1", "conv", resolved=False, is_transient_error=False)
    # Swap in a working sender on the same service instance and retry.
    svc._sender = _FakeSender()
    out = await svc.maybe_escalate(_USER, "t1", "conv", resolved=False, is_transient_error=False)
    assert out.sent is True


async def test_sanitizes_header_injection():
    # A malicious user id must not inject CR/LF into the Subject header.
    s = _FakeSender()
    bad = User(id="u1\r\nBcc: evil@x.com")
    out = await _svc(s).maybe_escalate(bad, "t1", "conv", resolved=False, is_transient_error=False)
    assert out.sent is True
    assert "\n" not in s.sent[0]["subject"] and "\r" not in s.sent[0]["subject"]
