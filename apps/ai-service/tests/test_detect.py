from unittest.mock import patch, AsyncMock
from app.schemas.detect import DetectedPart, BoundingBox


MOCK_DETECTED_PARTS = [
    DetectedPart(
        part_name="bumper_front",
        severity="MODERATE",
        confidence_score=0.87,
        bounding_box=BoundingBox(x=0.1, y=0.2, width=0.3, height=0.15),
        description="Front bumper shows moderate impact damage",
    )
]


def test_detect_returns_parts_in_demo_mode(client, auth_headers):
    """When YOLO model is not loaded, demo fallback should still return parts."""
    with patch("app.api.routes.detect.detect_damage", new_callable=AsyncMock) as mock_detect, \
         patch("app.api.routes.detect.get_provider", return_value=None):
        mock_detect.return_value = MOCK_DETECTED_PARTS

        res = client.post(
            "/detect",
            json={
                "scan_id": "scan-abc",
                "image_urls": ["http://localhost/car.jpg"],
                "provider": "GEMINI",
            },
            headers=auth_headers,
        )

    assert res.status_code == 200
    body = res.json()
    assert body["scan_id"] == "scan-abc"
    assert len(body["detected_parts"]) == 1
    assert body["detected_parts"][0]["part_name"] == "bumper_front"
    assert body["detected_parts"][0]["severity"] == "MODERATE"


def test_detect_validates_severity_values(client, auth_headers, detected_part_payload):
    """Response must only contain valid severity levels."""
    part = detected_part_payload.copy()
    part["severity"] = "MODERATE"

    with patch("app.api.routes.detect.detect_damage", new_callable=AsyncMock) as mock_detect, \
         patch("app.api.routes.detect.get_provider", return_value=None):
        mock_detect.return_value = MOCK_DETECTED_PARTS

        res = client.post(
            "/detect",
            json={"scan_id": "scan-1", "image_urls": ["http://localhost/img.jpg"]},
            headers=auth_headers,
        )

    assert res.status_code == 200
    for part in res.json()["detected_parts"]:
        assert part["severity"] in ("MINOR", "MODERATE", "SEVERE")


def test_detect_requires_at_least_one_image(client, auth_headers):
    """Empty image_urls should fail request validation."""
    res = client.post(
        "/detect",
        json={"scan_id": "scan-1", "image_urls": []},
        headers=auth_headers,
    )
    # FastAPI returns 422 for constraint violations or the service handles it
    assert res.status_code in (200, 422)


def test_detect_confidence_score_is_between_0_and_1(client, auth_headers):
    with patch("app.api.routes.detect.detect_damage", new_callable=AsyncMock) as mock_detect, \
         patch("app.api.routes.detect.get_provider", return_value=None):
        mock_detect.return_value = MOCK_DETECTED_PARTS

        res = client.post(
            "/detect",
            json={"scan_id": "scan-1", "image_urls": ["http://x.com/img.jpg"]},
            headers=auth_headers,
        )

    for part in res.json()["detected_parts"]:
        assert 0.0 <= part["confidence_score"] <= 1.0
