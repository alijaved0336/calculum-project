# Calculum — Video Support Ingestion Service

Superadmin-only ingestion backend for the **RAG support agent**. It owns the write-side steps that make
support content searchable:

1. **Video ingestion** — `POST /videos` accepts an MP4, **compresses** it (FFmpeg), stores it to
   **GCS** (or the local filesystem in dev), probes its duration, and registers it. Heavy work runs in
   the background; status is streamed live over SSE.
2. **Transcript ingestion** — `POST /ingest/video/transcript` takes a timestamped transcript
   (`.vtt` / `.srt` / `.json`) for an already-uploaded video, validates it, chunks it into
   time-windowed segments, embeds them with `Qwen3-Embedding-4B`, and upserts them into the
   `video-chunks-v1` Qdrant collection (tagged `chunk_source="video"`). Status streamed over SSE.
3. **Document ingestion** — `POST /ingest/document` takes a **general document** (`.pdf` / `.docx` /
   `.doc` / `.txt` / `.md`) that isn't linked to any video, parses/chunks/embeds it, and upserts into the
   **same** Qdrant collection tagged `chunk_source="document"`. Status streamed over SSE.

Tracking for all three lives in this service's **own** `video_kb_documents` table (see below). The query
side (retrieval, RAG answer, deep-linked clips) lives in the **support-agent** repo and reads what this
service writes.

> **Single collection, two sources.** Video transcript chunks and general-document chunks share one
> Qdrant collection and one embedding space; they're distinguished by `metadata.chunk_source`
> (`"video"` | `"document"`) so the query side can filter/route by source.

---

## High-Level Architecture

```
        Admin (superadmin JWT)
                │
                │  1) POST /videos (mp4)                2) POST /ingest/video/transcript (vtt/srt/json + video_id)
                ▼                                        ▼
   ┌──────────────────────────────┐        ┌──────────────────────────────────────┐
   │        FastAPI Layer         │        │            FastAPI Layer             │
   │  validate → 202 + video_id   │        │  validate transcript → 202 + job_id  │
   └───────────────┬──────────────┘        └────────────────────┬─────────────────┘
                   │ BackgroundTask                              │ BackgroundTask
                   ▼                                             ▼
   ┌──────────────────────────────┐        ┌──────────────────────────────────────┐
   │  VideoUploadUseCase          │        │  IngestDocumentUseCase (pipeline)    │
   │  compress (ffmpeg) → store   │        │  parse cues → time-window chunk →    │
   │  → probe duration            │        │  embed (Qwen) → upsert               │
   └───────┬───────────────┬──────┘        └───────┬───────────────────────┬──────┘
           │               │                       │                       │
           ▼               ▼                       ▼                       ▼
   ┌───────────────┐  ┌──────────┐        ┌──────────────┐        ┌────────────────────┐
   │ GCS / local   │  │ Postgres │        │   Postgres   │        │  Qdrant            │
   │ videos/<id>.mp4│  │kb_documents│      │  kb_documents │        │  video-chunks-v1   │
   └───────────────┘  └──────────┘        └──────────────┘        └────────────────────┘
           │                                                                  │
           └───────────────► ProgressBroker ◄─── status events ──────────────┘
                                   │
                                   ▼   Server-Sent Events
                    GET /videos/{id}/events
                    GET /ingest/video/{id}/events
                                   │
                                   ▼
                            support-agent (query/RAG) reads kb_documents + video-chunks-v1
```

---

## Flow 1 — Video ingestion (`POST /videos`)

Asynchronous: the endpoint returns `202` immediately; compress + store run in the background and the
client watches progress over SSE (or polls `GET /videos/{video_id}`).

```mermaid
sequenceDiagram
    actor Admin
    participant API as POST /videos
    participant DB as Postgres (kb_documents)
    participant BG as VideoUploadUseCase (background)
    participant FF as FFmpeg
    participant GCS as GCS / local
    participant SSE as GET /videos/{id}/events

    Admin->>API: mp4 + title (Bearer JWT)
    API->>API: validate .mp4 + size (413/422)
    API->>DB: create row (status=uploading, video_status=processing)
    API-->>Admin: 202 { video_id, events_url }
    Admin->>SSE: subscribe (replays buffered events)
    API->>BG: dispatch execute(video_id, tmp)
    BG-->>SSE: processing
    BG->>DB: video_status=compressing
    BG-->>SSE: compressing
    BG->>FF: compress (CRF 20, preset slow, ≤1080p, +faststart)
    BG->>DB: video_status=uploading
    BG-->>SSE: uploading
    BG->>GCS: upload videos/<id>.mp4
    BG->>DB: merge metadata + video_status=uploaded (status=uploaded)
    BG-->>SSE: uploaded (terminal) { size_before, size_after, duration_ms }
```

**Video status lifecycle** (`kb_documents.video_status`):

```
processing ──▶ compressing ──▶ uploading ──▶ uploaded      (accepted → ffmpeg → store → done)
     └──────────────┴───────────────┴───────────▶ failed   (any error; terminal)
```

---

## Flow 2 — Transcript ingestion (`POST /ingest/video/transcript`)

References an already-uploaded video by `video_id`; no video bytes are re-sent. Runs the
parse → chunk → embed → upsert pipeline in the background, streaming status over SSE.

```mermaid
sequenceDiagram
    actor Admin
    participant API as POST /ingest/video/transcript
    participant DB as Postgres (kb_documents)
    participant BG as IngestDocumentUseCase (background)
    participant Q as Qdrant (video-chunks-v1)
    participant SSE as GET /ingest/video/{id}/events

    Admin->>API: transcript (vtt/srt/json) + video_id (Bearer JWT)
    API->>DB: look up video (gcs_object, duration_ms)
    API->>API: validate_transcript (422 if invalid/misaligned)
    API-->>Admin: 202 { job_id, status_url }
    API-->>SSE: uploading (buffered)
    Admin->>SSE: subscribe (replays buffered events)
    API->>BG: dispatch execute(job, transcript, video_id)
    BG-->>SSE: processing
    BG->>BG: parse cues → time-window chunk → embed (Qwen)
    BG-->>SSE: upserting
    BG->>Q: upsert chunks (start_ms/end_ms, prev_id/next_id, chunk_source="video")
    BG->>DB: status=Upserted, transcript_status=upserted, chunk_count=N
    BG-->>SSE: upserted (terminal) { chunk_count }
```

**Transcript status lifecycle** (`kb_documents.transcript_status`):

```
uploading ──▶ processing ──▶ upserting ──▶ upserted     (N chunks written)
                   │                └──────▶ empty       (0 chunks; terminal)
                   └───────────────────────▶ failed      (any error; terminal)
```

### Re-uploading a transcript (idempotent replace)

Re-posting `POST /ingest/video/transcript` for a `video_id` that already has a transcript **replaces**
it — it never accumulates:

- **Old Qdrant vectors are deleted first**, then the new transcript is chunked and upserted. (Chunk ids
  are content-derived, so an *edited* transcript would otherwise leave stale/duplicate points behind.)
- The **old GCS transcript object is deleted** when the new file has a different extension
  (`transcripts/<id>.vtt` → `transcripts/<id>.srt`); a same-extension re-upload overwrites in place.
- Postgres is updated in place: `chunk_count` is re-written to the new total and
  `transcript_gcs_object` / `transcript_filename` / `transcript_format` are re-pointed.
- The **`video_id` / `file_uuid` never changes** — only the vectors and the transcript file are replaced;
  the tracking row is reused, and the stored video (`videos/<id>.mp4`) is untouched.

The same replace-on-reingest applies to documents — re-posting `POST /ingest/document` with an existing
`document_id` purges that document's old chunks + GCS file before re-indexing.

---

## Status tracking & real-time SSE

The two lifecycles are tracked in **dedicated `kb_documents` columns** (added by this feature), and the
coarse legacy `status` column is kept in sync for existing readers:

| Column | Values | Written by |
|---|---|---|
| `video_status` | `processing` → `compressing` → `uploading` → `uploaded` (or `failed`) | `VideoUploadUseCase` |
| `transcript_status` | `uploading` → `processing` → `upserting` → `upserted` (or `empty`/`failed`) | `IngestDocumentUseCase` |
| `status` (coarse, legacy) | `uploading` → `uploaded` → `Processing` → `Upserted`/`Empty`/`Failed` | kept in sync by the same writers |

**SSE transport.** Status transitions are published to an in-process `ProgressBroker`
(`infrastructure/session/progress_broker.py`) and streamed via `sse-starlette` from `api/sse.py`. Each
event is a JSON `data:` frame `{ phase, status, video_id, ... }`. Streams **replay** already-emitted
events on connect (so a client that subscribes right after the `202` still sees the full sequence) and
close on a terminal event.

```bash
# Watch an upload live (superadmin Bearer token required):
curl -N -H "Authorization: Bearer $JWT" http://localhost:8001/videos/<video_id>/events
# data: {"phase":"video","status":"processing","video_id":"..."}
# data: {"phase":"video","status":"compressing","video_id":"..."}
# data: {"phase":"video","status":"uploading","video_id":"...","size_before":..,"size_after":..}
# data: {"phase":"video","status":"uploaded","video_id":"...","duration_ms":..}

# Watch transcript ingestion live:
curl -N -H "Authorization: Bearer $JWT" http://localhost:8001/ingest/video/<video_id>/events
```

> **Single-instance scope.** The broker (like the job store) is in-memory, so SSE requires the client to
> reach the same instance — fine for single-instance Cloud Run. A Redis-backed broker is the
> multi-instance upgrade.

---

## API Endpoints

All ingest/video endpoints require a **superadmin** `calculum-tokenize` JWT (HS256) —
role ∈ `INGESTION_ADMIN_ROLES` (default `global_platform_admin`, `admin`).

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness + Qdrant collection point count |
| `POST` | `/videos/init-upload` | **Preferred.** Get a signed URL to upload the video **directly to GCS** (no bytes through the API). Returns `202 { video_id, upload_url, title, events_url }` |
| `POST` | `/videos/gcs-notification` | Pub/Sub push (OIDC): original landed → mark `uploaded`, submit Transcoder compress job → `compressing` |
| `POST` | `/videos/transcoder-notification` | Pub/Sub push (OIDC): Transcoder job done → `ready` (delete staging) or `failed` |
| `POST` | `/videos` | **Deprecated** — multipart upload through the API + server ffmpeg (times out for large videos). Use `init-upload` |
| `GET` | `/videos/{video_id}` | Current row (status, `video_status`, `metadata`, chunk_count) |
| `GET` | `/videos/{video_id}/events` | **SSE** stream of the video lifecycle (`awaiting_upload → uploaded → compressing → ready`) |
| `POST` | `/ingest/video/transcript` | Ingest a transcript (`vtt/srt/json`) for a `video_id` (async). Returns `202 { job_id, status_url }` |
| `GET` | `/ingest/video/{video_id}/events` | **SSE** stream of the transcript-ingest lifecycle |
| `POST` | `/ingest/document` | Ingest a general document (`pdf/docx/doc/txt/md`), not linked to a video (async). Returns `202 { job_id, file_id, status_url }` |
| `GET` | `/ingest/document/{document_id}/events` | **SSE** stream of the document-ingest lifecycle |
| `GET` | `/ingest/jobs/{job_id}` | Poll transcript/document ingest job status (in-memory job store) |

### POST /videos

```bash
curl -X POST http://localhost:8001/videos \
     -H "Authorization: Bearer $JWT" \
     -F "video=@/path/to/support-clip.mp4" \
     -F "title=How to reset your password"
# 202 { "video_id": "...", "status": "processing",
#       "events_url": "/videos/.../events", "status_url": "/videos/..." }
```

### POST /ingest/video/transcript

Idempotent-replace: re-posting for the same `video_id` replaces the prior transcript (Qdrant vectors +
GCS object) and keeps the `video_id`/`file_uuid` — see [Re-uploading a transcript](#re-uploading-a-transcript-idempotent-replace).

```bash
curl -X POST http://localhost:8001/ingest/video/transcript \
     -H "Authorization: Bearer $JWT" \
     -F "transcript=@/path/to/clip.vtt" \
     -F "video_id=<video_id from POST /videos>" \
     -F "title=How to reset your password"
# 202 { "job_id": "...", "file_id": "<video_id>", "status": "pending",
#       "status_url": "/ingest/jobs/..." }
# Re-run with an edited transcript for the same video_id → old vectors purged, new ones indexed.
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| API | FastAPI 0.111 + Uvicorn |
| Streaming | `sse-starlette` (Server-Sent Events) |
| Relational DB | PostgreSQL (shared `kb_documents` table) |
| Vector DB | Qdrant (self-hosted) — `video-chunks-v1`, 2560-dim, cosine |
| Embeddings | `Qwen3-Embedding-4B` via hosted API (`infrastructure/embedding`) |
| Chunking | time-window / hybrid semantic chunker (`infrastructure/chunking`) |
| Video processing | FFmpeg / ffprobe (system `PATH` → `static-ffmpeg` fallback) |
| Object storage | Google Cloud Storage (`google-cloud-storage`) + local-fs fallback |
| Auth | HS256 JWT (`calculum-tokenize` shared secret), superadmin-only |
| Package manager | `uv` |

---

## How to Run Locally

**Prerequisites:** Python 3.12+, Docker, [`uv`](https://docs.astral.sh/uv/), FFmpeg (or rely on the
bundled `static-ffmpeg`).

```bash
# 1. Install dependencies
uv sync

# 2. Configure environment
cp .env.example .env
# Minimum for local dev (see the Configuration table):
#   POSTGRES_DSN=postgresql://calculum:calculum@127.0.0.1:5432/calculum
#   QDRANT_HOST=localhost / QDRANT_PORT=6333
#   EMBED_API_URL / EMBED_API_KEY / EMBED_MODEL
#   JWT_SECRET  (must match calculum-tokenize)
#   VIDEO_STORAGE=local        # avoids needing GCS creds in dev
#   LOCAL_VIDEO_DIR=./data     # videos land under ./data/videos/<id>.mp4

# 3. Start Qdrant + PostgreSQL
docker-compose up -d
curl http://localhost:6333/healthz          # verify Qdrant

# 4. Create this service's own tracking table (isolated Alembic — never touches the shared schema)
uv run alembic upgrade head

# 5. Start the API
uv run uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

On startup the service creates the `video-chunks-v1` Qdrant collection if missing and connects to Postgres.

- Swagger UI: `http://localhost:8001/docs`
- Health check: `http://localhost:8001/health`

### Tests

```bash
# Unit tests — no live services required
uv run pytest -m "not integration" -q

# Integration tests — require a local Postgres (rolled back per test) + in-memory Qdrant
uv run pytest -m integration -q

# Everything
uv run pytest -q
```

---

## Media storage (videos, transcripts, documents)

One bucket, three folders — selected by `VIDEO_STORAGE` (`gcs` default, or `local` for dev under
`<LOCAL_VIDEO_DIR>/…`; both return the same object names so metadata is identical):

| Content | Object path | Stored by |
|---|---|---|
| Video (compressed) | `videos/<video_id>.mp4` | `POST /videos` (background) |
| Transcript | `transcripts/<video_id>.<ext>` — **same id as the video** | `POST /ingest/video/transcript` (background) |
| Document | `documents/<document_id>.<ext>` | `POST /ingest/document` (background) |

Transcripts/documents are archived to the bucket as the **first step of the background ingest job**
(`uploading` phase). Storage is **fail-fast**: if the upload fails, the job ends `failed` (terminal
`failed` SSE event) and nothing is chunked/embedded. The stored object path is saved on the row's
`metadata` (`gcs_object` for documents; `transcript_gcs_object` for transcripts). Video compression
settings are below.

**Original filename / `title`.** Every upload `202` returns a `title` = the file's original filename
(also persisted on the row) so the frontend can display it: `POST /videos` → the mp4 name,
`POST /ingest/document` → the document name, `POST /ingest/video/transcript` → the transcript name.

### Video compression

**Compression** (`infrastructure/storage/gcs_video_store.py::compress_video`) re-encodes before storing:

```
ffmpeg -i in.mp4 -c:v libx264 -crf 20 -preset veryfast \
       -vf "scale=-2:'min(1080,ih)'" -pix_fmt yuv420p \
       -c:a aac -b:a 128k -movflags +faststart out.mp4
```

**Speed-first, quality-preserving defaults** (`VIDEO_COMPRESS_CRF=20`, `VIDEO_COMPRESS_PRESET=veryfast`,
`VIDEO_TARGET_HEIGHT=1080`), all env-tunable. Sharpness is set by **CRF** (lower = sharper) and the
**resolution cap** (1080p only downscales taller sources); the **preset** only trades encode speed for
file size — `veryfast` keeps the exact CRF-20 quality but encodes ~5–10× faster than `slow` (marginally
larger file). Timing is reported per upload (`compress_ms` / `upload_ms` / `total_ms` in the logs and the
`uploaded` SSE event). Compression is skippable via `VIDEO_COMPRESS_ENABLED=false`, and falls back to the
original file if FFmpeg is unavailable or the re-encode isn't smaller.

---

## Large video uploads — direct-to-GCS + managed compression (preferred)

Routing a 1-hour video through the API and transcoding on the request instance times out and overloads the
server. The preferred path uploads **directly to the bucket** and compresses via the **GCP Transcoder API**:

**Two buckets** — originals and compressed finals are kept apart so we never keep a permanent duplicate:
- **Upload bucket** (`GCP_UPLOAD_BUCKET`) — **transient** originals at `uploads/<id>.mp4`.
- **Storage bucket** (`GCP_STORAGE_BUCKET`) — the compressed `videos/<id>.mp4` (+ transcripts/documents).

```
POST /videos/init-upload {filename,content_type,size_bytes}  → 202 {video_id, upload_url, title}   [SSE awaiting_upload]
client PUTs the ORIGINAL directly to gs://<UPLOAD_BUCKET>/uploads/<id>.mp4   (own % bar; no API bytes)
GCS OBJECT_FINALIZE(uploads/) → Pub/Sub → POST /videos/gcs-notification
     → uploaded → Transcoder job: gs://<UPLOAD_BUCKET>/uploads/<id>.mp4 → gs://<STORAGE_BUCKET>/videos/<id>.mp4 → compressing
Transcoder done → Pub/Sub → POST /videos/transcoder-notification
     → compressed video in the storage bucket; **DELETE the original from the upload bucket** → ready   (or failed)
```

Lifecycle on `GET /videos/{id}/events`: `awaiting_upload → uploaded → compressing → ready` (or `failed`).

**No duplicate copies.** The upload bucket only holds an original *while it's being transcoded* — on success the
original is deleted (only the compressed copy remains in the storage bucket). To reap **failed/abandoned**
uploads that never got deleted, put a **GCS lifecycle rule** on the upload bucket to auto-delete objects after a
few days:
```bash
gcloud storage buckets update gs://<UPLOAD_BUCKET> \
  --add-lifecycle-rule="type=Delete,age=3"   # delete originals older than 3 days
```
(Set `GCP_UPLOAD_BUCKET=` empty to fall back to a single bucket — then `uploads/` and `videos/` are just folders.)

> **SSE + Cloud Run caveat.** The status events come from **Pub/Sub webhooks that can hit any instance**, but
> the `ProgressBroker` is **in-memory per instance** — so SSE is only reliable on a single instance / sticky
> routing. **`GET /videos/{id}` (DB status) is authoritative**; the frontend should poll it as the source of
> truth (a Redis-backed broker would make cross-instance SSE reliable — follow-up).

**One-time GCP setup (ops, not code):**
- Create **two buckets** (`GCP_UPLOAD_BUCKET`, `GCP_STORAGE_BUCKET`) + a **lifecycle Delete rule** on the upload bucket (above).
- Enable the **Transcoder API**; grant its service agent read on the **upload** bucket + write on the **storage** bucket.
- **CORS** on the **upload** bucket: frontend origin, methods `PUT, POST`, headers `Content-Type, x-goog-resumable`.
- **Pub/Sub #1**: notification on the **upload** bucket — `gcloud storage buckets notifications create
  gs://<UPLOAD_BUCKET> --event-types=OBJECT_FINALIZE --object-prefix=uploads/ --topic=<t1>` + push sub → `/videos/gcs-notification` (OIDC).
- **Pub/Sub #2**: topic `<t2>` = `GCP_TRANSCODER_PUBSUB_TOPIC` + push sub → `/videos/transcoder-notification` (OIDC).
- **IAM**: runtime SA → `roles/iam.serviceAccountTokenCreator` (URL signing under ADC) +
  `roles/storage.objectAdmin` on **both** buckets + `roles/transcoder.admin`. Set `PUBSUB_AUDIENCE` to verify the push OIDC token.

Config: `GCP_UPLOAD_STAGING_PREFIX`, `VIDEO_UPLOAD_URL_TTL_SECONDS`, `GCP_SIGNING_SERVICE_ACCOUNT`,
`GCP_TRANSCODER_LOCATION`, `GCP_TRANSCODER_PUBSUB_TOPIC`, `PUBSUB_AUDIENCE` (see `.env.example`).

---

## Transcript formats & validation

`application/ingest/transcript_validator.py` accepts `.vtt`, `.srt`, and `.json` (config
`ALLOWED_TRANSCRIPT_EXT`). It rejects anything that isn't a valid **timestamped** transcript — no ASR:

- ≥ 1 cue with timestamps; monotonic, non-negative, `end ≥ start`.
- Alignment: `max(cue.end_ms) ≤ video.duration_ms + tolerance`.
- Non-empty text.

JSON is flexible: cues may carry `start_ms`/`end_ms`, `start_seconds`/`end_seconds`, or `M:SS` clock
strings, under a top-level list or a `segments`/`cues`/`results` key.

---

## Qdrant collection — `video-chunks-v1`

Created at startup (`infrastructure/vector_store/collections.py`), 2560-dim / cosine. Each transcript
chunk is upserted (`infrastructure/vector_store/ingestion_qdrant_adapter.py::build_video_point`) with:

```json
{ "text": "<aligned transcript window>", "file_uuid": "<video_id>",
  "metadata": { "file_id": "<video_id>", "chunk_source": "video", "video_id": "<video_id>",
    "start_ms": 270500, "end_ms": 330500, "prev_id": "...", "next_id": "...",
    "chunk_type": "hybrid", "gcs_object": "videos/<video_id>.mp4", "title": "..." } }
```

`start_ms`/`end_ms` power deep-linked clips and `prev_id`/`next_id` power neighbour expansion — both
consumed by the query-side support-agent.

Point ids are deterministic content hashes (`stable_chunk_id`), and a re-ingest first purges all points
for the id (`delete_by_file_uuid` matches `file_uuid` **or** `metadata.file_id`) before re-upserting — so
re-uploading a transcript replaces its vectors cleanly with the same `file_uuid` (= `video_id`).

---

## `video_kb_documents` (ingestion-owned tracking table)

This service tracks every upload/ingest in its **own** `video_kb_documents` table — **not** the shared
`kb_documents` table (owned by AI Negotiation). One row per video or document (`media_type` =
`'video'` | `'document'`), with granular per-lifecycle status columns and a JSONB `metadata` blob:

| Column | Notes |
|---|---|
| `media_type` | `video` \| `document` |
| `status` | coarse legacy status, kept in sync |
| `video_status` | `processing → compressing → uploading → uploaded` \| `failed` |
| `transcript_status` | `uploading → processing → upserting → upserted` \| `empty` \| `failed` |
| `document_status` | `uploading → processing → upserting → upserted` \| `empty` \| `failed` |
| `metadata` (JSONB) | media-specific fields (e.g. `gcs_object`, `duration_ms`, `transcript_format`, `page_count`) |
| `uploaded_by_user_uuid` | FK → `users.uuid` (deferrable) |

> **Migrations owned here.** Alembic in this repo is scoped to `video_kb_documents` only (a dedicated
> `IngestionBase.metadata` + its own `ingestion_alembic_version` table), so it can never touch the shared
> schema. Create/upgrade the table with **`uv run alembic upgrade head`**. (Later this can move to the
> main backend repo.)

---

## Directory Structure

```
├── api/
│   ├── main.py                     # FastAPI app + lifespan (ensure collection, connect PG) + /health
│   ├── sse.py                      # sse_response() — ProgressBroker → EventSourceResponse
│   ├── deps/auth.py                # HS256 JWT verify + require_admin (superadmin)
│   ├── routes/
│   │   ├── videos.py               # POST /videos, GET /videos/{id}, GET /videos/{id}/events
│   │   └── ingest.py               # POST /ingest/video/transcript, GET /ingest/video/{id}/events, GET /ingest/jobs/{id}
│   └── schemas/{videos,ingest}.py  # Pydantic request/response models
│
├── application/
│   ├── videos/upload_use_case.py   # compress → store → status/events (background)
│   └── ingest/
│       ├── use_case.py             # parse/chunk/embed/upsert orchestration + status/events
│       ├── pipeline.py             # threaded parse → chunk → embed stages
│       ├── transcript_validator.py # vtt/srt/json validation → cues
│       ├── workers.py / utils.py   # embed workers, chunk stamping, helpers
│
├── domain/
│   ├── entities/
│   │   ├── ingestion.py            # Page, Chunk, IngestionJob, JobStatus
│   │   └── pipeline.py             # KBDocumentStatus, VideoStatus, TranscriptStatus
│   └── ports/                      # job_store, kb_document_store, vector_store, embeddings, ...
│
├── infrastructure/
│   ├── storage/
│   │   ├── gcs_video_store.py      # GCS upload + compress_video + probe_duration_ms
│   │   └── local_video_store.py    # local-fs fallback (VIDEO_STORAGE=local)
│   ├── vector_store/
│   │   ├── collections.py          # ensure video-chunks-v1 (2560/cosine)
│   │   └── ingestion_qdrant_adapter.py # build_video_point + async upsert
│   ├── document_loader/transcript.py   # vtt/srt/json → timestamped Pages + factory
│   ├── chunking/ingestion_chunker.py   # time-window / hybrid chunking
│   ├── embedding/qwen_embedder.py      # Qwen3-Embedding-4B client
│   ├── postgres/
│   │   ├── kb_document.py           # create_video_row, set_video_status, set_transcript_status, get_kb_document
│   │   ├── postgres_adapter.py      # async engine + KBDocument mixin
│   │   └── models/kb_document.py     # ORM: status, video_status, transcript_status, metadata JSONB
│   └── session/
│       ├── ingestion_job_store.py   # in-memory transcript-job store
│       └── progress_broker.py       # in-memory pub/sub for SSE (replay buffer + terminal)
│
├── scripts/add_status_columns.sql   # idempotent local bootstrap for the status columns
├── tests/{unit,integration}/        # TDD suite (SSE, status writers, broker, upload/ingest events)
├── config.py                        # pydantic-settings (.env)
├── dependencies.py                  # lru_cache DI wiring (single wiring point)
└── docker-compose.yml               # PostgreSQL 16 (:5432) + Qdrant (:6333/:6334)
```

---

## Configuration

All settings live in `config.py` (pydantic-settings); override via `.env`.

| Variable | Default | Description |
|---|---|---|
| `POSTGRES_DSN` | _(required)_ | PostgreSQL DSN — e.g. `postgresql://calculum:calculum@127.0.0.1:5432/calculum` |
| `QDRANT_HOST` / `QDRANT_PORT` | `localhost` / `6333` | Qdrant location |
| `QDRANT_API_KEY` / `QDRANT_USE_TLS` | _(unset)_ / `false` | Qdrant auth / TLS |
| `COLLECTION_VIDEO_CHUNKS` | `video-chunks-v1` | Single Qdrant collection for both video + document chunks (tagged by `chunk_source`) |
| `EMBED_API_URL` | _(required)_ | Hosted embedding API base URL |
| `EMBED_API_KEY` | _(required)_ | Bearer token for the embedding API |
| `EMBED_MODEL` | _(required)_ | Embedding model name (`Qwen3-Embedding-4B`) |
| `EMBED_DIMS` | `2560` | Embedding vector dimensions |
| `INGEST_CONCURRENCY` | `16` | Worker threads for **both** the chunk and embed stages (parallel ingestion) |
| `EMBED_BATCHING` / `EMBED_BATCH_MAX_TOKENS` | `true` / `2048` | Token-aware embed batching |
| `QDRANT_UPSERT_BATCH_SIZE` | `64` | Chunks per bulk upsert |
| `ALLOWED_TRANSCRIPT_EXT` | `.vtt,.srt,.json` | Accepted transcript extensions |
| `ALLOWED_DOCUMENT_EXT` | `.pdf,.docx,.doc,.txt,.md` | Accepted general-document extensions |
| `VIDEO_STORAGE` | `gcs` | `gcs` or `local` |
| `LOCAL_VIDEO_DIR` | `./data` | Local storage root (`VIDEO_STORAGE=local`) → `<dir>/videos/<id>.mp4` |
| `MAX_VIDEO_BYTES` | `5 GiB` | Upload size cap (413 if exceeded) |
| `MAX_VIDEO_DURATION_SECONDS` | `7200` | Duration cap (2 h) |
| `VIDEO_COMPRESS_ENABLED` | `true` | Re-encode before storing |
| `VIDEO_COMPRESS_CRF` | `20` | x264 CRF — the quality/sharpness knob (lower = sharper/larger) |
| `VIDEO_COMPRESS_PRESET` | `veryfast` | x264 preset — speed knob; does not change quality at fixed CRF |
| `VIDEO_TARGET_HEIGHT` | `1080` | Downscale only sources taller than this (≤1080p untouched) |
| `GCP_STORAGE_BUCKET` | _(unset)_ | GCS bucket (`VIDEO_STORAGE=gcs`), e.g. `calculum-support-agent-videos` |
| `GCP_STORAGE_PREFIX` | `videos` | Folder for videos → `videos/<video_id>.mp4` |
| `GCP_TRANSCRIPT_PREFIX` | `transcripts` | Folder for transcripts → `transcripts/<video_id>.<ext>` (same id as the video) |
| `GCP_DOCUMENT_PREFIX` | `documents` | Folder for documents → `documents/<document_id>.<ext>` |
| `GCP_SERVICE_ACCOUNT_JSON` | _(unset)_ | SA key path or inline JSON; else Application Default Credentials |
| `JWT_SECRET` | _(required)_ | HS256 shared secret (must match `calculum-tokenize`) |
| `JWT_ALGORITHM` | `HS256` | JWT algorithm (only HS256 accepted) |
| `INGESTION_ADMIN_ROLES` | `global_platform_admin,admin` | Roles allowed to ingest |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,…:4173` | Comma-separated browser origins allowed to call the API |
| `LOG_LEVEL` / `LOG_FORMAT` | `INFO` / `text` | Logging |

---

## Relationship to the rest of the platform

| This service (`ingestion-support-agent`) | support-agent (query side) | AI Negotiation |
|---|---|---|
| Writes videos to GCS + `kb_documents` rows | Reads `kb_documents` + signs video URLs | Owns the `kb_documents` schema/migrations |
| Writes transcript chunks to `video-chunks-v1` | Retrieves + reranks from `video-chunks-v1` | Not involved in the video KB |
| Runs on admin upload / ingest (superadmin) | Runs on every support question | — |
```
