"""Tests for provider-neutral LLM client wiring."""

from unittest.mock import MagicMock, patch

import pytest

import llm_client


def test_disabled_when_triage_flag_is_false():
    with patch.dict("os.environ", {"LLM_TRIAGE_ENABLED": "false", "LLM_PROVIDER": "gemini", "LLM_API_KEY": "key"}, clear=True):
        assert not llm_client.is_llm_configured()


def test_configured_with_generic_gemini_key():
    with patch.dict("os.environ", {"LLM_PROVIDER": "gemini", "LLM_API_KEY": "key"}, clear=True):
        assert llm_client.is_llm_configured()


def test_openai_compatible_requires_base_url():
    with patch.dict("os.environ", {"LLM_PROVIDER": "openai_compatible", "LLM_API_KEY": "key"}, clear=True):
        assert not llm_client.is_llm_configured()

    with patch.dict(
        "os.environ",
        {"LLM_PROVIDER": "openai_compatible", "LLM_API_KEY": "key", "LLM_BASE_URL": "http://localhost:11434/v1"},
        clear=True,
    ):
        assert llm_client.is_llm_configured()


@patch("openai.OpenAI")
def test_openai_call_uses_generic_key_and_model(mock_openai):
    completion = MagicMock()
    completion.choices = [MagicMock(message=MagicMock(content="[]"))]
    completion.usage = MagicMock(prompt_tokens=11, completion_tokens=7)
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = completion
    mock_openai.return_value = mock_client

    with patch.dict("os.environ", {"LLM_PROVIDER": "openai", "LLM_MODEL": "gpt-test", "LLM_API_KEY": "key"}, clear=True):
        response = llm_client.call_llm(
            system_prompt="system",
            user_prompt="user",
            timeout_seconds=10,
        )

    mock_openai.assert_called_once_with(api_key="key", timeout=10)
    mock_client.chat.completions.create.assert_called_once()
    kwargs = mock_client.chat.completions.create.call_args.kwargs
    assert kwargs["model"] == "gpt-test"
    assert response.text == "[]"
    assert response.input_tokens == 11
    assert response.output_tokens == 7
    assert response.provider == "openai"


@patch("openai.OpenAI")
def test_openai_compatible_uses_base_url(mock_openai):
    completion = MagicMock()
    completion.choices = [MagicMock(message=MagicMock(content="[]"))]
    completion.usage = None
    mock_client = MagicMock()
    mock_client.chat.completions.create.return_value = completion
    mock_openai.return_value = mock_client

    with patch.dict(
        "os.environ",
        {
            "LLM_PROVIDER": "openai_compatible",
            "LLM_MODEL": "local-model",
            "LLM_API_KEY": "key",
            "LLM_BASE_URL": "http://localhost:11434/v1",
        },
        clear=True,
    ):
        response = llm_client.call_llm(system_prompt="system", user_prompt="user", timeout_seconds=10)

    mock_openai.assert_called_once_with(api_key="key", timeout=10, base_url="http://localhost:11434/v1")
    assert response.provider == "openai_compatible"
    assert response.model == "local-model"


@patch("llm_client.httpx.Client")
def test_gemini_call_maps_response_shape(mock_client_cls):
    mock_response = MagicMock()
    mock_response.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "[]"}]}}],
        "usageMetadata": {"promptTokenCount": 13, "candidatesTokenCount": 5},
    }
    mock_client = MagicMock()
    mock_client.__enter__.return_value = mock_client
    mock_client.post.return_value = mock_response
    mock_client_cls.return_value = mock_client

    with patch.dict("os.environ", {"LLM_PROVIDER": "gemini", "LLM_MODEL": "gemini-test", "LLM_API_KEY": "key"}, clear=True):
        response = llm_client.call_llm(system_prompt="system", user_prompt="user", timeout_seconds=10)

    mock_client.post.assert_called_once()
    url = mock_client.post.call_args.args[0]
    kwargs = mock_client.post.call_args.kwargs
    assert url.endswith("/v1beta/models/gemini-test:generateContent")
    assert kwargs["params"] == {"key": "key"}
    assert kwargs["json"]["generationConfig"]["responseMimeType"] == "application/json"
    assert response.text == "[]"
    assert response.input_tokens == 13
    assert response.output_tokens == 5
    assert response.provider == "gemini"


def test_unsupported_provider_raises():
    with patch.dict("os.environ", {"LLM_PROVIDER": "unknown", "LLM_API_KEY": "key"}, clear=True):
        with pytest.raises(ValueError, match="Unsupported LLM_PROVIDER"):
            llm_client.call_llm(system_prompt="system", user_prompt="user", timeout_seconds=10)
