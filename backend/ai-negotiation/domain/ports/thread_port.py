from abc import ABC, abstractmethod
from typing import Any


class ThreadPort(ABC):

    @abstractmethod
    async def create_thread(
        self,
        supplier_id: str,
        user_id: str,
        title: str,
        tone: str | None = None,
    ) -> Any: ...

    @abstractmethod
    async def get_threads_by_supplier(
        self, supplier_id: str, limit: int = 50
    ) -> list[Any]: ...

    @abstractmethod
    async def get_messages(self, thread_id: str, limit: int = 200) -> list[Any]: ...

    @abstractmethod
    async def get_recent_messages(self, thread_id: str, limit: int = 10) -> list[Any]:
        """Return the most recent ``limit`` messages, oldest first."""
        ...

    @abstractmethod
    async def get_latest_summary(self, thread_id: str) -> Any | None: ...

    @abstractmethod
    async def get_thread(self, thread_id: str) -> Any | None: ...

    @abstractmethod
    async def save_message(
        self,
        thread_id: str,
        role: str,
        content: str,
        tokens_in: int | None = None,
        tokens_out: int | None = None,
        source: dict | None = None,
        rag_sources: list[dict] | None = None,
    ) -> Any: ...

    @abstractmethod
    async def insert_thread_summary(
        self,
        thread_id: str,
        content: str,
        token_count: int | None = None,
        thread_name: str | None = None,
    ) -> Any: ...

    @abstractmethod
    async def set_thread_pinned(self, thread_id: str, pinned: bool) -> Any | None: ...

    @abstractmethod
    async def update_thread(
        self,
        thread_id: str,
        title: str | None = None,
        pinned: bool | None = None,
        reaction: bool | None = None,
    ) -> Any: ...

    @abstractmethod
    async def delete_thread(self, thread_id: str) -> None: ...

    @abstractmethod
    async def edit_message(
        self,
        thread_id: str,
        message_id: str,
        updated_content: str,
    ) -> list[Any]: ...
