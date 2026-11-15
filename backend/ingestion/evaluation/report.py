"""Console and JSON report formatting for evaluation results."""
from __future__ import annotations

import json


def print_report(results: dict) -> None:
    w = 62
    print("\n" + "=" * w)
    print("  RAG INGESTION PIPELINE — EVALUATION REPORT")
    print("=" * w)

    if "file" in results:
        print(f"\n  Document : {results['file']}")
    if "collection" in results:
        print(f"  Collection: {results['collection']}")
    if "file_id" in results:
        print(f"  File UUID : {results['file_id']}")

    # ── Layer 1 ──────────────────────────────────────────────────────────────
    if "chunk_metrics" in results:
        m = results["chunk_metrics"]
        ts = m.get("token_stats", {})
        ov = m.get("overlap", {})
        td = m.get("type_distribution", {})
        print(f"\n{'─' * w}")
        print("  [Layer 1] Chunk Structural Metrics")
        print(f"{'─' * w}")
        print(f"  Total chunks       : {m.get('chunk_count', 0)}")
        print(f"  Empty chunks (<10t): {m.get('empty_chunks', 0)}")
        print(f"  Token mean / stdev : {ts.get('mean', 0):.1f} / {ts.get('stdev', 0):.1f}")
        print(f"  Token range        : [{ts.get('min', 0)} … {ts.get('max', 0)}]")
        print(f"  Token p25 / p75    : {ts.get('p25', 0)} / {ts.get('p75', 0)}")
        print(f"  Overlap Jaccard    : mean={ov.get('mean', 0):.4f}  max={ov.get('max', 0):.4f}")
        type_str = "  ".join(f"{k}={v}" for k, v in td.items() if v)
        print(f"  Type distribution  : {type_str}")

    # ── Layer 2 ──────────────────────────────────────────────────────────────
    if "embedding_metrics" in results:
        m = results["embedding_metrics"]
        sc = m.get("semantic_continuity", {})
        print(f"\n{'─' * w}")
        print("  [Layer 2] Embedding Semantic Coherence")
        print(f"{'─' * w}")
        print(f"  Embedded chunks    : {m.get('embedded_count', 0)}")
        print(f"  Missing embeddings : {m.get('missing_embeddings', 0)}")
        print(f"  Dim violations     : {m.get('dim_violations', 0)}")
        print(f"  Malformed vectors  : {m.get('malformed_vectors', 0)}")
        if sc:
            print(f"  Cosine sim mean    : {sc.get('mean', 0):.4f}")
            print(f"  Cosine sim min/max : {sc.get('min', 0):.4f} / {sc.get('max', 0):.4f}")

    # ── Layer 3 ──────────────────────────────────────────────────────────────
    if "retrieval_metrics" in results:
        m = results["retrieval_metrics"]
        print(f"\n{'─' * w}")
        print("  [Layer 3] Retrieval Quality")
        print(f"{'─' * w}")
        if "error" in m:
            print(f"  Error: {m['error']}")
        else:
            print(f"  Queries tested     : {m.get('query_count', 0)}")
            print(f"\n  Vector search (baseline):")
            print(f"    Hit rate @1      : {m.get('hit_rate@1', 0):.4f}")
            print(f"    Hit rate @3      : {m.get('hit_rate@3', 0):.4f}")
            print(f"    Hit rate @5      : {m.get('hit_rate@5', 0):.4f}")
            print(f"    MRR              : {m.get('mrr', 0):.4f}")
            rr = m.get("reranked")
            if rr:
                print(f"\n  Cross-encoder re-ranked (ms-marco-MiniLM-L-6-v2):")
                print(f"    Hit rate @1      : {rr.get('hit_rate@1', 0):.4f}")
                print(f"    Hit rate @3      : {rr.get('hit_rate@3', 0):.4f}")
                print(f"    Hit rate @5      : {rr.get('hit_rate@5', 0):.4f}")
                print(f"    MRR              : {rr.get('mrr', 0):.4f}")

    # ── Layer 4 ──────────────────────────────────────────────────────────────
    if "ragas_metrics" in results:
        m = results["ragas_metrics"]
        print(f"\n{'─' * w}")
        print("  [Layer 4] Ragas Evaluation")
        print(f"{'─' * w}")
        if "skipped" in m:
            print(f"  Skipped: {m['skipped']}")
        elif "error" in m:
            print(f"  Error: {m['error']}")
        else:
            print(f"  Test questions     : {m.get('test_size', '?')}")
            if "eval_llm" in m:
                print(f"  Eval LLM           : {m['eval_llm']}  (testset + scoring)")
            if "rag_llm" in m:
                print(f"  RAG LLM            : {m['rag_llm']}  (answer generation)")
            if "reranker" in m:
                print(f"  Re-ranker          : {m['reranker']}")
            for key in ["faithfulness", "response_relevancy", "context_precision",
                        "context_recall", "context_relevance", "answer_relevance"]:
                if key in m:
                    label = key.replace("_", " ").title()
                    val = m[key]
                    formatted = f"{val:.4f}" if isinstance(val, float) else str(val)
                    print(f"  {label:<19}: {formatted}")

            # ── Per-sample detail ─────────────────────────────────────────────
            samples = m.get("samples", [])
            if samples:
                print(f"\n{'─' * w}")
                print("  [Layer 4] Per-Sample Detail")
                print(f"{'─' * w}")
                for s in samples:
                    idx = s.get("index", "?")
                    q   = s.get("question", "")
                    ans = s.get("answer", "")
                    ref = s.get("reference") or ""
                    ret = s.get("retrieval", {})
                    sc  = s.get("scores", {})

                    print(f"\n  Q{idx}: {q}")

                    # Retrieved chunks
                    chunks_used = ret.get("chunks_used", [])
                    cand = ret.get("candidates_fetched", len(chunks_used))
                    tag  = "re-ranked" if ret.get("reranked") else "vector-search"
                    print(f"  Retrieved ({tag}, {len(chunks_used)} of {cand} candidates):")
                    for c in chunks_used:
                        pos  = c.get("rerank_position") or c.get("vector_rank", "?")
                        text = c.get("text", "")
                        preview = text[:120].replace("\n", " ") + ("…" if len(text) > 120 else "")
                        pages = c.get("page_numbers") or []
                        page_str = f"  p{pages}" if pages else ""
                        print(f"    [{pos}]{page_str} {preview}")

                    # Answer
                    ans_preview = ans[:200].replace("\n", " ") + ("…" if len(ans) > 200 else "")
                    print(f"  Answer: {ans_preview}")

                    # Per-sample scores
                    if sc:
                        score_str = "  ".join(
                            f"{k}={v:.3f}" if isinstance(v, float) else f"{k}=N/A"
                            for k, v in sc.items()
                        )
                        print(f"  Scores: {score_str}")

    print("\n" + "=" * w + "\n")


def save_report(results: dict, path: str) -> None:
    with open(path, "w") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"Report saved → {path}")
