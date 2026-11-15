from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from infrastructure.postgres.models.base import Base, TimestampMixin
from infrastructure.postgres.models.enums import UserRoleEnum, user_role_enum

if TYPE_CHECKING:
    from infrastructure.postgres.models.tenant import Tenant
    from infrastructure.postgres.models.thread import Thread


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "(role = 'global_platform_admin' AND tenant_uuid IS NULL) "
            "OR (role IN ('admin', 'user') AND tenant_uuid IS NOT NULL)",
            name="ck_users_role_tenant_scope",
        ),
        Index(
            "uq_users_platform_email",
            "email",
            unique=True,
            postgresql_where=text("role = 'global_platform_admin'"),
        ),
        Index(
            "uq_users_tenant_email",
            "tenant_uuid",
            "email",
            unique=True,
            postgresql_where=text("role IN ('admin', 'user')"),
        ),
    )

    uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_uuid: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.uuid", deferrable=True, initially="deferred"),
        nullable=True,
    )
    email: Mapped[str] = mapped_column(String(160), nullable=False)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRoleEnum] = mapped_column(user_role_enum, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    tenant: Mapped["Tenant | None"] = relationship("Tenant", back_populates="users")
    threads: Mapped[list["Thread"]] = relationship("Thread", back_populates="user")
