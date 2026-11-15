from pydantic_settings import BaseSettings, SettingsConfigDict
from infrastructure.postgres.dsn import sqlalchemy_asyncpg_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    llm_model: str = "Qwen3.6-35B-A3B"
    llm_base_url: str = ""
    llm_api_key: str = ""
    chat_path: str = "/v1/chat/completions"
    # Qwen3 reasoning is OFF by default: on a small context window it eats the
    # generation budget (latency + truncated/empty answers) for little gain on
    # these prescriptive, fact-grounded prompts. Individual calls can override.
    llm_enable_thinking: bool = False
    # `chat_template_kwargs` is a vLLM/SGLang extension (how we toggle Qwen3
    # reasoning). Other chat-completions-compatible backends (llama.cpp, TGI,
    # hosted APIs) may reject the unknown field with HTTP 400 — set False to omit
    # it for those.
    llm_supports_chat_template_kwargs: bool = True

    embed_model: str = "Qwen3-Embedding-4B"
    embedding_model_base_url: str = ""
    embedding_model_key: str = ""
    embed_dims: int = 2560
    # Qwen3-Embedding is trained for ASYMMETRIC retrieval: documents are embedded
    # raw, queries are embedded behind an instruction prefix. We were sending
    # queries raw, which compresses the score band. Measured effect of adding it:
    # relevant queries +0.06/+0.07, off-topic -0.15 (a sourdough-recipe query fell
    # 0.3166 -> 0.1633). Only `embed_query` is prefixed; `embed` stays raw so the
    # document side (ingested by a separate service) is never affected.
    embed_query_instruction_enabled: bool = True
    embed_query_instruction: str = (
        "Given a procurement negotiation question, retrieve passages from the "
        "knowledge base that define or answer it"
    )
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # Retrieval is deliberately WIDE and the precision gate is the cross-encoder,
    # not the dense score. Measured on the live KB: dense cosine separates a real
    # answer from pure gibberish by ~0.05 (gibberish scored 0.4325 while a real
    # definitional query scored 0.4858), so no dense threshold can discriminate.
    # The cross-encoder separates the same pair by ~18 logits. Retrieving 25 also
    # survives the KB's 59% duplicate rate: `_deduplicate` runs after retrieval
    # with no back-fill, so top_k=5 collapsed to ONE unique chunk on every
    # definitional query.
    rag_top_k_retrieve: int = 25
    # Hard cap on pairs handed to the cross-encoder. It is CPU-bound at ~60ms per
    # pair, so this is the latency guard: 30 pairs ≈ 1.8s.
    rag_rerank_max_candidates: int = 30
    rag_top_n_rerank: int = 4
    # Server-side dense pre-filter. None = no gate; Qdrant then returns the top_k
    # nearest regardless of score and the cross-encoder decides. Set a small float
    # only to drop obvious garbage before paying for reranking.
    rag_dense_score_floor: float | None = None
    # The real precision gate: minimum cross-encoder score for a chunk to reach
    # the prompt. `ms-marco-MiniLM-L-6-v2` ships with an Identity activation, so
    # these are RAW LOGITS (roughly -11..+11), not probabilities. Measured for
    # "What is buyer standards?": a real definition +10.71, the chunk the old
    # top_k=5 actually returned -7.42, off-topic/gibberish ≈ -11.
    rag_rerank_score_threshold: float = -4.0
    # Character budget for the injected KNOWLEDGE BASE REFERENCE block. Prompt
    # ceilings in tests/unit/test_prompt_size.py leave as little as ~550 chars of
    # headroom, and raising top_n_rerank multiplies this block.
    rag_context_max_chars: int = 6000

    # ── Supplier pushback knowledge ──────────────────────────────────────────
    # The pushback node answers objections from these knowledge-base documents
    # ONLY — the client's pushback playbook, parsed into whole categories (see
    # application.services.pushback_knowledge). Scoped by `metadata.filename`
    # because nothing else in the ingested payload tells documents apart
    # (`playbook_strategy_type` is identical on every point). Unscoped retrieval
    # is what got RAG removed from this node: the Concepts Definitions and the
    # B2B case studies leaked "15-day harmonisation" and fixed BATNAs into live
    # advice. A re-upload under a new filename must be added here.
    # Env: PUSHBACK_KB_FILENAMES='["a.pdf", "b.pdf"]'
    pushback_kb_filenames: list[str] = ["20260602_AI- Negotiation Playbook.pdf"]
    # How long parsed categories are served before the document is re-read, so
    # an edited upload reaches the product without a restart.
    pushback_kb_cache_ttl_seconds: int = 900
    # Chunks retrieved per objection. Each maps to the 1-3 categories it spans;
    # the cross-encoder then scores those whole categories.
    # 6 missed "we pay our own suppliers early" (Tier 2 Supplier Pressure) on
    # the live KB; 8 found it for ~0.06s more reranking.
    pushback_top_k_retrieve: int = 8
    pushback_max_categories: int = 2
    # Cross-encoder gate for a matched category (raw logit, like
    # rag_rerank_score_threshold), scored against the category's name and
    # supplier arguments — see PushbackCategory.match_text. Calibrated on the
    # live KB (2026-09-24): correct matches scored -3.6 to +8.9, off-topic
    # messages about -11.
    pushback_rerank_score_threshold: float = -4.0
    # The gate when the objection extractor found NOTHING and the negotiator's
    # message is matched on its own. Measured on the live KB (2026-09-24): bare
    # refusals ("they said no", "they're pushing back hard") peaked at -0.5
    # against some category; concerns the extractor missed ("what if their
    # credit insurer cuts our limit?") scored +1.0 to +4.0.
    pushback_unstated_objection_threshold: float = 0.5
    # Score EVERY category with the cross-encoder up to this catalogue size —
    # full recall, ~0.5s for 55, no embedding call. Above it, the scoped
    # vector search shortlists first.
    pushback_full_rerank_max_categories: int = 150
    # A second category is kept only within this many logits of the first:
    # "bank covenant" at -2.7 riding along on a DSO objection that scored +8.3
    # is noise, while "credit insurance" at +2.7 next to "bank covenant" at
    # +4.6 is a genuine second angle.
    pushback_runner_up_margin: float = 3.0

    qdrant_host: str = ""
    qdrant_port: int = 6333
    qdrant_api_key: str = ""
    qdrant_use_tls: bool = False
    # NOTE: this app and the ingestion service currently point at DIFFERENT
    # Qdrant instances AND different collections. Anything ingested through the
    # ingestion service will not be visible here until both sides agree on a
    # host and a collection name — see the startup check in api/main.py, which
    # logs [RAG_FAILURE] when the configured collection is missing or empty.
    collection_knowledge_base: str = "calculum-knowledge-base-v1"

    calculum_api_url: str = ""
    calculum_api_key: str = ""

    postgres_host: str = ""
    postgres_port: int = 5432
    postgres_db: str = ""
    postgres_user: str = ""
    postgres_password: str = ""
    postgres_dsn: str = ""

    @property
    def db_url(self) -> str:
        if self.postgres_dsn:
            return "postgresql+asyncpg://" + self.postgres_dsn.removeprefix("postgresql://")
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # Evaluation — RAGAS judge LLM. Vendor-neutral by design: point these at any
    # self-hosted, chat-completions-compatible endpoint through EVAL_LLM_BASE_URL /
    # EVAL_LLM_MODEL / EVAL_LLM_API_KEY in .env. There is deliberately NO default
    # model — an empty `eval_llm_model` means no judge is configured, and the
    # LLM-scored evaluation metrics are skipped rather than silently billed to a
    # third-party API.
    eval_llm_base_url: str = ""
    eval_llm_api_key: str = ""
    eval_llm_model: str = ""

    # LangFuse online tracing (tracing is skipped when langfuse_public_key is empty
    # or langfuse_tracing_enabled is false). Traces carry full prompts, including
    # buyer-internal figures — see infrastructure/observability/langfuse_tracing.py.
    langfuse_tracing_enabled: bool = True
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_base_url: str = "https://us.cloud.langfuse.com"

    log_level: str = "INFO"
    log_dir: str = "logs"
    ws_debug_log: bool = False
    enable_test_client: bool = False
    gcp_project_id: str = ""
    gcp_storage_bucket: str = ""
    # Set false locally to skip GCS and return the PDF inline for download.
    gcp_playbook_storage_enabled: bool = True
    gcp_storage_prefix: str = "playbooks"
    gcp_storage_timeout_seconds: int = 60
    gcp_signed_url_ttl_seconds: int = 900
    # Optional locally. On Cloud Run, leave this empty and use the runtime
    # service account through Application Default Credentials.
    gcp_service_account_json: str = ""
    # Comma-separated; set CORS_ALLOWED_ORIGINS per environment.
    cors_allowed_origins: str = "http://localhost:5173"
    cors_allow_any_origin: bool = True

    jwt_secret: str = ""
    jwt_expiry_hours: int = 24

    ALGORITHM: str = "HS256"

    # Azure B2C — RS256 JWT verification via JWKS (no secret needed, public keys only)
    azure_jwks_url: str = ""
    azure_b2c_issuer: str = ""          # iss claim — https://login-dev.calculum.ai/<tid>/v2.0/
    azure_b2c_audience: str = ""        # aud claim — the B2C app client ID
    azure_auth_cookie_name: str = "__Secure-auth_session-token"
    # Grace window applied on top of the Azure B2C token's own `exp` claim.
    # Ada's session store treats the SSO session as alive for ~24h behind a
    # silent-refresh cycle this service doesn't participate in, so the raw
    # token can look "expired" here well before the user's real session ends.
    # 0 (default) preserves today's strict behavior; set per-environment.
    azure_jwt_leeway_hours: int = 0
    # SSO users (Azure B2C / Ada) have no row in `users`, yet threads.user_uuid is
    # a foreign key to it. True creates the row on the user's first session start
    # (no password; keyed on the token's `oid`), so history persists without a
    # manual provisioning step. False restores the old "row must already exist".
    sso_auto_provision_users: bool = True
    postgres_pool_size: int = 10
    postgres_max_overflow: int = 0
    postgres_auto_migrate: bool = True

    password_pepper: str = ""
    seed_admin_password: str = "12345678"
    seed_user_password: str = "12345678"
    seed_global_user_password: str = "12345678"

    @property
    def cors_origins(self) -> list[str]:
        # Browsers send `Origin` without a trailing slash and Starlette matches
        # it by exact string, so "https://host/" would silently never match.
        return [
            origin.strip().rstrip("/")
            for origin in self.cors_allowed_origins.split(",")
            if origin.strip()
        ]


settings = Settings()
