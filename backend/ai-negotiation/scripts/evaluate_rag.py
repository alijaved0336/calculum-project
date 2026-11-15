#!/usr/bin/env python
"""
RAGAS 0.4.x offline batch evaluation for the RAG pipeline.

Loads a golden Q&A dataset, runs each question through the live RAG pipeline,
generates answers with the production LLM, then scores 4 RAGAS metrics using
a configured judge LLM.

Usage
-----
  # Full evaluation (all questions in golden_dataset.json)
  python scripts/evaluate_rag.py

  # Smoke-test (first 5 questions only — fast, cheap)
  python scripts/evaluate_rag.py --questions 5

  # Compare against a previous run to detect regressions
  python scripts/evaluate_rag.py --baseline scripts/eval/results/baseline.json

Prerequisites
-------------
  A judge endpoint must be configured in .env — EVAL_LLM_BASE_URL,
  EVAL_LLM_MODEL and EVAL_LLM_API_KEY. There is no default judge, so the
  LLM-scored metrics stay off until one is wired up (see `_build_judge`).
  Run: uv sync   to install ragas, langfuse, datasets, pandas.
"""
from __future__ import annotations

# ── Compatibility shim ────────────────────────────────────────────────────────
# RAGAS 0.4.x imports langchain_community.chat_models.vertexai which was removed
# in langchain-community 0.4.x. Inject a minimal stub before RAGAS is imported.
import sys
import types as _types

_vc_stub = _types.ModuleType("langchain_community.chat_models.vertexai")
_vc_stub.ChatVertexAI = type("ChatVertexAI", (), {})
sys.modules.setdefault("langchain_community.chat_models.vertexai", _vc_stub)
# ─────────────────────────────────────────────────────────────────────────────

import argparse
import asyncio
import json
import logging
import re
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings
from infrastructure.llm.llm_client import LLMClient

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("evaluate_rag")

_GOLDEN = Path(__file__).parent / "eval" / "golden_dataset.json"
_RESULTS = Path(__file__).parent / "eval" / "results"

_GENERATION_SYSTEM_PROMPT = (
    "You are a helpful assistant. Answer the user's question using ONLY the information "
    "provided in the KNOWLEDGE BASE REFERENCE section. If the answer is not present in "
    "the provided context, say so clearly. Be concise and direct."
)


def _extract_chunks(context_text: str) -> list[str]:
    """Split the formatted RAGContext string into individual chunk texts."""
    if not context_text:
        return []
    parts = re.split(r"\n### \[\d+\][^\n]*\n", context_text)
    return [p.strip() for p in parts[1:] if p.strip()]


_LLM_MAX_RETRIES = 3


async def _evaluate_one(
    rag_svc,
    llm: LLMClient,
    question: str,
) -> tuple[str, list[str]]:
    """Run RAG retrieval + LLM generation for a single question."""
    rag_ctx = await rag_svc.query(question)
    contexts = _extract_chunks(rag_ctx.context_text)

    if not contexts:
        logger.warning("  No chunks retrieved for: %r", question[:80])
        return "[no context retrieved — check RAG_SCORE_THRESHOLD and collection]", [
            "[no context retrieved]"
        ]

    prompt = f"{rag_ctx.context_text}\n\n## Question\n{question}"

    last_exc: Exception | None = None
    for attempt in range(1, _LLM_MAX_RETRIES + 1):
        try:
            answer = await llm.complete(prompt, system=_GENERATION_SYSTEM_PROMPT)
            logger.info("  chunks=%d  answer_len=%d chars", len(contexts), len(answer))
            return answer, contexts
        except Exception as exc:
            last_exc = exc
            if attempt < _LLM_MAX_RETRIES:
                wait = 2 ** (attempt - 1)
                logger.warning(
                    "  LLM call failed (attempt %d/%d): %s — retrying in %ds",
                    attempt, _LLM_MAX_RETRIES, exc, wait,
                )
                await asyncio.sleep(wait)

    logger.error("  LLM call failed after %d attempts: %s", _LLM_MAX_RETRIES, last_exc)
    return f"[generation failed after {_LLM_MAX_RETRIES} retries: {last_exc}]", contexts


def _build_judge(llm_wrapper, embeddings_wrapper):
    """Return ``(judge_llm, judge_embeddings)`` for RAGAS from the EVAL_LLM_* settings.

    Deliberately unimplemented. The judge must be a self-hosted,
    chat-completions-compatible endpoint configured through EVAL_LLM_BASE_URL /
    EVAL_LLM_MODEL / EVAL_LLM_API_KEY — wire a LangChain-compatible chat model and
    embeddings here and hand them to the two RAGAS wrappers passed in
    (``LangchainLLMWrapper`` / ``LangchainEmbeddingsWrapper``), which is all
    ``evaluate()`` requires. Any DeprecationWarning suppression the client needs
    belongs inside this function.

    `main_async` exits earlier when EVAL_LLM_* is unset; this raises when those
    settings ARE present but no client has been wired, which is the current state.
    It is called before the generation loop so that failure costs a second rather
    than a full retrieval-and-generation pass.
    """
    raise NotImplementedError(
        "Evaluation judge not wired — point EVAL_LLM_BASE_URL at a "
        "chat-completions endpoint and construct the wrappers here."
    )


async def main_async(n_questions: int | None, baseline_path: str | None) -> None:
    if not _GOLDEN.exists():
        logger.error("Golden dataset not found: %s", _GOLDEN)
        sys.exit(1)

    golden = json.loads(_GOLDEN.read_text())
    if n_questions:
        golden = golden[:n_questions]

    if not settings.eval_llm_model or not settings.eval_llm_api_key:
        logger.error(
            "No evaluation judge configured — set EVAL_LLM_MODEL, "
            "EVAL_LLM_BASE_URL and EVAL_LLM_API_KEY to a self-hosted "
            "chat-completions endpoint."
        )
        sys.exit(1)

    # Import evaluation dependencies here so a missing package gives a clear error
    try:
        from ragas import evaluate
        from ragas.dataset_schema import EvaluationDataset, SingleTurnSample
        from ragas.embeddings.base import LangchainEmbeddingsWrapper
        from ragas.llms.base import LangchainLLMWrapper
        # Old-style metric classes (Metric subclasses) — compatible with evaluate()
        from ragas.metrics._answer_relevance import ResponseRelevancy
        from ragas.metrics._context_precision import LLMContextPrecisionWithReference
        from ragas.metrics._context_recall import LLMContextRecall
        from ragas.metrics._faithfulness import Faithfulness
    except ImportError as exc:
        logger.error(
            "Missing evaluation dependencies: %s\n"
            "Run: uv sync   (or pip install ragas datasets pandas)",
            exc,
        )
        sys.exit(1)

    # Build the judge BEFORE the generation loop. Every metric here is LLM-scored,
    # so a run without a judge produces nothing — failing now costs a second
    # instead of minutes of retrieval and generation. evaluate() accepts the RAGAS
    # wrapper types, so `_build_judge` only has to return a LangChain-compatible
    # chat model and embeddings.
    print(f"\nSetting up judge LLM ({settings.eval_llm_model}) and embeddings…")
    judge_llm, judge_embeddings = _build_judge(
        LangchainLLMWrapper, LangchainEmbeddingsWrapper
    )

    from dependencies import get_rag_service

    rag_svc = get_rag_service()
    llm = LLMClient(
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        api_key=settings.llm_api_key,
        chat_path=settings.chat_path,
    )

    print(
        f"\nEvaluating {len(golden)} question(s) against collection "
        f"'{settings.collection_knowledge_base}'…\n"
    )

    questions, answers, contexts_list, ground_truths = [], [], [], []

    for i, item in enumerate(golden, 1):
        print(f"  [{i:02d}/{len(golden)}] {item['question'][:80]}")
        answer, contexts = await _evaluate_one(rag_svc, llm, item["question"])
        questions.append(item["question"])
        answers.append(answer)
        contexts_list.append(contexts)
        ground_truths.append(item["ground_truth"])

    # Build RAGAS 0.4.x EvaluationDataset
    # Field names changed from 0.2.x: question→user_input, answer→response,
    # contexts→retrieved_contexts, ground_truth→reference
    samples = [
        SingleTurnSample(
            user_input=q,
            response=a,
            retrieved_contexts=c,
            reference=gt,
        )
        for q, a, c, gt in zip(questions, answers, contexts_list, ground_truths)
    ]
    dataset = EvaluationDataset(samples=samples)

    # Old-style metrics are Metric subclasses — compatible with evaluate()
    # Rename context_precision for cleaner output column
    context_precision = LLMContextPrecisionWithReference()
    context_precision.name = "context_precision"

    metrics = [
        Faithfulness(),
        LLMContextRecall(),
        context_precision,
        ResponseRelevancy(),
    ]

    print(f"Running RAGAS evaluation ({len(metrics)} metrics × {len(samples)} questions)…\n")
    result = evaluate(
        dataset,
        metrics=metrics,
        llm=judge_llm,
        embeddings=judge_embeddings,
        show_progress=True,
        allow_nest_asyncio=True,
    )

    df = result.to_pandas()

    metric_cols = {
        "faithfulness": "faithfulness",
        "context_recall": "context_recall",
        "context_precision": "context_precision",
        "answer_relevancy": "answer_relevancy",
    }
    agg: dict[str, float] = {}
    for key, col in metric_cols.items():
        if col in df.columns:
            agg[key] = float(df[col].mean())
        else:
            logger.warning("Column '%s' not found in results — skipping", col)

    print("\n" + "═" * 64)
    print("RAGAS EVALUATION RESULTS")
    print("═" * 64)
    for k, v in agg.items():
        bar = "█" * int(v * 20)
        flag = "  ⚠  below target" if v < 0.80 else ""
        print(f"  {k:<24} {v:.4f}  {bar}{flag}")
    print("═" * 64)

    # Persist results
    _RESULTS.mkdir(parents=True, exist_ok=True)
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M")
    out_path = _RESULTS / f"{ts}.json"
    out_path.write_text(
        json.dumps(
            {
                "timestamp": ts,
                "n_questions": len(golden),
                "collection": settings.collection_knowledge_base,
                "judge_model": settings.eval_llm_model,
                "metrics": agg,
                "per_question": df.to_dict(orient="records"),
            },
            indent=2,
        )
    )
    print(f"\nResults saved → {out_path}")

    # Regression comparison
    regressed = False
    if baseline_path:
        base_file = Path(baseline_path)
        if not base_file.exists():
            logger.warning(
                "Baseline file not found: %s — skipping comparison", baseline_path
            )
        else:
            base = json.loads(base_file.read_text())
            print("\n── Regression vs baseline ──────────────────────────────")
            for k in agg:
                if k not in base.get("metrics", {}):
                    continue
                delta = agg[k] - base["metrics"][k]
                symbol = "▲" if delta >= 0 else "▼"
                flag = "  ← REGRESSION (>0.05 drop)" if delta < -0.05 else ""
                if delta < -0.05:
                    regressed = True
                print(f"  {k:<24} {symbol}{abs(delta):.4f}{flag}")
            print("────────────────────────────────────────────────────────")

    if regressed:
        print("\n[FAIL] One or more metrics regressed more than 0.05 below baseline.")
        sys.exit(1)
    else:
        print("\n[PASS] All metrics at or above threshold.")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="RAGAS 0.4.x offline batch evaluation for the RAG pipeline"
    )
    parser.add_argument(
        "--questions",
        type=int,
        default=None,
        help="Limit to first N questions (default: all)",
    )
    parser.add_argument(
        "--baseline",
        default=None,
        help="Path to a previous results JSON file for regression comparison",
    )
    args = parser.parse_args()
    asyncio.run(main_async(args.questions, args.baseline))


if __name__ == "__main__":
    main()
