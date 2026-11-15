# Calculum AI — Ingestion Service

Dedicated data ingestion service with two core responsibilities:

1. **Supplier Data Ingestion** — fetches spend and supplier data from the Calculum API, persists structured records in PostgreSQL, and stores embedded supplier intelligence in Qdrant.
2. **Document Vector Ingestion** — handles manual uploads of negotiation strategies, playbooks, and examples; chunks and embeds them using `Qwen3-Embedding-4B`; and stores the resulting vectors in Qdrant for downstream retrieval by `core-calculum`.

---

## High-Level Architecture

```
                                    ┌────────────────────────────────────────────────────────────────────────────────────┐
                                    │                                                                                    │
                                    │                                                                                    │
                                    │      API DELTA-PULL PATH                     DOCUMENT INGESTION PIPELINE           │
                                    │      ───────────────────                     ───────────────────────────           │
                                    │                                                                                    │
                                    │  ┌──────────────────────────┐          ┌──────────────────────────────────┐        │
                                    │  │      Calculum API        │          │      Manual Upload (PDF)         │        │
                                    │  └─────────────┬────────────┘          └─────────────────┬────────────────┘        │
                                    │                │ scheduled delta pull                    │ POST /ingest/upload     │
                                    │                ▼                                         ▼                         │
                                    │  ┌──────────────────────────┐          ┌──────────────────────────────────┐        │
                                    │  │ Scheduler / Manual Sync  │          │         FastAPI Layer             │       │
                                    │  └─────────────┬────────────┘          └─────────────────┬────────────────┘        │
                                    │                │                                         │                         │
                                    │                ▼                                         ▼                         │
                                    │  ┌──────────────────────────┐          ┌──────────────────────────────────┐        │
                                    │  │        PostgreSQL        │          │     Chunk (SemanticChunker)       │        │
                                    │  │    (supplier records)    │          └─────────────────┬────────────────┘        │
                                    │  └─────────────┬────────────┘                            │                         │
                                    │                │                                         ▼                         │
                                    │                │                        ┌──────────────────────────────────┐       │ 
                                    │                │                        │    Embed  (Qwen3-Embedding-4B)   │       │
                                    │                │                        └─────────────────┬────────────────┘       │
                                    │                │                                          │                        │
                                    │                └──────────────────┬───────────────────────┘                        │
                                    │                                   │                                                │
                                    └───────────────────────────────────┼────────────────────────────────────────────────┘
                                                                        │
                                                                        ▼
                                                            ┌────────────────────────┐
                                                            │     core-calculum      │
                                                            │  Negotiation Service   │
                                                            └────────────────────────┘
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| API | FastAPI 0.111 |
| Relational DB | PostgreSQL |
| Vector DB | Qdrant (self-hosted) |
| Embeddings | `Qwen3-Embedding-4B` via hosted API (`infrastructure/embedding`) |
| Chunking | `langchain-experimental` SemanticChunker |
| Vector store client | `langchain-qdrant` QdrantVectorStore |
| HTTP client | `httpx` + `tenacity` (retry + backoff) |
| PDF parsing | `pypdf` |
| Scheduler | APScheduler 3 (async, interval-based) |
| Package manager | `uv` |
| Evaluation | `ragas` (testset + LLM-as-judge), `sentence-transformers` (re-ranker), `langchain-openai` |

---

## How to Run Locally

**Prerequisites:** Python 3.11+, Docker Desktop, [`uv`](https://docs.astral.sh/uv/)

```bash
# 1. Install dependencies
uv sync

# 2. Configure environment
cp .env.example .env
# Fill in CALCULUM_API_URL, CALCULUM_API_KEY, and the PostgreSQL block below:
#
# ── PostgreSQL ────────────────────────────────────────────────────────────────
# POSTGRES_DSN=postgresql://calculum:calculum@localhost:5432/calculum

# 3. Start Qdrant + PostgreSQL
docker-compose up -d
curl http://localhost:6333/healthz   # verify Qdrant

# 4. Seed the database (first time, or to reset to clean sample data)
uv run python scripts/seed.py --reset

# 5. Start the API
uv run uvicorn api.main:app --host 0.0.0.0 --port 8001 --reload
```

On startup the service will:
1. Create the two Qdrant collections if they don't exist
2. Start the background delta-pull scheduler (skipped if `CALCULUM_API_URL` is unset)

- Swagger UI: `http://localhost:8001/docs`
- Health check: `http://localhost:8001/health`

### Other useful commands

```bash
# Seed the database with sample data (--reset truncates first)
uv run python scripts/seed.py --reset

# Run smoke test (requires Qdrant + PostgreSQL running)
uv run python scripts/test_pipeline.py

# Run all unit tests (no live services required)
uv run pytest tests/unit/ -v

# Run integration tests (requires Qdrant + embedding API)
uv run pytest tests/integration/ -v -m integration

# Run RAGAS integration tests (requires Qdrant + embedding + LLM + eval key)
uv run pytest tests/integration/test_ragas_metrics.py -v -m ragas

# Run end-to-end evaluation tests (requires full stack running on :8001)
uv run pytest tests/e2e/ -v -m e2e

# Add a runtime dependency
uv add some-package

# Add a dev-only dependency
uv add --group dev some-package
```

---

## Architecture

Hexagonal (Ports & Adapters). LangChain handles embedding, chunking, and vector store operations; the application layer orchestrates the flow.

```
┌─────────────────────────────────────────────────────────────┐
│  API (FastAPI)          Scheduler (APScheduler)             │
│  POST /ingest/upload    delta pull every N min              │
│  POST /ingest/sync      ─────────────────────┐             │
└──────────────┬──────────────────────────────┘│             │
               │                               ▼             │
        ┌──────▼────────────────────────────────────────┐    │
        │  Application Layer                            │    │
        │  ApiIngestionService  DocumentIngestionService│    │
        └──────────────────────┬────────────────────────┘    │
                               │                             │
        ┌──────────────────────▼────────────────────────┐    │
        │  Agents / Pipeline                            │    │
        │  fetch → transform → serialize → Document     │    │
        │  SemanticChunker → QdrantVectorStore          │    │
        └──────────────────────┬────────────────────────┘    │
                               │                             │
        ┌──────────────────────▼────────────────────────┐    │
        │  Infrastructure (swappable)                   │    │
        │  CalculumApiClient · EntitySerializer         │    │
        │  FileCursorStore · InMemoryJobStore           │    │
        └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

`dependencies.py` is the single wiring point — all LangChain objects (`QwenEmbeddings`, `SemanticChunker`, `QdrantVectorStore`) are `@lru_cache` singletons constructed there.

---

## Evaluation Framework

The `evaluation/` package provides a four-layer quality assessment of the full ingestion → retrieval → RAG pipeline. Each layer is independent — you can run any subset.

```
Layer 1 — Chunk Structural Metrics   (no model calls, instant)
Layer 2 — Embedding Semantic Coherence (reads vectors already in Qdrant)
Layer 3 — Retrieval Quality: Hit Rate & MRR (requires embedding API + Qdrant)
Layer 4 — Full RAGAS Evaluation      (requires LLM + eval key)
```

### Layer 1 — Chunk Structural Metrics

Computed from `evaluation/chunk_metrics.py`. No model calls needed.

| Metric | Description |
|---|---|
| `chunk_count` | Total chunks after ingestion |
| `token_stats` | mean, stdev, min, max, p5/p25/p75/p95 token counts |
| `overlap.mean/max` | Jaccard similarity between consecutive chunks (word-level) |
| `type_distribution` | Count of `recursive` vs `table` chunk types |
| `empty_chunks` | Chunks with fewer than 10 tokens |

### Layer 2 — Embedding Semantic Coherence

Computed from `evaluation/embedding_metrics.py`. Reads vectors already stored in Qdrant (no re-embedding).

| Metric | Description |
|---|---|
| `embedded_count` | Chunks that have a vector |
| `missing_embeddings` | Chunks without a vector (should be 0) |
| `dim_violations` | Chunks whose vector dimension ≠ `EMBED_DIMS` |
| `malformed_vectors` | Chunks containing NaN or Inf values |
| `semantic_continuity` | Cosine similarity between consecutive chunk embeddings (mean/min/max) |

### Layer 3 — Retrieval Quality (Hit Rate & MRR)

Computed from `evaluation/retrieval_metrics.py`. Derives a synthetic query from the first sentence of each chunk, embeds it, and searches Qdrant. Measures whether the source chunk is retrieved.

Two result sets are produced for comparison:

| Mode | Description |
|---|---|
| **vector_search** (baseline) | Pure Qdrant cosine similarity ranking |
| **reranked** | Vector search candidates re-ranked by `ms-marco-MiniLM-L-6-v2` cross-encoder |

Metrics: `hit_rate@1`, `hit_rate@3`, `hit_rate@5`, `mrr` (Mean Reciprocal Rank).

### Layer 4 — RAGAS Evaluation (LLM-as-Judge)

Computed from `evaluation/ragas_metrics.py`. Runs a full RAG evaluation pipeline:

1. **Testset generation** — RAGAS `TestsetGenerator` builds a knowledge graph from chunk content using the configured eval model and generates N test questions + reference answers. Results are cached in `.ragas_kg_cache/<file_uuid>_testset.json` so the LLM is only called once per document.
2. **Retrieve + re-rank** — Each question is embedded with Qwen, fetched from Qdrant, and re-ranked with the cross-encoder.
3. **Answer generation** — Production Qwen 35B GGUF generates answers from the retrieved context.
4. **Metric scoring** — `ragas.evaluate()` runs `Faithfulness`, `ResponseRelevancy`, `LLMContextPrecisionWithoutReference`, and `LLMContextRecall` using the configured eval model (LLM) and eval embedding model.

LLM roles at a glance:

| Role | Model | Purpose |
|---|---|---|
| Eval LLM | _(configured via `EVAL_LLM_MODEL`)_ | Testset generation + RAGAS metric scoring |
| RAG LLM | Qwen 35B GGUF | Answer generation (production model under test) |
| Retrieval embedding | `Qwen3-Embedding-4B` | Embedding queries for Qdrant search |
| Metric embedding | _(configured via `EVAL_EMBED_MODEL`)_ | RAGAS `ResponseRelevancy` computation |

---

### Running the Evaluator

The `scripts/eval/run_eval.py` CLI handles everything end-to-end: upload → wait → fetch chunks → run selected layers → print report.

```bash
# Layers 1–3 only (no LLM or eval key required):
uv run python scripts/eval/run_eval.py --file path/to/doc.pdf --layers 1,2,3

# All four layers (LLM_BASE_URL + EVAL_LLM_API_KEY must be set in .env):
uv run python scripts/eval/run_eval.py --file path/to/doc.pdf

# Save a JSON report alongside the console output:
uv run python scripts/eval/run_eval.py --file doc.pdf --output report.json

# Evaluate chunks already in Qdrant (skip upload — useful for re-runs):
uv run python scripts/eval/run_eval.py --file-uuid <uuid> --skip-upload --layers 1,2,3

# Adjust retrieval top-K and number of RAGAS test questions:
uv run python scripts/eval/run_eval.py --file doc.pdf --top-k 5 --test-size 10

# Point at a non-default collection or API URL:
uv run python scripts/eval/run_eval.py \
    --file doc.pdf \
    --collection calculum_knowledge_base \
    --api-url http://localhost:8001
```

Full argument reference:

| Argument | Default | Description |
|---|---|---|
| `--file` | — | Path to a document to ingest then evaluate |
| `--file-uuid` | — | UUID of an already-ingested document (mutually exclusive with `--file`) |
| `--skip-upload` | `false` | Skip ingestion; evaluate existing Qdrant chunks |
| `--api-url` | `http://localhost:8001` | Ingestion API base URL |
| `--collection` | value from `.env` | Qdrant collection to evaluate |
| `--layers` | `1,2,3,4` | Comma-separated layer numbers to run |
| `--top-k` | `3` | K for hit-rate metrics and retrieval context window |
| `--test-size` | `5` | Number of RAGAS test questions to generate (Layer 4) |
| `--output` | — | Path to write the full JSON report |
| `--poll-interval` | `3.0` | Seconds between job-status polls during ingestion |
| `--timeout` | `600.0` | Max seconds to wait for the ingestion job |

---

### Running the Tests

Tests are split into three groups with pytest markers:

```bash
# Unit tests — no live services required (pure logic, deterministic fixtures)
uv run pytest tests/unit/ -v

# Integration tests — requires Qdrant + embedding API (creates/deletes a temp collection)
uv run pytest tests/integration/ -v -m integration

# RAGAS integration tests — additionally requires LLM + EVAL_LLM_API_KEY
uv run pytest tests/integration/test_ragas_metrics.py -v -m ragas

# End-to-end tests — requires full stack running on localhost:8001
uv run pytest tests/e2e/ -v -m e2e

# Run all tests at once (skip unavailable services gracefully)
uv run pytest -v
```

| Marker | What it tests | Services needed |
|---|---|---|
| _(none)_ | Unit: chunk metrics, embedding metrics | None |
| `integration` | Retrieval metrics against a live Qdrant + embedding API | Qdrant, embed API |
| `ragas` | Full RAGAS pipeline | Qdrant, embed API, LLM, eval key |
| `e2e` | Upload → ingest → all eval layers via the running API | Full stack on :8001 |

---

## Data Sources

### 1 — Calculum API (structured, tenant-scoped)

Seven feeds polled on a configurable schedule (`SYNC_INTERVAL_MINUTES`, default 15):

| Feed | Endpoint |
|---|---|
| Tenants | `GET /tenants` |
| Spend File Versions | `GET /spend-file-versions` |
| Suppliers | `GET /suppliers` |
| Supplier Ultimate Parents | `GET /supplier-ultimate-parents` |
| Buying Entities | `GET /buying-entities` |
| Buying Entity Ultimate Parents | `GET /buying-entity-ultimate-parents` |
| **Spends** (primary) | `GET /spends` |

First run = full initial load. Subsequent runs = delta pull via `?updatedAfter=<high-water-mark>`. Cursors persisted in `./data/cursors/` as JSON files.

### 2 — PDF Knowledge Base (unstructured, global)

Negotiation playbooks and other documents uploaded via `POST /ingest/upload`. Parsed page-by-page with `pypdf`, semantically chunked, and stored in the `calculum_knowledge_base` collection. Ingestion runs as a FastAPI `BackgroundTask` — the endpoint returns a `job_id` immediately.

---

## Qdrant Collections

| Collection | Contents | Tenant-scoped? | Key payload filters |
|---|---|---|---|
| `calculum_supplier_intel` | All API entities | Yes | `tenant_id`, `entity_type`, `sfv_uuid`, `entity_uuid` |
| `calculum_knowledge_base` | PDF playbooks + docs | No | `doc_type`, `source` |

### Chunk ID strategy

API entity chunks use a deterministic MD5 ID (`tenant_id:entity_type:entity_uuid:chunk_index`). Re-ingesting the same entity overwrites in place — no duplicates.

---

## Embedding

Model: `Qwen3-Embedding-4B` — 2560-dim vectors, served by a hosted API and called via `infrastructure/embedding.QwenEmbeddings`.

- Requests are sent to `EMBED_API_URL` with `Authorization: Bearer <EMBED_API_KEY>`
- At index time: documents encoded as-is (no task prompt)
- At retrieval time: `prompt_name="query"` applied by `core-calculum`
- Batching controlled by `EMBED_BATCH_SIZE` (default 16) to avoid server OOM

---

## Semantic Chunking

Uses `langchain-experimental` `SemanticChunker` (percentile-based breakpoints):

1. Splits text into sentences
2. Embeds sentences with Qwen3
3. Measures semantic distance between adjacent sentences
4. Inserts chunk boundaries where distance exceeds the 95th percentile threshold
5. Each resulting chunk is stored as one Qdrant point

For most API entities the serialised text is short enough to be a single chunk. Splitting activates for large supplier records and multi-page PDFs.

---

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service liveness check |
| `POST` | `/ingest/upload` | Upload a PDF for ingestion (multipart) |
| `POST` | `/ingest/document` | Submit a PDF by server-side path |
| `GET` | `/ingest/document/{job_id}` | Poll document ingestion job status |
| `POST` | `/ingest/sync` | Manually trigger an API delta pull |

### POST /ingest/upload

```bash
curl -X POST http://localhost:8001/ingest/upload \
     -F "file=@/path/to/playbook.pdf" \
     -F "doc_type=negotiation_playbook"
```

Returns `{ "job_id": "...", "status": "queued" }`. Poll `GET /ingest/document/{job_id}` for completion.

### POST /ingest/sync

```json
{ "feed": "suppliers" }
```

Omit `feed` to sync all feeds. Returns `{ "results": { "suppliers": 142, ... } }` (chunks written per feed).

---

## Directory Structure

```
├── api/
│   ├── main.py                    # FastAPI app + lifespan (collections, scheduler)
│   ├── routes/ingest.py           # /ingest/* endpoints
│   └── schemas/ingest.py          # Pydantic request/response models
│
├── agents/
│   ├── api_pipeline.py            # fetch → transform → Document → chunk → upsert
│   ├── document_ingestion_service.py # PDF load → Document → chunk → upsert
│   └── nodes/
│       ├── transform.py           # Raw API dict → domain entity (all 7 types)
│       └── serialize.py           # Domain entity → LangChain Document + metadata
│
├── domain/
│   ├── entities/
│   │   ├── api_entities.py        # Tenant, SpendFileVersion, Spend, Supplier, … (dataclasses)
│   │   └── pipeline.py            # IngestionJob, SyncCursor, FeedName, enums
│   └── ports/                     # Abstract interfaces
│       ├── api_client.py
│       ├── job_store.py
│       └── cursor_store.py
│
├── infrastructure/
│   ├── vector_store/
│   │   └── collections.py         # ensure_collections() — creates Qdrant collections at startup
│   ├── chunking/
│   │   └── entity_serializer.py   # Domain entity → rich natural-language text
│   ├── supplier_data/
│   │   ├── calculum_api_client.py # httpx async client, pagination, rate-limit handling
│   │   └── response_models.py     # Pydantic models for all API feed shapes
│   └── session/
│       ├── in_memory_job_store.py # Thread-safe job status store
│       └── file_cursor_store.py   # Per-feed cursor persistence (./data/cursors/)
│
├── application/
│   ├── api_ingestion_service.py   # Syncs all 7 feeds in dependency order
│   ├── document_ingestion_service.py # Job-tracked async PDF ingestion
│   └── scheduler.py               # APScheduler interval trigger
│
├── evaluation/                    # Four-layer evaluation package
│   ├── chunk_metrics.py           # Layer 1: structural metrics (token stats, overlap, type dist)
│   ├── embedding_metrics.py       # Layer 2: embedding coherence (cosine sim, dim violations)
│   ├── retrieval_metrics.py       # Layer 3: hit rate & MRR (vector search + cross-encoder)
│   ├── ragas_metrics.py           # Layer 4: full RAGAS pipeline (testset → retrieve → answer → score)
│   ├── qdrant_search.py           # Async Qdrant search & scroll helpers
│   ├── reranker.py                # Cross-encoder re-ranker (ms-marco-MiniLM-L-6-v2)
│   ├── adapters.py                # LangChain wrappers for Qwen & eval LLMs/embeddings
│   └── report.py                  # Console and JSON report formatting
│
├── scripts/
│   ├── seed.py                    # Seed sample data into PostgreSQL
│   ├── test_pipeline.py           # End-to-end smoke test (one supplier → Qdrant → search)
│   └── eval/
│       └── run_eval.py            # Evaluation CLI: upload → wait → fetch → Layer 1-4 → report
│
├── tests/
│   ├── conftest.py                # Shared fixtures: sample_chunks, sample_pages, count_tokens_fn
│   ├── unit/
│   │   ├── test_chunk_metrics.py       # Layer 1 unit tests (no services)
│   │   └── test_embedding_metrics.py   # Layer 2 unit tests (no services)
│   ├── integration/
│   │   ├── test_retrieval_metrics.py   # Layer 3: live Qdrant + embed API (marker: integration)
│   │   └── test_ragas_metrics.py       # Layer 4: full RAGAS (marker: ragas)
│   └── e2e/
│       └── test_pipeline_eval.py       # Full stack: upload → ingest → eval layers (marker: e2e)
│
├── .ragas_kg_cache/               # Cached RAGAS testsets keyed by file_uuid (auto-created)
├── config.py                      # All settings via pydantic-settings (.env)
├── dependencies.py                # Single wiring point — LangChain singletons
├── pyproject.toml                 # uv project definition + dependencies
└── docker-compose.yml             # Qdrant (REST :6333, gRPC :6334) + PostgreSQL (:5432)
```

---

## Configuration

All settings are in `config.py` (pydantic-settings). Override any value via `.env`.

| Variable | Default | Description |
|---|---|---|
| `QDRANT_HOST` | `localhost` | Qdrant host |
| `QDRANT_PORT` | `6333` | Qdrant REST port |
| `QDRANT_API_KEY` | _(unset)_ | Set if Qdrant is running with auth |
| `EMBED_API_URL` | _(required)_ | Base URL of the hosted embedding API |
| `EMBED_API_KEY` | _(unset)_ | Bearer token for the embedding API |
| `EMBED_MODEL` | `Qwen3-Embedding-4B` | Model name passed in the API request |
| `EMBED_DIMS` | `2560` | Embedding vector dimensions |
| `EMBED_BATCH_SIZE` | `16` | Texts per embedding API request |
| `EMBED_TIMEOUT` | `180.0` | Embedding request timeout (seconds) |
| `POSTGRES_DSN` | _(unset)_ | PostgreSQL connection string — e.g. `postgresql://calculum:calculum@localhost:5432/calculum` |
| `CALCULUM_API_URL` | _(unset)_ | Base URL of the Calculum API — scheduler disabled if empty |
| `CALCULUM_API_KEY` | _(unset)_ | `X-API-Key` header value |
| `SYNC_INTERVAL_MINUTES` | `15` | Delta pull frequency |
| `CURSOR_STORE_PATH` | `./data/cursors` | Directory for per-feed cursor files |
| `LOG_LEVEL` | `INFO` | Python logging level |
| `LLM_BASE_URL` | _(unset)_ | Base URL of the production RAG LLM (Qwen 35B GGUF) — Layer 4 answer generation |
| `LLM_API_KEY` | _(unset)_ | Bearer token for the RAG LLM |
| `LLM_MODEL` | _(unset)_ | Model name to pass to the RAG LLM API |
| `EVAL_LLM_API_KEY` | _(unset)_ | Eval API key — used by RAGAS for testset generation and metric scoring (Layer 4) |
| `EVAL_LLM_MODEL` | _(unset)_ | Eval model for RAGAS testset generation and evaluation |
| `EVAL_EMBED_MODEL` | _(unset)_ | Eval embedding model for RAGAS `ResponseRelevancy` computation |

---

## Relationship to core-calculum

| This service (`ingestion-calculum`) | `core-calculum` |
|---|---|
| Writes to `calculum_supplier_intel` | Reads from `calculum_supplier_intel` |
| Writes to `calculum_knowledge_base` | Reads from `calculum_knowledge_base` |
| Runs on schedule + document upload | Runs on every negotiation message |
| No LLM required | LLM required for generation |
