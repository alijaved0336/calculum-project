import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from api.routes import ingest_router, videos_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from dependencies import get_pg_adapter, get_async_qdrant_client, get_embedder, get_video_ingest_use_case
    from infrastructure.vector_store import ensure_collections

    _init_logging(settings)
    get_video_ingest_use_case()  # eager init — loads Qwen tokenizer before first request
    await ensure_collections(get_async_qdrant_client())

    pg = get_pg_adapter()
    await pg.connect()
    logger.info("PostgreSQL ready.")

    logger.info("startup complete")
    yield

    await get_embedder().aclose()
    await pg.close()


def _init_logging(s) -> None:
    fmt = "%(asctime)s %(levelname)-8s pid=%(process)d %(name)s — %(message)s" if s.log_format.lower() != "json" else "%(message)s"
    logging.basicConfig(level=s.log_level, format=fmt, force=True)


app = FastAPI(
    title="Calculum — Video Support Ingestion",
    description=(
        "Superadmin-only ingestion for the video support agent: upload support videos to GCS "
        "(POST /videos) and ingest their timestamped transcripts into the video-chunks Qdrant "
        "collection (POST /ingest/video/transcript)."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    # Any Ada Bot subdomain (dev/staging/prod) can send credentialed cookie/iframe requests
    # without editing cors_allowed_origins per environment.
    allow_origin_regex=r"https://[a-zA-Z0-9-]+\.hello-ada\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # SSE streams need these readable by the browser's fetch reader.
    expose_headers=["Content-Type"],
)

app.include_router(ingest_router)
app.include_router(videos_router)


@app.get("/health", tags=["infra"])
async def health():
    from dependencies import get_async_qdrant_client
    client = get_async_qdrant_client()
    try:
        info = await client.get_collection(settings.collection_video_chunks)
        points, status = info.points_count, "ok"
    except Exception as e:
        points, status = None, f"error: {e}"

    return {
        "status": status,
        "embed_model": settings.embed_model,
        "collections": {settings.collection_video_chunks: points},
    }
