import httpx
from langchain_google_genai import ChatGoogleGenerativeAI
from .base import BaseVisionProvider


class GeminiProvider(BaseVisionProvider):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model

    async def describe_damage(self, image_urls: list[str], part_name: str, severity: str) -> str:
        try:
            from google import generativeai as genai
            genai.configure(api_key=self.api_key)

            image_parts = []
            async with httpx.AsyncClient(timeout=30) as client:
                for url in image_urls[:2]:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        image_parts.append({
                            "mime_type": resp.headers.get("content-type", "image/jpeg"),
                            "data": resp.content,
                        })

            model = genai.GenerativeModel(self.model)
            prompt = (
                f"You are a vehicle damage assessment expert. "
                f"Analyze the {severity} damage to the {part_name.replace('_', ' ')} in this vehicle image. "
                f"Provide a concise 1-2 sentence professional description of the damage condition."
            )

            if image_parts:
                parts = [{"inline_data": p} for p in image_parts] + [prompt]
                response = model.generate_content(parts)
            else:
                response = model.generate_content(
                    f"{prompt} Note: No image available, provide a generic description based on severity."
                )

            return response.text.strip()
        except Exception as e:
            return f"{severity.capitalize()} damage to {part_name.replace('_', ' ')} detected."

    def get_llm(self):
        return ChatGoogleGenerativeAI(
            model=self.model,
            google_api_key=self.api_key,
            temperature=0.3,
        )
