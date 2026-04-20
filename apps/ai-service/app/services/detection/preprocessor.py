import httpx
import numpy as np
from PIL import Image
import io


async def load_image_from_url(url: str) -> np.ndarray:
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url)
        response.raise_for_status()

    image = Image.open(io.BytesIO(response.content)).convert("RGB")
    return np.array(image)


def normalize_bbox(x1: float, y1: float, x2: float, y2: float, img_w: int, img_h: int) -> dict:
    return {
        "x": round(x1 / img_w, 4),
        "y": round(y1 / img_h, 4),
        "width": round((x2 - x1) / img_w, 4),
        "height": round((y2 - y1) / img_h, 4),
    }


def confidence_to_severity(confidence: float) -> str:
    if confidence >= 0.75:
        return "SEVERE"
    elif confidence >= 0.50:
        return "MODERATE"
    return "MINOR"
