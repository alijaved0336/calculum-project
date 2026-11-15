from __future__ import annotations

from email.message import EmailMessage


class SmtpSender:
    """Send escalation emails over SMTP (aiosmtplib, imported lazily).

    ``send_func`` is an injection seam for tests; production leaves it ``None``
    and the real ``aiosmtplib.send`` is resolved lazily on first use.
    """

    def __init__(self, host: str, port: int, user: str, password: str, from_addr: str,
                 send_func=None) -> None:
        self._host = host
        self._port = port
        self._user = user
        self._password = password
        self._from = from_addr
        self._send_func = send_func

    @property
    def enabled(self) -> bool:
        """True when enough SMTP config is present to attempt a send."""
        return bool(self._host and self._from)

    async def send(self, to: str, subject: str, body: str) -> None:
        send_func = self._send_func
        if send_func is None:
            import aiosmtplib

            send_func = aiosmtplib.send

        msg = EmailMessage()
        msg["From"] = self._from
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        await send_func(
            msg,
            hostname=self._host,
            port=self._port,
            username=self._user or None,
            password=self._password or None,
            start_tls=self._port == 587,
        )
