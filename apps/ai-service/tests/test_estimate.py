from unittest.mock import patch, AsyncMock


MOCK_ESTIMATE = {
    "scan_id": "scan-abc",
    "total_min": 45000,
    "total_max": 85000,
    "currency": "PKR",
    "line_items": [
        {
            "part": "bumper_front",
            "parts_min": 20000,
            "parts_max": 40000,
            "labor_min": 5000,
            "labor_max": 10000,
        }
    ],
    "narrative": "Front bumper replacement required.",
}


def test_estimate_returns_cost_breakdown(client, auth_headers):
    with patch("app.api.routes.estimate.run_estimation_pipeline", new_callable=AsyncMock) as mock_est:
        mock_est.return_value = MOCK_ESTIMATE

        res = client.post(
            "/estimate",
            json={
                "scan_id": "scan-abc",
                "detected_parts": [
                    {
                        "part_name": "bumper_front",
                        "severity": "MODERATE",
                        "confidence_score": 0.87,
                        "bounding_box": {"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.15},
                        "description": "Front bumper damage",
                    }
                ],
            },
            headers=auth_headers,
        )

    assert res.status_code == 200
    body = res.json()
    assert body["scan_id"] == "scan-abc"
    assert body["total_min"] > 0
    assert body["total_max"] >= body["total_min"]
    assert body["currency"] == "PKR"
    assert len(body["line_items"]) >= 1


def test_estimate_total_max_gte_total_min(client, auth_headers):
    with patch("app.api.routes.estimate.run_estimation_pipeline", new_callable=AsyncMock) as mock_est:
        mock_est.return_value = MOCK_ESTIMATE

        res = client.post(
            "/estimate",
            json={"scan_id": "s1", "detected_parts": []},
            headers=auth_headers,
        )

    body = res.json()
    assert body["total_max"] >= body["total_min"]


def test_estimate_currency_is_pkr(client, auth_headers):
    with patch("app.api.routes.estimate.run_estimation_pipeline", new_callable=AsyncMock) as mock_est:
        mock_est.return_value = MOCK_ESTIMATE

        res = client.post(
            "/estimate",
            json={"scan_id": "s1", "detected_parts": []},
            headers=auth_headers,
        )

    assert res.json()["currency"] == "PKR"
