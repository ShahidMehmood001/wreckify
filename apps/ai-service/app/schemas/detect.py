from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class AIProvider(str, Enum):
    GEMINI = "GEMINI"
    OPENAI = "OPENAI"
    ZHIPU = "ZHIPU"


class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float


class DetectRequest(BaseModel):
    scan_id: str
    image_urls: List[str]
    provider: AIProvider = AIProvider.GEMINI
    api_key: Optional[str] = None
    model: Optional[str] = None


class DetectedPart(BaseModel):
    part_name: str
    severity: str
    confidence_score: float
    bounding_box: BoundingBox
    description: str


class DetectResponse(BaseModel):
    scan_id: str
    detected_parts: List[DetectedPart]
