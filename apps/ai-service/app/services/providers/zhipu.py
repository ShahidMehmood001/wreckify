import httpx
import base64
from langchain_openai import ChatOpenAI
from .base import BaseVisionProvider


class ZhipuProvider(BaseVisionProvider):
    """ZhipuAI provider using GLM-4V for vision tasks."""

    def __init__(self, api_key: str, model: str = "glm-4v"):
        self.api_key = api_key
        self.model = model

    async def describe_damage(self, image_urls: list[str], part_name: str, severity: str) -> str:
        try:
            from zhipuai import ZhipuAI
            client = ZhipuAI(api_key=self.api_key)

            messages = [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                f"You are a vehicle damage expert. Describe the {severity} damage "
                                f"to the {part_name.replace('_', ' ')} in 1-2 sentences."
                            ),
                        }
                    ],
                }
            ]

            async with httpx.AsyncClient(timeout=30) as http:
                for url in image_urls[:1]:
                    resp = await http.get(url)
                    if resp.status_code == 200:
                        b64 = base64.b64encode(resp.content).decode()
                        messages[0]["content"].insert(0, {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        })

            response = client.chat.completions.create(model=self.model, messages=messages)
            return response.choices[0].message.content.strip()
        except Exception:
            return f"{severity.capitalize()} damage to {part_name.replace('_', ' ')} detected."

    def get_llm(self):
        # ZhipuAI is OpenAI-compatible
        return ChatOpenAI(
            model=self.model,
            api_key=self.api_key,
            base_url="https://open.bigmodel.cn/api/paas/v4/",
            temperature=0.3,
        )
