"""LangChain wrappers for the project's embedding and LLM APIs → Ragas-compatible."""
from __future__ import annotations

# Two LLM roles in Layer 4:
#   get_ragas_llm()  — local Qwen 35B GGUF (production RAG model, answer generation)
#   get_eval_llm()   — configured eval model (RAGAS TestsetGenerator + evaluate())


def get_ragas_embeddings():
    """Returns a LangChain OpenAIEmbeddings pointing at the Qwen embedding server."""
    from langchain_openai import OpenAIEmbeddings
    from config import settings

    base = settings.embed_api_url.rstrip("/")
    return OpenAIEmbeddings(
        openai_api_base=f"{base}/v1",
        openai_api_key=settings.embed_api_key,
        model=settings.embed_model,
        check_embedding_ctx_length=False,
        tiktoken_enabled=False,
    )


def get_eval_embeddings():
    """Returns the configured eval embedding model for RAGAS internal metric scoring.

    Used in ragas.evaluate() for ResponseRelevancy (embeds generated questions)
    and other embedding-based metrics. Separate from the Qwen embeddings used
    for actual RAG retrieval — the eval embeddings are reliable in sync/thread
    contexts that Ragas runs in, whereas the local Qwen server can time out.
    """
    from langchain_openai import OpenAIEmbeddings
    from config import settings

    if not settings.eval_llm_api_key:
        raise RuntimeError("EVAL_LLM_API_KEY not set — required for RAGAS evaluation metrics")
    return OpenAIEmbeddings(
        openai_api_key=settings.eval_llm_api_key,
        model=settings.eval_embed_model,
    )


def get_ragas_llm():
    """Returns a LangChain ChatOpenAI pointing at the configured LLM server.

    Raises RuntimeError if LLM_BASE_URL is not set in .env.
    """
    from langchain_openai import ChatOpenAI
    from config import settings

    if not settings.llm_base_url:
        raise RuntimeError(
            "LLM_BASE_URL not set — add it to .env before running Layer 4 evaluation.\n"
            "Example:\n  LLM_BASE_URL=http://<your-llm-host>:8080\n  LLM_API_KEY=...\n  LLM_MODEL=..."
        )
    base = settings.llm_base_url.rstrip("/")
    return ChatOpenAI(
        openai_api_base=f"{base}/v1",
        openai_api_key=settings.llm_api_key or "na",
        model_name=settings.llm_model,
        temperature=0,
        # Large GGUF models can take several minutes per call.
        request_timeout=1200,
        max_retries=1,
        # Allow enough tokens for question/answer generation plus any residual thinking.
        max_tokens=2048,
    )


def get_eval_llm():
    """Returns a LangChain ChatOpenAI pointing at the configured eval model.

    Used exclusively by RAGAS TestsetGenerator (SummaryExtractor, keyphrase
    extraction) and evaluate() — where structured JSON responses are required
    and the local GGUF model times out or truncates the output.

    Raises RuntimeError if EVAL_LLM_API_KEY is not set in .env.
    """
    from langchain_openai import ChatOpenAI
    from config import settings

    if not settings.eval_llm_api_key:
        raise RuntimeError(
            "EVAL_LLM_API_KEY not set — add your eval key to .env:\n"
            "  EVAL_LLM_API_KEY=...\n"
            "  EVAL_LLM_MODEL=..."
        )
    return ChatOpenAI(
        openai_api_key=settings.eval_llm_api_key,
        model_name=settings.eval_llm_model,
        temperature=0,
        request_timeout=120,
        max_retries=3,
    )
