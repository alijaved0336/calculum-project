from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import ForeignKey
from infrastructure.postgres.models.base import Base, TimestampMixin
from infrastructure.postgres.models.enums import UserRoleEnum, user_role_enum


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        "uuid", UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        "tenant_uuid", UUID(as_uuid=True), ForeignKey("tenants.uuid"), nullable=True
    )
    email: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    hashed_password: Mapped[str | None] = mapped_column(
        "password_hash", String(255), nullable=True
    )
    role: Mapped[UserRoleEnum] = mapped_column(user_role_enum, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    tenant: Mapped[Tenant | None] = relationship("Tenant", back_populates="users")
