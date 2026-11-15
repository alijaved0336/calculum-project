import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from api.routes.auth import router as auth_router
from api.routes.retrieval import router as retrieval_router
from api.routes.settings import router as settings_router
from config import settings
from dependencies import get_graph, get_pushback_knowledge, get_vector_store
from infrastructure.logging.log_config import setup_logging
from infrastructure.observability.langfuse_tracing import flush_tracing
from api.routes.negotiation import router as negotiation_router

logger = logging.getLogger(__name__)


async def _check_knowledge_base() -> None:
    """Log loudly at startup when the knowledge base cannot serve anything.

    A misconfigured collection name is invisible at runtime: `rag_query` catches
    the resulting exception and every answer degrades to "no KB context" while
    looking completely healthy. The same is true of a collection that exists but
    holds zero points — and `kb_documents` rows can read "Upserted" while the
    vectors never landed, so the Postgres side is not evidence either.

    Never raises: a KB problem must not stop the service booting, because every
    non-RAG intent still works.
    """
    name = settings.collection_knowledge_base
    try:
        store = get_vector_store()
        if not await store.health_check():
            logger.error(
                "[RAG_FAILURE] knowledge base collection %r does not exist on %s — "
                "every KB query will fail and answers will silently lose their "
                "grounding. Check COLLECTION_KNOWLEDGE_BASE matches the ingestion "
                "service.",
                name,
                settings.qdrant_host,
            )
            return

        client = getattr(store, "_client", None)
        points = None
        if client is not None:
            info = await client.get_collection(name)
            points = getattr(info, "points_count", None)

        if points == 0:
            logger.error(
                "[RAG_FAILURE] knowledge base collection %r exists but holds 0 points "
                "— nothing can be retrieved. Re-run ingestion and verify the vectors "
                "actually landed.",
                name,
            )
        else:
            logger.info("knowledge base %r ready (points=%s)", name, points)
    except Exception:
        logger.exception(
            "[RAG_FAILURE] knowledge base health check failed for %r", name
        )


async def _warm_pushback_knowledge() -> None:
    """Parse the pushback playbook once at boot, so a missing or re-laid-out
    upload shows in the startup log (the service logs the category count, or
    [RAG_FAILURE]) and the first pushback turn does not pay for the load.
    Never raises, like the check above."""
    try:
        await get_pushback_knowledge().categories()
    except Exception:
        logger.exception("[RAG_FAILURE] pushback knowledge warm-up failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    setup_logging(log_level=settings.log_level, log_dir=settings.log_dir)
    get_graph()  # warm-up: loads CrossEncoder model and all @lru_cache singletons before first request
    await _check_knowledge_base()
    await _warm_pushback_knowledge()
    yield
    flush_tracing()


app = FastAPI(
    title="Calculum AI — Negotiation Intelligence Service",
    description="LLM + RAG service for procurement payment-terms negotiation.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r".*" if settings.cors_allow_any_origin else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(negotiation_router)
app.include_router(retrieval_router)
app.include_router(settings_router)

if settings.enable_test_client:
    _static_dir = os.path.join(os.path.dirname(__file__), "static")
    os.makedirs(_static_dir, exist_ok=True)
    app.mount("/ui", StaticFiles(directory=_static_dir, html=True), name="ui")


@app.get("/health", tags=["infra"])
def health():
    return {
        "status": "ok",
        "model": settings.llm_model,
        "embed_model": settings.embed_model,
        "qdrant_host": settings.qdrant_host,
    }
