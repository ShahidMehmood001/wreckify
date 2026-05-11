from fastapi import FastAPI
from contextlib import asynccontextmanager
import sentry_sdk
from app.api.routes import health, detect, estimate
from app.services.detection.yolo_service import load_model
from app.core.config import get_settings

settings = get_settings()

if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment="production",
        traces_sample_rate=0.2,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Loading YOLO model...")
    load_model()
    print(f"AI service ready on port {settings.port}")
    yield


app = FastAPI(
    title="Wreckify AI Service",
    description="Internal AI microservice for vehicle damage detection and repair cost estimation",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(health.router, tags=["Health"])
app.include_router(detect.router, tags=["Detection"])
app.include_router(estimate.router, tags=["Estimation"])
