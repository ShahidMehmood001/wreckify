from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    internal_api_key: str
    default_gemini_api_key: str = ""
    yolo_model_path: str = "./weights/best.pt"
    database_url: str
    port: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
