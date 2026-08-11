import logging
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


_WEAK_JWT_SECRETS = {"change_me", "secret", "lifelink_secret_key_123", "test_secret", "default", "1234567890"}


class Settings(BaseSettings):
    app_name: str = "LifeLink FastAPI Service"
    app_env: str = "development"
    host: str = "0.0.0.0"
    port: int = 3001

    postgres_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/lifelink_db"
    jwt_secret: str = "change_me"
    privacy_salt: str = "change_me"

    frontend_url: str = "http://localhost:5000"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    llm_provider: str = "groq"
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com"
    groq_model: str = "groq/compound"

    # OpenAI / OpenAI-compatible LLM endpoint (design.md config)
    openai_api_key: str = ""
    openai_base_url: str = "http://144.79.62.242:8000/v1"
    openai_model: str = "qwen3.6-27b"
    llm_max_output_tokens: int = 8192
    llm_endpoint: str = "http://144.79.62.242:8000/v1/chat/completions"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    rag_collection: str = "knowledge_chunks"
    rag_vector_index: str = "lifelink_vector_index"
    rag_top_k: int = 5

    sendgrid_api_key: str = ""
    sendgrid_from_email: str = "noreply@lifelink.ai"


    @property
    def cors_origins(self) -> list[str]:
        # Keep behavior close to existing Express setup.
        if self.app_env == "production":
            origins = [o.strip().rstrip("/") for o in self.frontend_url.split(",") if o.strip()]
            return origins or ["*"]
        return [
            "http://localhost:5000",
            "http://127.0.0.1:5000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.jwt_secret in _WEAK_JWT_SECRETS:
        logger.warning(
            "JWT_SECRET is set to a known weak/default value ('%s'). "
            "Generate a strong random secret (e.g. via `openssl rand -hex 32`) "
            "and set it in your .env or environment variables.",
            settings.jwt_secret[:3] + "***",
        )
    return settings


def validate_jwt_secret() -> None:
    """Call at startup to fail hard if JWT secret is weak."""
    settings = get_settings()
    if settings.jwt_secret in _WEAK_JWT_SECRETS:
        raise RuntimeError(
            f"JWT_SECRET is set to a known weak value. "
            f"Set JWT_SECRET to a cryptographically random string "
            f"(e.g. 64 hex chars from `openssl rand -hex 32`). "
            f"Current value starts with: {settings.jwt_secret[:4]}***"
        )
    if len(settings.jwt_secret) < 16:
        raise RuntimeError(
            f"JWT_SECRET is too short ({len(settings.jwt_secret)} chars). "
            f"Minimum recommended length is 32 characters."
        )
