from abc import ABC, abstractmethod
from typing import Any


class SessionPort(ABC):
    """Contract for storing and retrieving negotiation session state."""

    @abstractmethod
    async def create(self, session_id: str, metadata: dict[str, Any]) -> None:
        """Create a new session with the given ID and initial metadata."""
        ...

    @abstractmethod
    async def get(self, session_id: str) -> dict[str, Any] | None:
        """Return full session data, or None if the session does not exist."""
        ...

    @abstractmethod
    async def update(self, session_id: str, data: dict[str, Any]) -> None:
        """Merge *data* into an existing session (partial update)."""
        ...

    @abstractmethod
    async def get_history(self, session_id: str) -> list[dict[str, Any]]:
        """Return the full ordered message history for a session."""
        ...

    @abstractmethod
    async def append_history(self, session_id: str, message: dict[str, Any]) -> None:
        """Append one turn (``{"role": ..., "content": ...}``) to the session's
        in-process history.

        This is the fallback transcript used when no durable DB thread exists
        for the session (e.g. the session has no ``user_id``, so a thread can't
        be created). It keeps multi-turn features working for the life of the
        process even without DB persistence.
        """
        ...

    @abstractmethod
    async def delete(self, session_id: str) -> None:
        """Remove a session and its history from the store. No-op if not found."""
        ...
