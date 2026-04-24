"""
Shared pytest fixtures for the credit scoring service test suite.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from fastapi.testclient import TestClient


@pytest.fixture(scope="session", autouse=True)
def patch_db_create_all():
    """
    Prevent Base.metadata.create_all from connecting to PostgreSQL during tests.
    The app startup calls create_all; we replace it with a no-op so no real DB
    is required in the test environment.
    """
    with patch("app.main.Base.metadata.create_all"):
        yield


@pytest.fixture(scope="session")
def mock_db_session():
    """Return a MagicMock acting as a SQLAlchemy session."""
    session = MagicMock()
    session.add = MagicMock()
    session.flush = MagicMock()
    session.commit = MagicMock()
    session.close = MagicMock()
    return session


@pytest.fixture(scope="session")
def api_client(mock_db_session):
    """
    TestClient with DB and scoring service mocked out.
    Import is deferred so .env is loaded before app import.
    """
    from app.main import app
    from app.database.db import get_db
    from app.schemas.response_schema import CreditScoreResponse

    def override_get_db():
        yield mock_db_session

    app.dependency_overrides[get_db] = override_get_db

    fake_response = CreditScoreResponse(
        borrower_id="3fa85f64-5717-4562-b3fc-2c963f66afa6",
        credit_score=720,
        probability_of_default=0.12,
        risk_level="LOW",
        scored_at=datetime.now(timezone.utc),
    )

    with patch("app.api.routes.score_borrower", return_value=fake_response):
        with TestClient(app) as client:
            yield client

    app.dependency_overrides.clear()
