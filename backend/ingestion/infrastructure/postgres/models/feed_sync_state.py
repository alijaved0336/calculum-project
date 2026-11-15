from __future__ import annotations

from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.sql import func
from datetime import datetime

from .base import Base, TimestampMixin


class FeedSyncState(Base, TimestampMixin):
    """Per-feed delta-sync watermark. ``updated_after`` is the max supplier
    timestamp seen, replayed as the ``updatedAfter`` API param next sync."""

    __tablename__ = "feed_sync_state"

    feed: Mapped[str] = mapped_column(Text, primary_key=True)
    updated_after: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=False
    )
