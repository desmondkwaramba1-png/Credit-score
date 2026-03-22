import os
import pytest
import pandas as pd
from score_engine import PamojaScoreEngine

@pytest.fixture
def engine():
    model_dir = os.path.join(os.path.dirname(__file__), "..", "models")
    return PamojaScoreEngine(model_dir=model_dir)

def test_engine_init(engine):
    assert engine.loan_model is not None
    assert engine.beh_model is not None
    assert len(engine.beh_features) > 0
    assert len(engine.loan_features) > 0

def test_prob_to_score(engine):
    assert engine._prob_to_score(0) == 850
    assert engine._prob_to_score(1) == 300
    assert engine._prob_to_score(0.5) == 575

def test_get_band(engine):
    assert engine._get_band(800)["key"] == "excellent"
    assert engine._get_band(700)["key"] == "very_good"
    assert engine._get_band(600)["key"] == "good"
    assert engine._get_band(550)["key"] == "fair"
    assert engine._get_band(400)["key"] == "poor"

def test_score_borrower(engine):
    borrower = {
        "business_type": "tuck_shop",
        "mm_consistency_score": 0.8,
        "mm_months_active": 12,
        "monthly_revenue_usd": 500
    }
    result = engine.score(borrower)
    assert "score" in result
    assert "band" in result
    assert "loan_recommendation" in result

def test_score_loan(engine):
    loan = {
        "total_amount": 1000,
        "total_amount_to_repay": 1100,
        "duration_days": 30,
        "prior_loans_count": 5,
        "monthly_revenue_usd": 500
    }
    result = engine.score_loan(loan)
    assert "score" in result
    assert "default_probability" in result
