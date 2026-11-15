from __future__ import annotations

import uuid
from datetime import datetime

from typing import Any

from sqlalchemy import String
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class AdabotIngestionLog(Base, TimestampMixin):
    """One lifecycle record for a scheduler-triggered Adabot ingestion."""

    __tablename__ = "adabot_ingestion_logs"

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    started_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    logs: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
