"""Single dependency-injection wiring point (lru_cache singletons).

Adapters are wired here so the API/agent layers depend only on ports. Functions
are added incrementally as features land (embedding, vector store, reranker, LLM,
storage, email).
"""
from __future__ import annotations

from functools import lru_cache

from config import settings


@lru_cache
def get_async_qdrant_client():
    from qdrant_client import AsyncQdrantClient

    if settings.qdrant_host.startswith(("http://", "https://")):
        return AsyncQdrantClient(
            url=settings.qdrant_host, api_key=settings.qdrant_api_key or None, timeout=settings.qdrant_timeout
        )
    return AsyncQdrantClient(
        host=settings.qdrant_host,
        port=settings.qdrant_port,
        api_key=settings.qdrant_api_key or None,
        https=settings.qdrant_use_tls,
        timeout=settings.qdrant_timeout,
    )


@lru_cache
def get_embedder():
    from infrastructure.embedding.http_embedding_adapter import HttpEmbeddingAdapter

    return HttpEmbeddingAdapter(
        base_url=settings.embedding_model_base_url,
        api_key=settings.embedding_model_key,
        model=settings.embed_model,
        timeout=settings.embed_timeout,
    )


@lru_cache
def get_vector_store():
    from infrastructure.vector_store.qdrant_adapter import QdrantAdapter

    return QdrantAdapter(embedder=get_embedder(), client=get_async_qdrant_client())


@lru_cache
def get_reranker():
    from infrastructure.reranker.cross_encoder_adapter import CrossEncoderAdapter

    return CrossEncoderAdapter(model_name=settings.reranker_model)


@lru_cache
def get_rag_service():
    from application.services.rag_service import RAGService

    return RAGService(
        vector_store=get_vector_store(),
        reranker=get_reranker(),
        top_k=settings.rag_top_k_retrieve,
        top_n=settings.rag_top_n_rerank,
        score_threshold=settings.rag_score_threshold,
        near_dup_threshold=settings.rag_near_dup_threshold,
    )


@lru_cache
def get_llm_client():
    from infrastructure.llm.llm_client import LLMClient

    return LLMClient(
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        chat_path=settings.chat_path,
        timeout=settings.llm_timeout,
        temperature=settings.llm_temperature,
    )


@lru_cache
def get_signed_url():
    from infrastructure.storage.gcs_video_url import GcsSignedUrl

    return GcsSignedUrl()


@lru_cache
def get_video_store():
    from infrastructure.postgres.video_store import VideoStore

    return VideoStore(settings.postgres_dsn)


@lru_cache
def get_document_store():
    from infrastructure.postgres.document_store import DocumentStore

    return DocumentStore(settings.postgres_dsn)


@lru_cache
def get_chat_store():
    from infrastructure.postgres.chat_store import ChatStore

    return ChatStore(settings.postgres_dsn)


@lru_cache
def get_escalation_service():
    from application.agent.escalation import EscalationService
    from infrastructure.email.smtp_sender import SmtpSender

    sender = SmtpSender(
        host=settings.smtp_host,
        port=settings.smtp_port,
        user=settings.smtp_user,
        password=settings.smtp_password,
        from_addr=settings.smtp_from,
    )
    return EscalationService(
        sender=sender,
        support_email_to=settings.support_email_to,
        max_per_thread=settings.escalation_max_per_thread,
        window_seconds=settings.escalation_window_seconds,
        user_lookup=get_chat_store().get_user_contact,
    )


@lru_cache
def get_support_agent():
    from application.agent.support_agent import SupportAgent

    return SupportAgent(
        rag_service=get_rag_service(),
        llm_client=get_llm_client(),
        signer=get_signed_url().sign,
        answerable_threshold=settings.rag_answerable_threshold,
        escalation_service=get_escalation_service(),
        max_document_sources=settings.rag_max_document_sources,
        chat_store=get_chat_store(),
        document_store=get_document_store(),
        max_history_messages=settings.chat_history_max_messages,
        thread_title_max_len=settings.chat_thread_title_max_len,
        enable_meta_followups=settings.enable_meta_followups,
        max_subquestions=settings.max_subquestions,
        enable_decomposition=settings.query_decomposition_enabled,
        enable_query_rewrite=settings.query_rewrite_enabled,
    )
