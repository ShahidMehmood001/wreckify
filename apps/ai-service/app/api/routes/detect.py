from fastapi import APIRouter, Depends
from app.schemas.detect import DetectRequest, DetectResponse
from app.services.detection.yolo_service import detect_damage
from app.services.providers.factory import get_provider
from app.core.security import verify_internal_key

router = APIRouter()


@router.post("/detect", response_model=DetectResponse)
async def detect(request: DetectRequest, _=Depends(verify_internal_key)):
    provider = get_provider(
        provider=request.provider.value,
        api_key=request.api_key,
        model=request.model,
    )

    vehicle_str = (
        f"{request.vehicle.year} {request.vehicle.make} {request.vehicle.model}"
        if request.vehicle
        else None
    )

    detected_parts = await detect_damage(
        image_urls=request.image_urls,
        provider=provider,
        vehicle_str=vehicle_str,
    )

    return DetectResponse(
        scan_id=request.scan_id,
        detected_parts=detected_parts,
    )
