from __future__ import annotations
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, Query, Request, status

from api.schemas.auth import AuthenticatedUser
from config import settings
from infrastructure.auth.jwt_handler import verify_azure_token, verify_token



def _extract_from_cookie_string(cookie_string: str, cookie_name: str) -> str | None:
    for part in cookie_string.split(";"):
        name, _, value = part.strip().partition("=")
        if name.strip() == cookie_name:
            return value.strip() or None
    return None


def _decode_azure(token: str) -> AuthenticatedUser:
    try:
        payload = verify_azure_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    emails = payload.get("emails") or []
    email = payload.get("email") or (emails[0] if emails else None)
    roles = [r.strip() for r in (payload.get("extension_Roles") or "").split(",") if r.strip()]
    if payload.get("extension_IsSuperAdmin") is True:
        role = "global_platform_admin"
    elif "ROLE_COMPANY_ADMIN" in roles:
        role = "admin"
    else:
        role = "user"
    return AuthenticatedUser(
        email=email,
        display_name=payload.get("name"),
        scope=payload.get("scp"),
        user_id=payload.get("oid"),
        # tid is Azure AD's tenant GUID, not this app's internal tenant id — that comes from the request body instead.
        tenant_id=None,
        role=role,
    )


def _decode_hs256(token: str) -> AuthenticatedUser:
    try:
        payload = verify_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return AuthenticatedUser(
        email=payload.get("email"),
        scope=payload.get("scope"),
        user_id=payload.get("sub") or payload.get("user_id"),
        tenant_id=payload.get("tenant_id"),
        role=payload.get("role"),
    )


def get_current_user(request: Request) -> AuthenticatedUser:
    """Unified auth: Ada cookie → X-Ada-Session header → Bearer token."""
    cookie_name = settings.azure_auth_cookie_name

    # 1. Azure B2C HttpOnly cookie
    if settings.azure_jwks_url:
        cookie_val = request.cookies.get(cookie_name)
        if cookie_val:
            return _decode_azure(cookie_val)

        # 2. X-Ada-Session header (iframe shells forward the raw cookie string)
        ada_header = request.headers.get("X-Ada-Session")
        if ada_header:
            token = _extract_from_cookie_string(ada_header, cookie_name)
            if token:
                return _decode_azure(token)

    # 3. Authorization: Bearer (HS256)
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return _decode_hs256(auth_header[7:])

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")


# Alias for routes that want the explicit name
get_current_user_any = get_current_user


def get_global_platform_admin(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if current_user.role != "global_platform_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Global admin access required")
    return current_user


def get_current_user_from_cookie(request: Request) -> AuthenticatedUser:
    """Azure B2C cookie-only auth (no Bearer fallback)."""
    cookie_val = request.cookies.get(settings.azure_auth_cookie_name)
    if not cookie_val:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session cookie missing")
    return _decode_azure(cookie_val)


def get_current_user_ws(token: str = Query(...)) -> AuthenticatedUser:
    """WebSocket auth via ?token= query param (browsers can't set headers on WS)."""
    # Try HS256 first; fall back to Azure if configured
    try:
        return _decode_hs256(token)
    except HTTPException:
        pass
    if settings.azure_jwks_url:
        return _decode_azure(token)
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid token")

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
                             timeout=settings.qdrant_timeout, verify=settings.qdrant_verify_tls)

@lru_cache
def get_api_client():
    from infrastructure.supplier_data import CalculumApiClient
    return CalculumApiClient()

@lru_cache
def get_cursor_store():
    from infrastructure.postgres import PostgresCursorStore
    return PostgresCursorStore(get_pg_adapter())

@lru_cache
def get_adabot_ingestion_log_store():
    return get_pg_adapter()

@lru_cache
def get_api_ingestion_service():
    from application import ApiIngestionService
    return ApiIngestionService(
        api_client=get_api_client(), pg_store=get_pg_adapter(), cursor_store=get_cursor_store(),
        adabot_ingestion_log_store=get_adabot_ingestion_log_store(),
    )

def get_scheduler():
    from application import build_scheduler
    return build_scheduler(api_ingestion_service=get_api_ingestion_service())

# ── Ingestion pipeline ────────────────────────────────────────────────────────

@lru_cache
def get_ingestion_job_store():
    from infrastructure.session.ingestion_job_store import InMemoryIngestionJobStore
    return InMemoryIngestionJobStore()

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
    )

@lru_cache
def get_ingestion_vector_store():
    from infrastructure.vector_store.ingestion_qdrant_adapter import AsyncIngestionQdrantAdapter
    return AsyncIngestionQdrantAdapter(
        client=get_async_qdrant_client(),
        collection=settings.collection_knowledge_base,
        upsert_batch_size=settings.qdrant_upsert_batch_size,
    )

@lru_cache
def get_kb_document_store():
    return get_pg_adapter()

@lru_cache
def get_storage():
    if settings.storage_type == "gcp":
        if not settings.gcs_bucket:
            raise RuntimeError("STORAGE_TYPE=gcp requires GCS_BUCKET to be set.")
        from infrastructure.storage.gcs import GCSStorage
        return GCSStorage(settings.gcs_bucket, settings.gcs_credentials_path)
    from infrastructure.storage.local import LocalStorage
    return LocalStorage(settings.local_storage_dir)

@lru_cache
def get_document_pipeline():
    from application.ingest.pipeline import DocumentPipeline
    from infrastructure.document_loader import create_loader
    return DocumentPipeline(
        loader_factory=create_loader,
        chunker=get_chunker(),
        embedder=get_embedder(),
        vector_store=get_ingestion_vector_store(),
        chunk_size=settings.ingestion_chunk_size,
        concurrency=settings.ingest_concurrency,
        embed_batching=settings.embed_batching,
        embed_batch_max_tokens=settings.embed_batch_max_tokens,
        upsert_batch_size=settings.qdrant_upsert_batch_size,
    )

@lru_cache
def get_status_broker():
    from application.notifications import StatusEventBus
    return StatusEventBus(
        idle_timeout=settings.sse_idle_timeout,
        max_cached=settings.sse_max_cached,
        max_queue=settings.sse_max_queue,
    )

@lru_cache
def get_ingest_use_case():
    from application.ingest import IngestDocumentUseCase
    return IngestDocumentUseCase(
        pipeline=get_document_pipeline(),
        job_repo=get_ingestion_job_store(),
        embed_dims=settings.embed_dims,
        pg_adapter=get_kb_document_store(),
        vector_store=get_ingestion_vector_store(),
        notifier=get_status_broker(),
        storage=get_storage(),
    )


@lru_cache
def get_delete_use_case():
    from application.delete import DeleteDocumentUseCase
    return DeleteDocumentUseCase(
        pg_adapter=get_kb_document_store(),
        vector_store=get_ingestion_vector_store(),
        storage=get_storage(),
    )
