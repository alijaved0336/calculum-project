from __future__ import annotations
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, Request, WebSocket, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from api.schemas.auth import AuthenticatedUser
from domain.ports.session_port import SessionPort
from domain.ports.intent_classifier_port import IntentClassifierPort
from domain.ports.reranker_port import RerankerPort
from domain.ports.supplier_data_port import SupplierDataPort
from domain.ports.llm_port import LLMPort
from domain.ports.thread_port import ThreadPort
from domain.ports.embedding_port import EmbeddingPort
from domain.ports.settings_port import SettingsPort
from domain.ports.vector_store_port import VectorStorePort
from infrastructure.embedding.http_embedding_adapter import HttpEmbeddingAdapter
from infrastructure.vector_store.qdrant_adapter import QdrantAdapter
from infrastructure.session.in_memory_session_store import InMemorySessionStore
from infrastructure.auth.jwt_handler import verify_azure_token, verify_token
from infrastructure.llm.llm_client import LLMClient
from infrastructure.database.connection import get_db_session
from infrastructure.intent.llm_intent_classifier import LLMIntentClassifier
from config import settings

# ── Auth ──────────────────────────────────────────────────────────────────────

_bearer = HTTPBearer()


def _decode(token: str) -> AuthenticatedUser:
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


def _parse_cookie_string(cookie_header: str, name: str) -> str | None:
    """Extract a named cookie value from a raw Cookie-header string."""
    for part in cookie_header.split(";"):
        k, _, v = part.strip().partition("=")
        if k.strip() == name:
            return v.strip() or None
    return None


def _decode_azure(token: str) -> AuthenticatedUser:
    """Decode and validate an Azure B2C / Ada RS256 cookie token via JWKS."""
    try:
        payload = verify_azure_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Invalid token: {exc}")
    # extension_Roles is a comma-separated string e.g. "ROLE_USER,ROLE_COMPANY_ADMIN,..."
    # Ada tokens may not carry this claim — default to "user" when absent.
    # extension_IsSuperAdmin is Ada's explicit cross-tenant admin flag — it maps
    # to our internal "global_platform_admin" role, which bypasses the
    # per-tenant access check entirely (see _is_global_admin in settings routes).
    raw_roles = (payload.get("extension_Roles") or "").split(",")
    if payload.get("extension_IsSuperAdmin"):
        role = "global_platform_admin"
    elif "ROLE_COMPANY_ADMIN" in raw_roles:
        role = "admin"
    else:
        role = "user"
    emails = payload.get("emails") or []
    # `tid` in Ada/Azure tokens is the Azure AD tenant GUID, not our internal
    # tenant ID. We intentionally leave tenant_id as None here; the frontend
    # passes tenant_id explicitly in the request body and it is validated there.
    return AuthenticatedUser(
        email=payload.get("email") or (emails[0] if emails else None),
        display_name=payload.get("name"),
        scope=payload.get("scp"),
        user_id=payload.get("oid"),
        tenant_id=None,
        role=role,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> AuthenticatedUser:
    return _decode(credentials.credentials)


async def get_current_user_ws(websocket: WebSocket) -> AuthenticatedUser:
    # Ada Bot / Azure B2C path — RS256 cookie or X-Ada-Session header
    cookie_token = websocket.cookies.get(settings.azure_auth_cookie_name)
    if not cookie_token:
        ada_session = websocket.headers.get("x-ada-session", "")
        cookie_token = _parse_cookie_string(ada_session, settings.azure_auth_cookie_name) if ada_session else None
    if cookie_token:
        try:
            return _decode_azure(cookie_token)
        except HTTPException:
            await websocket.close(code=4001)
            raise

    # Standalone frontend path — HS256 Bearer token passed as ?token= query param
    # (WebSocket clients cannot send custom headers, so the token must travel via URL)
    query_token = websocket.query_params.get("token")
    if query_token:
        try:
            return _decode(query_token)
        except HTTPException:
            await websocket.close(code=4001)
            raise

    # Session-identity fallback — works for local HTTP dev where the __Secure-*
    # cookie cannot be set (requires HTTPS) and no Bearer token is passed.
    # The session was created by an authenticated /session/start call, so the
    # user identity stored there is already verified. The session_id UUID is
    # unguessable, making it an implicit short-lived credential.
    # get_session_store() is @lru_cache — returns the singleton with no overhead.
    session_id = websocket.path_params.get("session_id")
    if session_id:
        session = await get_session_store().get(session_id)
        if session and session.get("_auth_user"):
            return session["_auth_user"]

    await websocket.close(code=4001)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication")


async def get_current_user_from_cookie(request: Request) -> AuthenticatedUser:
    """Authenticate via the Azure B2C HttpOnly cookie or X-Ada-Session header."""
    token = request.cookies.get(settings.azure_auth_cookie_name)
    if not token:
        ada_session = request.headers.get("x-ada-session", "")
        token = _parse_cookie_string(ada_session, settings.azure_auth_cookie_name) if ada_session else None
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing auth cookie")
    return _decode_azure(token)


async def get_current_user_any(request: Request) -> AuthenticatedUser:
    """Unified auth: Ada Bot cookie (RS256) OR standalone Bearer token (HS256).

    Priority:
      1. HttpOnly Ada cookie (browser / Vite-proxy dev path)
      2. X-Ada-Session header (full cookie string forwarded by the Ada iframe shell)
      3. Authorization: Bearer header (standalone frontend with HS256 token)
    """
    cookie_token = request.cookies.get(settings.azure_auth_cookie_name)
    if cookie_token:
        return _decode_azure(cookie_token)

    ada_session = request.headers.get("x-ada-session", "")
    if ada_session:
        token = _parse_cookie_string(ada_session, settings.azure_auth_cookie_name)
        if token:
            return _decode_azure(token)

    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        return _decode(auth_header[7:])

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authentication")

# ── LLM ───────────────────────────────────────────────────────────────────────

@lru_cache
def get_llm() -> LLMPort:
    return LLMClient(
        base_url=settings.llm_base_url,
        model=settings.llm_model,
        api_key=settings.llm_api_key,
        chat_path=settings.chat_path,
        enable_thinking=settings.llm_enable_thinking,
        supports_chat_template_kwargs=settings.llm_supports_chat_template_kwargs,
    )

# ── Intent classifier ─────────────────────────────────────────────────────────

@lru_cache
def get_intent_classifier() -> IntentClassifierPort:
    return LLMIntentClassifier(llm=get_llm())

# ── Session store ─────────────────────────────────────────────────────────────

@lru_cache
def get_session_store() -> SessionPort:
    return InMemorySessionStore()


async def get_session_by_id(
    session_id: str,
    store: SessionPort = Depends(get_session_store),
) -> dict:
    session = await store.get(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


async def get_pg_supplier_adapter(
    session: AsyncSession = Depends(get_db_session, use_cache=False),
) -> SupplierDataPort:
    from infrastructure.postgres.adapters.pg_supplier_data_adapter import PostgresSupplierDataAdapter
    return PostgresSupplierDataAdapter(session=session)

async def get_pg_thread_adapter(
    session: AsyncSession = Depends(get_db_session, use_cache=False),
) -> ThreadPort:
    from infrastructure.postgres.adapters.pg_thread_adapter import PostgresThreadAdapter
    return PostgresThreadAdapter(session=session)

async def get_pg_settings_adapter(
    session: AsyncSession = Depends(get_db_session, use_cache=False),
) -> SettingsPort:
    from infrastructure.postgres.adapters.pg_settings_adapter import PostgresSettingsAdapter
    return PostgresSettingsAdapter(session=session)

# ── Future stubs (not yet implemented) ───────────────────────────────────────

@lru_cache
def get_embedder() -> EmbeddingPort:
    return HttpEmbeddingAdapter()

@lru_cache
def get_vector_store() -> VectorStorePort:
    return QdrantAdapter(embedder=get_embedder())

# ── Reranker ──────────────────────────────────────────────────────────────────

@lru_cache
def get_reranker() -> RerankerPort:
    from infrastructure.reranker.cross_encoder_adapter import CrossEncoderAdapter
    return CrossEncoderAdapter(model_name=settings.reranker_model)

# ── RAG service ───────────────────────────────────────────────────────────────

@lru_cache
def get_rag_service():
    from application.services.rag_service import RAGService
    return RAGService(
        vector_store=get_vector_store(),
        reranker=get_reranker(),
        top_k_retrieve=settings.rag_top_k_retrieve,
        top_n_rerank=settings.rag_top_n_rerank,
        rerank_max_candidates=settings.rag_rerank_max_candidates,
        rerank_score_threshold=settings.rag_rerank_score_threshold,
        dense_score_floor=settings.rag_dense_score_floor,
        context_max_chars=settings.rag_context_max_chars,
    )

@lru_cache
def get_pushback_knowledge():
    from application.services.pushback_knowledge import PushbackKnowledgeService
    return PushbackKnowledgeService(
        vector_store=get_vector_store(),
        reranker=get_reranker(),
        filenames=settings.pushback_kb_filenames,
        top_k_retrieve=settings.pushback_top_k_retrieve,
        max_categories=settings.pushback_max_categories,
        rerank_score_threshold=settings.pushback_rerank_score_threshold,
        unstated_objection_threshold=settings.pushback_unstated_objection_threshold,
        runner_up_margin=settings.pushback_runner_up_margin,
        full_rerank_max_categories=settings.pushback_full_rerank_max_categories,
        cache_ttl_seconds=settings.pushback_kb_cache_ttl_seconds,
    )

# ── Graph ─────────────────────────────────────────────────────────────────────

@lru_cache
def get_graph():
    from agents.graph import build_negotiation_graph
    return build_negotiation_graph(
        get_intent_classifier(),
        get_llm(),
        get_rag_service(),
        get_pushback_knowledge(),
    )

