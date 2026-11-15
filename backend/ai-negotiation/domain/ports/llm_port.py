from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMPort(ABC):
    """Contract for any large-language-model backend."""

    @abstractmethod
    async def complete(self, prompt: str, *, stream_to_client: bool = False, **kwargs) -> str:
        """Send a prompt and return the full text completion."""
        ...

    @abstractmethod
    async def stream(self, prompt: str, **kwargs) -> AsyncIterator[str]:
        """Stream completion tokens one by one."""
        ...
