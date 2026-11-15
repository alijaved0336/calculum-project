"""Shared pytest fixtures for unit, integration, and e2e evaluation tests."""
from __future__ import annotations

import math
import pytest

from domain.entities.ingestion import Chunk, ChunkType, Page

# ── Corpus ────────────────────────────────────────────────────────────────────

_TEXTS = [
    "The procurement process involves several key steps. First, identify the requirement and source suppliers.",
    "Supplier evaluation criteria include quality, price, and delivery time. These factors determine the final vendor score.",
    "Contract negotiation typically involves multiple rounds of discussion. Both parties must agree on pricing terms.",
    "Invoice processing must follow established approval workflows. All invoices require sign-off from two approvers.",
    "Spend analysis provides visibility into organisational spending patterns. Monthly reports are generated automatically.",
]


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def sample_pages() -> list[Page]:
    return [
        Page(
            page_number=i + 1,
            content=text,
            has_table=False,
            source_file="test.pdf",
            metadata={"source": "test"},
        )
        for i, text in enumerate(_TEXTS)
    ]


@pytest.fixture
def sample_chunks() -> list[Chunk]:
    dims = 2560
    chunks: list[Chunk] = []
    for i, text in enumerate(_TEXTS):
        # Build a deterministic, normalised embedding
        raw = [math.sin(i * 0.3 + j * 0.007) for j in range(dims)]
        norm = math.sqrt(sum(x * x for x in raw))
        embedding = [x / norm for x in raw]
        chunks.append(
            Chunk(
                id=f"test-chunk-{i:04d}",
                text=text,
                page_numbers=[i + 1],
                chunk_type=ChunkType.RECURSIVE,
                file_id="test-file-uuid",
                metadata={"chunk_type": "recursive", "page_numbers": [i + 1]},
                embedding=embedding,
                prev_id=f"test-chunk-{i - 1:04d}" if i > 0 else None,
                next_id=f"test-chunk-{i + 1:04d}" if i < len(_TEXTS) - 1 else None,
            )
        )
    return chunks


@pytest.fixture
def count_tokens_fn():
    """Lightweight word-count tokeniser used in unit tests (no Qwen dependency)."""
    def _count(text: str) -> int:
        return len(text.split())
    return _count


# ── Async DI isolation ────────────────────────────────────────────────────────
# The app lifespan (run by every TestClient) uses the lru_cached async Qdrant client
# and the pipelines/use-cases that hold it. Those bind to the first test's event loop;
# a later TestClient reuses them after that loop closed → "Event loop is closed".
# Reset the loop-bound singletons between tests (keep the embedder/chunker cached so we
# don't reload the Qwen tokenizer every test).
import pytest as _pytest


@_pytest.fixture(autouse=True)
def _reset_async_di_singletons():
    import dependencies as deps

    _keep = {"get_embedder", "get_chunker"}

    def _clear():
        for _name in dir(deps):
            if _name in _keep:
                continue
            _fn = getattr(deps, _name)
            if hasattr(_fn, "cache_clear"):
                _fn.cache_clear()
        deps._pg_adapter = None

    _clear()
    yield
    _clear()
