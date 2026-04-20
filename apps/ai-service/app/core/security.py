from fastapi import Header, HTTPException, status
from .config import get_settings


async def verify_internal_key(x_internal_key: str = Header(...)):
    settings = get_settings()
    if x_internal_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key",
        )
