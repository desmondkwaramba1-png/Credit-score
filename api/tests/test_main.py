import pytest
from fastapi.testclient import TestClient
from main import app, os

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_verify_key_fail():
    response = client.post("/score", json={}, headers={"X-API-Key": "invalid"})
    assert response.status_code == 401

def test_score_endpoint():
    # Use demo key from environment or default
    api_key = os.getenv("DEMO_API_KEY", "pk_demo_zw_pamoja2026")
    payload = {
        "phone": "+263771234567",
        "data": {
            "business_type": "tuck_shop",
            "mm_consistency_score": 0.8
        }
    }
    response = client.post("/score", json=payload, headers={"X-API-Key": api_key})
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "result" in response.json()

def test_schema_endpoint():
    response = client.get("/docs/schema")
    assert response.status_code == 200
    assert "borrower_fields" in response.json()
