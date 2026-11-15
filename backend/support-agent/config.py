from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    # ── Qdrant (single video collection; the AI Negotiation KB collection is NOT used) ──
    qdrant_host: str = ""
    qdrant_port: int = 6333
    qdrant_api_key: str = ""
    qdrant_use_tls: bool = False
    qdrant_timeout: float = 30.0
    collection_video_chunks: str = "video-chunks-v2"

    # ── Embedding (Qwen3-Embedding-4B, 2560-dim dense; same model as ingestion) ──
    embed_model: str = "Qwen3-Embedding-4B"
    embedding_model_base_url: str = ""
    embedding_model_key: str = ""
    embed_dims: int = 2560
    embed_timeout: float = 60.0

    # ── LLM (self-hosted Qwen, OpenAI-compatible) ──
    llm_model: str = "Qwen3.6-35B-A3B"
    llm_base_url: str = ""
    llm_api_key: str = ""
    chat_path: str = "/v1/chat/completions"
    llm_timeout: float = 120.0
    # Low, explicit temperature: without it the inference server's own default (well above 0)
    # applies, and the exact same prompt/citation-format rules can sample a different token
    # sequence per call — the root cause of "sometimes brackets, sometimes parens, sometimes no
    # citation at all" for the identical question.
    llm_temperature: float = 0.1

    # ── Reranker ──
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"

    # ── RAG ──
    # Retrieve wide and keep more after rerank: a feature's real explanation often spans
    # several transcript windows, so a small top_n let the chunk that merely NAMES the term
    # crowd out the ones that explain it — producing thin/partial answers.
    rag_top_k_retrieve: int = 20
    rag_top_n_rerank: int = 6
    rag_score_threshold: float = 0.50
    rag_answerable_threshold: float = 0.30
    rag_max_document_sources: int = 5
    # "Prefer latest": when two retrieved chunks from DIFFERENT files are near-duplicates
    # (cosine ≥ threshold) they describe the same feature — drop the one from the older
    # upload, so an updated clip supersedes the same segment in an older long video.
    rag_near_dup_threshold: float = 0.90
    # Multi-intent: split a bundled prompt ("do X and also Y") into sub-questions, each
    # answered as its own section with its own video(s)/doc(s). Disable to force one section.
    query_decomposition_enabled: bool = True
    max_subquestions: int = 4
    # Query rewrite + clarification: for a follow-up that's ambiguous without prior context (or
    # has no real content at all, e.g. "?"), either expand it into a standalone retrieval query
    # using recent history, or ask the user to clarify — instead of guessing or running RAG on
    # noise. Disable to force retrieval on the raw text (pre-rewrite behaviour).
    query_rewrite_enabled: bool = True

    # ── Chat history (support_threads / support_messages) ──
    chat_history_max_messages: int = 10   # recent messages fed back to the LLM
    chat_thread_title_max_len: int = 80
    enable_meta_followups: bool = True    # answer "summarize/rewrite the previous message" from history
    auto_migrate: bool = True             # run `alembic upgrade head` on startup

    # ── GCS / video ──
    gcp_storage_bucket: str = ""
    gcp_service_account_json: str = ""
    video_signed_url_ttl_seconds: int = 604800
    max_video_bytes: int = 5 * 1024 * 1024 * 1024  # 5 GB
    max_video_duration_seconds: int = 7200  # 2 h
    allowed_video_mime: str = "video/mp4"
    video_compress_crf: int = 28
    video_target_height: int = 1280

    # ── Postgres (shared users table; escalation email lookup) ──
    postgres_dsn: str = ""

    # ── Escalation ──
    support_email_to: str = ""  # comma-separated; every address receives the escalation
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    escalation_max_per_thread: int = 3
    escalation_window_seconds: int = 3600

    # ── Auth ──
    # HS256 path (calculum-tokenize / standalone frontend):
    #   JWT_SECRET MUST equal calculum-tokenize's secret — tokens are verified locally.
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    # RS256 path (Ada Bot / Azure B2C):
    #   Leave AZURE_B2C_ISSUER / AZURE_B2C_AUDIENCE empty in dev to skip those claim checks.
    azure_jwks_url: str = ""
    azure_b2c_issuer: str = ""
    azure_b2c_audience: str = ""
    azure_auth_cookie_name: str = "__Secure-auth_session-token"
    # Grace window on top of the token's own exp claim — Ada's session lasts
    # ~24h behind a silent refresh this service doesn't run. 0 = today's
    # strict behavior. Set per environment.
    azure_jwt_leeway_hours: int = 0

    # ── App ──
    log_level: str = "INFO"
    cors_allowed_origins: str = "http://localhost:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]


settings = Settings()
