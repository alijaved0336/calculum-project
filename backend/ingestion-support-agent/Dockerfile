# syntax=docker/dockerfile:1
# Video-support ingestion service — Cloud Run ready.
#   ffmpeg/ffprobe : baked into the image (video duration probe + compression).
#   git            : needed by `uv sync` to fetch the calculum-tokenizer git dependency.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/app/.venv

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

# uv binary
COPY --from=ghcr.io/astral-sh/uv:0.5 /uv /usr/local/bin/uv

WORKDIR /app

# Install deps first (better layer caching). Needs git auth for the private
# calculum-tokenizer dependency (see deploy notes). Falls back to a fresh
# resolve if the lockfile is stale.
COPY pyproject.toml uv.lock* ./
# The Azure DevOps PAT is passed as a BuildKit secret and written to an EPHEMERAL gitconfig
# (GIT_CONFIG_GLOBAL) that is deleted within this same RUN — so the token never lands in an
# image layer. Local builds without the secret still work if the host git is already
# authenticated to Azure DevOps.
RUN --mount=type=secret,id=azure_pat \
    sh -c 'set -e; \
      if [ -s /run/secrets/azure_pat ]; then \
        export GIT_CONFIG_GLOBAL=/tmp/gitconfig; \
        git config --file "$GIT_CONFIG_GLOBAL" \
          url."https://pat:$(cat /run/secrets/azure_pat)@dev.azure.com/".insteadOf "https://dev.azure.com/"; \
      fi; \
      uv sync --no-dev --frozen || uv sync --no-dev; \
      rm -f /tmp/gitconfig'

COPY . .

# Cloud Run injects $PORT (usually 8080) and terminates TLS for you.
# Run the venv's uvicorn directly (no `uv run` → no runtime re-sync on the read-only-ish FS).
ENV PORT=8080
EXPOSE 8080
CMD ["sh", "-c", ".venv/bin/uvicorn api.main:app --host 0.0.0.0 --port ${PORT}"]
