#!/usr/bin/env python
"""
Evaluation CLI for the ingestion pipeline.

Uploads a document, waits for ingestion to complete, then runs all four
evaluation layers against the resulting chunks in Qdrant.

Usage examples:
  # Layers 1-3 only (no LLM required):
  uv run python scripts/eval/run_eval.py --file path/to/doc.pdf --layers 1,2,3

  # All four layers (requires LLM_BASE_URL in .env):
  uv run python scripts/eval/run_eval.py --file path/to/doc.pdf

  # Save JSON report:
  uv run python scripts/eval/run_eval.py --file doc.pdf --output report.json

  # Evaluate chunks already in Qdrant (skip upload):
  uv run python scripts/eval/run_eval.py --file-uuid <uuid> --skip-upload --layers 1,2,3
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import sys
import time
from pathlib import Path

import httpx

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("eval")


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Evaluate the ingestion pipeline (upload → chunk → embed → retrieve → Ragas)."
    )
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--file", help="Path to the document to ingest and evaluate")
    src.add_argument(
        "--file-uuid",
        help="UUID of an already-ingested document (skips upload; use with --skip-upload)",
    )
    p.add_argument(
        "--skip-upload",
        action="store_true",
        help="Skip ingestion; evaluate chunks already stored in Qdrant under --file-uuid",
    )
    p.add_argument("--api-url", default="http://localhost:8001", help="Ingestion API base URL")
    p.add_argument("--collection", default=None, help="Qdrant collection (default from .env)")
    p.add_argument(
        "--layers",
        default="1,2,3,4",
        help="Comma-separated layers to run: 1=chunk structural, 2=embedding coherence, "
             "3=retrieval quality, 4=Ragas (default: all)",
    )
    p.add_argument("--top-k", type=int, default=3, help="K for hit-rate metrics (default: 3)")
    p.add_argument(
        "--test-size",
        type=int,
        default=5,
        help="Number of Ragas test questions to generate (Layer 4, default: 5)",
    )
    p.add_argument("--output", default=None, help="Path to write JSON report")
    p.add_argument(
        "--poll-interval",
        type=float,
        default=3.0,
        help="Seconds between job-status polls (default: 3)",
    )
    p.add_argument(
        "--timeout",
        type=float,
        default=600.0,
        help="Max seconds to wait for ingestion job (default: 600)",
    )
    return p.parse_args()


async def _upload_and_wait(
    api_url: str,
    file_path: Path,
    poll_interval: float,
    timeout: float,
) -> tuple[str, str]:
    """Upload a document and poll until the ingestion job completes.

    Returns (job_id, file_id).
    """
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            with open(file_path, "rb") as f:
                resp = await client.post(
                    f"{api_url}/ingest/upload",
                    files={"file": (file_path.name, f, "application/octet-stream")},
                )
        except httpx.ConnectError:
            print(
                f"\nError: could not connect to the ingestion API at {api_url}.\n"
                "  The server is not running. Start it first:\n"
                "    make run\n"
                "  or:\n"
                "    uv run uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload",
                file=sys.stderr,
            )
            sys.exit(1)
        resp.raise_for_status()
        data = resp.json()
        job_id: str = data["job_id"]
        file_id: str = data["file_id"]
        print(f"  Uploaded  — job_id={job_id}  file_id={file_id}")

        deadline = time.time() + timeout
        seen_running = False
        consecutive_404s = 0
        while True:
            if time.time() > deadline:
                raise TimeoutError(f"Job {job_id} did not complete within {timeout:.0f}s")
            await asyncio.sleep(poll_interval)
            try:
                r = await client.get(f"{api_url}/ingest/jobs/{job_id}")
            except httpx.ConnectError:
                print("  Polling   — server unreachable, retrying…")
                continue
            if r.status_code == 404:
                if seen_running:
                    # use_case.execute() always calls job_repo.remove() in its finally
                    # block right after finalization — 404 after "running" means the job
                    # completed and was cleaned from the in-memory store normally.
                    print("  Done      — ingestion complete (job cleaned from store after execution)")
                    return job_id, file_id
                consecutive_404s += 1
                if consecutive_404s >= 3:
                    print(
                        f"\nError: job {job_id} not found (HTTP 404) and was never seen as running.\n"
                        "  The server may have restarted before the job could start.\n"
                        "  Re-run the script without editing project files while ingestion is in progress.",
                        file=sys.stderr,
                    )
                    sys.exit(1)
                print(f"  Polling   — 404 (job not started yet?), retry {consecutive_404s}/3…")
                continue
            consecutive_404s = 0
            r.raise_for_status()
            s = r.json()
            status = s["status"]
            if status == "running":
                seen_running = True
            print(f"  Polling   — status={status}  chunks={s.get('chunks_written', '…')}")
            if status == "completed":
                print(f"  Done      — {s['chunks_written']} chunks written")
                return job_id, file_id
            if status == "failed":
                raise RuntimeError(f"Ingestion failed: {s.get('error')}")


async def _fetch_chunks(file_uuid: str, collection: str, qdrant_client) -> list:
    """Reconstruct Chunk objects from Qdrant records for a given file_uuid."""
    from evaluation.qdrant_search import scroll_by_file_uuid
    from domain.entities.ingestion import Chunk, ChunkType

    records = await scroll_by_file_uuid(qdrant_client, collection, file_uuid)
    chunks = []
    for r in records:
        p = r.payload or {}
        meta = p.get("metadata", {})
        raw_type = meta.get("chunk_type", "recursive")
        # stored as "ChunkType.recursive" or just "recursive"
        raw_type = raw_type.split(".")[-1].lower()
        try:
            chunk_type = ChunkType(raw_type)
        except ValueError:
            chunk_type = ChunkType.RECURSIVE

        embedding = list(r.vector) if r.vector is not None else None
        chunks.append(
            Chunk(
                id=str(r.id),
                text=p.get("text", ""),
                page_numbers=meta.get("page_numbers", [0]),
                chunk_type=chunk_type,
                file_id=p.get("file_uuid", file_uuid),
                metadata=meta,
                embedding=embedding,
            )
        )
    return chunks


async def main() -> None:
    args = _parse_args()
    layers = {int(x.strip()) for x in args.layers.split(",") if x.strip()}

    from config import settings
    collection = args.collection or settings.collection_knowledge_base

    results: dict = {"collection": collection}

    # ── Ingestion ─────────────────────────────────────────────────────────────
    if args.file and not args.skip_upload:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"Error: file not found: {file_path}", file=sys.stderr)
            sys.exit(1)
        results["file"] = str(file_path)
        print(f"\nIngesting '{file_path.name}' into collection '{collection}'…")
        job_id, file_uuid = await _upload_and_wait(
            args.api_url, file_path, args.poll_interval, args.timeout
        )
        results["job_id"] = job_id
        results["file_id"] = file_uuid
    else:
        file_uuid = args.file_uuid
        if not file_uuid:
            print("Error: --file-uuid required when --skip-upload is used.", file=sys.stderr)
            sys.exit(1)
        results["file_id"] = file_uuid
        print(f"\nSkipping upload — evaluating existing file_uuid={file_uuid}")

    # ── Fetch chunks from Qdrant ──────────────────────────────────────────────
    from dependencies import get_async_qdrant_client, get_embedder

    qdrant_client = get_async_qdrant_client()
    embedder = get_embedder()

    print(f"\nFetching chunks from '{collection}'…")
    chunks = await _fetch_chunks(file_uuid, collection, qdrant_client)
    print(f"Found {len(chunks)} chunks.")

    if not chunks:
        print("No chunks found in Qdrant for this file_uuid. Is ingestion complete?", file=sys.stderr)
        sys.exit(1)

    # ── Layer 1: Structural metrics ───────────────────────────────────────────
    if 1 in layers:
        print("\nLayer 1 — Chunk Structural Metrics…")
        from evaluation.chunk_metrics import compute_chunk_metrics
        results["chunk_metrics"] = compute_chunk_metrics(chunks, embedder.count_tokens)

    # ── Layer 2: Embedding coherence ──────────────────────────────────────────
    if 2 in layers:
        print("Layer 2 — Embedding Semantic Coherence…")
        from evaluation.embedding_metrics import compute_embedding_metrics
        results["embedding_metrics"] = compute_embedding_metrics(chunks, settings.embed_dims)

    # ── Layer 3: Retrieval quality ────────────────────────────────────────────
    if 3 in layers:
        print("Layer 3 — Retrieval Quality (hit rate / MRR)…")
        from evaluation.retrieval_metrics import compute_retrieval_metrics
        results["retrieval_metrics"] = await compute_retrieval_metrics(
            chunks, embedder, qdrant_client, collection, top_k=args.top_k
        )

    # ── Layer 4: Ragas ────────────────────────────────────────────────────────
    if 4 in layers:
        print("Layer 4 — Ragas Evaluation (requires LLM_BASE_URL in .env)…")
        from evaluation.ragas_metrics import run_ragas_metrics
        from langchain_core.documents import Document as LCDocument

        # Pass all non-empty chunks; ragas_metrics.py picks test_size evenly spaced ones.
        # Passing all lets the selector choose representative samples across the whole doc.
        lc_docs = [
            LCDocument(
                page_content=c.text,
                metadata={"file_id": c.file_id, "page_numbers": c.page_numbers},
            )
            for c in chunks
            if c.text.strip()
        ]
        results["ragas_metrics"] = await run_ragas_metrics(
            lc_docs,
            embedder,
            qdrant_client,
            collection,
            top_k=args.top_k,
            test_size=args.test_size,
            file_uuid=file_uuid,
        )

    # ── Report ────────────────────────────────────────────────────────────────
    from evaluation.report import print_report, save_report
    print_report(results)
    if args.output:
        save_report(results, args.output)


if __name__ == "__main__":
    asyncio.run(main())
