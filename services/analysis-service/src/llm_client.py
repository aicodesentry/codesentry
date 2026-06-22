"""
Provider-neutral LLM client for Tier 3 triage.

The triage layer owns prompt construction and parsing. This module only adapts
provider-specific request/response shapes into one small internal response.
"""

import os
from dataclasses import dataclass
from typing import Optional

import httpx


@dataclass(frozen=True)
class LLMResponse:
    text: str
    input_tokens: int
    output_tokens: int
    provider: str
    model: str


def _normalized_provider() -> str:
    configured = (
        os.getenv("LLM_PROVIDER")
        or os.getenv("LLM_TRIAGE_PROVIDER")
        or ""
    ).strip().lower().replace("-", "_")
    if configured:
        return configured

    if os.getenv("GEMINI_API_KEY"):
        return "gemini"
    if os.getenv("OPENAI_API_KEY"):
        return "openai"
    if os.getenv("LLM_BASE_URL") and os.getenv("LLM_API_KEY"):
        return "openai_compatible"
    return "openai"


def _model_for(provider: str) -> str:
    configured = os.getenv("LLM_MODEL") or os.getenv("LLM_TRIAGE_MODEL")
    if configured:
        return configured
    if provider == "gemini":
        return "gemini-2.0-flash"
    return "gpt-4o-mini"


def _api_key_for(provider: str) -> Optional[str]:
    generic_key = os.getenv("LLM_API_KEY")
    if generic_key:
        return generic_key
    if provider == "gemini":
        return os.getenv("GEMINI_API_KEY")
    if provider in {"openai", "openai_compatible"}:
        return os.getenv("OPENAI_API_KEY")
    return None


def is_llm_configured() -> bool:
    disabled_values = {"0", "false", "no", "off"}
    if os.getenv("LLM_TRIAGE_ENABLED", "true").strip().lower() in disabled_values:
        return False
    provider = _normalized_provider()
    if provider == "openai_compatible" and not os.getenv("LLM_BASE_URL"):
        return False
    return bool(_api_key_for(provider))


def call_llm(
    *,
    system_prompt: str,
    user_prompt: str,
    timeout_seconds: int,
    temperature: float = 0,
    max_output_tokens: int = 4096,
) -> LLMResponse:
    provider = _normalized_provider()
    model = _model_for(provider)
    api_key = _api_key_for(provider)
    if not api_key:
        raise RuntimeError(f"LLM API key is not configured for provider '{provider}'")

    if provider == "openai":
        return _call_openai(
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            timeout_seconds=timeout_seconds,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )
    if provider == "openai_compatible":
        return _call_openai(
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            timeout_seconds=timeout_seconds,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            base_url=os.getenv("LLM_BASE_URL"),
            provider="openai_compatible",
        )
    if provider == "gemini":
        return _call_gemini(
            api_key=api_key,
            model=model,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            timeout_seconds=timeout_seconds,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        )

    raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")


def _call_openai(
    *,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    timeout_seconds: int,
    temperature: float,
    max_output_tokens: int,
    base_url: Optional[str] = None,
    provider: str = "openai",
) -> LLMResponse:
    from openai import OpenAI

    client_kwargs = {"api_key": api_key, "timeout": timeout_seconds}
    if base_url:
        client_kwargs["base_url"] = base_url
    client = OpenAI(**client_kwargs)
    response = client.chat.completions.create(
        model=model,
        temperature=temperature,
        max_tokens=max_output_tokens,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    return LLMResponse(
        text=response.choices[0].message.content or "",
        input_tokens=response.usage.prompt_tokens if response.usage else 0,
        output_tokens=response.usage.completion_tokens if response.usage else 0,
        provider=provider,
        model=model,
    )


def _call_gemini(
    *,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    timeout_seconds: int,
    temperature: float,
    max_output_tokens: int,
) -> LLMResponse:
    base_url = os.getenv(
        "GEMINI_BASE_URL",
        "https://generativelanguage.googleapis.com",
    ).rstrip("/")
    url = f"{base_url}/v1beta/models/{model}:generateContent"
    payload = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}],
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}],
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "application/json",
        },
    }

    with httpx.Client(timeout=timeout_seconds) as client:
        response = client.post(url, params={"key": api_key}, json=payload)
        response.raise_for_status()
        data = response.json()

    text = ""
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            if part.get("text"):
                text += part["text"]

    usage = data.get("usageMetadata") or {}
    return LLMResponse(
        text=text,
        input_tokens=int(usage.get("promptTokenCount") or 0),
        output_tokens=int(usage.get("candidatesTokenCount") or 0),
        provider="gemini",
        model=model,
    )
