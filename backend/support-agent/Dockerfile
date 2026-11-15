# syntax=docker/dockerfile:1
# backend-support-agent — query-time Video RAG support API, Cloud Run ready.
#   No ffmpeg/transcoder: this service only retrieves, generates a grounded answer, and
#   signs GCS URLs (video upload/compression lives in ingestion-support-agent).
#   The cross-encoder reranker model is pre-baked into the image so the startup warm-up
#   loads it from cache instead of downloading from HuggingFace on cold start.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    HF_HOME=/app/.cache/huggingface

# uv binary
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

WORKDIR /app

# Install deps first (better layer caching). Uses the committed uv.lock for a
# reproducible build; falls back to a fresh resolve if the lock is stale/absent.
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen || uv sync --no-dev

# Pre-download the cross-encoder reranker into the image's HF cache so the startup
# warm-up (api.main lifespan) loads from disk — no runtime HuggingFace fetch, faster
# and offline-safe cold starts. Matches settings.reranker_model's default.
RUN .venv/bin/python -c "from sentence_transformers import CrossEncoder; CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

COPY . .

# Cloud Run injects $PORT (usually 8080) and terminates TLS for you.
# Run the venv's uvicorn directly (no `uv run` → no runtime re-sync on the read-only-ish FS).
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", ".venv/bin/uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
