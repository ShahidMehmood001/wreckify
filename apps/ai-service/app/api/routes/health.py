import time
from fastapi import APIRouter
from app.services.detection.yolo_service import is_model_loaded

router = APIRouter()
_start_time = time.time()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "model_loaded": is_model_loaded(),
        "uptime": round(time.time() - _start_time, 2),
    }
