import asyncio
import httpx
from typing import Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from .base import BaseVisionProvider


class GeminiProvider(BaseVisionProvider):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model

    async def describe_damage(
        self,
        image_urls: list[str],
        part_name: str,
        severity: str,
        vehicle_str: Optional[str] = None,
    ) -> str:
        try:
            from google import generativeai as genai
            genai.configure(api_key=self.api_key)

            image_parts = []
            async with httpx.AsyncClient(timeout=15, trust_env=False) as client:
                for url in image_urls[:2]:
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        image_parts.append({
                            "mime_type": resp.headers.get("content-type", "image/jpeg"),
                            "data": resp.content,
                        })

            vehicle_context = f"Vehicle: {vehicle_str}. " if vehicle_str else ""
            model_obj = genai.GenerativeModel(self.model)
            prompt = (
                f"You are a vehicle damage assessment expert. "
                f"{vehicle_context}"
                f"Analyze the {severity} damage to the {part_name.replace('_', ' ')} in this vehicle image. "
                f"Provide a concise 1-2 sentence professional description of the damage condition."
            )

            if image_parts:
                content = [{"inline_data": p} for p in image_parts] + [prompt]
            else:
                content = f"{prompt} Note: No image available, provide a generic description based on severity."

            # Run the synchronous Gemini call in a thread with a hard timeout
            loop = asyncio.get_running_loop()
            response = await asyncio.wait_for(
                loop.run_in_executor(None, lambda: model_obj.generate_content(content)),
                timeout=10.0,
            )
            return response.text.strip()
        except Exception:
            return f"{severity.capitalize()} damage to {part_name.replace('_', ' ')} detected."

    def get_llm(self):
        return ChatGoogleGenerativeAI(
            model=self.model,
            google_api_key=self.api_key,
            temperature=0.3,
        )
