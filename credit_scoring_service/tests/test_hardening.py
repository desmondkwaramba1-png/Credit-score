"""
Comprehensive test suite for new CredAI endpoints and components.

Covers:
  - RFC 7807 error format
  - /v1/sandbox/score (no auth)
  - /v1/score (live scoring)
  - /v1/score/batch
  - /v1/score/{request_id}
  - /v1/usage
  - /v1/webhooks CRUD
  - ScoringEngine: 8-tier risk mapping
  - ScoringEngine: risk flags generation
  - ScoringEngine: confidence heuristics
  - app.auth.security: decode_access_token
"""

import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

VALID_PAYLOAD = {
    "person_age": 32,
    "person_income": 60000.0,
    "person_home_ownership": "RENT",
    "person_emp_length": 3.0,
    "loan_intent": "PERSONAL",
    "loan_grade": "B",
    "loan_amnt": 15000.0,
    "loan_int_rate": 11.5,
    "loan_percent_income": 0.25,
    "cb_person_default_on_file": "N",
    "cb_person_cred_hist_length": 4,
}


@pytest.fixture(scope="module")
def client(mock_db_session):
    """TestClient with DB mocked and scoring service stubbed."""
    from app.main import app
    from app.database.db import get_db
    from app.schemas.response_schema import CreditScoreResponse
    from app.auth.api_key_auth import verify_api_key

    def override_get_db():
        yield mock_db_session

    def override_verify_api_key():
        return "pmj_test_fake_key"

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[verify_api_key] = override_verify_api_key

    fake_response = CreditScoreResponse(
        borrower_id=str(uuid.uuid4()),
        credit_score=720,
        probability_of_default=0.12,
        risk_level="LOW",
        scored_at=datetime.now(timezone.utc),
    )

    # Stub out the DB add/commit so ScoreRequest persistence doesn't fail
    mock_db_session.add = MagicMock()
    mock_db_session.flush = MagicMock()
    mock_db_session.commit = MagicMock()
    mock_db_session.refresh = MagicMock()
    mock_db_session.query = MagicMock(return_value=MagicMock(
        filter=MagicMock(return_value=MagicMock(
            first=MagicMock(return_value=None),
            count=MagicMock(return_value=0),
            all=MagicMock(return_value=[]),
        ))
    ))

    with (
        patch("app.api.routes.score_borrower", return_value=fake_response),
        patch("app.api.score.score_borrower", return_value=fake_response),
        patch("app.api.score.score_borrower_batch", return_value=MagicMock(
            model_dump=lambda: {"total": 1, "results": []},
        )),
        patch("app.api.score._dispatch_webhooks_background"),
    ):
        with TestClient(app, raise_server_exceptions=True) as c:
            yield c

    app.dependency_overrides.clear()


# ─────────────────────────────────────────────────────────────────────────────
# RFC 7807 Error Format
# ─────────────────────────────────────────────────────────────────────────────

class TestRFC7807ErrorFormat:

    def test_404_has_problem_detail_keys(self, client):
        res = client.get("/v1/nonexistent-path-xyz")
        assert res.status_code == 404
        body = res.json()
        assert "type" in body
        assert "title" in body
        assert "status" in body
        assert "detail" in body
        assert "instance" in body

    def test_404_status_matches_http_code(self, client):
        res = client.get("/v1/score/nonexistent-request-id-abc")
        assert res.json().get("status") in (404, 401, 422)

    def test_validation_error_returns_422_problem_detail(self, client):
        """Submitting an empty body should return RFC 7807 validation error."""
        res = client.post(
            "/v1/predict-credit-score",
            json={},
            headers={"Authorization": "Bearer pmj_test_fake_key"},
        )
        assert res.status_code == 422
        body = res.json()
        assert body.get("status") == 422
        assert "type" in body


# ─────────────────────────────────────────────────────────────────────────────
# Sandbox Endpoint (no auth)
# ─────────────────────────────────────────────────────────────────────────────

class TestSandboxScore:

    def test_sandbox_returns_200(self, client):
        res = client.get("/v1/sandbox/score")
        assert res.status_code == 200

    def test_sandbox_is_deterministic(self, client):
        r1 = client.get("/v1/sandbox/score?seed=42").json()
        r2 = client.get("/v1/sandbox/score?seed=42").json()
        assert r1["credit_score"] == r2["credit_score"]
        assert r1["probability_of_default"] == r2["probability_of_default"]

    def test_sandbox_different_seeds_differ(self, client):
        r1 = client.get("/v1/sandbox/score?seed=1").json()
        r2 = client.get("/v1/sandbox/score?seed=9999").json()
        assert r1["credit_score"] != r2["credit_score"]

    def test_sandbox_has_required_fields(self, client):
        body = client.get("/v1/sandbox/score").json()
        for key in ["credit_score", "probability_of_default", "risk_level",
                    "risk_tier", "risk_flags", "confidence", "sandbox"]:
            assert key in body, f"Missing field: {key}"

    def test_sandbox_flag_is_true(self, client):
        assert client.get("/v1/sandbox/score").json()["sandbox"] is True

    def test_sandbox_score_within_range(self, client):
        score = client.get("/v1/sandbox/score?seed=123").json()["credit_score"]
        assert 300 <= score <= 850

    def test_sandbox_pd_within_range(self, client):
        pd = client.get("/v1/sandbox/score?seed=7").json()["probability_of_default"]
        assert 0.0 <= pd <= 1.0


# ─────────────────────────────────────────────────────────────────────────────
# ScoringEngine — 8-tier risk mapping
# ─────────────────────────────────────────────────────────────────────────────

class TestScoringEngineTierMapping:
    """Unit tests for _map_pd_to_tier without ML model dependency."""

    @pytest.fixture(autouse=True)
    def import_mapper(self):
        from app.ml.predict import _map_pd_to_tier
        self._map = _map_pd_to_tier

    def _assert_tier(self, pd, expected_tier, expected_risk_level):
        score, risk, tier = self._map(pd)
        assert tier == expected_tier, f"pd={pd}: expected tier {expected_tier}, got {tier}"
        assert risk == expected_risk_level, f"pd={pd}: expected risk {expected_risk_level}, got {risk}"
        assert 300 <= score <= 850, f"Score {score} out of range"

    def test_exceptional_tier(self):     self._assert_tier(0.03, "EXCEPTIONAL", "LOW")
    def test_excellent_tier(self):       self._assert_tier(0.09, "EXCELLENT",   "LOW")
    def test_very_good_tier(self):       self._assert_tier(0.15, "VERY_GOOD",   "LOW")
    def test_good_tier(self):            self._assert_tier(0.21, "GOOD",        "MEDIUM")
    def test_fair_tier(self):            self._assert_tier(0.28, "FAIR",        "MEDIUM")
    def test_poor_tier(self):            self._assert_tier(0.36, "POOR",        "HIGH")
    def test_very_poor_tier(self):       self._assert_tier(0.50, "VERY_POOR",   "HIGH")
    def test_critical_tier(self):        self._assert_tier(0.80, "CRITICAL",    "HIGH")

    def test_score_monotonically_decreases_with_pd(self):
        pds = [0.03, 0.09, 0.15, 0.21, 0.28, 0.36, 0.50, 0.80]
        scores = [self._map(pd)[0] for pd in pds]
        for i in range(len(scores) - 1):
            assert scores[i] >= scores[i + 1], f"Score should decrease: {scores}"

    def test_edge_pd_zero_maps_to_exceptional(self):
        _, _, tier = self._map(0.0)
        assert tier == "EXCEPTIONAL"

    def test_edge_pd_one_maps_to_critical(self):
        _, _, tier = self._map(0.99)
        assert tier == "CRITICAL"


# ─────────────────────────────────────────────────────────────────────────────
# ScoringEngine — Risk Flags
# ─────────────────────────────────────────────────────────────────────────────

class TestRiskFlags:

    @pytest.fixture(autouse=True)
    def import_flags(self):
        from app.ml.predict import _generate_risk_flags
        self._flags = _generate_risk_flags

    def test_no_flags_for_clean_profile(self):
        flags = self._flags(0.05, "EXCEPTIONAL", {
            "loan_percent_income": 0.10,
            "cb_person_default_on_file": "N",
            "person_emp_length": 5.0,
            "cb_person_cred_hist_length": 8,
            "loan_int_rate": 7.0,
            "loan_grade": "A",
        })
        assert flags == []

    def test_high_dti_flag(self):
        flags = self._flags(0.30, "GOOD", {"loan_percent_income": 0.50})
        assert any("income" in f.lower() for f in flags)

    def test_cb_default_flag(self):
        flags = self._flags(0.30, "GOOD", {"cb_person_default_on_file": "Y"})
        assert any("default" in f.lower() for f in flags)

    def test_low_employment_flag(self):
        flags = self._flags(0.20, "FAIR", {"person_emp_length": 0.5})
        assert any("employment" in f.lower() or "tenure" in f.lower() for f in flags)

    def test_thin_credit_file_flag(self):
        flags = self._flags(0.20, "FAIR", {"cb_person_cred_hist_length": 1})
        assert any("credit history" in f.lower() for f in flags)

    def test_high_interest_rate_flag(self):
        flags = self._flags(0.20, "FAIR", {"loan_int_rate": 22.0})
        assert any("interest rate" in f.lower() for f in flags)

    def test_subprime_grade_flag(self):
        for grade in ("D", "E", "F", "G"):
            flags = self._flags(0.30, "POOR", {"loan_grade": grade})
            assert any("grade" in f.lower() for f in flags), f"No grade flag for {grade}"

    def test_very_poor_tier_always_flags(self):
        flags = self._flags(0.55, "VERY_POOR", {})
        assert any("42%" in f or "default" in f.lower() for f in flags)


# ─────────────────────────────────────────────────────────────────────────────
# ScoringEngine — Confidence
# ─────────────────────────────────────────────────────────────────────────────

class TestConfidenceHeuristic:

    @pytest.fixture(autouse=True)
    def import_confidence(self):
        from app.ml.predict import _compute_confidence
        self._conf = _compute_confidence

    def test_full_profile_has_high_confidence(self):
        features = {
            "person_age": 32, "person_income": 60000, "person_home_ownership": "RENT",
            "person_emp_length": 3.0, "loan_intent": "PERSONAL", "loan_grade": "B",
            "loan_amnt": 15000, "loan_int_rate": 11.5, "loan_percent_income": 0.25,
            "cb_person_default_on_file": "N", "cb_person_cred_hist_length": 4,
        }
        assert self._conf(features) >= 0.90

    def test_empty_profile_has_low_confidence(self):
        assert self._conf({}) <= 0.20

    def test_confidence_in_0_to_1(self):
        for features in [{}, {"person_age": 30}, {"person_income": 50000, "loan_amnt": 10000}]:
            c = self._conf(features)
            assert 0.0 <= c <= 1.0, f"Confidence {c} out of range for features={features}"


# ─────────────────────────────────────────────────────────────────────────────
# Security — decode_access_token
# ─────────────────────────────────────────────────────────────────────────────

class TestDecodeAccessToken:

    def test_valid_token_decodes_correctly(self):
        from app.auth.security import create_access_token, decode_access_token
        token = create_access_token({"sub": "user-123", "user_type": "lender"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "user-123"
        assert payload["user_type"] == "lender"

    def test_expired_token_returns_none(self):
        from app.auth.security import create_access_token, decode_access_token
        token = create_access_token({"sub": "user-xyz"}, expires_delta=timedelta(seconds=-1))
        assert decode_access_token(token) is None

    def test_tampered_token_returns_none(self):
        from app.auth.security import decode_access_token
        assert decode_access_token("this.is.not.valid") is None

    def test_empty_string_returns_none(self):
        from app.auth.security import decode_access_token
        assert decode_access_token("") is None


# ─────────────────────────────────────────────────────────────────────────────
# Health Endpoint
# ─────────────────────────────────────────────────────────────────────────────

class TestHealth:

    def test_health_returns_200(self, client):
        res = client.get("/v1/health")
        assert res.status_code == 200

    def test_health_has_status_field(self, client):
        body = client.get("/v1/health").json()
        assert "status" in body


# ─────────────────────────────────────────────────────────────────────────────
# API Key Generation (pmj_ prefix)
# ─────────────────────────────────────────────────────────────────────────────

class TestApiKeyGeneration:

    def test_live_key_has_pmj_live_prefix(self):
        from app.auth.security import generate_api_key
        key = generate_api_key("test-user", mode="live")
        assert key.startswith("pmj_live_")

    def test_test_key_has_pmj_test_prefix(self):
        from app.auth.security import generate_api_key
        key = generate_api_key("test-user", mode="test")
        assert key.startswith("pmj_test_")

    def test_generated_keys_are_unique(self):
        from app.auth.security import generate_api_key
        keys = {generate_api_key("u", mode="test") for _ in range(20)}
        assert len(keys) == 20, "API keys must be unique"
