from .base import BaseVisionProvider
from .gemini import GeminiProvider
from .openai import OpenAIProvider
from .zhipu import ZhipuProvider
from app.core.config import get_settings


def get_provider(provider: str, api_key: str | None = None, model: str | None = None) -> BaseVisionProvider:
    settings = get_settings()

    if provider == "GEMINI":
        key = api_key or settings.default_gemini_api_key
        return GeminiProvider(api_key=key, model=model or "gemini-1.5-flash")

    if provider == "OPENAI":
        if not api_key:
            raise ValueError("OpenAI requires a BYOK API key")
        return OpenAIProvider(api_key=api_key, model=model or "gpt-4o-mini")

    if provider == "ZHIPU":
        if not api_key:
            raise ValueError("ZhipuAI requires a BYOK API key")
        return ZhipuProvider(api_key=api_key, model=model or "glm-4v")

    raise ValueError(f"Unknown provider: {provider}")
