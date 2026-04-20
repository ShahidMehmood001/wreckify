from pydantic import BaseModel
from typing import Optional, List, Any
from .detect import AIProvider, DetectedPart


class VehicleInfo(BaseModel):
    make: str
    model: str
    year: int


class EstimateRequest(BaseModel):
    scan_id: str
    detected_parts: List[DetectedPart]
    vehicle: Optional[VehicleInfo] = None
    provider: AIProvider = AIProvider.GEMINI
    api_key: Optional[str] = None
    model: Optional[str] = None
    city: Optional[str] = "Lahore"


class LineItem(BaseModel):
    part: str
    parts_min: float
    parts_max: float
    labor_min: float
    labor_max: float


class EstimateResponse(BaseModel):
    scan_id: str
    total_min: float
    total_max: float
    currency: str = "PKR"
    line_items: List[LineItem]
    narrative: str
