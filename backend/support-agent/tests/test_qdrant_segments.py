"""Adapter tests for the segment-manager primitives: scroll_by_file, delete_by_ids, count_by_file."""
from types import SimpleNamespace

from config import settings
from infrastructure.vector_store.qdrant_adapter import QdrantAdapter


class _FakeEmbedder:
    async def embed_query(self, text):
        return [0.0] * settings.embed_dims


def _point(pid, vid, start_ms, text="hi"):
    return SimpleNamespace(
        id=pid,
        payload={
            "text": text,
            "file_uuid": vid,
            "metadata": {
                "file_id": vid,
                "video_id": vid,
                "start_ms": start_ms,
                "end_ms": (start_ms or 0) + 1000,
                "chunk_type": "transcript",
                "page_numbers": [1],
            },
        },
    )


class _FakeClient:
    def __init__(self, pages=None, count=0):
        self._pages = pages or []       # list of (points, next_offset)
        self._count = count
        self.deleted = None
        self.scroll_calls = []
        self.count_filter = None

    async def scroll(self, collection_name, scroll_filter, limit, offset, with_payload, with_vectors):
        self.scroll_calls.append(offset)
        # Serve pages in order regardless of the offset token we hand back.
        idx = len(self.scroll_calls) - 1
        return self._pages[idx]

    async def delete(self, collection_name, points_selector, wait):
        self.deleted = {"selector": points_selector, "wait": wait}

    async def count(self, collection_name, count_filter, exact):
        self.count_filter = count_filter
        return SimpleNamespace(count=self._count)


def _adapter(client):
    return QdrantAdapter(embedder=_FakeEmbedder(), client=client)


async def test_scroll_by_file_paginates_until_exhausted():
    vid = "vid-1"
    pages = [
        ([_point("a", vid, 2000), _point("b", vid, 0)], "next-token"),
        ([_point("c", vid, 1000)], None),   # last page → stop
    ]
    client = _FakeClient(pages=pages)
    results = await _adapter(client).scroll_by_file(vid)

    assert [r.id for r in results] == ["a", "b", "c"]   # order preserved (route sorts later)
    assert client.scroll_calls == [None, "next-token"]   # second call used the returned offset
    assert results[0].start_ms == 2000 and results[0].metadata["page_numbers"] == [1]


async def test_delete_by_ids_builds_point_selector():
    client = _FakeClient()
    n = await _adapter(client).delete_by_ids(["p1", "p2"])
    assert n == 2
    assert client.deleted["wait"] is True
    assert list(client.deleted["selector"].points) == ["p1", "p2"]


async def test_delete_by_ids_empty_is_noop():
    client = _FakeClient()
    n = await _adapter(client).delete_by_ids([])
    assert n == 0
    assert client.deleted is None    # client never called


async def test_count_by_file_matches_both_id_fields():
    client = _FakeClient(count=7)
    n = await _adapter(client).count_by_file("vid-9")
    assert n == 7
    keys = {c.key: c.match.value for c in client.count_filter.should}
    assert keys == {"file_uuid": "vid-9", "metadata.file_id": "vid-9"}
