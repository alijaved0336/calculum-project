from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    # ── Qdrant ────────────────────────────────────────────────────────────────
    qdrant_host: str                     # required — hostname or IP of the Qdrant instance
    qdrant_port: int                     # required — 6333 for local HTTP, 443 for hosted TLS
    qdrant_api_key: str | None = None    # API key for hosted Qdrant; None for unauthenticated local
    qdrant_use_tls: bool = False         # True when connecting over HTTPS (hosted Qdrant)
    qdrant_timeout: float = 30.0         # seconds per Qdrant request
    collection_knowledge_base: str       # required — Qdrant collection name for KB documents
    qdrant_upsert_batch_size: int = 64   # points per bulk upsert (batched embed mode only)
    qdrant_enabled: bool = False         # True → check/create Qdrant collections on startup; False → skip
    qdrant_verify_tls: bool = False      # verify the Qdrant server's TLS certificate (HTTPS only)

    # ── Embedding ─────────────────────────────────────────────────────────────
    embed_api_url: str                   # required — base URL of the embedding server, no trailing slash
    embed_api_key: str                   # required — API key for the embedding server
    embed_model: str                     # required — model name sent in the request body
    embed_dims: int = 2560               # vector dimensions; MUST match the collection schema
    embed_timeout: float = 180.0         # seconds to wait for one embedding response
    embed_max_tokens: int = 512          # per-text cap; keep ≥ INGESTION_CHUNK_SIZE or text is truncated
    embed_batching: bool = True          # False → one chunk per request; True → token-aware batching
    embed_batch_max_tokens: int = 2048   # max total tokens per batched call (≤ model context 2048)

    # ── Chunking ─────────────────────────────────────────
    chunking_strategy: str = "hybrid"                   # hybrid (recursive tables + semantic prose) | recursive
    ingestion_chunk_size: int = 512                     # target chunk size in tokens (Qwen tokenizer); ≤ embed_max_tokens
    ingestion_chunk_overlap: int = 100                  # token overlap between adjacent chunks
    ingestion_semantic_breakpoint_percentile: int = 85  # hybrid only — percentile threshold for semantic splits
    ingestion_min_chunk_size: int = 20                  # tokens; chunks ≤ this are merged into the next

    # ── Ingestion — concurrency ───────────────────────────────────────────────
    # Worker threads for BOTH the chunk and embed stages. They run concurrently and
    # hit the same embed server, so peak in-flight requests is up to 2× this value.
    ingest_concurrency: int = 16                   # set via INGEST_CONCURRENCY

    # ── Calculum API ──────────────────────────────────────────────────────────
    calculum_api_url: str = ""           # required for sync — base URL of the Calculum data API
    calculum_api_key: str = ""           # required for sync — API key
    calculum_api_timeout: float = 30.0   # seconds per API request
    calculum_api_max_retries: int = 3    # retry attempts per failed request
    calculum_api_page_limit: int = 100   # rows requested per page (NOT a cap on total pages)

    # ── Scheduler ─────────────────────────────────────────────────────────────
    # How often the full sync pipeline runs (minutes). Override via SYNC_INTERVAL_MINUTES.
    sync_interval_minutes: int = 180     # how often the full sync runs (minutes); 180 = 3 h
    scheduler_enabled: bool = False      # True to run the sync pipeline periodically

    # ── Document storage ──────────────────────────────────────────────────────
    storage_type: str = "local"                       # local | gcp
    local_storage_dir: str = "data/documents"         # LocalStorage base dir
    gcs_bucket: str | None = None                      # GCS_BUCKET
    gcs_credentials_path: str | None = None            # service-account JSON path; None → ADC

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    postgres_dsn: str                       # required — e.g. postgresql://user:password@host:5432/dbname
    postgres_pool_size: int = 10            # pooled connections
    postgres_max_overflow: int = 0          # extra connections above the pool; 0 = requests wait instead
    postgres_connect_timeout: float = 10.0  # seconds to wait for a connection before failing fast

    # ── SSE (document-status stream) ──────────────────────────────────────────
    sse_idle_timeout: float = 15.0   # seconds between heartbeats on an idle stream
    sse_max_cached: int = 1024       # retained last-events; bounds memory for unsubscribed files
    sse_max_queue: int = 64          # per-subscriber backlog cap; bounds a dead/slow client

    # ── Auth — HS256 (standalone) ─────────────────────────────────────────────
    jwt_secret: str = ""             # required — HS256 secret; must match the issuing service
    jwt_expiry_hours: int = 24       # token lifetime in hours
    ALGORITHM: str = "HS256"         # JWT signing algorithm
    password_pepper: str = ""        # appended to plaintext before bcrypt; must match the issuing service

    # ── Auth — Azure B2C (RS256) ──────────────────────────────────────────────
    azure_jwks_url: str | None = None                                    # JWKS endpoint, e.g. https://login-dev.calculum.ai/.../keys
    azure_b2c_issuer: str | None = None                                  # expected iss claim
    azure_b2c_audience: str | None = None                                # expected aud claim (B2C app client ID)
    azure_auth_cookie_name: str = "__Secure-auth_session-token"          # HttpOnly cookie name set by Azure B2C
    # Grace window on top of the token's own exp claim — Ada's session
    # lasts ~24h behind a silent refresh this service doesn't run.
    # 0 = today's strict behavior. Set per environment.
    azure_jwt_leeway_hours: int = 0
    # An Azure B2C / Ada uploader has no row in `users`, yet kb_documents.uploaded_by_user_uuid
    # is a foreign key to it. True creates the row for a platform admin on their first upload
    # (no password, keyed on the token's `oid`); other roles have no tenant to attach, so a
    # row must already exist for them. False restores "the row must already exist".
    sso_auto_provision_users: bool = True

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: str = ""           # comma-separated allowed origins, e.g. http://localhost:5173,https://app.example.com

    # ── App ───────────────────────────────────────────────────────────────────
    log_level: str = "INFO"          # DEBUG | INFO | WARNING | ERROR
    log_format: str = "text"         # text (human-readable) | json (for log aggregators)
    debug: bool = False              # True logs every SQL statement — local only, never production

    # ── Production RAG LLM (answer generation in Layer 4) ─────────────────────
    llm_base_url: str | None = None  # base URL of the answer-generation server
    llm_api_key: str | None = None   # API key for the RAG LLM server
    llm_model: str | None = None     # model name for answer generation

    # ── Evaluation LLM (RAGAS TestsetGenerator + evaluate()) ──────────────────
    # Fast cloud model for SummaryExtractor, testset generation, and metric scoring.
    eval_llm_api_key: str | None = None      # key for Ragas scoring (scripts/eval + tests only)
    eval_llm_model: str = ""                 # model used for eval metric scoring
    eval_embed_model: str = ""               # embedding model used for RAGAS metric scoring


settings = Settings()
