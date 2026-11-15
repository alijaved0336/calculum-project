from __future__ import annotations

from dataclasses import dataclass

# The single role allowed to see private-document CITATIONS and (on the client) video
# titles in chat. Kept here so every layer gates on the same constant.
GLOBAL_PLATFORM_ADMIN_ROLE = "global_platform_admin"

# Admin-console roles (anything that isn't a plain end user). These may open/download any
# document from the management console, including private ones.
ADMIN_ROLES = ("admin", GLOBAL_PLATFORM_ADMIN_ROLE)


@dataclass
class User:
    """Authenticated principal derived from a calculum-tokenize JWT.

    The JWT carries no email (only ``sub``); ``email`` is filled from the shared
    users table when needed (e.g. for escalation) and may be None.
    """

    id: str
    role: str | None = None
    tenant_id: str | None = None
    email: str | None = None
    name: str | None = None
    scope: str | None = None

    @property
    def is_global_admin(self) -> bool:
        return self.role == GLOBAL_PLATFORM_ADMIN_ROLE

    @property
    def is_admin(self) -> bool:
        """Any admin-console role (tenant admin or global platform admin) — not a plain user."""
        return self.role in ADMIN_ROLES
