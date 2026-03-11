"""Unified Configuration — Single source of truth.

All configuration comes from environment variables via Pydantic Settings.
No ``os.getenv`` calls anywhere else in the codebase.
"""
from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-wide settings loaded from ``.env``."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──────────────────────────────────────────────
    app_name: str = "Sentinel Fabric V2"
    environment: str = "development"
    debug: bool = False
    log_level: str = "INFO"
    api_prefix: str = "/api/v1"
    version: str = "2.0.0"
    cors_origins: list[str] = ["http://localhost:3000"]

    # ── Auth (self-issued JWT) ───────────────────────────
    jwt_secret_key: str  # No default, must be set in env
    jwt_fallback_secret_key: str | None = None
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60 * 24  # 24 hours

    # ── ClickHouse ───────────────────────────────────────
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_database: str = "sentinel"
    clickhouse_user: str = "default"
    clickhouse_password: str = ""

    # ── Redis ────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    redis_host: str = "localhost"
    redis_port: int = 6379

    # ── PostgreSQL ───────────────────────────────────────
    postgres_dsn: str = "postgresql+asyncpg://sentinel:sentinel@localhost:5432/sentinel"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    # ── Kafka ────────────────────────────────────────────
    kafka_bootstrap_servers: str = "localhost:9092"
    kafka_consumer_group: str = "sentinel-pipeline"
    kafka_topics: list[str] = [
        "sentinel.suricata",
        "sentinel.zeek",
        "sentinel.palo_alto",
        "sentinel.windows",
        "sentinel.crowdstrike",
        "sentinel.syslog",
    ]
    kafka_dlq_topic: str = "sentinel.dlq"

    # ── Qdrant ───────────────────────────────────────────
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333

    # ── Pipeline ─────────────────────────────────────────
    pipeline_budget_ms: int = 2000
    sse_heartbeat_seconds: int = 15

    # ── IOC Feeds ──────────────────────────────────────
    otx_api_key: str = ""
    ioc_feed_interval_hours: int = 6

    # ── Narrative ──────────────────────────────────────
    narrative_mode: str = "llm"  # "llm" or "template"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    llama_cpp_model: str = "deepseek-coder"
    llama_cpp_base_url: str = "http://localhost:8080/v1"
    llama_cpp_temperature: float = 0.2
    llama_cpp_max_tokens: int = 200

    # ── SOAR Integrations (Mocks) ──────────────────────
    crowdstrike_api_key: str = ""
    paloalto_api_key: str = ""
    okta_api_token: str = ""


settings = Settings()
