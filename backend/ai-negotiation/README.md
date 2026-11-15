# Calculum AI — Negotiation Intelligence Service

An AI-powered procurement negotiation assistant that helps buyers secure better payment terms from suppliers. Built on Calculum's private infrastructure — no data leaves your environment.

---

## What It Does

When a procurement professional submits a supplier query, the service:

1. **Retrieves grounded supplier data** — searches a private Qdrant vector database using hybrid RAG (semantic search + BM25 keyword matching + neural reranking) to pull the most relevant supplier context.
2. **Runs the negotiation pipeline** — a multi-step LangGraph agent graph (research → strategy → generation → validation → escalation) reasons over that context to produce a structured negotiation playbook.
3. **Returns a payment terms playbook** — includes recommended strategy arguments, confidence scores, validation flags, and escalation reasoning where needed.

All inference runs on a self-hosted **Qwen3 35B** model via llama.cpp on a dedicated private GPU. Zero cloud egress.

---

## Architecture Overview

```
                                    ╔═════════════════════════════════════════════════════════════╗
                                    ║                                                             ║
                                    ║  Procurement User                                           ║
                                    ║        │  supplier query                                    ║
                                    ║        ▼                                                    ║
                                    ║  ┌─────────────────────────────────────────────────────┐    ║
                                    ║  │                  FastAPI Service                    │    ║
                                    ║  │                                                     │    ║
                                    ║  │   POST /session/start      →  init negotiation      │    ║
                                    ║  │   POST /session/{id}/msg   →  full response (REST)  │    ║
                                    ║  │   WS   /session/{id}/stream→  token streaming       │    ║
                                    ║  │   GET  /session/{id}/summary  →  session history    │    ║
                                    ║  └──────────────┬──────────────────────────────────────┘    ║
                                    ║                 │                                           ║
                                    ║                 ▼                                           ║
                                    ║  ┌─────────────────────────────────────────────────────┐    ║
                                    ║  │             LangGraph Agent Pipeline                │    ║
                                    ║  │                                                     │    ║
                                    ║  │   research → strategy → generation → validation     │    ║
                                    ║  │                                                     │    ║
                                    ║  │                                                     │    ║
                                    ║  └──────────┬──────────────────────────────────────────┘    ║
                                    ║             │                                               ║
                                    ║       ┌─────┴──────┐                                        ║
                                    ║       ▼            ▼                                        ║
                                    ║  ┌─────────┐  ┌────────────────────────────────────────┐    ║
                                    ║  │  Qdrant │  │         Self-Hosted LLM                │    ║
                                    ║  │ Vector  │  │  Qwen3.6-35B · llama.cpp · private GPU │    ║
                                    ║  │   DB    │  │                                        │    ║
                                    ║  └─────────┘  └────────────────────────────────────────┘    ║
                                    ║                             │                               ║
                                    ║                             ▼                               ║
                                    ║            ┌──────────────────────────────────────────┐     ║
                                    ║            │          Payment Terms Playbook          │     ║
                                    ║            └──────────────────────────────────────────┘     ║
                                    ║                             │                               ║
                                    ║                             └──────▶ returned to user       ║
                                    ║                                                             ║
                                    ╚═════════════════════════════════════════════════════════════╝

```

**Hexagonal (Ports & Adapters) design** — every external dependency (LLM, vector store, session state, supplier data API) is accessed through an abstract port interface. Swapping any component requires changing a single line in `dependencies.py`.

---

## Privacy & Infrastructure

| Concern       | Approach                                                      |
| ------------- | ------------------------------------------------------------- |
| LLM inference | Self-hosted Qwen3 35B on private GPU via llama.cpp            |
| Supplier data | Stays in private Qdrant instance (no third-party vector DB)   |
| Session state | In-process memory store (Redis-ready for production)          |
| Cloud egress  | Zero — all computation runs within Calculum's private network |

---

## Tech Stack

| Layer               | Technology                                   |
| ------------------- | -------------------------------------------- |
| API framework       | FastAPI                                      |
| Agent orchestration | LangGraph                                    |
| Vector database     | Qdrant (hybrid: semantic + BM25 + reranker)  |
| Language model      | Qwen3 35B (llama.cpp, Ollama-compatible API) |
| Embeddings          | `nomic-ai/nomic-embed-text-v1.5`             |
| Reranker            | `BAAI/bge-reranker-base`                     |
| Observability       | Langfuse (distributed tracing, optional)     |
| RAG Evaluation      | RAGAS 0.4.x (offline batch metrics)          |
| Configuration       | pydantic-settings (`.env` binding)           |
| Language            | Python 3.11+ (managed by uv)                 |

---

## API Endpoints

| Method   | Endpoint                | Description                                                 |
| -------- | ----------------------- | ----------------------------------------------------------- |
| `GET`    | `/health`               | Service health, model, and Qdrant status                    |
| `POST`   | `/session/start`        | Begin a negotiation session with supplier + tenant context  |
| `POST`   | `/session/{id}/message` | Submit a query, receive the full playbook response          |
| `WS`     | `/session/{id}/stream`  | Submit a query, receive token-level streaming via WebSocket |
| `GET`    | `/session/{id}/summary` | Retrieve conversation history for a session                 |
| `DELETE` | `/session/{id}`         | End and clear a session                                     |

---

## Project Structure

```
├── api/                   # FastAPI routes and request/response schemas
├── agents/                # LangGraph node functions (one per pipeline stage)
├── domain/
│   ├── entities/          # Core domain models (StrategyBrief, GraphState, etc.)
│   ├── ports/             # Abstract interfaces — LLM, vector store, session, supplier data
│   └── services/          # Domain orchestration logic
├── infrastructure/        # Concrete adapter implementations (swappable)
│   ├── llm/               # LLM adapter — httpx chat-completions client
│   ├── vector_store/      # Qdrant adapter — hybrid search pipeline
│   ├── supplier_data/     # Calculum API adapter
│   └── session/           # In-memory session store
├── scripts/               # Standalone evaluation and diagnostic scripts
├── benchmarking/          # Latency and throughput testing harness
├── tests/                 # Unit, integration, and end-to-end test suites
├── config.py              # Centralised settings via pydantic-settings
├── dependencies.py        # Single dependency-injection wiring point
└── docker-compose.yml     # Local Qdrant setup
```

---

## Observability & Evaluation

### Langfuse (Distributed Tracing)

The RAG pipeline is instrumented with [Langfuse](https://langfuse.com) traces at each stage (dense retrieval, reranking, full pipeline). Tracing is **opt-in** — the service starts and runs normally with empty keys; traces are simply not emitted.

To enable, add the following to your `.env`:

```
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
```

### RAGAS (RAG Quality Evaluation)

`scripts/evaluate_rag.py` runs an offline batch evaluation of the retrieval pipeline using [RAGAS 0.4.x](https://docs.ragas.io). It loads a golden Q&A dataset, runs each question through the full RAG pipeline, generates answers with the production LLM, and scores four metrics:

| Metric | What it measures |
| ------ | ---------------- |
| Faithfulness | Is the answer grounded in the retrieved context? |
| Context Recall | Did retrieval surface the chunks needed to answer? |
| Context Precision | Are the retrieved chunks actually relevant? |
| Answer Relevancy | Does the answer address the question? |

All four metrics are LLM-scored, so they need a judge LLM. There is **no default
judge** — point these at a self-hosted, chat-completions-compatible endpoint in
your `.env`:

```
EVAL_LLM_BASE_URL=http://<host>:<port>
EVAL_LLM_MODEL=<model-name>
EVAL_LLM_API_KEY=<key>
```

Until a judge client is wired up in `_build_judge` (`scripts/evaluate_rag.py`),
the script stops at the config gate and the scored metrics are skipped.
`scripts/eval_summarize.py` runs all of its non-judge checks either way.

Results are saved with a timestamp to `scripts/eval/results/`.

---

## Local Development Setup

**Prerequisites:** [uv](https://docs.astral.sh/uv/getting-started/installation/), Docker Desktop, Ollama

```bash
# 1. Install uv (once per machine)
curl -LsSf https://astral.sh/uv/install.sh | sh
```

```bash
# 2. Clone the repo
git clone <repo-url>
cd ai-negotiation

# 3. Create a virtual environment (.venv/ in the project root)
uv venv

# 4. Install all locked dependencies into the virtual environment
uv sync

# 5. Configure environment
cp .env.example .env   # fill in model and API values

# 6. Start Qdrant
docker-compose up -d qdrant

# 7. Start Ollama
ollama serve

# 8. Start the API
uv run uvicorn api.main:app --reload --port 8000
```

Interactive API docs are available at `http://localhost:8000/docs` once the server is running.

### Common commands

```bash
uv sync                  # install / re-sync dependencies after a git pull
uv add <package>         # add a new dependency (updates pyproject.toml + uv.lock)
uv add --dev <package>   # add a dev-only dependency
uv run pytest            # run tests
uv lock --upgrade        # upgrade all dependencies to latest compatible versions
```

> Dependencies are managed via `pyproject.toml` and locked in `uv.lock`. Never edit `uv.lock` by hand and never use `pip install` directly — changes made outside uv will be overwritten on the next `uv sync`.

### Evaluation & diagnostics

```bash
# Print all RAG pipeline stages for a query (retrieval → rerank → answer)
uv run python scripts/test_rag_pipeline.py "your query here"

# Same, against a specific Qdrant collection
uv run python scripts/test_rag_pipeline.py "your query here" --collection <name>

# Check embedding dimension alignment (useful after a model swap)
uv run python scripts/test_rag_pipeline.py diagnose --collection <name>

# Full RAGAS evaluation against the golden dataset
uv run python scripts/evaluate_rag.py

# Smoke-test: run evaluation on the first 5 questions only
uv run python scripts/evaluate_rag.py --questions 5

# Regression: compare results against a saved baseline
uv run python scripts/evaluate_rag.py --baseline scripts/eval/results/baseline.json
```
