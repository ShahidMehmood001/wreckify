from fastapi import APIRouter, Depends
from app.schemas.estimate import EstimateRequest, EstimateResponse
from app.services.estimation.agent import run_estimation_pipeline
from app.services.providers.factory import get_provider
from app.core.security import verify_internal_key

router = APIRouter()


@router.post("/estimate", response_model=EstimateResponse)
async def estimate(request: EstimateRequest, _=Depends(verify_internal_key)):
    provider = get_provider(
        provider=request.provider.value,
        api_key=request.api_key,
        model=request.model,
    )

    return await run_estimation_pipeline(
        scan_id=request.scan_id,
        detected_parts=request.detected_parts,
        vehicle=request.vehicle,
        provider=provider,
        city=request.city or "Lahore",
    )
