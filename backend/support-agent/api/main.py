import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings


def _configure_logging() -> None:
    """Give the ROOT logger a handler + level, so the application's own logs are actually emitted.

    Uvicorn only configures its own ``uvicorn*`` loggers; it leaves the root logger bare. Every
    module here logs through ``logging.getLogger(__name__)``, which propagates to that bare root
    — where, with no handler, logging's "last resort" fallback drops anything below WARNING. Net
    effect: every ``logger.info`` step trace in the agent and the WS route (``chat.stream_started``,
    ``rag.query_finished``, ``llm.stream_finished``, ``chat.persist_assistant_*``,
    ``support_chat.*``) was silently discarded — locally AND on Cloud Run — so a turn that stalled
    or failed left nothing to diagnose it with. ``LOG_LEVEL`` (config.py) now actually takes effect.

    Called at import time: uvicorn applies its own logging config before importing the app, so
    this runs afterwards and is not clobbered. Uvicorn's loggers don't propagate to root, so
    their lines are not duplicated.
    """
    level = logging.getLevelNamesMapping().get(settings.log_level.strip().upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)
    if not any(getattr(h, "_support_agent_handler", False) for h in root.handlers):
        handler = logging.StreamHandler(sys.stdout)  # Cloud Run captures stdout → Cloud Logging
        # Same formatter class uvicorn's own loggers use (that's why "INFO:" reads green/yellow/
        # red in a local terminal) — otherwise our lines render as plain text next to uvicorn's
        # colored ones, which looks like two different logging systems even though it's one.
        # ``use_colors=None`` auto-detects (color in a local TTY, plain text once Cloud Run
        # captures stdout — colors there would just show up as raw escape codes).
        from uvicorn.logging import DefaultFormatter

        handler.setFormatter(
            DefaultFormatter("%(levelprefix)s %(asctime)s [%(name)s] %(message)s")
        )
        handler._support_agent_handler = True  # idempotent under --reload / repeated imports
        root.addHandler(handler)
    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        logging.getLogger(name).setLevel(level)
    # Third-party chatter at INFO (one httpx line per embedding/LLM/Qdrant call, model-loading
    # noise) would bury the turn trace this exists to surface. Their warnings/errors still show.
    for name in ("httpx", "httpcore", "urllib3", "sentence_transformers", "transformers"):
        logging.getLogger(name).setLevel(max(level, logging.WARNING))


_configure_logging()

# Use uvicorn's configured logger so startup messages are visible in the server log
# (the app's own INFO logs aren't wired into uvicorn's handlers by default).
logger = logging.getLogger("uvicorn.error")


def _configure_app_logging() -> None:
    """Make this app's module loggers visible in the same process output as Uvicorn."""
    level = getattr(logging, settings.log_level.upper(), logging.INFO)
    root = logging.getLogger()
    root.setLevel(level)

    uvicorn_error = logging.getLogger("uvicorn.error")
    if uvicorn_error.handlers and not root.handlers:
        for handler in uvicorn_error.handlers:
            root.addHandler(handler)
    elif not root.handlers:
        logging.basicConfig(
            level=level,
            format="%(levelname)s:%(name)s:%(message)s",
        )

    for name in ("api", "application", "infrastructure"):
        logging.getLogger(name).setLevel(level)


_configure_app_logging()


def _run_migrations() -> None:
    """Apply this repo's own Alembic migrations (isolated support_alembic_version lineage).
    Runs in a worker thread; env.py drives the async engine via asyncio.run."""
    from alembic import command
    from alembic.config import Config

    command.upgrade(Config("alembic.ini"), "head")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the cross-encoder reranker ONCE at startup (off the event loop) so the first
    # query isn't slow and the heavy model load never blocks a request. Best-effort: if
    # it fails, the adapter still lazy-loads on first use.
    # Apply this service's own chat migrations before serving (idempotent; the isolated
    # support_alembic_version table makes this safe alongside the other lineages).
    if settings.auto_migrate:
        try:
            await asyncio.to_thread(_run_migrations)
            logger.info("chat.migrations_applied")
        except Exception:
            logger.exception("chat.migrations_failed — chat history may be unavailable")

    from dependencies import get_reranker

    logger.info("reranker.warming_up model=%s", settings.reranker_model)
    try:
        await asyncio.to_thread(get_reranker().load)
        logger.info("reranker.warmed_up model=%s", settings.reranker_model)
    except Exception:
        logger.exception("reranker.warmup_failed — will lazy-load on first query")
    yield
    # Shutdown: release the library DB pools if they were opened.
    from dependencies import get_chat_store, get_document_store, get_video_store

    for closer in (get_video_store, get_document_store, get_chat_store):
        try:
            await closer().close()
        except Exception:
            logger.exception("store.close_failed")


app = FastAPI(
    title="Calculum — Video RAG Support Agent",
    description=(
        "Answers user questions grounded strictly in support-video transcripts, returns a "
        "deep-linked video clip, and auto-escalates to email support when it cannot answer."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# CORS so the browser frontend can call the API cross-origin. Origins come from
# CORS_ALLOWED_ORIGINS (comma-separated) → settings.cors_origins. A "*" wildcard cannot be
# combined with allow_credentials per the CORS spec, so disable credentials in that case
# (the FE authenticates with a Bearer JWT header, not cookies, so credentials aren't needed).
_cors_origins = settings.cors_origins or ["*"]
_allow_all_origins = _cors_origins == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=not _allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


from api.routes.support import router as support_router  # noqa: E402
from api.routes.videos import router as videos_router  # noqa: E402
from api.routes.documents import router as documents_router  # noqa: E402
from api.routes.threads import router as threads_router  # noqa: E402

app.include_router(support_router)
app.include_router(videos_router)
app.include_router(documents_router)
app.include_router(threads_router)
