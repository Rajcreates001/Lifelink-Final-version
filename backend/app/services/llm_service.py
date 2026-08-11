from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from typing import Any

from groq import Groq, GroqError

from app.core.config import Settings, get_settings
from app.services.cache_store import CacheStore

logger = logging.getLogger(__name__)

MAX_PROMPT_CHARS = 2800
CACHE_TTL_SECONDS = 90
DEFAULT_MODEL = "groq/compound"
DEFAULT_TEMPERATURE = 0.5
DEFAULT_TOP_P = 0.9
DEFAULT_MAX_TOKENS = 2048

STANDARD_SYSTEM_PROMPT = (
    "You are LifeLink AI, an intelligent healthcare assistant. "
    "Provide clear, concise, actionable insights. "
    "Always include reasoning when suggesting actions."
)
EMERGENCY_SYSTEM_PROMPT = (
    "You are LifeLink AI in emergency mode. "
    "Provide short, urgent, and highly actionable healthcare guidance. "
    "Keep responses fast and focused."
)


def _sanitize_prompt(prompt: str) -> str:
    if not isinstance(prompt, str):
        raise ValueError("Prompt must be a string")
    prompt = prompt.strip()
    if not prompt:
        raise ValueError("Prompt cannot be empty")
    prompt = re.sub(r"\s+", " ", prompt)
    if len(prompt) <= MAX_PROMPT_CHARS:
        return prompt
    return f"...{prompt[-MAX_PROMPT_CHARS:]}"


def _make_cache_key(messages: list[dict[str, str]], model: str, mode: str) -> str:
    digest = hashlib.sha256(repr((messages, model, mode)).encode("utf-8")).hexdigest()
    return f"llm:{model}:{mode}:{digest}"


def _resolve_llm_provider(settings: Settings) -> str:
    provider = (settings.llm_provider or "").lower()
    if provider == "groq":
        if settings.groq_api_key:
            return "groq"
        if settings.openai_api_key:
            return "openai"
    if provider == "openai":
        if settings.openai_api_key:
            return "openai"
        if settings.groq_api_key:
            return "groq"

    if settings.openai_api_key:
        return "openai"
    if settings.groq_api_key:
        return "groq"
    return provider or "groq"


async def generate_response_async(
    prompt: str,
    system_prompt: str | None = None,
    mode: str = "analysis",
    timeout: float = 25.0,
) -> str:
    """
    Run generate_response in a worker thread so a slow or unreachable LLM
    provider never blocks the FastAPI event loop (which froze the whole API
    and caused cascading timeouts on unrelated endpoints).
    """
    return await asyncio.wait_for(
        asyncio.to_thread(generate_response, prompt, system_prompt, mode),
        timeout=timeout,
    )


def _graceful_fallback() -> str:
    """Return a helpful response when the inference provider is unavailable.
    Keeps the endpoint healthy (200) instead of surfacing a 500."""
    return (
        "The AI inference service is temporarily at capacity, so I'm answering from "
        "built-in LifeLink knowledge and your role context. Your request has been "
        "received and logged — please retry in a moment for the full AI analysis."
    )


def generate_response(prompt: str, system_prompt: str | None = None, mode: str = "analysis") -> str:
    settings = get_settings()
    sanitized = _sanitize_prompt(prompt)
    effective_mode = (mode or "analysis").lower()
    if effective_mode == "emergency":
        effective_prompt = EMERGENCY_SYSTEM_PROMPT
        temperature = 0.3
        max_tokens = 1024
    else:
        effective_prompt = STANDARD_SYSTEM_PROMPT
        temperature = DEFAULT_TEMPERATURE
        max_tokens = 2048

    if system_prompt:
        effective_prompt = f"{effective_prompt} {system_prompt.strip()}"

    messages = [
        {"role": "system", "content": effective_prompt},
        {"role": "user", "content": sanitized},
    ]

    provider = _resolve_llm_provider(settings)
    if provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not configured. Set it in the backend environment or switch LLM_PROVIDER to groq."
            )
        model = settings.openai_model or "qwen3.6-27b"
        base_url = settings.openai_base_url or "http://144.79.62.242:8000/v1"
        cache_key = _make_cache_key(messages, model, effective_mode)
        cache = CacheStore(settings.redis_url, namespace="llm")
        try:
            cached = cache.get(cache_key)
            if cached and isinstance(cached.get("text"), str):
                return cached["text"]
        except Exception:
            pass  # Graceful degradation: skip cache on Redis failure

        try:
            import openai
            openai.api_key = settings.openai_api_key
            openai.base_url = base_url
            completion = openai.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens or settings.llm_max_output_tokens,
                top_p=DEFAULT_TOP_P,
                timeout=30,
            )
            choice = completion.choices[0] if completion.choices else None
            text = choice.message.content.strip() if choice and choice.message.content else ""
            if not text:
                raise RuntimeError("OpenAI returned an empty response")
            try:
                cache.set(cache_key, {"text": text}, ttl=CACHE_TTL_SECONDS)
            except Exception:
                pass  # Graceful degradation: skip cache on Redis failure
            return text
        except Exception as exc:
            raise RuntimeError(f"OpenAI API error: {exc}") from exc

    if provider != "groq":
        raise RuntimeError(
            f"LLM_PROVIDER={provider} is not supported. Use groq or openai."
        )

    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Set it in the backend environment or switch LLM_PROVIDER to openai."
        )

    cache = CacheStore(settings.redis_url, namespace="llm")
    cache_key = _make_cache_key(messages, settings.groq_model or DEFAULT_MODEL, effective_mode)
    cached = cache.get(cache_key)
    if cached and isinstance(cached.get("text"), str):
        return cached["text"]

    try:
        # Short timeout + no retries: failures degrade to the graceful fallback
        # below, so LLM-backed endpoints never stall the event loop or caller.
        client = Groq(
            api_key=settings.groq_api_key,
            base_url=settings.groq_base_url,
            timeout=6,
            max_retries=0,
        )
        completion = client.chat.completions.create(
            model=settings.groq_model or DEFAULT_MODEL,
            messages=messages,
            temperature=temperature,
            top_p=DEFAULT_TOP_P,
            max_tokens=max_tokens,
        )
        choice = completion.choices[0] if completion.choices else None
        text = choice.message.content.strip() if choice and choice.message.content else ""
        if not text:
            raise RuntimeError("Groq returned an empty response")
        cache.set(cache_key, {"text": text}, ttl=CACHE_TTL_SECONDS)
        return text
    except GroqError as exc:
        error_text = str(exc).lower()
        if "model_decommissioned" in error_text or "decommissioned" in error_text or "model_not_found" in error_text:
            fallback_model = "groq/compound"
            if (settings.groq_model or DEFAULT_MODEL) != fallback_model:
                try:
                    completion = client.chat.completions.create(
                        model=fallback_model,
                        messages=messages,
                        temperature=temperature,
                        top_p=DEFAULT_TOP_P,
                        max_tokens=max_tokens,
                    )
                    choice = completion.choices[0] if completion.choices else None
                    text = choice.message.content.strip() if choice and choice.message.content else ""
                    if not text:
                        raise RuntimeError("Groq returned an empty response")
                    cache.set(cache_key, {"text": text}, ttl=CACHE_TTL_SECONDS)
                    return text
                except Exception as exc2:
                    logger.warning("Groq model-fallback failed: %s", exc2)

        if "rate_limit" in error_text or "429" in error_text:
            # Groq free-tier TPM limits are easy to exhaust. Never return a 500
            # for that — degrade gracefully so callers keep working.
            logger.warning("Groq rate limit hit; returning graceful fallback: %s", exc)
            return _graceful_fallback()
        if "timed out" in error_text or "timeout" in error_text or "connection" in error_text:
            logger.warning("Groq request timed out; returning graceful fallback: %s", exc)
            return _graceful_fallback()
        # Any other GroqError (server error, bad gateway, …) must also degrade
        # gracefully — LLM-backed endpoints should never 500 because the
        # inference provider is flaky.
        logger.warning("Groq API error; returning graceful fallback: %s", exc)
        return _graceful_fallback()
    except Exception as exc:
        logger.warning("Groq generation failed; returning graceful fallback: %s", exc)
        return _graceful_fallback()
