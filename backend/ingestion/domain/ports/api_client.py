from abc import ABC, abstractmethod
from typing import AsyncIterator

from domain.entities import FeedName


class ApiClientPort(ABC):
    @abstractmethod
    def stream_feed(
        self,
        feed: FeedName,
        updated_after: str | None = None,
    ) -> AsyncIterator[dict]:
        """
        Async-iterate over every raw item dict in a feed, handling
        cursor-based pagination transparently.
        """

