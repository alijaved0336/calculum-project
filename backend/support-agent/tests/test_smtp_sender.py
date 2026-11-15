from infrastructure.email.smtp_sender import SmtpSender


class _Capture:
    """Captures the aiosmtplib.send call (message + kwargs) without touching the network."""

    def __init__(self):
        self.calls = []

    async def __call__(self, message, **kwargs):
        self.calls.append({"message": message, "kwargs": kwargs})


def _sender(cap, host="email-smtp.eu-west-1.amazonaws.com", port=587,
            user="SMTPUSER", password="secret", from_addr="ada@calculum.ai"):
    return SmtpSender(host=host, port=port, user=user, password=password,
                      from_addr=from_addr, send_func=cap)


async def test_send_builds_message_with_from_to_subject_body():
    cap = _Capture()
    await _sender(cap).send(to="a@x.com, b@y.com", subject="Hi", body="Body text")
    msg = cap.calls[0]["message"]
    assert msg["From"] == "ada@calculum.ai"
    assert msg["To"] == "a@x.com, b@y.com"
    assert msg["Subject"] == "Hi"
    assert msg["Cc"] is None  # no Cc header is ever set
    assert msg.get_content().strip() == "Body text"


async def test_send_uses_starttls_on_port_587():
    cap = _Capture()
    await _sender(cap, port=587).send(to="a@x.com", subject="s", body="b")
    kwargs = cap.calls[0]["kwargs"]
    assert kwargs["start_tls"] is True
    assert kwargs["hostname"] == "email-smtp.eu-west-1.amazonaws.com"
    assert kwargs["port"] == 587


async def test_send_no_starttls_on_non_587_port():
    cap = _Capture()
    await _sender(cap, port=25).send(to="a@x.com", subject="s", body="b")
    assert cap.calls[0]["kwargs"]["start_tls"] is False


async def test_send_passes_none_credentials_when_blank():
    cap = _Capture()
    await _sender(cap, user="", password="").send(to="a@x.com", subject="s", body="b")
    kwargs = cap.calls[0]["kwargs"]
    assert kwargs["username"] is None
    assert kwargs["password"] is None


def test_enabled_false_when_host_or_from_blank():
    assert SmtpSender("", 587, "u", "p", "ada@calculum.ai").enabled is False
    assert SmtpSender("h", 587, "u", "p", "").enabled is False


def test_enabled_true_when_configured():
    assert SmtpSender("h", 587, "u", "p", "ada@calculum.ai").enabled is True
