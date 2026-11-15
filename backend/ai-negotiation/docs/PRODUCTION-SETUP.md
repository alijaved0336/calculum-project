# Calculum AI: Production Setup Guide

Three repositories on your own GCP infrastructure, with your own PostgreSQL and Qdrant, your existing LLM and embedding endpoints, and Ada/Azure B2C single sign-on. There is no username/password login to set up.

`[VERIFY]` marks things only you can confirm. `[GOTCHA]` marks traps.

## 1. What you are deploying

| Repo | Role | Runs as | Port |
|------|------|---------|------|
| **AI Negotiation** | The product API. **Owns the database schema** (Alembic). Reads supplier data and the knowledge base; calls your LLM and embedding endpoints. | Cloud Run service | 8080 |
| **ingestion-calculum** | The only **writer**. Syncs supplier/spend data from the Calculum data API into Postgres, and turns uploaded documents into vectors in Qdrant. | Cloud Run service | 8001 |
| **calculum-tokenize** | A **library** holding the Qwen3-Embedding-4B tokenizer files. A build-time dependency of ingestion. **Never deployed.** Its bundled auth app must not be deployed either (it targets an old schema). | none | none |

The services share only the database, the Qdrant collection and the embedding model. AI Negotiation never calls ingestion.

Order is fixed: **schema → ingestion fills Postgres and Qdrant → AI Negotiation.**

## 2. What you need beforehand

| Item | Notes |
|------|-------|
| GCP project | Cloud Run, Artifact Registry, Secret Manager, GCS, VPC access. |
| PostgreSQL 14+ | Reachable from Cloud Run. No extensions needed. |
| Qdrant | Reachable from Cloud Run, API key enabled, persistent storage. |
| LLM endpoint | OpenAI-compatible (section 3). |
| Embedding endpoint | OpenAI-compatible, Qwen3-Embedding-4B, 2560 dims (section 3). |
| GCS bucket | Uploaded originals for ingestion. Optional second bucket for saved playbook PDFs. |
| **From Calculum** | The data API URL and key; the SSO values (JWKS URL, issuer, audience) and a DNS name under the Ada cookie domain; the knowledge-base documents; the `calculum-tokenize` repo. |

## 3. Your LLM and embedding endpoints

Both services speak plain OpenAI-style HTTP. There is no Google SDK, so check these first.

**LLM** (AI Negotiation only): `POST {LLM_BASE_URL}/v1/chat/completions`, `Authorization: Bearer <key>`.
- `LLM_MODEL` must equal the id from `GET /v1/models`. **Case-sensitive**, a mismatch is HTTP 404.
- Streaming (server-sent events) must work end to end.
- Requests carry `chat_template_kwargs` (vLLM/SGLang). If the backend returns HTTP 400, set `LLM_SUPPORTS_CHAT_TEMPLATE_KWARGS=false`.
- Vertex AI/Gemini is not drop-in. Put an OpenAI-compatible gateway with a static key in front. `[VERIFY]` Only the Qwen family has been tested; the prompts assume a comparable context window.

**Embedding** (both services): `POST {base}/v1/embeddings` with `{"model": ..., "input": [...]}` and a bearer key; the response is `{"data":[{"index":0,"embedding":[...]}]}`.
- It must accept **array input**. Ingestion sends batches of up to 2048 tokens.
- Model **Qwen3-Embedding-4B, 2560 dims**. The tokenizer, vector size and query prefix are all tied to it. A different model means changing the model, dims, collection, tokenizer folder, chunk limits and reranker thresholds together and re-ingesting everything. Ask us first.
- **[GOTCHA]** Ingestion loads the tokenizer from a folder named after `EMBED_MODEL`. Only `Qwen3-Embedding-4B` (exact case) ships. If your server reports `qwen3-embedding-4b`, ingestion fails at startup in the Linux container (it passes on a Mac). Make the server's id match, or copy the folder under the new name inside calculum-tokenize.

**Reranker:** `cross-encoder/ms-marco-MiniLM-L-6-v2` runs inside the AI Negotiation container on CPU and is downloaded from `huggingface.co` on first start. Allow that egress once, or bake the model into the image.

## 4. Settings that apply to both services

- `POSTGRES_DSN`, `COLLECTION_KNOWLEDGE_BASE`, `QDRANT_*` host details, `EMBED_MODEL` and `EMBED_DIMS` must be **identical** in both.
- **SSO** (required): `AZURE_JWKS_URL`, `AZURE_B2C_ISSUER`, `AZURE_B2C_AUDIENCE`, `AZURE_AUTH_COOKIE_NAME` (default `__Secure-auth_session-token`). The API hostnames must sit under the cookie's parent domain, over HTTPS, and the front-end origin must be in the CORS list.
- **No JWT/password setup.** Leave `JWT_SECRET` and `PASSWORD_PEPPER` empty. With an empty key every HS256 Bearer token is rejected (tested on the locked PyJWT 2.13), so `/auth/login` can never succeed. You may block it at the gateway.
- **Users are created automatically.** On a user's first session, AI Negotiation creates their `users` row (no password) and the tenant's settings. Ingestion does the same for a **super admin's** first upload. Switch off with `SSO_AUTO_PROVISION_USERS=false`.
- Roles come from the token: `extension_IsSuperAdmin` → platform admin; `ROLE_COMPANY_ADMIN` → admin; otherwise user. Company admins (non-super) cannot use the tenant-scoped `/settings` endpoints.
- Use Secret Manager (`--set-secrets`) for `POSTGRES_DSN`, `LLM_API_KEY`, `EMBED*_KEY`, `QDRANT_API_KEY`, `CALCULUM_API_KEY`.

## 5. Step-by-step

### Step 1: infrastructure
VPC connectivity (`--vpc-egress private-ranges-only` reaches private IPs through the VPC and the public internet directly), Artifact Registry repo, bucket(s), and one runtime service account per service (`secretAccessor`; ingestion also `storage.objectAdmin` on its bucket; AI Negotiation needs bucket access plus URL-signing rights only if saved playbook PDFs are enabled).

### Step 2: make calculum-tokenize buildable
ingestion's `pyproject.toml` and `uv.lock` pull it from a **private Calculum Azure DevOps repo**, so your ingestion build fails until you do **one** of these:

- **A (git):** copy the repo (tag `v0.1.0`) into a repo your CI can read. In ingestion's `pyproject.toml` change the line to `"calculum-tokenizer @ git+https://<your-host>/<path>.git@v0.1.0"`, run `uv lock` once and commit it. In `Dockerfile.base`, point the `dev.azure.com` token rewrite at your host, or delete that step if no token is needed.
- **B (wheel):** run `uv build` in calculum-tokenize, publish the wheel to an Artifact Registry Python repo (or put it in `vendor/`), reference it in `pyproject.toml` (`[tool.uv.sources] calculum-tokenizer = { path = "vendor/....whl" }`), `uv lock`, `COPY vendor/` before `uv sync` in `Dockerfile.base`, and remove the git-token step.

Check inside the built image: `python -c "from calculum_tokenizer import tokenizer_dir; print(tokenizer_dir())"`.

### Step 3: database and schema
```sql
CREATE DATABASE calculum_negotiation ENCODING 'UTF8';
CREATE ROLE calc_migrator LOGIN PASSWORD '<strong>';          -- runs alembic only
GRANT ALL PRIVILEGES ON DATABASE calculum_negotiation TO calc_migrator;
\c calculum_negotiation
GRANT ALL ON SCHEMA public TO calc_migrator;                  -- PG15+
CREATE ROLE calc_app LOGIN PASSWORD '<strong>';               -- both services
GRANT CONNECT ON DATABASE calculum_negotiation TO calc_app;
GRANT USAGE ON SCHEMA public TO calc_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO calc_app;
ALTER DEFAULT PRIVILEGES FOR ROLE calc_migrator IN SCHEMA public
      GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO calc_app;
```
DSN: `postgresql://USER:PASSWORD@HOST:5432/DB` (URL-encode special characters). `[VERIFY]` the TLS (`?ssl=require`) and Cloud SQL socket forms in staging.

Run the migrations from the AI Negotiation repo root, **as a deploy step before each release**:
```bash
export POSTGRES_DSN='postgresql://calc_migrator:...@HOST:5432/calculum_negotiation'
uv sync --frozen --no-dev
uv run alembic upgrade head        # == make migrate-up
uv run alembic current             # must print: e9f0a1b2c3d4 (head)
```
- **[GOTCHA]** Alembic reads **only `POSTGRES_DSN`**. Migrations never run on app startup (`POSTGRES_AUTO_MIGRATE` is declared but unused).
- Never create tables by hand, and never run ingestion's `infrastructure/postgres/schema.sql` (stale). ingestion creates no tables.
- Chain: 15 migrations from `58e035b345d4`. Tested on an empty PostgreSQL 14: it reaches head cleanly.

What the schema holds: **written by ingestion**: `tenants`, `spend_file_versions`, `supplier_ultimate_parents`, `suppliers`, `buying_entity_ultimate_parents`, `buying_entities`, `spends`, `feed_sync_state` (per-feed sync cursor), `adabot_ingestion_logs` (one row per sync run), `kb_documents` (one row per uploaded file). **Written by AI Negotiation**: `users`, `settings`, `threads`, `messages`, `thread_summaries`, `thread_playbooks`, `support_*`.

### Step 4: Qdrant collection
One collection, shared. Create it once, with the name you will set as `COLLECTION_KNOWLEDGE_BASE` in both services (default `calculum-knowledge-base-v1`):
```bash
curl -X PUT "https://<qdrant>:6333/collections/calculum-knowledge-base-v1" \
  -H "api-key: <key>" -H "Content-Type: application/json" -d '{
    "vectors": {"size": 2560, "distance": "Cosine", "on_disk": true},
    "hnsw_config": {"on_disk": true}, "on_disk_payload": true,
    "optimizers_config": {"indexing_threshold": 1000, "memmap_threshold": 1000}}'
```
One unnamed dense vector per point; size = `EMBED_DIMS`. Recommended keyword payload indexes: `metadata.filename`, `file_uuid`. Supplier data is **not** vectorised; it lives in Postgres only.

### Step 5: build the images
```bash
# AI Negotiation (Python 3.12, CPU-only PyTorch, large image)
docker build --platform linux/amd64 -f Dockerfile.base -t <reg>/negotiation-base:<sha256(uv.lock)> .
docker build --platform linux/amd64 --build-arg BASE_IMAGE=<reg>/negotiation-base:<sha256> -t <reg>/negotiation-api:<tag> -f Dockerfile .
# ingestion-calculum (Python 3.11): same pattern; the base needs the tokenizer from step 2.
#   Option A with a token adds:  DOCKER_BUILDKIT=1 ... --secret id=git_pat,env=GIT_PAT
```
Cache the base image by the sha256 of `uv.lock`. Configuration comes from the environment, never a baked `.env`.

### Step 6: deploy ingestion-calculum
**Run exactly one instance** (`--min-instances 1 --max-instances 1`) **[GOTCHA]**: the scheduler runs inside each process (N instances means N duplicate syncs) and job status is held in memory. Keep CPU always allocated (`--no-cpu-throttling`), because work continues after the HTTP response.
```bash
gcloud run deploy ingestion-api --image <reg>/ingestion-api:<tag> --region <region> \
  --port 8001 --memory 4Gi --cpu 2 --cpu-boost --no-cpu-throttling \
  --min-instances 1 --max-instances 1 --timeout 300 \
  --service-account ingestion-runtime@<project>.iam.gserviceaccount.com \
  --network <vpc> --subnet <subnet> --vpc-egress private-ranges-only \
  --set-env-vars "QDRANT_HOST=<bare host>,QDRANT_PORT=6333,QDRANT_USE_TLS=false,COLLECTION_KNOWLEDGE_BASE=calculum-knowledge-base-v1,EMBED_API_URL=<url>,EMBED_MODEL=Qwen3-Embedding-4B,EMBED_DIMS=2560,INGEST_CONCURRENCY=8,STORAGE_TYPE=gcp,GCS_BUCKET=<bucket>,CALCULUM_API_URL=<url>,SCHEDULER_ENABLED=true,SYNC_INTERVAL_MINUTES=180,CORS_ORIGINS=https://<admin-ui>,AZURE_JWKS_URL=<..>,AZURE_B2C_ISSUER=<..>,AZURE_B2C_AUDIENCE=<..>,LOG_FORMAT=json" \
  --set-secrets "POSTGRES_DSN=..:latest,EMBED_API_KEY=..:latest,CALCULUM_API_KEY=..:latest,QDRANT_API_KEY=..:latest"
```
Notes: `QDRANT_HOST` is a bare host (no `https://`); behind TLS use port 443 and `QDRANT_USE_TLS=true`. Set `QDRANT_VERIFY_TLS=true` if Qdrant presents a verifiable certificate (it defaults to `false`, no certificate check). `STORAGE_TYPE` defaults to `local` (ephemeral disk, files vanish on restart), so set `gcp`. `CORS_ORIGINS` defaults to empty, which allows **no** browser origin. An empty `CALCULUM_API_URL` silently disables the scheduler. The service fails hard at startup if the tokenizer folder is missing or Postgres is unreachable; `startup complete` in the log means success.

**First sync.** With `SCHEDULER_ENABLED=true` the full sync starts as soon as the service boots and repeats every `SYNC_INTERVAL_MINUTES`. Order: tenants → spend versions → parents → suppliers/buying entities → spends. The first run is a full load, later runs are deltas (cursor in `feed_sync_state`; it advances only on success, so a killed run loses nothing; writes are idempotent). Watch it:
```sql
SELECT status, started_at, completed_at, logs->'metrics'->'total' FROM adabot_ingestion_logs ORDER BY started_at DESC LIMIT 3;
SELECT feed, updated_after FROM feed_sync_state;        -- 7 rows after a full sync
```
`parse_failed` or `upsert_failed` above zero points at a data or schema problem. A super admin can also trigger `POST /ingest/sync` (body `{}` or `{"feed":"suppliers"}`); to reload one feed in full, `DELETE FROM feed_sync_state WHERE feed='suppliers'` first.

### Step 7: upload the knowledge base
Authenticate as a **Calculum/Ada super admin** (sends the SSO cookie, or forwards it in the `X-Ada-Session` header). Their `users` row is created on the first upload. A non-super-admin uploader needs a row created beforehand, otherwise the vectors still reach Qdrant but no `kb_documents` row is written.
```bash
curl -X POST https://<ingestion>/ingest/upload -H "Cookie: __Secure-auth_session-token=<token>" \
  -F "file=@/path/20260602_AI- Negotiation Playbook.pdf;type=application/pdf" \
  -F "strategy_term_extension=true" -F "strategy_term_extension_scf=true"
# 202 {job_id, file_id, events_url}; progress: GET /ingest/files/<file_id>/events (SSE)
```
Accepted: `.pdf .docx .doc .txt`. Same content already ingested is skipped (`duplicated`); the same filename with new content replaces the old document. Upload everything Calculum supplies: the playbook, concept definitions, case studies.

**[GOTCHA] The pushback playbook is matched by exact filename**: default `20260602_AI- Negotiation Playbook.pdf` (note the space after `AI-`). If yours differs, set `PUSHBACK_KB_FILENAMES='["Exact Name.pdf"]'` in AI Negotiation (a JSON list), or rename the file before uploading.

Check that vectors landed (a `kb_documents.status` of `Upserted` is not proof): `GET /collections/<name>` → `points_count > 0`.

### Step 8: deploy AI Negotiation
Required: `POSTGRES_DSN`; `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`; `EMBEDDING_MODEL_BASE_URL`, `EMBEDDING_MODEL_KEY`, `EMBED_MODEL`, `EMBED_DIMS`; `QDRANT_HOST` (bare host or full URL), `QDRANT_PORT`, `QDRANT_USE_TLS`, `QDRANT_API_KEY`, `COLLECTION_KNOWLEDGE_BASE`; `CORS_ALLOWED_ORIGINS`; the `AZURE_*` values; `PUSHBACK_KB_FILENAMES` if your playbook name differs. Optional: `GCP_STORAGE_BUCKET` (+ `GCP_STORAGE_PREFIX`, `GCP_PROJECT_ID`) for saved playbook PDFs, otherwise they download inline. Leave `LANGFUSE_*` empty (traces contain full prompts with buyer figures) and `ENABLE_TEST_CLIENT=false`.
```bash
gcloud run deploy negotiation-api --image <reg>/negotiation-api:<tag> --region <region> \
  --port 8080 --memory 4Gi --cpu 2 --cpu-boost --no-cpu-throttling \
  --min-instances 1 --max-instances 1 --timeout 300 \
  --service-account negotiation-runtime@<project>.iam.gserviceaccount.com \
  --network <vpc> --subnet <subnet> --vpc-egress private-ranges-only \
  --set-env-vars "^|^LLM_BASE_URL=..|LLM_MODEL=..|EMBEDDING_MODEL_BASE_URL=..|EMBED_MODEL=Qwen3-Embedding-4B|EMBED_DIMS=2560|QDRANT_HOST=..|QDRANT_PORT=6333|QDRANT_USE_TLS=false|COLLECTION_KNOWLEDGE_BASE=calculum-knowledge-base-v1|CORS_ALLOWED_ORIGINS=https://<front-end>|AZURE_JWKS_URL=..|AZURE_B2C_ISSUER=..|AZURE_B2C_AUDIENCE=.." \
  --set-secrets "POSTGRES_DSN=..:latest,LLM_API_KEY=..:latest,EMBEDDING_MODEL_KEY=..:latest,QDRANT_API_KEY=..:latest"
```
- Start with **one instance**: live chat sessions are held in process memory, so with several instances a follow-up or the WebSocket can land on an instance that does not know the session. Scaling beyond one needs session affinity or a shared session store (ask us).
- Give the startup probe 2+ minutes (the reranker loads on first start).
- `CORS_ALLOWED_ORIGINS` is **not enforced by default**: CORS accepts every origin unless you set `CORS_ALLOW_ANY_ORIGIN=false`. Set it to `false` once the front-end origin is listed.
- `/retrieval/*` diagnostic endpoints now require authentication.

## 6. Verify

1. **Boot log (AI Negotiation):** `knowledge base '<name>' ready (points=N)` with N > 0, a pushback category count, and **no `[RAG_FAILURE]`**. Without the collection the service still boots but answers silently lose their grounding. `GET /health` only proves the process is up, in both services.
2. **Database:** `alembic current` is `e9f0a1b2c3d4`; `suppliers`, `spends`, `tenants` have rows; `kb_documents.status = 'Upserted'`.
3. **Qdrant:** `points_count > 0`, vector size 2560, `Cosine`.
4. **App, signed in via Ada:** `GET /auth/me` returns your claims; `GET /tenants` and `GET /suppliers?tenant_id=<slug>` return data; start a session, then chat over REST (`POST /{session_id}/chat`) and the WebSocket (`/{session_id}/negotiation/chat`). Tokens must stream, a definition question must return KB sources, and a supplier-position question must quote real terms. After the first session the user appears in `users` and the tenant in `settings`.
5. **Pushback:** ask it to answer a supplier objection; a reply from the playbook categories confirms the filename match.

Optional: `make backfill-settings` (AI Negotiation repo) pre-creates settings for every tenant. It is idempotent and not required, because the first session for a tenant creates them.

## 7. If something breaks

| Symptom | Cause | Fix |
|---------|-------|-----|
| ingestion boot error `no vendored tokenizer` | `EMBED_MODEL` doesn't match the tokenizer folder (case-sensitive) | Section 3 |
| ingestion image build can't clone `dev.azure.com` | private tokenizer dependency | Step 2 |
| `alembic` ignores DB settings / permission denied | only `POSTGRES_DSN` is read; migration role needs `CREATE` | Step 3 |
| answers ungrounded, `[RAG_FAILURE]` | wrong/empty collection, or `EMBED_DIMS` ≠ collection size | Step 4 |
| LLM 404 / 400 | model id case / `chat_template_kwargs` | Section 3 |
| browser can't call ingestion | `CORS_ORIGINS` empty | Step 6 |
| uploaded files vanish after restart | `STORAGE_TYPE=local` | Step 6 |
| duplicate syncs, job 404s | more than one ingestion instance | Step 6 |
| chat works once then "session not found" | several AI Negotiation instances | Step 8 |
| pushback answers empty | playbook filename mismatch | Step 7 |
| upload completes but no `kb_documents` row | uploader isn't a super admin and has no `users` row | Step 7 |
| sync stuck at `Processing` in `adabot_ingestion_logs` | instance killed mid-run | it re-runs on schedule; no data is lost |

## 8. Never run

`make seed` and `seeds/seed_users.py` (delete every user and set the password `12345678`), `seeds/seed_dev_tenant.py` (inserts a fake dev tenant), ingestion's `scripts/seed.py` (sample data the schema rejects, and `--reset` truncates tables), and anything under `infra/` in AI Negotiation (stale, project-specific). There is no data-migration script from Calculum's own database; yours starts empty and fills through steps 6 and 7.

## 9. What Calculum must still provide

1. Calculum data API URL and key (or an agreed alternative loader writing the same tables).
2. The SSO values and the DNS name under the Ada cookie domain.
3. The knowledge-base documents and the exact playbook filename.
4. The `calculum-tokenize` repository at tag `v0.1.0`.
5. You confirm: your embedding model id (expected `Qwen3-Embedding-4B`, 2560 dims), and your LLM's id, context window and OpenAI compatibility.
