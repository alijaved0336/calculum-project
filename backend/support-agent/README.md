# backend-support-agent

Query-time **Video RAG support agent** for Calculum. Given a user question it retrieves the most relevant
chunks from the shared Qdrant knowledge base, generates an answer grounded strictly in that context with the
self-hosted Qwen LLM, and returns a **deep-linked video clip** (full-video signed URL + `start_ms`/`end_ms`)
that the frontend seeks to and pauses. When nothing is grounded it auto-escalates to email support.

This service is **query-only**. Video upload/compression and transcript/document ingestion are owned by
`ingestion-support-agent`, which writes chunks to Qdrant. This repo never transcodes video.

## Knowledge base

One Qdrant collection, `video-chunks-v1` (2560-dim Qwen embeddings, COSINE), holds **both** sources,
discriminated by `metadata.chunk_source`:

- `"video"` — transcript chunks. Carry `video_id`, `start_ms`, `end_ms`, `gcs_object`, `title`. Produce a
  playable clip.
- `"document"` — standalone support documents. Globally searchable, ground the answer as text only (no clip).

**Same-file guarantee:** after reranking, retrieval locks onto the single highest-scoring video's file. The
answer is grounded on that one video's chunks (plus any document chunks) and returns exactly **one merged
clip** `[min_start, max_end]`. A clip never mixes chunks from different video files, so the frontend can
always seek/pause a coherent segment.

## Pipeline

Small talk (greetings / thanks / goodbyes) is detected up front and answered with a friendly canned reply —
no retrieval, no clip, no escalation (`resolved:true`). Everything else runs the RAG pipeline:

`question → small-talk? → yes: friendly reply · no: embed (Qwen) → retrieve (video-chunks-v1) →
neighbour-expand (prev_id/next_id) → dedupe → cross-encoder rerank → scope to single best video →
format context ([MM:SS–MM:SS] for video) → Qwen grounded answer (streamed on WS, blocking on REST) →
build merged clip (signed URL) → resolved? → (if not) auto-escalate`

The small-talk detector (`application/agent/smalltalk.py`) is a small deterministic rule (no LLM/classifier)
in the agent seam; only short social messages match, so real product questions — even ones that open with
"hi" — still go through RAG.

## Endpoints

- `GET /health` → `{"status":"ok"}`
- `POST /support/query` (JWT) → `{answer, video_clips, document_sources, resolved, sources, escalated, thread_id}`
  (non-streaming; builds the full answer via `LLMClient.complete`). Pass `thread_id` in the body to continue a
  conversation; omit it to start a new one (the response returns the new `thread_id`).
- `WS /support/chat?token=<jwt>` → **true token-by-token streaming**. First frame `{message, thread_id?}`. As the
  Qwen LLM generates, the agent emits `{type:"token", data:"…"}` events live (via `LLMClient.stream`, an OpenAI
  SSE stream with `<think>…</think>` reasoning stripped incrementally across token boundaries), then a final
  `{type:"done", metadata:{video_clips, document_sources, resolved, sources, escalated, thread_id}}`. When a
  question is unresolved the fixed "forwarded to support" message is streamed and `resolved:false` with empty clips.
- `POST /support/threads` (JWT, `{title?}`) → **create a new empty thread** ("New chat"); 201 with the new
  `thread_id` (title defaults to "New chat"). The FE then passes that `thread_id` to `/support/query` or the WS.
  (A thread is also created implicitly on the first turn when `thread_id` is omitted — both flows work.)
- `GET /support/threads` (JWT) → paginated list of the user's threads `{items:[{thread_id,title,message_count,…}], total, page, page_size}`.
- `GET /support/threads/{thread_id}/messages` (JWT) → `{thread_id, title, messages:[{message_id,role,content,metadata,created_at}]}`.
- `PATCH /support/threads/{thread_id}` (JWT, `{title}`) → rename. `DELETE /support/threads/{thread_id}` → delete (cascades messages).
  All thread routes enforce per-user ownership (a thread that isn't yours → 404).

## Chat history & multi-turn memory

Conversations are persisted in this service's **own** tables on the shared DB — `support_threads` and
`support_messages` (`user → threads → messages`, message `metadata` JSONB holds the assistant turn's
clips/doc-sources/resolved/escalated). Video clips are stored as **durable records**
(`{video_id, title, start_ms, end_ms, gcs_object}` — NOT the ephemeral signed URL), so
`GET /support/threads/{id}/messages` **re-signs a fresh `video_url` on read** and replayed history stays
playable after the original signed URL expired. Each turn (incl. small-talk / unresolved) is saved; on a continued
thread the last `CHAT_HISTORY_MAX_MESSAGES` (default 10) messages are fed back into the prompt
(`utils/conversation_history.py`) for true multi-turn memory. Persistence is best-effort — a DB hiccup logs
and the answer still returns — but an unknown/foreign `thread_id` is a hard 404.

**Conversational follow-ups (meta).** Requests that operate on the prior conversation rather than the KB —
"summarize / rewrite / shorten / translate the previous message" — are detected (`application/agent/meta_followup.py`,
a conservative rule) and answered **from the conversation history via the LLM, bypassing RAG + the grounding
gate + escalation** (`utils/prompts/meta_prompt.py`). They use the full prior message (untruncated) so a
"rewrite" has the whole text. This only fires when the thread has history and the request clearly references the
prior turn — genuine KB questions ("summarize the onboarding video") are not hijacked. Toggle with
`ENABLE_META_FOLLOWUPS` (default true). Requires the FE to send `thread_id` (else there's no history to act on).

These tables are owned and migrated by **this** repo via an **isolated Alembic lineage**
(`migrations/`, version table `support_alembic_version`, `down_revision=None`), so its head never collides with
the AI-Negotiation (`alembic_version`) or ingestion (`ingestion_alembic_version`) lineages on the same DB. The
migration is applied on startup when `AUTO_MIGRATE=true` (default; idempotent), or run manually with
`uv run alembic upgrade head`.

**Hybrid answers (video + document citations).** Retrieval spans both sources, so an answer can be grounded
on a video *and* supporting documents. The response carries both: `video_clips` (0–1 merged clip for the
single best video) **and** `document_sources` — a deduped, capped (`RAG_MAX_DOCUMENT_SOURCES`, default 3)
list of `{document_id, title, page_numbers}` for the documents that contributed. The LLM also attributes
documents inline ("According to <title>, p. N…"). Citation-only: no download link is returned (title + pages
come straight from the chunk metadata — no store lookup). A video-only answer has `document_sources: []`; a
document-only answer has `video_clips: []`.

Auth validates the platform's existing HS256 JWT (shared secret with `calculum-tokenize`); no separate login
and **no role gating — any authenticated user can query the agent**. In Swagger (`/docs`) click **Authorize**
and paste the JWT to call the protected routes; the only auth config you need locally is `JWT_SECRET` in
`.env`. The WS authenticates via the `token` query param (browsers can't set WS headers).

## Run locally

**Prerequisites:** Python ≥ 3.11 and [`uv`](https://docs.astral.sh/uv/) (`pip install uv` or
`curl -LsSf https://astral.sh/uv/install.sh | sh`).

```bash
# 1. Enter the repo
cd backend-support-agent

# 2. Install dependencies into a local, git-ignored .venv/
uv sync

# 3. Create your .env (see the variables below). The service talks to the SAME
#    shared infra as ingestion-support-agent (Qdrant / Qwen embed+LLM / Postgres / GCS).
cp .env .env.local 2>/dev/null || true   # or author .env directly

# 4. Run the API with hot-reload
uv run uvicorn api.main:app --reload --port 8080
#   → http://localhost:8080/health, Swagger UI at http://localhost:8080/docs
```

**Authorizing in Swagger:** open http://localhost:8080/docs, click the **Authorize** button (top-right),
paste your calculum-tokenize JWT (no `Bearer ` prefix — Swagger adds it), and **Authorize**. Every
`/support/*` request from the UI then carries the token. Any valid token works; there is no role restriction.

The `.env` must define at least (values come from the shared infra):

```dotenv
QDRANT_HOST=            # http(s)://… or host; COLLECTION_VIDEO_CHUNKS defaults to video-chunks-v1
QDRANT_PORT=6333
QDRANT_USE_TLS=false
COLLECTION_VIDEO_CHUNKS=video-chunks-v1
EMBEDDING_MODEL_BASE_URL=   # Qwen3-Embedding-4B, OpenAI-compatible /v1/embeddings
EMBEDDING_MODEL_KEY=
EMBED_MODEL=Qwen3-Embedding-4B
EMBED_DIMS=2560
LLM_BASE_URL=               # self-hosted Qwen, OpenAI-compatible /v1/chat/completions
LLM_API_KEY=
POSTGRES_DSN=               # escalation email lookup
JWT_SECRET=                 # shared secret with calculum-tokenize (HS256)
GCP_STORAGE_BUCKET=         # + GOOGLE_APPLICATION_CREDENTIALS / GCP_SERVICE_ACCOUNT_JSON for signed URLs
CORS_ALLOWED_ORIGINS=
```

### Smoke-test the endpoints

```bash
# Health (no auth)
curl http://localhost:8080/health
#   → {"status":"ok"}

# Query (needs a valid JWT signed with JWT_SECRET; export it as TOKEN)
curl -X POST http://localhost:8080/support/query \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"how do I set up SSO?"}'

# Streaming chat over WebSocket (token as query param, not header):
#   wscat -c "ws://localhost:8080/support/chat?token=$TOKEN"
#   > {"message":"how do I set up SSO?"}
#   ← {"type":"token","data":"…"}  (live, as the LLM generates)
#   ← {"type":"done","metadata":{video_clips,resolved,sources,escalated}}
```

### Run with Docker

```bash
docker build -t backend-support-agent .
docker run --rm -p 8080:8080 --env-file .env backend-support-agent
```

## Test

```bash
uv run pytest -q                    # unit tests (hermetic, fakes/injected deps — no live services)
uv run pytest -m "not integration"  # same as above, excludes any integration-marked tests
uv run pytest -q tests/test_rag_service.py   # a single file
```

## Configuration

Settings load from `.env` via `pydantic-settings` (`config.py`). Key groups: Qdrant
(`collection_video_chunks=video-chunks-v1`), embedding (`Qwen3-Embedding-4B`, `embed_dims=2560`), LLM (Qwen,
OpenAI-compatible chat), reranker (`ms-marco-MiniLM-L-6-v2`), RAG thresholds (`rag_top_k_retrieve`,
`rag_top_n_rerank`, `rag_score_threshold`, `rag_answerable_threshold`), GCS signed-URL TTL, Postgres DSN
(escalation email lookup), SMTP + escalation rate-limits, and the JWT secret.

The embedding/LLM/Qdrant endpoints must match `ingestion-support-agent`'s (same shared infra) so query
vectors match the indexed vectors.

## Startup

The cross-encoder reranker (`RERANKER_MODEL`, default `ms-marco-MiniLM-L-6-v2`) is loaded **once at app
startup** (a FastAPI `lifespan` hook, off the event loop) — so the first query isn't slow and the heavy
model load never blocks a request. Startup logs `reranker.warming_up` → `reranker.warmed_up` before
"Application startup complete"; the load is best-effort, so if it fails the adapter lazy-loads on first use.
The `Dockerfile` **pre-bakes** this model into the image, so on Cloud Run the warm-up loads from cache
instead of fetching from HuggingFace on cold start.

## Deployment (Cloud Run via Azure Pipelines)

`azure-pipelines.yml` builds → pushes to Artifact Registry → deploys Cloud Run service
`backend-support-agent-api-staging` in `ai-negotiation-494315` / `us-central1` (Test → Build → Deploy,
deploy only on `master`). The image has **no ffmpeg** (query-only; upload/compression stays in
`ingestion-support-agent`).

- **Variable group `Backend-Support-Staging`** (Pipelines → Library) holds all env values. Mark
  credentials/DSN/keys as **secret**: `GCP_SA_KEY` (deploy SA key used by `gcloud`), `QDRANT_API_KEY`,
  `EMBEDDING_MODEL_KEY`, `LLM_API_KEY`, `POSTGRES_DSN`, `JWT_SECRET`, `SMTP_USER`, `SMTP_PASSWORD`. The
  full list is in the pipeline header.
- **Runtime SA JSON** lives in Secret Manager as `GCP_SERVICE_ACCOUNT_JSON` and is mounted with
  `--set-secrets` (the app reads it inline → `from_service_account_info` → GCS signed URLs). Use the same
  SA as `RUNTIME_SA` (`calculum-storage-sa`) so the runtime and signing identities match.
- **`--allow-unauthenticated`**: the browser frontend calls the API directly and the app enforces its own
  JWT — Cloud Run IAM auth would block browsers. **`--timeout 3600`** keeps the WS streaming endpoint open.
- **Must match `ingestion-support-agent`:** `COLLECTION_VIDEO_CHUNKS`, `EMBEDDING_MODEL_BASE_URL`,
  `EMBED_MODEL`, `EMBED_DIMS` (so query vectors match indexed vectors), and `JWT_SECRET` (= calculum-tokenize).
- **CORS:** set `CORS_ALLOWED_ORIGINS` in the `Backend-support-staging` group to your frontend origin(s)
  (comma-separated, e.g. `https://app.calculum.com,https://staging.calculum.com`); the pipeline passes it to
  Cloud Run. It defaults to `http://localhost:5173` (Vite dev). Use `*` only for quick dev — with `*` the app
  disables credentialed CORS (fine here, since the FE authenticates with a Bearer JWT header, not cookies).
  After the first deploy, point the frontend's `VITE_SUPPORT_API_URL` at the printed service URL and ensure its
  origin is in `CORS_ALLOWED_ORIGINS`.
- `uv.lock` is committed so the image builds reproducibly with `uv sync --frozen`.
