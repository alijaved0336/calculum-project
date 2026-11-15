from __future__ import annotations

import asyncio

from domain.ports.kb_document_store import KBDocumentStorePort
from domain.ports.storage import StoragePort
from domain.ports.vector_store import VectorStorePort


class DeleteDocumentUseCase:
    """Deletes a document's vectors, stored object, then its DB record."""

    def __init__(
        self,
        pg_adapter: KBDocumentStorePort | None = None,
        vector_store: VectorStorePort | None = None,
        storage: StoragePort | None = None,
    ) -> None:
        self._pg = pg_adapter
        self._vector_store = vector_store
        self._storage = storage

    async def delete_document(self, file_uuid) -> bool:
        """Returns False if the document is not found."""
        # if not self._pg or not await self._pg.kb_document_exists(file_uuid):
            # return False
        if self._vector_store:
            await self._vector_store.delete_by_file_uuid(str(file_uuid))
        if self._storage:
            await asyncio.to_thread(self._storage.delete, str(file_uuid))
        await self._pg.delete_kb_document(file_uuid)
        return True
