"""Layer 4: Full RAGAS evaluation pipeline.

LLM roles:
  eval model   → TestsetGenerator (SummaryExtractor + question generation)
               + ragas.evaluate() metric scoring (faithfulness, response_relevancy,
                 context_precision, context_recall)
  Qwen 35B     → Answer generation (the actual production RAG model being evaluated)

Embedding roles:
  Qwen3-Embedding-4B    → Retrieval from Qdrant (production embeddings)
  eval embed model      → RAGAS internal metric computation (response_relevancy)

Re-ranking:
  cross-encoder/ms-marco-MiniLM-L-6-v2 → re-orders Qdrant results before
  passing to the LLM, improving context quality fed into the evaluation.

Knowledge graph is cached per file_uuid so SummaryExtractor only runs once.
"""
from __future__ import annotations

import asyncio
import logging
import re as _re
from pathlib import Path

logger = logging.getLogger(__name__)

KG_CACHE_DIR = Path(".ragas_kg_cache")


def _strip_thinking(text: str) -> str:
    """Remove <think>...</think> blocks (Qwen3 chain-of-thought)."""
    text = _re.sub(r"<think>.*?</think>\s*", "", text, flags=_re.DOTALL)
    text = _re.sub(r"<think>[\s\S]*", "", text)
    return text.strip()


async def run_ragas_metrics(
    langchain_documents: list,
    embedder,
    qdrant_client,
    collection: str,
    top_k: int = 3,
    test_size: int = 5,
    file_uuid: str = "",
) -> dict:
    """Run full RAGAS evaluation pipeline with re-ranking and proper metric coverage.

    Flow:
      1. Build (or load cached) knowledge graph via TestsetGenerator —
         SummaryExtractor runs via the eval model (fast, reliable JSON output).
      2. Generate test questions from the knowledge graph.
      3. Embed questions with Qwen, retrieve top-K chunks from Qdrant,
         re-rank with cross-encoder to surface the most relevant context.
      4. Generate answers with the production Qwen 35B GGUF.
      5. Run ragas.evaluate() using the eval model (LLM) + eval embeddings,
         which fixes response_relevancy and context_recall that failed when
         the local Qwen embedding server was called from inside the executor.
    """
    from config import settings

    if not settings.llm_base_url:
        logger.warning("ragas: skipped — LLM_BASE_URL not set in .env")
        return {"skipped": "LLM_BASE_URL not configured in .env"}

    if not settings.eval_llm_api_key:
        logger.warning("ragas: skipped — EVAL_LLM_API_KEY not set in .env")
        return {"skipped": "EVAL_LLM_API_KEY not configured — add your eval key to .env"}

    # ── Import RAGAS ──────────────────────────────────────────────────────────
    try:
        from ragas.testset import TestsetGenerator
        from ragas.llms import LangchainLLMWrapper
        from ragas.embeddings import LangchainEmbeddingsWrapper
        from ragas import evaluate, EvaluationDataset
        from ragas.dataset_schema import SingleTurnSample
        from ragas.metrics import Faithfulness, ResponseRelevancy
        from ragas.run_config import RunConfig

        try:
            from ragas.metrics import LLMContextPrecisionWithoutReference, LLMContextRecall
            _advanced_metrics = True
        except ImportError:
            _advanced_metrics = False

        try:
            from ragas.testset.graph import KnowledgeGraph
            _kg_cache_supported = True
        except ImportError:
            _kg_cache_supported = False

    except ImportError as exc:
        logger.warning("ragas: skipped — package not available: %s", exc)
        return {"skipped": f"ragas not installed: {exc}"}

    from langchain_core.messages import HumanMessage, SystemMessage
    from evaluation.adapters import get_ragas_llm, get_eval_llm, get_ragas_embeddings, get_eval_embeddings
    from evaluation.qdrant_search import search as qdrant_search
    from domain.entities.ingestion import Chunk, ChunkType

    # ── Re-ranker (optional) ──────────────────────────────────────────────────
    try:
        from evaluation.reranker import rerank_indices
        _rerank_available = True
        print("  Ragas     — cross-encoder re-ranker loaded ✓")
    except ImportError:
        _rerank_available = False
        logger.warning("ragas: sentence-transformers not installed — skipping re-ranking")

    # ── LLM / embedding instances ─────────────────────────────────────────────
    eval_llm = get_eval_llm()           # eval model — testset + metric scoring
    rag_llm = get_ragas_llm()           # Qwen 35B   — answer generation
    qwen_embeddings = get_ragas_embeddings()    # Qwen3-Embedding-4B — retrieval
    eval_embeddings = get_eval_embeddings()     # eval embed model — RAGAS metrics

    wrapped_eval_llm = LangchainLLMWrapper(eval_llm)
    wrapped_qwen_emb = LangchainEmbeddingsWrapper(qwen_embeddings)   # for testset KG
    wrapped_eval_emb = LangchainEmbeddingsWrapper(eval_embeddings)   # for evaluate()

    loop = asyncio.get_running_loop()

    # ── Step 1: Build or load cached testset (questions + references) ────────
    # We cache the generated questions/references as a JSON file so that
    # SummaryExtractor (eval model) only runs once per file_uuid.
    # Note: KnowledgeGraph KG-level caching requires generate_with_knowledge_graph()
    # which is unavailable in this RAGAS version — question-level caching is simpler.
    usable = [d for d in langchain_documents if d.page_content.strip()]
    if not usable:
        return {"skipped": "no non-empty documents provided"}

    testset_cache_path = KG_CACHE_DIR / f"{file_uuid or 'unknown'}_testset.json" if file_uuid else None

    def _build_or_load_testset():
        import json as _json

        # Try loading cached questions first
        if testset_cache_path and testset_cache_path.exists():
            print(f"  Ragas     — loading cached testset ({testset_cache_path.name})…")
            try:
                cached = _json.loads(testset_cache_path.read_text())
                # Return a lightweight namespace with the same interface as testset.to_pandas()
                import pandas as pd
                return pd.DataFrame(cached)
            except Exception as exc:
                logger.warning("ragas: testset cache load failed, rebuilding: %s", exc)

        print(
            f"  Ragas     — building knowledge graph from {len(usable)} chunks "
            f"(SummaryExtractor via {settings.eval_llm_model})…"
        )
        generator = TestsetGenerator(
            llm=wrapped_eval_llm,
            embedding_model=wrapped_qwen_emb,
        )
        testset = generator.generate_with_langchain_docs(usable, testset_size=test_size)
        df = testset.to_pandas()

        # Cache the questions + references for future runs
        if testset_cache_path and not df.empty:
            try:
                KG_CACHE_DIR.mkdir(exist_ok=True)
                q_col = "user_input" if "user_input" in df.columns else "question"
                gt_col = "reference" if "reference" in df.columns else "ground_truth"
                cache_data = df[[q_col, gt_col]].fillna("").to_dict(orient="records")
                testset_cache_path.write_text(_json.dumps(cache_data, ensure_ascii=False, indent=2))
                print(f"  Ragas     — testset cached → {testset_cache_path}")
            except Exception as exc:
                logger.warning("ragas: testset cache save failed: %s", exc)

        return df

    print(f"  Ragas     — step 1/4: testset generation (test_size={test_size})…")
    try:
        from langchain_community.callbacks import get_openai_callback
        _token_tracking = True
    except ImportError:
        _token_tracking = False

    _usage: dict = {}  # accumulated token counts across all eval model calls

    def _track(label: str, fn):
        """Run fn() inside a token-tracking callback and accumulate token usage."""
        if not _token_tracking:
            return fn()
        with get_openai_callback() as cb:
            result = fn()
        _usage.setdefault(label, {})
        _usage[label]["prompt_tokens"] = _usage[label].get("prompt_tokens", 0) + cb.prompt_tokens
        _usage[label]["completion_tokens"] = _usage[label].get("completion_tokens", 0) + cb.completion_tokens
        _usage[label]["total_tokens"] = _usage[label].get("total_tokens", 0) + cb.total_tokens
        _usage[label]["calls"] = _usage[label].get("calls", 0) + 1
        _usage[label]["cost_usd"] = round(_usage[label].get("cost_usd", 0.0) + cb.total_cost, 6)
        return result

    try:
        testset_df = await loop.run_in_executor(
            None, lambda: _track("testset_generation", _build_or_load_testset)
        )
    except Exception as exc:
        logger.error("ragas: testset generation failed: %s", exc)
        return {"error": f"testset generation failed: {exc}"}

    if testset_df.empty:
        return {"skipped": "testset generation produced no questions"}

    q_col = "user_input" if "user_input" in testset_df.columns else "question"
    gt_col = "reference" if "reference" in testset_df.columns else "ground_truth"

    questions: list[str] = testset_df[q_col].tolist()
    ground_truths: list[str] = testset_df[gt_col].fillna("").tolist()

    print(f"  Ragas     — {len(questions)} questions generated:")
    for i, q in enumerate(questions):
        print(f"             Q{i + 1}: {q[:90]}{'…' if len(q) > 90 else ''}")

    # ── Step 2: Retrieve + re-rank contexts ───────────────────────────────────
    print("  Ragas     — step 2/4: retrieve + re-rank contexts from Qdrant…")
    contexts_list: list[list[str]] = []
    retrieval_details: list[dict] = []  # per-question retrieval trace for report.json

    for question in questions:
        dummy = Chunk(
            id="__ragas_query__",
            text=question,
            page_numbers=[0],
            chunk_type=ChunkType.RECURSIVE,
            file_id="__eval__",
            metadata={},
        )
        embedded = embedder.embed_one_sync(dummy)
        # Fetch more candidates than top_k so the re-ranker has room to work
        fetch_k = max(top_k * 3, 10)
        results = await qdrant_search(
            qdrant_client, collection, embedded.embedding, top_k=fetch_k
        )

        # Capture raw vector-search results (before reranking)
        raw_chunks = []
        for rank, r in enumerate(results, start=1):
            if r.payload and r.payload.get("text"):
                raw_chunks.append({
                    "vector_rank": rank,
                    "chunk_id": str(r.id),
                    "score": round(float(r.score), 4) if hasattr(r, "score") and r.score is not None else None,
                    "text": r.payload.get("text", ""),
                    "page_numbers": (r.payload.get("metadata") or {}).get("page_numbers", []),
                })

        texts = [c["text"] for c in raw_chunks]

        reranked = False
        final_chunks = raw_chunks[:top_k]
        if _rerank_available and len(texts) > 1:
            indices = rerank_indices(question, texts)
            texts = [texts[i] for i in indices]
            # Build reranked chunk list with both vector and rerank positions
            reranked_chunks = []
            for rerank_pos, vec_idx in enumerate(indices, start=1):
                chunk = dict(raw_chunks[vec_idx])
                chunk["rerank_position"] = rerank_pos
                reranked_chunks.append(chunk)
            final_chunks = reranked_chunks[:top_k]
            reranked = True

        contexts_list.append(texts[:top_k])
        retrieval_details.append({
            "reranked": reranked,
            "candidates_fetched": len(raw_chunks),
            "chunks_used": final_chunks,
        })

    # ── Step 3: Generate answers using Qwen 35B ───────────────────────────────
    print("  Ragas     — step 3/4: generating answers via local Qwen 35B…")
    NO_THINK = SystemMessage(content="/no_think")

    def _generate_answers() -> list[str]:
        answers: list[str] = []
        for i, (q, ctxs) in enumerate(zip(questions, contexts_list)):
            ctx_str = "\n\n".join(ctxs[:3]) if ctxs else "No context available."
            prompt = (
                "Answer the question directly in 1-3 sentences using only the information "
                "in the context below. Do not introduce any information not present in the "
                "context. Do not repeat the question. Give only the answer.\n\n"
                f"Context:\n{ctx_str}\n\n"
                f"Question: {q}\n\nAnswer:"
            )
            print(f"  Ragas     — answering Q{i + 1}/{len(questions)}…")
            try:
                response = rag_llm.invoke([NO_THINK, HumanMessage(content=prompt)])
                answers.append(_strip_thinking(response.content))
            except Exception as exc:
                logger.warning("ragas: answer generation failed for Q%d: %s", i + 1, exc)
                answers.append("")
        return answers

    try:
        answers = await loop.run_in_executor(None, _generate_answers)
    except Exception as exc:
        logger.error("ragas: answer generation failed: %s", exc)
        return {"error": f"answer generation failed: {exc}"}

    # ── Step 4: ragas.evaluate() with eval embeddings ────────────────────────
    # Uses wrapped_eval_emb (eval embed model) instead of Qwen so that
    # response_relevancy and context_recall work reliably inside the executor.
    print("  Ragas     — step 4/4: running ragas.evaluate() via eval model…")

    def _evaluate():
        samples = [
            SingleTurnSample(
                user_input=q,
                response=a,
                retrieved_contexts=ctxs,
                reference=gt if gt.strip() else None,
            )
            for q, a, ctxs, gt in zip(questions, answers, contexts_list, ground_truths)
        ]
        dataset = EvaluationDataset(samples=samples)

        metrics = [Faithfulness(), ResponseRelevancy()]
        if _advanced_metrics:
            metrics.append(LLMContextPrecisionWithoutReference())
            metrics.append(LLMContextRecall())

        return evaluate(
            dataset=dataset,
            metrics=metrics,
            llm=wrapped_eval_llm,           # eval model — metric scoring
            embeddings=wrapped_eval_emb,    # eval embed model — response_relevancy
            run_config=RunConfig(timeout=120, max_retries=3, max_wait=30),
            raise_exceptions=False,
        )

    try:
        result = await loop.run_in_executor(
            None, lambda: _track("ragas_evaluate", _evaluate)
        )
    except Exception as exc:
        logger.error("ragas: evaluate() failed: %s", exc)
        return {"error": f"ragas evaluate() failed: {exc}"}

    # ── Format output ─────────────────────────────────────────────────────────
    import math

    score_keys = {
        "faithfulness": "faithfulness",
        "answer_relevancy": "response_relevancy",              # RAGAS 0.2.x column name
        "llm_context_precision_without_reference": "context_precision",
        "context_recall": "context_recall",                    # RAGAS 0.2.x column name
    }

    means: dict = {}
    per_sample_scores: list[dict] = []
    try:
        df = result.to_pandas()
        means = df.mean(numeric_only=True).to_dict()
        for _, row in df.iterrows():
            sample_scores: dict = {}
            for raw_key, friendly_key in score_keys.items():
                if raw_key in df.columns:
                    val = row.get(raw_key)
                    try:
                        f = float(val)
                        sample_scores[friendly_key] = round(f, 4) if not math.isnan(f) else None
                    except (TypeError, ValueError):
                        sample_scores[friendly_key] = None
            per_sample_scores.append(sample_scores)
    except Exception as exc:
        logger.error("ragas: could not extract scores: %s", exc)

    out: dict = {
        "test_size": len(questions),
        "eval_llm": settings.eval_llm_model,
        "rag_llm": settings.llm_model,
        "reranker": "ms-marco-MiniLM-L-6-v2" if _rerank_available else "disabled",
    }
    for raw_key, friendly_key in score_keys.items():
        if raw_key in means:
            val = means[raw_key]
            try:
                f = float(val)
                out[friendly_key] = round(f, 4) if not math.isnan(f) else "N/A"
            except (TypeError, ValueError):
                out[friendly_key] = val

    # ── Per-sample detail: question → retrieved chunks → answer → scores ──────
    samples_detail: list[dict] = []
    for i, (q, gt, ctxs, ans, ret) in enumerate(
        zip(questions, ground_truths, contexts_list, answers, retrieval_details)
    ):
        scores = per_sample_scores[i] if i < len(per_sample_scores) else {}
        samples_detail.append({
            "index": i + 1,
            "question": q,
            "reference": gt or None,
            "retrieval": {
                "reranked": ret["reranked"],
                "candidates_fetched": ret["candidates_fetched"],
                "chunks_used": ret["chunks_used"],
            },
            "answer": ans,
            "scores": scores,
        })

    out["samples"] = samples_detail

    if _usage:
        total_tokens = sum(v.get("total_tokens", 0) for v in _usage.values())
        total_cost = sum(v.get("cost_usd", 0.0) for v in _usage.values())
        out["token_usage"] = _usage
        out["total_tokens"] = total_tokens
        out["estimated_cost_usd"] = round(total_cost, 6)
        print(f"\n  Token Usage (eval model):")
        for stage, u in _usage.items():
            print(f"    {stage:<25}: {u.get('total_tokens', 0):>6} tokens  "
                  f"(prompt={u.get('prompt_tokens', 0)}, "
                  f"completion={u.get('completion_tokens', 0)})  "
                  f"${u.get('cost_usd', 0):.4f}")
        print(f"    {'TOTAL':<25}: {total_tokens:>6} tokens  ${total_cost:.4f}")

    logger.info("ragas: %s", out)
    return out
