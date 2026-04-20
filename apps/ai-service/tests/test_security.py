def test_detect_rejects_missing_internal_key(client):
    res = client.post("/detect", json={
        "scan_id": "scan-1",
        "image_urls": ["http://localhost/img.jpg"],
    })
    assert res.status_code == 422  # Header missing → validation error


def test_detect_rejects_wrong_internal_key(client):
    res = client.post(
        "/detect",
        json={"scan_id": "scan-1", "image_urls": ["http://localhost/img.jpg"]},
        headers={"x-internal-key": "wrong-key"},
    )
    assert res.status_code == 401


def test_estimate_rejects_wrong_internal_key(client):
    res = client.post(
        "/estimate",
        json={"scan_id": "scan-1", "detected_parts": []},
        headers={"x-internal-key": "wrong-key"},
    )
    assert res.status_code == 401
