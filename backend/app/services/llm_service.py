from __future__ import annotations

import hashlib
import re
from typing import Any

from groq import Groq, GroqError

from app.core.config import get_settings
from app.services.cache_store import CacheStore

MAX_PROMPT_CHARS = 2800
CACHE_TTL_SECONDS = 90
DEFAULT_MODEL = "llama3-8b-8192"
DEFAULT_TEMPERATURE = 0.5
DEFAULT_TOP_P = 0.9
DEFAULT_MAX_TOKENS = 512

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


def generate_response(prompt: str, system_prompt: str | None = None, mode: str = "analysis") -> str:
    settings = get_settings()
    if not settings.groq_api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not configured. Set it in the backend environment and do not hardcode it in source."
        )

    sanitized = _sanitize_prompt(prompt)
    effective_mode = (mode or "analysis").lower()
    if effective_mode == "emergency":
        effective_prompt = EMERGENCY_SYSTEM_PROMPT
        temperature = 0.3
        max_tokens = 320
    else:
        effective_prompt = STANDARD_SYSTEM_PROMPT
        temperature = DEFAULT_TEMPERATURE
        max_tokens = DEFAULT_MAX_TOKENS

    if system_prompt:
        effective_prompt = f"{effective_prompt} {system_prompt.strip()}"

    messages = [
        {"role": "system", "content": effective_prompt},
        {"role": "user", "content": sanitized},
    ]

    cache = CacheStore(settings.redis_url, namespace="llm")
    cache_key = _make_cache_key(messages, settings.groq_model or DEFAULT_MODEL, effective_mode)
    cached = cache.get(cache_key)
    if cached and isinstance(cached.get("text"), str):
        return cached["text"]

    try:
        client = Groq(
            api_key=settings.groq_api_key,
            base_url=settings.groq_base_url,
            timeout=10,
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
        raise RuntimeError(f"Groq API error: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Failed to generate response from Groq: {exc}") from exc
