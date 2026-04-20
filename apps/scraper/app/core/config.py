from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str
    olx_base_url: str = "https://www.olx.com.pk"
    pakwheels_base_url: str = "https://www.pakwheels.com"
    scraper_interval_hours: int = 12

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    return Settings()
