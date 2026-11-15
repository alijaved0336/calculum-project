from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        extra="ignore",
    )

    # ── Qdrant ────────────────────────────────────────────────────────────────
    qdrant_host: str
    qdrant_port: int
    qdrant_api_key: str | None = None
    qdrant_use_tls: bool = False
    qdrant_timeout: float = 30.0
    collection_video_chunks: str = "video-chunks-v2"
    qdrant_upsert_batch_size: int = 64

    # ── Embedding ─────────────────────────────────────────────────────────────
    embed_api_url: str
    embed_api_key: str
    embed_model: str
    embed_dims: int = 2560
    embed_timeout: float = 180.0
    embed_max_tokens: int = 512          # per-text cap; model context window is 2048
    ingest_concurrency: int = 16          # worker threads for BOTH chunk and embed stages (INGEST_CONCURRENCY)
    embed_batching: bool = True         # False → one chunk per request; True → token-aware batching
    embed_batch_max_tokens: int = 2048   # batch never exceeds this total (model context window)

    # ── Chunking ─────────────────────────────────────────
    chunking_strategy: str = "hybrid"          # recursive | hybrid (recursive tables + semantic text)
    ingestion_chunk_size: int = 512               # tokens (Qwen tokenizer); ≤ model context 2048
    ingestion_chunk_overlap: int = 100            # tokens overlap between adjacent chunks
    ingestion_semantic_breakpoint_percentile: int = 85  # hybrid only
    ingestion_min_chunk_size: int = 20            # tokens; chunks ≤ this are merged into the next
    # Transcript chunks pack whole cues up to this wall-clock window (or the token cap
    # above, whichever comes first) so a retrieved clip's start/end is tight (~40s) rather
    # than the ~2-3 min a 512-token chunk of speech would span.
    ingestion_transcript_chunk_ms: int = 40_000   # target chunk duration in ms
    ingestion_transcript_overlap_cues: int = 1    # whole cues shared between adjacent chunks

    # ── Video ingestion ──────────────────────────────────────────────────────
    allowed_transcript_ext: list[str] = [".vtt", ".srt", ".json"]
    allowed_document_ext: list[str] = [".pdf", ".docx", ".doc", ".txt", ".md"]

    # ── Video upload + GCS ─────────────────────────────────────────────────────
    # Storage backend: "gcs" (default) or "local" (filesystem fallback for dev).
    video_storage: str = "gcs"
    local_video_dir: str = "./data"  # local fallback root; files land under <root>/videos/
    max_video_bytes: int = 5 * 1024 * 1024 * 1024  # 5 GB
    max_video_duration_seconds: int = 7200  # 2 h
    allowed_video_mime: str = "video/mp4"
    # OFF for now: store originals as-is. The GCP Transcoder completion leg (transcoder-notification
    # webhook) is not wired reliably, so enabling compression strands videos ≥ video_compress_min_bytes
    # at "compressing" (never "ready", never indexed). Re-enable with VIDEO_COMPRESS_ENABLED=true only
    # after that webhook is verified end-to-end.
    video_compress_enabled: bool = False
    # Speed-first, quality-preserving defaults: CRF 20 keeps the picture sharp (no blur),
    # the 1080p cap only shrinks sources taller than 1080p, and "veryfast" encodes ~5-10x
    # faster than "slow" at the SAME CRF-20 quality (only the file is marginally larger).
    # Skip re-encoding for small/already-optimized sources: CRF targets QUALITY not size, so a
    # low-bitrate file below this threshold would only grow. Store it as-is (copy → videos/) instead.
    video_compress_min_bytes: int = 50 * 1024 * 1024  # 50 MB
    video_compress_crf: int = 20  # x264 CRF (quality knob): lower = sharper/larger (18=~lossless, 28=lossy)
    video_compress_preset: str = "veryfast"  # x264 preset (speed knob): does NOT change quality at fixed CRF
    video_target_height: int = 1080  # downscale only sources taller than this (px); ≤1080p untouched
    gcp_project_id: str = ""
    gcp_storage_bucket: str = ""                # compressed videos + transcripts + documents
    gcp_upload_bucket: str = ""                 # separate bucket for direct-uploaded originals (empty = reuse gcp_storage_bucket)
    gcp_storage_prefix: str = "videos"          # folder for compressed videos (in the storage bucket)
    gcp_upload_staging_prefix: str = "uploads"  # folder for direct-uploaded originals (in the upload bucket)
    gcp_transcript_prefix: str = "transcripts"  # bucket folder for transcript files
    gcp_document_prefix: str = "documents"       # bucket folder for general documents
    gcp_storage_timeout_seconds: int = 60
    # Path to a service-account JSON file, OR inline JSON, OR empty (use ADC).
    gcp_service_account_json: str = ""
    # Email of the SA to sign as under ADC (needs roles/iam.serviceAccountTokenCreator);
    # empty when a SA key is provided or default signing works.
    gcp_signing_service_account: str = ""
    video_upload_url_ttl_seconds: int = 604800     # signed upload URL lifetime (1h; large uploads take time)
    # ── GCP Transcoder API (managed video compression, GCS → GCS) ────────────────
    gcp_transcoder_location: str = "us-central1"
    gcp_transcoder_pubsub_topic: str = ""        # projects/<p>/topics/<t> for job-completion events
    # Transcoder requires bitrate_bps even in CRF mode — it's the ceiling, CRF drives the actual
    # bitrate. 8 Mbps is a sane 1080p cap; the CRF-20 encode almost always lands well below it.
    video_transcode_bitrate_bps: int = 8_000_000
    pubsub_audience: str = ""                     # expected OIDC audience on Pub/Sub push webhooks

    # ── Calculum API ──────────────────────────────────────────────────────────
    calculum_api_url: str = ""
    calculum_api_key: str = ""
    calculum_api_timeout: float = 30.0
    calculum_api_max_retries: int = 3
    calculum_api_page_limit: int = 100

    # ── Scheduler ─────────────────────────────────────────────────────────────
    # How often the full sync pipeline runs (minutes). Override via SYNC_INTERVAL_MINUTES.
    sync_interval_minutes: int = 180  # 3 h
    scheduler_enabled: bool = False

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    postgres_dsn: str
    postgres_pool_size: int = 10
    postgres_max_overflow: int = 0
    postgres_connect_timeout: float = 10.0  # seconds; fail fast if DB unreachable

    # ── App ───────────────────────────────────────────────────────────────────
    log_level: str = "INFO"
    log_format: str = "text"
    debug: bool = False
    uploaded_by: str = ""

    # ── Auth (video upload + transcript ingest are superadmin-only) ────────────
    # Standalone / calculum-tokenize path (HS256, shared secret).
    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    # Roles permitted to upload videos / ingest transcripts. Others get 403.
    ingestion_admin_roles: list[str] = ["global_platform_admin", "admin"]
    # Ada Bot / Azure B2C path (RS256, JWKS).
    # Leave issuer/audience empty in dev to skip those claim checks.
    azure_jwks_url: str = ""
    azure_b2c_issuer: str = ""
    azure_b2c_audience: str = ""
    azure_auth_cookie_name: str = "__Secure-auth_session-token"
    # Grace window on top of the token's own exp claim — Ada's session
    # lasts ~24h behind a silent refresh this service doesn't run.
    # 0 = today's strict behavior. Set per environment.
    azure_jwt_leeway_hours: int = 0

    # ── Production RAG LLM (OpenAI-compatible; answer generation in Layer 4) ───
    llm_base_url: str | None = None
    llm_api_key: str | None = None
    llm_model: str | None = None

    # ── Evaluation LLM — OpenAI (RAGAS TestsetGenerator + evaluate()) ──────────
    # Fast cloud model for SummaryExtractor, testset generation, and metric scoring.
    eval_llm_api_key: str | None = None
    eval_llm_model: str = "gpt-4o-mini"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated browser origins allowed to call this API (frontend dev + staging).
    # Mirrors the AI Negotiation service. Override CORS_ALLOWED_ORIGINS in .env per environment.
    cors_allowed_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,"
        "http://localhost:8081,"
        # Staging frontend — Cloud Run serves it on both the project-number and legacy-hash domains.
        "https://calculum-ui-staging-790888106252.us-central1.run.app,"
        "https://calculum-ui-staging-yu3o33nplq-uc.a.run.app,"
        # Ada Bot embedded shell (staging).
        "https://dev-app.hello-ada.com"
    )

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    @property
    def upload_bucket(self) -> str:
        """Bucket that holds direct-uploaded originals (falls back to the storage bucket)."""
        return self.gcp_upload_bucket or self.gcp_storage_bucket


settings = Settings()
