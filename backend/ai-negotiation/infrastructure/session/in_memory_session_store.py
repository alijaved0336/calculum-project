from __future__ import annotations
from typing import Any
from domain.ports.session_port import SessionPort


class InMemorySessionStore(SessionPort):

    def __init__(self) -> None:
        self._sessions: dict[str, dict[str, Any]] = {}
        self._histories: dict[str, list[dict[str, Any]]] = {}

    async def create(self, session_id: str, metadata: dict[str, Any]) -> None:
        self._sessions[session_id] = metadata
        self._histories[session_id] = []

    async def get(self, session_id: str) -> dict[str, Any] | None:
        return self._sessions.get(session_id)

    async def update(self, session_id: str, data: dict[str, Any]) -> None:
        if session_id in self._sessions:
            self._sessions[session_id].update(data)

    async def get_history(self, session_id: str) -> list[dict[str, Any]]:
        return self._histories.get(session_id, [])

    async def append_history(self, session_id: str, message: dict[str, Any]) -> None:
        self._histories.setdefault(session_id, []).append(message)

    async def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)
        self._histories.pop(session_id, None)