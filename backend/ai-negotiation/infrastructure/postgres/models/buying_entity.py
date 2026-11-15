from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, NullableTimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.buying_entity_ultimate_parent import (
        BuyingEntityUltimateParent,
    )
    from infrastructure.postgres.models.spend import Spend


class BuyingEntity(Base, NullableTimestampMixin):
    __tablename__ = "buying_entities"

    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ultimate_parent_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "buying_entity_ultimate_parents.uuid", deferrable=True, initially="deferred"
        ),
        nullable=True,
    )
    tenant_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    spend_file_version_uuid: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True),nullable=True,)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    ada_updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    ultimate_parent: Mapped[BuyingEntityUltimateParent | None] = relationship("BuyingEntityUltimateParent", back_populates="buying_entities")
    spends: Mapped[list[Spend]] = relationship("Spend", back_populates="buying_entity")
