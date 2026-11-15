"""The parallel chunk+embed pipeline must produce every chunk exactly once, in
prev/next-linked order, regardless of worker concurrency."""
import asyncio

import pytest

from application.ingest.pipeline import DocumentPipeline
from application.ingest.utils import join_thread
from domain.entities.ingestion import Chunk, ChunkType, Page


class FakeLoader:
    def __init__(self, pages):
        self._pages = pages

    def load(self, _path):
        return self._pages


class FakeChunker:
    """One chunk per page, id = c<page_number> (so order is verifiable)."""

    def chunk_pages(self, pages, file_id):
        return [
            Chunk(id=f"c{p.page_number}", text=p.content, page_numbers=[p.page_number],
                  chunk_type=ChunkType.RECURSIVE, file_id=file_id, metadata={})
            for p in pages
        ]


class FakeEmbedder:
    def count_tokens(self, text):
        return len(text.split())

    def embed_one_sync(self, chunk):
        chunk.embedding = [0.0]
        return chunk

    def embed_batch_sync(self, chunks):
        for c in chunks:
            c.embedding = [0.0]
        return chunks


class FakeVectorStore:
    def __init__(self):
        self.upserted = []

    async def ensure_collection(self, _dims):
        pass

    async def upsert(self, chunks):
        self.upserted.extend(chunks)
        return len(chunks), None


@pytest.mark.asyncio
async def test_parallel_pipeline_completeness_and_links():
    # Each page ~300 tokens > chunk_size(200) => one group per page => 20 sequential chunks.
    pages = [
        Page(page_number=i, content=" ".join(f"w{i}" for _ in range(300)),
             has_table=False, source_file="f", metadata={})
        for i in range(1, 21)
    ]
    vs = FakeVectorStore()
    pipe = DocumentPipeline(
        loader_factory=lambda _p: FakeLoader(pages),
        chunker=FakeChunker(), embedder=FakeEmbedder(), vector_store=vs,
        chunk_size=200, concurrency=4, embed_batching=True,
        embed_batch_max_tokens=2048, upsert_batch_size=8,
    )
    loop = asyncio.get_running_loop()
    state, parse_t, chunk_t, embed_t = pipe.start(loop, "ignored", "file1", None)
    await join_thread(loop, parse_t)
    await join_thread(loop, chunk_t)
    await join_thread(loop, embed_t)
    await pipe.flush_tail(state)

    assert state.errors == []
    ids = {c.id for c in vs.upserted}
    assert ids == {f"c{i}" for i in range(1, 21)}, "every chunk upserted exactly once"
    assert state.chunks_written == 20

    # prev/next chain restores original page order despite concurrent chunking.
    by_id = {c.id: c for c in vs.upserted}
    head = next(c for c in vs.upserted if c.prev_id is None)
    order, node = [], head
    while node is not None:
        order.append(node.id)
        node = by_id.get(node.next_id) if node.next_id else None
    assert order == [f"c{i}" for i in range(1, 21)]
