"""
Standalone RAG pipeline test harness.

Queries the existing Qdrant collection and shows detailed output at every stage
(dense retrieval → context expansion → deduplication → reranking).

Usage
-----
  python scripts/test_rag_pipeline.py "What is the annual leave policy?"

  # Use a different collection
  python scripts/test_rag_pipeline.py "query text" --collection other_collection
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings
from domain.entities.retrieval_result import RetrievalResult
from infrastructure.embedding.http_embedding_adapter import HttpEmbeddingAdapter
from infrastructure.llm.llm_client import LLMClient
from infrastructure.reranker.cross_encoder_adapter import CrossEncoderAdapter
from infrastructure.vector_store.qdrant_adapter import _to_result
from qdrant_client import AsyncQdrantClient

# Read from settings so this harness cannot drift away from what production
# runs — the previous hardcoded values (a test collection that is not the live
# one, and a 0.5 threshold documented as "production uses 0.50" when production
# used 0.30) made every run measure something other than the real pipeline.
DEFAULT_COLLECTION = settings.collection_knowledge_base
TOP_K_RETRIEVE = settings.rag_top_k_retrieve
SCORE_THRESHOLD = settings.rag_dense_score_floor
TOP_N_RERANK = settings.rag_top_n_rerank

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("test_rag")


def _make_qdrant_client() -> AsyncQdrantClient:
    if settings.qdrant_host.startswith(("http://", "https://")):
        return AsyncQdrantClient(
            url=settings.qdrant_host,
            api_key=settings.qdrant_api_key or None,
            timeout=30.0,
        )
    return AsyncQdrantClient(
        host=settings.qdrant_host,
        port=settings.qdrant_port,
        api_key=settings.qdrant_api_key or None,
        https=settings.qdrant_use_tls,
        timeout=30.0,
    )


async def _dense_retrieve(
    client: AsyncQdrantClient,
    embedder: HttpEmbeddingAdapter,
    collection: str,
    query: str,
    threshold: float,
) -> list[RetrievalResult]:
    logger.info("── Stage 1: Dense Retrieval ─────────────────────────────")
    logger.info("  query     : %r", query)
    logger.info(
        "  top_k     : %d  threshold: %s",
        TOP_K_RETRIEVE,
        "none" if threshold is None else f"{threshold:.2f}",
    )

    query_vector = await embedder.embed_query(query)
    response = await client.query_points(
        collection_name=collection,
        query=query_vector,
        limit=TOP_K_RETRIEVE,
        score_threshold=threshold,
        with_payload=True,
    )

    # `_to_result` tolerates the live payload shape (top-level `file_uuid`, no
    # `metadata.file_id`); indexing those keys directly raised KeyError on every
    # real query.
    results = [_to_result(hit, hit.score) for hit in response.points]

    logger.info("  → %d chunk(s) returned", len(results))
    for i, r in enumerate(results, 1):
        logger.info(
            "    [%d] id=%-38s score=%.4f  page=%s",
            i, r.id, r.score, r.page_numbers,
        )
        logger.info("         preview: %r", r.text[:120])

    return results


async def _expand_context(
    client: AsyncQdrantClient,
    collection: str,
    retrieved: list[RetrievalResult],
) -> list[RetrievalResult]:
    logger.info("── Stage 2: Context Expansion ───────────────────────────")
    retrieved_ids = {r.id for r in retrieved}
    expansion_ids = []
    for r in retrieved:
        if r.prev_id and r.prev_id not in retrieved_ids:
            expansion_ids.append(r.prev_id)
            retrieved_ids.add(r.prev_id)
        if r.next_id and r.next_id not in retrieved_ids:
            expansion_ids.append(r.next_id)
            retrieved_ids.add(r.next_id)

    expanded = list(retrieved)
    if expansion_ids:
        raw = await client.retrieve(
            collection_name=collection,
            ids=expansion_ids,
            with_payload=True,
            with_vectors=False,
        )
        neighbours = [_to_result(p, 0.0) for p in raw]
        expanded.extend(neighbours)
        logger.info(
            "  → fetched %d neighbour chunk(s) → total %d",
            len(neighbours), len(expanded),
        )
        for n in neighbours:
            logger.info(
                "    neighbour id=%-38s  page=%s  preview=%r",
                n.id, n.page_numbers, n.text[:80],
            )
    else:
        logger.info("  → no neighbours to expand")

    return expanded


def _deduplicate(chunks: list[RetrievalResult]) -> list[RetrievalResult]:
    logger.info("── Stage 3: Deduplication ───────────────────────────────")
    seen_ids: set[str] = set()
    seen_pages: set[tuple] = set()
    deduped: list[RetrievalResult] = []
    for chunk in sorted(chunks, key=lambda r: r.score, reverse=True):
        if chunk.id in seen_ids:
            continue
        page_key = (chunk.file_id, frozenset(chunk.page_numbers))
        if page_key in seen_pages:
            logger.info("  dropped duplicate: page_key=%s", page_key)
            continue
        seen_ids.add(chunk.id)
        seen_pages.add(page_key)
        deduped.append(chunk)

    logger.info("  → %d chunk(s) after deduplication", len(deduped))
    return deduped


async def _rerank(query: str, candidates: list[RetrievalResult]) -> list[RetrievalResult]:
    logger.info("── Stage 4: Reranking (CrossEncoder) ───────────────────")
    logger.info("  model: %s  candidates: %d  top_n: %d",
                settings.reranker_model, len(candidates), TOP_N_RERANK)

    reranker = CrossEncoderAdapter(model_name=settings.reranker_model)
    reranked = await reranker.rerank(query, candidates, top_n=TOP_N_RERANK)

    logger.info("  → %d chunk(s) selected", len(reranked))
    for i, r in enumerate(reranked, 1):
        logger.info(
            "    [%d] id=%-38s score=%.4f  page=%s",
            i, r.id, r.score, r.page_numbers,
        )
        logger.info("         preview: %r", r.text[:160])

    return reranked


_GENERATION_SYSTEM_PROMPT = (
    "You are a helpful assistant. Answer the user's question using ONLY the information "
    "provided in the KNOWLEDGE BASE REFERENCE section. If the answer is not present in "
    "the provided context, say so clearly. Be concise and direct."
)


async def _generate_answer(reranked: list[RetrievalResult], query: str) -> None:
    if not reranked:
        print("\n[LLM Generation skipped — no chunks to inject]")
        return

    # Build context block (same format as _format_rag_context in rag_service.py)
    lines = [
        "## KNOWLEDGE BASE REFERENCE",
        "",
    ]
    for i, chunk in enumerate(reranked, 1):
        pages = ", ".join(str(p) for p in chunk.page_numbers) if chunk.page_numbers else "N/A"
        lines.append(f"### [{i}] {chunk.chunk_type} — pages {pages}")
        lines.append(chunk.text)
        lines.append("")
    context_block = "\n".join(lines).rstrip()

    prompt = f"{context_block}\n\n## Question\n{query}"

    llm = LLMClient(
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        api_key=settings.llm_api_key,
        chat_path=settings.chat_path,
    )

    print("\n" + "═" * 70)
    print("LLM GENERATED ANSWER")
    print(f"Model : {settings.llm_model}")
    print("═" * 70)

    logger.info("Calling LLM for generation…")
    answer = await llm.complete(prompt, system=_GENERATION_SYSTEM_PROMPT)
    print(answer)
    print("═" * 70)


def _print_final_context(reranked: list[RetrievalResult], query: str) -> None:
    print("\n" + "═" * 70)
    print("FINAL RAG CONTEXT")
    print(f"Query : {query!r}")
    print(f"Chunks: {len(reranked)}")
    print("═" * 70)
    for i, r in enumerate(reranked, 1):
        pages = ", ".join(str(p) for p in r.page_numbers) if r.page_numbers else "N/A"
        print(f"\n[{i}] {r.chunk_type} — pages {pages}  (score={r.score:.4f})")
        print("-" * 60)
        print(r.text)
    print("\n" + "═" * 70)


async def run(query_text: str, collection: str, threshold: float) -> None:
    client = _make_qdrant_client()
    embedder = HttpEmbeddingAdapter()

    existing = [c.name for c in (await client.get_collections()).collections]
    if collection not in existing:
        logger.error(
            "Collection '%s' not found. Available: %s", collection, existing
        )
        await client.close()
        sys.exit(1)

    logger.info("Collection : %s", collection)

    retrieved = await _dense_retrieve(client, embedder, collection, query_text, threshold)
    if not retrieved:
        logger.warning("No chunks retrieved. Try lowering --threshold (currently %.2f).", threshold)
        await client.close()
        return

    expanded = await _expand_context(client, collection, retrieved)
    deduped = _deduplicate(expanded)
    reranked = await _rerank(query_text, deduped)
    _print_final_context(reranked, query_text)
    await _generate_answer(reranked, query_text)

    await client.close()


async def diagnose(collection: str) -> None:
    """Check for embedding dimension mismatch between stored vectors and current model."""
    client = _make_qdrant_client()
    embedder = HttpEmbeddingAdapter()

    print("\n" + "═" * 70)
    print("RAG DIAGNOSTIC REPORT")
    print("═" * 70)

    # 1. Collection vector config
    info = await client.get_collection(collection)
    stored_dim = info.config.params.vectors.size
    stored_distance = info.config.params.vectors.distance
    stored_count = info.points_count
    print(f"\n[Qdrant Collection]")
    print(f"  name          : {collection}")
    print(f"  total points  : {stored_count}")
    print(f"  vector size   : {stored_dim}")
    print(f"  distance      : {stored_distance}")

    # 2. Sample stored point — peek at its vector
    sample = await client.retrieve(
        collection_name=collection,
        ids=[],  # empty means we need scroll instead
        with_vectors=True,
        with_payload=True,
    )
    # use scroll to get one real point with its vector
    points, _ = await client.scroll(
        collection_name=collection,
        limit=1,
        with_vectors=True,
        with_payload=True,
    )
    if points:
        p = points[0]
        actual_vec = p.vector if isinstance(p.vector, list) else list(p.vector.values())[0]
        actual_dim = len(actual_vec)
        print(f"\n[Sample Stored Point]")
        print(f"  id            : {p.id}")
        print(f"  vector dims   : {actual_dim}")
        print(f"  chunk_type    : {p.payload.get('metadata', {}).get('chunk_type', 'N/A')}")
        print(f"  page_numbers  : {p.payload.get('metadata', {}).get('page_numbers', 'N/A')}")
        print(f"  text preview  : {p.payload.get('text', '')[:120]!r}")

    # 3. Current model output dimension
    print(f"\n[Current Embedding Model]")
    print(f"  server        : {settings.embedding_model_base_url}")
    print(f"  model         : {settings.embed_model}")
    print(f"  config dims   : {settings.embed_dims}")
    test_vector = await embedder.embed("test query for dimension check")
    query_dim = len(test_vector)
    print(f"  actual output : {query_dim} dims")

    # 4. Verdict
    print(f"\n[Verdict]")
    if stored_dim != query_dim:
        print(f"  ❌ DIMENSION MISMATCH: stored={stored_dim}  query_model={query_dim}")
        print(f"     The document was ingested with a different embedding model.")
        print(f"     Scores will be meaningless — re-ingest with the current model.")
    elif points and actual_dim != query_dim:
        print(f"  ❌ ACTUAL VECTOR MISMATCH: point_vector={actual_dim}  query_model={query_dim}")
    else:
        print(f"  ✓ Dimensions match ({stored_dim}). Mismatch is NOT the issue.")
        print(f"    The low scores ({stored_dim} dims, same model) suggest the query")
        print(f"    and document language/style are semantically distant.")
        print("    The dense stage no longer gates on score by default "
              "(rag_dense_score_floor=None); an empty result here means the "
              "collection is empty or the query is genuinely unrelated.")

    print("\n" + "═" * 70)
    await client.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="RAG pipeline test harness")
    sub = parser.add_subparsers(dest="command", required=True)

    p_query = sub.add_parser("query", help="Run the full RAG pipeline and show chunk details")
    p_query.add_argument("text", help="Query string")
    p_query.add_argument("--collection", default=DEFAULT_COLLECTION,
                         help=f"Qdrant collection (default: {DEFAULT_COLLECTION})")
    p_query.add_argument("--threshold", type=float, default=SCORE_THRESHOLD,
                         help=f"Score threshold (default: {SCORE_THRESHOLD})")

    p_diag = sub.add_parser("diagnose", help="Check for embedding dimension/model mismatch")
    p_diag.add_argument("--collection", default=DEFAULT_COLLECTION,
                        help=f"Qdrant collection (default: {DEFAULT_COLLECTION})")

    args = parser.parse_args()

    if args.command == "query":
        asyncio.run(run(args.text, args.collection, args.threshold))
    elif args.command == "diagnose":
        asyncio.run(diagnose(args.collection))


if __name__ == "__main__":
    main()
