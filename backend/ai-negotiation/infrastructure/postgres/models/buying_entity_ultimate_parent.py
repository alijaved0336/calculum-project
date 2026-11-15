from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, NullableTimestampMixin

if TYPE_CHECKING:
    from infrastructure.postgres.models.buying_entity import BuyingEntity


class BuyingEntityUltimateParent(Base, NullableTimestampMixin):
    __tablename__ = "buying_entity_ultimate_parents"

    uuid: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    spend_file_version_uuid: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    country: Mapped[str | None] = mapped_column(Text, nullable=True)
    main_industry_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    main_industry_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    company_size: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    ada_updated_at: Mapped[datetime | None] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )

    buying_entities: Mapped[list[BuyingEntity]] = relationship(
        "BuyingEntity", back_populates="ultimate_parent"
    )