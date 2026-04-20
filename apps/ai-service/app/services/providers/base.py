from abc import ABC, abstractmethod
from typing import Optional


class BaseVisionProvider(ABC):
    @abstractmethod
    async def describe_damage(self, image_urls: list[str], part_name: str, severity: str) -> str:
        pass

    @abstractmethod
    def get_llm(self):
        """Return a LangChain-compatible LLM instance for use in LangGraph."""
        pass
