"""The app's own step logs must actually reach stdout.

Uvicorn configures only its ``uvicorn*`` loggers and leaves root bare, so before
``_configure_logging`` every ``logger.info`` in the agent / WS route was dropped by logging's
last-resort fallback (WARNING+) — locally and on Cloud Run alike, leaving a stalled or failed
turn with no trace to diagnose it with.
"""
from __future__ import annotations

import logging

from api.main import _configure_logging


def _support_handlers(root: logging.Logger) -> list[logging.Handler]:
    return [h for h in root.handlers if getattr(h, "_support_agent_handler", False)]


def test_application_info_logs_are_enabled():
    _configure_logging()
    root = logging.getLogger()
    assert _support_handlers(root), "root logger has no handler — INFO logs would be dropped"
    for name in ("application.agent.support_agent", "api.routes.support"):
        assert logging.getLogger(name).isEnabledFor(logging.INFO)


def test_configure_logging_is_idempotent():
    # Runs at import time and again under --reload; must not stack duplicate handlers.
    _configure_logging()
    _configure_logging()
    assert len(_support_handlers(logging.getLogger())) == 1


def test_noisy_third_party_loggers_stay_quiet():
    # One httpx line per embedding / LLM / Qdrant call would bury the turn trace.
    _configure_logging()
    for name in ("httpx", "httpcore", "urllib3", "sentence_transformers", "transformers"):
        assert not logging.getLogger(name).isEnabledFor(logging.INFO)
        assert logging.getLogger(name).isEnabledFor(logging.WARNING)
