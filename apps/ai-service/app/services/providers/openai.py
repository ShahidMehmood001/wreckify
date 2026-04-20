import httpx
import base64
from langchain_openai import ChatOpenAI
from .base import BaseVisionProvider


class OpenAIProvider(BaseVisionProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.api_key = api_key
        self.model = model

    async def describe_damage(self, image_urls: list[str], part_name: str, severity: str) -> str:
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key)

            content = [
                {
                    "type": "text",
                    "text": (
                        f"You are a vehicle damage assessment expert. "
                        f"Analyze the {severity} damage to the {part_name.replace('_', ' ')}. "
                        f"Provide a concise 1-2 sentence professional description."
                    ),
                }
            ]

            async with httpx.AsyncClient(timeout=30) as http:
                for url in image_urls[:2]:
                    resp = await http.get(url)
                    if resp.status_code == 200:
                        b64 = base64.b64encode(resp.content).decode()
                        mime = resp.headers.get("content-type", "image/jpeg")
                        content.append({
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime};base64,{b64}"},
                        })

            response = await client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": content}],
                max_tokens=150,
            )
            return response.choices[0].message.content.strip()
        except Exception:
            return f"{severity.capitalize()} damage to {part_name.replace('_', ' ')} detected."

    def get_llm(self):
        return ChatOpenAI(
            model=self.model,
            api_key=self.api_key,
            temperature=0.3,
        )
