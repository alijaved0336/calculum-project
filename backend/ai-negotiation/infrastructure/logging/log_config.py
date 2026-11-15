from __future__ import annotations

import glob
import logging
import logging.handlers
import os
from datetime import datetime, timezone


_FORMATTER = logging.Formatter(
    fmt="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

_configured = False


class _DailyFileHandler(logging.handlers.TimedRotatingFileHandler):
    """Writes to <log_dir>/YYYY-MM-DD.log; rolls to the next date at midnight UTC.

    Unlike the default TimedRotatingFileHandler (which keeps the base name as
    the active file and renames on rollover), this handler names the active file
    after today's UTC date from the moment the process starts.  On rollover it
    opens a fresh file named for the incoming date rather than renaming the old one.
    Old files beyond backup_count are pruned by date-sorted name.
    """

    def __init__(self, log_dir: str, backup_count: int = 30) -> None:
        self._log_dir = log_dir
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        super().__init__(
            filename=os.path.join(log_dir, f"{today}.log"),
            when="midnight",
            backupCount=backup_count,
            utc=True,
            encoding="utf-8",
        )

    def doRollover(self) -> None:
        if self.stream:
            self.stream.close()
            self.stream = None

        # self.rolloverAt is the upcoming midnight timestamp; name the new file for that date.
        new_date = datetime.fromtimestamp(self.rolloverAt, tz=timezone.utc).strftime("%Y-%m-%d")
        self.baseFilename = os.path.abspath(os.path.join(self._log_dir, f"{new_date}.log"))
        self.stream = self._open()
        self.rolloverAt = self.computeRollover(self.rolloverAt)

        if self.backupCount > 0:
            pattern = os.path.join(
                self._log_dir,
                "[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9].log",
            )
            dated_logs = sorted(glob.glob(pattern))
            for old_file in dated_logs[: -self.backupCount]:
                try:
                    os.remove(old_file)
                except OSError:
                    pass


def setup_logging(log_level: str = "INFO", log_dir: str = "logs") -> None:
    """Configure the root logger once for the entire application lifetime.

    - Console: always active (level = ``log_level``).
    - File: ``<log_dir>/YYYY-MM-DD.log`` — one file per UTC calendar day,
      named for that day from the moment the process starts.  Rolls over at
      midnight UTC; keeps the last 30 days.

    Call this exactly once at application startup (e.g. in ``api/main.py``
    lifespan).  Every ``logging.getLogger(__name__)`` in the codebase
    inherits this configuration automatically.
    """
    global _configured
    if _configured:
        return
    _configured = True

    os.makedirs(log_dir, exist_ok=True)

    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    root = logging.getLogger()
    root.setLevel(numeric_level)

    # ── Console handler ────────────────────────────────────────────────────
    # Warnings and errors only — the per-turn intent line is the one thing
    # printed on a healthy turn. The file below still records everything.
    console = logging.StreamHandler()
    console.setLevel(logging.WARNING)
    console.setFormatter(_FORMATTER)
    root.addHandler(console)

    # ── Date-named file handler ────────────────────────────────────────────
    file_handler = _DailyFileHandler(log_dir=log_dir, backup_count=30)
    file_handler.setFormatter(_FORMATTER)
    root.addHandler(file_handler)

    # Quiet down noisy third-party loggers regardless of our own level.
    for noisy in ("httpx", "httpcore", "uvicorn.access", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
