"""
Pytest API tests for the credit scoring service.

Tests cover:
  - GET  /v1/health      (no auth required)
  - POST /v1/score       happy path
  - POST /v1/score       missing API key → 403
  - POST /v1/score       invalid API key → 401
  - POST /v1/score       bad request body → 422
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from fastapi.testclient import TestClient

# ── Patch DB and ML before importing the app ───────────────────────────────
# We use mocks so tests run without a real PostgreSQL instance or model.pkl

FAKE_SCORE_RESPONSE = {
    "borrower_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "credit_score": 720,
    "probability_of_default": 0.12,
    "risk_level": "LOW",
    "scored_at": datetime.now(timezone.utc).isoformat(),
    "shap_explanations": {
        "top_features": [],
        "method": "rule_based"
    },
    "recommendations": []
}

VALID_API_KEY = "sk-lender-ama-0001"
INVALID_API_KEY = "sk-bad-key-xxxx"

VALID_PAYLOAD = {
    "person_age": 25,
    "person_income": 60000.0,
    "person_home_ownership": "RENT",
    "person_emp_length": 3.0,
    "loan_intent": "EDUCATION",
    "loan_grade": "A",
    "loan_amnt": 15000.0,
    "loan_int_rate": 10.5,
    "loan_percent_income": 0.25,
    "cb_person_default_on_file": "N",
    "cb_person_cred_hist_length": 3
}


@pytest.fixture(scope="module")
def client():
    """
    Returns a TestClient with:
      - DB dependency overridden with a MagicMock session.
      - scoring_service.score_borrower patched to return a fake response.
    """
    from app.main import app
    from app.database.db import get_db
    from app.schemas.response_schema import CreditScoreResponse, ShapExplanation
    from datetime import datetime, timezone

    # Override DB dependency
    def override_get_db():
        yield MagicMock()

    app.dependency_overrides[get_db] = override_get_db

    fake_response = CreditScoreResponse(
        borrower_id="3fa85f64-5717-4562-b3fc-2c963f66afa6",
        credit_score=720,
        probability_of_default=0.12,
        risk_level="LOW",
        scored_at=datetime.now(timezone.utc),
        shap_explanations=ShapExplanation(top_features=[], method="rule_based"),
        recommendations=[]
    )

    with patch("app.api.routes.score_borrower", return_value=fake_response), \
         patch("app.ml.predict._download_model_if_needed"):
        with TestClient(app) as c:
            yield c

    app.dependency_overrides.clear()


# ─────────────────────────────────────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────────────────────────────────────

class TestHealthEndpoint:
    def test_health_returns_200(self, client):
        resp = client.get("/v1/health")
        assert resp.status_code == 200

    def test_health_response_shape(self, client):
        resp = client.get("/v1/health")
        data = resp.json()
        assert data["status"] == "ok"
        assert "service" in data
        assert "version" in data
        assert "environment" in data


# ─────────────────────────────────────────────────────────────────────────────
# Score endpoint – happy path
# ─────────────────────────────────────────────────────────────────────────────

class TestScoreEndpoint:
    def test_score_returns_200(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json=VALID_PAYLOAD,
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        assert resp.status_code == 200

    def test_score_response_contains_required_fields(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json=VALID_PAYLOAD,
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        data = resp.json()
        assert "borrower_id" in data
        assert "credit_score" in data
        assert "probability_of_default" in data
        assert "risk_level" in data
        assert "scored_at" in data

    def test_score_credit_score_in_valid_range(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json=VALID_PAYLOAD,
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        score = resp.json()["credit_score"]
        assert 300 <= score <= 850

    def test_score_risk_level_is_valid(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json=VALID_PAYLOAD,
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        assert resp.json()["risk_level"] in ("LOW", "MEDIUM", "HIGH")

    def test_score_pod_in_valid_range(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json=VALID_PAYLOAD,
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        pod = resp.json()["probability_of_default"]
        assert 0.0 <= pod <= 1.0


# ─────────────────────────────────────────────────────────────────────────────
# Authentication tests
# ─────────────────────────────────────────────────────────────────────────────

class TestAuthentication:
    def test_missing_api_key_returns_401(self, client):
        resp = client.post("/v1/predict-credit-score", json=VALID_PAYLOAD)
        assert resp.status_code == 401

    def test_invalid_api_key_returns_401(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json=VALID_PAYLOAD,
            headers={"Authorization": f"Bearer {INVALID_API_KEY}"},
        )
        assert resp.status_code == 401

    def test_invalid_api_key_error_message(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json=VALID_PAYLOAD,
            headers={"Authorization": f"Bearer {INVALID_API_KEY}"},
        )
        assert "Invalid" in resp.json()["detail"]


# ─────────────────────────────────────────────────────────────────────────────
# Validation tests
# ─────────────────────────────────────────────────────────────────────────────

class TestRequestValidation:
    def test_missing_income_returns_422(self, client):
        payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "person_income"}
        resp = client.post(
            "/v1/predict-credit-score",
            json=payload,
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        assert resp.status_code == 422

    def test_negative_income_returns_422(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json={**VALID_PAYLOAD, "person_income": -1000},
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        assert resp.status_code == 422

    def test_negative_loan_amount_returns_422(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json={**VALID_PAYLOAD, "loan_amnt": -500},
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        assert resp.status_code == 422

    def test_loan_exceeds_income_multiple_returns_422(self, client):
        resp = client.post(
            "/v1/predict-credit-score",
            json={**VALID_PAYLOAD, "loan_amnt": 60000 * 25},  # 25× income
            headers={"Authorization": f"Bearer {VALID_API_KEY}"},
        )
        assert resp.status_code == 422
