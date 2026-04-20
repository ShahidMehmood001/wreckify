import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.core.config import get_settings

INTERNAL_KEY = "test-internal-key"


@pytest.fixture(autouse=True)
def mock_settings(monkeypatch):
    """Override settings for all tests — no real DB or model needed."""
    settings = get_settings()
    monkeypatch.setattr(settings, "internal_api_key", INTERNAL_KEY)
    monkeypatch.setattr(settings, "database_url", "postgresql://x:x@localhost/x")
    return settings


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_headers():
    return {"x-internal-key": INTERNAL_KEY}


@pytest.fixture
def detected_part_payload():
    return {
        "part_name": "bumper_front",
        "severity": "MODERATE",
        "confidence_score": 0.87,
        "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.15},
        "description": "Front bumper shows moderate impact damage",
    }
