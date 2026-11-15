from abc import ABC, abstractmethod

from domain.entities import FeedName, SyncCursor


class CursorStorePort(ABC):
    @abstractmethod
    async def load(self, feed: FeedName) -> SyncCursor:
        """
        Return the persisted cursor for the feed.
        If no cursor exists, returns SyncCursor(feed, updated_after=None)
        which triggers an initial full load.
        """

    @abstractmethod
    async def save(self, cursor: SyncCursor) -> None:
        """Persist the cursor after a successful feed exhaustion."""

    @abstractmethod
    async def load_all(self) -> dict[FeedName, SyncCursor]:
        """Return cursors for all feeds."""
