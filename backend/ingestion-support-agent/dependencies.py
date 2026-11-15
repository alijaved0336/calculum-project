from __future__ import annotations
from functools import lru_cache
from config import settings

_pg_adapter = None

def get_pg_adapter():
    global _pg_adapter
    if _pg_adapter is None:
        from infrastructure.postgres import PostgresAdapter
        _pg_adapter = PostgresAdapter(settings.postgres_dsn, pool_size=settings.postgres_pool_size,
                                      max_overflow=settings.postgres_max_overflow, echo=settings.debug,
                                      connect_timeout=settings.postgres_connect_timeout)
    return _pg_adapter

@lru_cache
def get_async_qdrant_client():
    from qdrant_client import AsyncQdrantClient
    return AsyncQdrantClient(host=settings.qdrant_host, port=settings.qdrant_port,
                             api_key=settings.qdrant_api_key, https=settings.qdrant_use_tls,
                             timeout=settings.qdrant_timeout)

# ── Shared ingestion building blocks ────────────────────────────────────────

@lru_cache
def get_ingestion_job_store():
    from infrastructure.session.ingestion_job_store import InMemoryIngestionJobStore
    return InMemoryIngestionJobStore()

@lru_cache
def get_progress_broker():
    """Process-wide in-memory event bus for streaming upload/ingest status via SSE."""
    from infrastructure.session.progress_broker import ProgressBroker
    return ProgressBroker()

@lru_cache
def get_embedder():
    from infrastructure.embedding.qwen_embedder import AsyncQwenEmbedder
    return AsyncQwenEmbedder(
        api_url=settings.embed_api_url,
        api_key=settings.embed_api_key,
        model=settings.embed_model,
        max_tokens_per_text=settings.embed_max_tokens,
        timeout=settings.embed_timeout,
    )

@lru_cache
def get_chunker():
    from infrastructure.chunking.ingestion_chunker import IngestionChunkerAdapter
    langchain_embeddings = None
    if settings.chunking_strategy == "hybrid":
        from infrastructure.embedding.qwen_langchain_embeddings import QwenLangchainEmbeddings
        langchain_embeddings = QwenLangchainEmbeddings(
            api_url=settings.embed_api_url,
            api_key=settings.embed_api_key,
            model=settings.embed_model,
            timeout=settings.embed_timeout,
        )
    return IngestionChunkerAdapter(
        chunk_size=settings.ingestion_chunk_size,
        chunk_overlap=settings.ingestion_chunk_overlap,
        strategy=settings.chunking_strategy,
        semantic_breakpoint_percentile=settings.ingestion_semantic_breakpoint_percentile,
        langchain_embeddings=langchain_embeddings,
        length_function=get_embedder().count_tokens,
        min_chunk_size=settings.ingestion_min_chunk_size,
        transcript_chunk_ms=settings.ingestion_transcript_chunk_ms,
        transcript_overlap_cues=settings.ingestion_transcript_overlap_cues,
    )

@lru_cache
def get_kb_document_store():
    return get_pg_adapter()

# ── Video upload (POST /videos) ──────────────────────────────────────────────

@lru_cache
def get_video_store():
    """GCS by default; local filesystem fallback when VIDEO_STORAGE=local."""
    if settings.video_storage.lower() == "local":
        from infrastructure.storage.local_video_store import LocalVideoStore
        return LocalVideoStore()
    from infrastructure.storage.gcs_video_store import GcsVideoStore
    return GcsVideoStore()

@lru_cache
def get_video_upload_use_case():
    from application.videos.upload_use_case import VideoUploadUseCase
    return VideoUploadUseCase(
        gcs_store=get_video_store(),
        kb_store=get_kb_document_store(),
        broker=get_progress_broker(),
        # Lazily resolve the transcript ingest use case so an attached transcript can be
        # indexed server-side right after the video is stored (chaining) — no 2nd client call.
        transcript_uc_factory=get_video_ingest_use_case,
    )

# ── Transcript ingest (POST /ingest/video/transcript) ───────────────────────────────────

def _build_vector_store(chunk_source: str):
    from infrastructure.vector_store.ingestion_qdrant_adapter import AsyncIngestionQdrantAdapter
    return AsyncIngestionQdrantAdapter(
        client=get_async_qdrant_client(),
        collection=settings.collection_video_chunks,  # single unified collection
        upsert_batch_size=settings.qdrant_upsert_batch_size,
        chunk_source=chunk_source,
    )

def _build_pipeline(vector_store):
    from application.ingest.pipeline import DocumentPipeline
    from infrastructure.document_loader import create_loader
    return DocumentPipeline(
        loader_factory=create_loader,
        chunker=get_chunker(),
        embedder=get_embedder(),
        vector_store=vector_store,
        chunk_size=settings.ingestion_chunk_size,
        concurrency=settings.ingest_concurrency,
        embed_batching=settings.embed_batching,
        embed_batch_max_tokens=settings.embed_batch_max_tokens,
        upsert_batch_size=settings.qdrant_upsert_batch_size,
    )

@lru_cache
def get_video_vector_store():
    return _build_vector_store(chunk_source="video")

@lru_cache
def get_document_vector_store():
    return _build_vector_store(chunk_source="document")

@lru_cache
def get_video_document_pipeline():
    return _build_pipeline(get_video_vector_store())

@lru_cache
def get_document_pipeline():
    return _build_pipeline(get_document_vector_store())

@lru_cache
def get_video_ingest_use_case():
    from application.ingest import IngestDocumentUseCase
    return IngestDocumentUseCase(
        pipeline=get_video_document_pipeline(),
        job_repo=get_ingestion_job_store(),
        embed_dims=settings.embed_dims,
        pg_adapter=get_kb_document_store(),
        vector_store=get_video_vector_store(),
        broker=get_progress_broker(),
        store=get_video_store(),
    )

@lru_cache
def get_document_ingest_use_case():
    from application.ingest import IngestDocumentUseCase
    return IngestDocumentUseCase(
        pipeline=get_document_pipeline(),
        job_repo=get_ingestion_job_store(),
        embed_dims=settings.embed_dims,
        pg_adapter=get_kb_document_store(),
        vector_store=get_document_vector_store(),
        broker=get_progress_broker(),
        phase="document",
        store=get_video_store(),
    )
