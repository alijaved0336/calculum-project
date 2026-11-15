# Calculum – AI Procurement & Negotiation Platform

Source-structure sample of a multi-service AI platform: a Vue frontend plus several Python (FastAPI) microservices around a shared Qdrant vector store.
This repo shows how the codebase is organised; it is **not** a runnable deployment (env files, models, data and build output are stripped).

## Repository layout

```
backend/
  ai-negotiation/          Negotiation intelligence service (RAG + LangGraph agent pipeline)
  ingestion/               Supplier-data and document ingestion (embeds into Qdrant)
  support-agent/           Query-time video-RAG support assistant (answers with deep-linked video clips)
  ingestion-support-agent/ Superadmin ingestion of support videos/transcripts (FFmpeg, chunking, embeddings)
  tokenize/                Small tokenizer / auth-token service
frontend/
  ai-agent-ui/             Vue 3 chat/agent UI
  platform-ui/             Vue 3 monorepo (Turborepo): apps/{ap,apv2,ar} + packages/{auth,core,design-system}
```

## Technologies

| Layer | Stack |
|-------|-------|
| Frontend | Vue 3, TypeScript, Vite, Pinia, Vue Router, Ant Design Vue, Kendo UI, Apollo (GraphQL) client, Turborepo monorepo, Husky, Nginx for serving |
| Backend | Python 3.11+, FastAPI + Uvicorn, Pydantic v2, SQLAlchemy 2 (async) + asyncpg, Alembic migrations, WebSockets / SSE |
| AI / RAG | Qdrant vector DB, Qwen3-Embedding-4B (sentence-transformers), BM25 + neural reranking (hybrid search), LangChain + LangGraph, self-hosted Qwen LLM (Ollama), Unstructured/pypdf for parsing |
| Data | PostgreSQL, Qdrant, Google Cloud Storage |
| DevOps | Docker (`Dockerfile`, `Dockerfile.base`), docker-compose, Azure Pipelines (dev + prod), uv (`pyproject.toml`/`uv.lock`), Makefiles, pytest |

## How the code flows

All Python services use the same clean layering:

```
api/            FastAPI routers, request/response schemas, auth dependencies
application/    use-cases / orchestration
domain/         entities and ports (interfaces)
infrastructure/ adapters: Postgres repos, Qdrant client, LLM client, GCS, SMTP
migrations/     Alembic
```

1. **Ingestion** – `ingestion` pulls supplier/spend data from the Calculum API into Postgres, and embeds playbooks and uploaded documents into Qdrant. `ingestion-support-agent` does the same for support videos (compress -> store in GCS -> transcript chunks -> embeddings), streaming progress over SSE.
2. **Retrieval** – both `ai-negotiation` and `support-agent` run hybrid retrieval (semantic + BM25 + reranker) against the shared Qdrant collections.
3. **Reasoning** – `ai-negotiation` runs a LangGraph pipeline: research -> strategy -> generation -> validation -> escalation, returning a structured negotiation playbook. `support-agent` answers strictly from retrieved context and returns a video clip (`start_ms`/`end_ms`); with no grounded answer it escalates to email support.
4. **Frontend** – the Vue apps call these services over REST/WebSocket with JWTs (`packages/auth`), manage state in Pinia and render results (chat UI, waterfall/opportunity views, dashboards).
5. **Deploy** – each service builds its own Docker image through Azure Pipelines.

## Running locally (reference)

Python services: `uv sync` -> copy `.env.example` to `.env` -> `uv run uvicorn main:app --reload` (ports differ per service).
Frontends: `npm install` (or pnpm) -> `npm run dev`.
