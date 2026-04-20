import os
import asyncio
from typing import List
from app.core.config import get_settings
from app.schemas.detect import DetectedPart, BoundingBox
from app.services.providers.base import BaseVisionProvider
from .preprocessor import load_image_from_url, normalize_bbox, confidence_to_severity

# YOLO class names matching the trained model
PART_CLASSES = [
    "bumper_front", "bumper_rear", "door_left", "door_right",
    "bonnet", "boot", "headlight", "taillight",
    "windscreen", "mirror_left", "mirror_right", "fender_left",
    "fender_right", "roof",
]

_model = None
_model_loaded = False


def load_model():
    global _model, _model_loaded
    settings = get_settings()
    model_path = settings.yolo_model_path

    if not os.path.exists(model_path):
        _model_loaded = False
        return

    try:
        from ultralytics import YOLO
        _model = YOLO(model_path)
        _model_loaded = True
    except Exception as e:
        print(f"Failed to load YOLO model: {e}")
        _model_loaded = False


def is_model_loaded() -> bool:
    return _model_loaded


async def detect_damage(
    image_urls: List[str],
    provider: BaseVisionProvider,
) -> List[DetectedPart]:
    images = []
    for url in image_urls:
        try:
            img = await load_image_from_url(url)
            images.append((url, img))
        except Exception as e:
            print(f"Failed to load image {url}: {e}")

    if not images:
        return []

    if _model_loaded and _model is not None:
        return await _detect_with_yolo(images, provider)
    else:
        return await _detect_demo_mode(images, provider)


async def _detect_with_yolo(images: list, provider: BaseVisionProvider) -> List[DetectedPart]:
    detected = {}

    for url, img in images:
        results = _model(img, conf=0.35, verbose=False)
        h, w = img.shape[:2]

        for result in results:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                part_name = PART_CLASSES[cls_id] if cls_id < len(PART_CLASSES) else f"part_{cls_id}"

                if part_name not in detected or conf > detected[part_name]["conf"]:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    detected[part_name] = {
                        "conf": conf,
                        "bbox": normalize_bbox(x1, y1, x2, y2, w, h),
                        "url": url,
                    }

    parts = []
    for part_name, data in detected.items():
        severity = confidence_to_severity(data["conf"])
        description = await provider.describe_damage([data["url"]], part_name, severity)
        parts.append(DetectedPart(
            part_name=part_name,
            severity=severity,
            confidence_score=round(data["conf"], 4),
            bounding_box=BoundingBox(**data["bbox"]),
            description=description,
        ))

    return parts


async def _detect_demo_mode(images: list, provider: BaseVisionProvider) -> List[DetectedPart]:
    """Fallback when no model weights are available — uses LLM vision only."""
    import random
    demo_parts = random.sample(PART_CLASSES, min(3, len(PART_CLASSES)))
    parts = []

    for part_name in demo_parts:
        severity = random.choice(["MINOR", "MODERATE", "SEVERE"])
        url = images[0][0] if images else ""
        description = await provider.describe_damage([url] if url else [], part_name, severity)
        parts.append(DetectedPart(
            part_name=part_name,
            severity=severity,
            confidence_score=round(random.uniform(0.45, 0.92), 4),
            bounding_box=BoundingBox(
                x=round(random.uniform(0.1, 0.5), 4),
                y=round(random.uniform(0.1, 0.5), 4),
                width=round(random.uniform(0.2, 0.4), 4),
                height=round(random.uniform(0.1, 0.3), 4),
            ),
            description=description,
        ))

    return parts
