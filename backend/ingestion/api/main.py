import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from api.routes import auth_router, ingestion_logs_router, ingest_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from dependencies import get_pg_adapter, get_async_qdrant_client, get_embedder, get_ingest_use_case
    from infrastructure.vector_store import ensure_collections

    _init_logging(settings)
    try:
        get_ingest_use_case()  # eager init — loads Qwen tokenizer before first request
    except Exception:
        logger.exception("STARTUP FAILED: ingest use case init")
        raise
    if settings.qdrant_enabled:
        await ensure_collections(get_async_qdrant_client())
        logger.info("Qdrant ready.")
    else:
        logger.info("Qdrant disabled (QDRANT_ENABLED=false).")

    pg = get_pg_adapter()
    try:
        await pg.connect()
    except Exception:
        logger.exception("STARTUP FAILED: PostgreSQL connect (dsn masked)")
        raise
    logger.info("PostgreSQL ready.")

    scheduler = None
    if settings.scheduler_enabled:
        from dependencies import get_scheduler
        scheduler = get_scheduler()
        scheduler.start()
        logger.info("Scheduler started (interval=%d min).", settings.sync_interval_minutes)
    else:
        logger.info("Scheduler disabled (SCHEDULER_ENABLED=false).")

    logger.info("startup complete")
    yield

    if scheduler is not None:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
    await get_embedder().aclose()
    await pg.close()


def _init_logging(s) -> None:
    fmt = "%(asctime)s %(levelname)-8s pid=%(process)d %(name)s — %(message)s" if s.log_format.lower() != "json" else "%(message)s"
    logging.basicConfig(level=s.log_level, format=fmt, force=True)


app = FastAPI(
    title="Calculum AI — Ingestion Service",
    description=(
        "Fetches spend/supplier data from the Calculum API and stores it in PostgreSQL. "
        "Document uploads are semantically chunked, embedded with Qwen3-Embedding-4B, "
        "and stored in Qdrant (knowledge_base collection only)."
    ),
    version="0.3.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(ingest_router)
app.include_router(ingestion_logs_router)


@app.get("/health", tags=["infra"])
async def health():
    from dependencies import get_async_qdrant_client
    client = get_async_qdrant_client()
    try:
        kb_info = await client.get_collection(settings.collection_knowledge_base)
        kb_points = kb_info.points_count
        status = "ok"
    except Exception as e:
        kb_points, status = None, f"error: {e}"

    return {
        "status": status,
        "embed_model": settings.embed_model,
        "scheduler_enabled": settings.scheduler_enabled,
        "sync_interval_minutes": settings.sync_interval_minutes,
        "collections": {settings.collection_knowledge_base: kb_points},
    }
