"""
Updated response schemas for the Credit Scoring API.

Includes SHAP explanations and actionable recommendations in the
CreditScoreResponse.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any

from pydantic import BaseModel, Field


class ShapFeature(BaseModel):
    """A single SHAP feature impact entry."""
    feature: str = Field(..., description="Internal feature name")
    label:   str = Field(..., description="Human-readable label")
    value:   Optional[float] = Field(None, description="Raw feature value")
    impact:  float = Field(..., description="SHAP impact score (positive = increases default risk)")


class ShapExplanation(BaseModel):
    """SHAP explanation block returned with each prediction."""
    top_features: List[ShapFeature]
    method:       str = Field(..., description="'shap' or 'rule_based'")


class CreditScoreResponse(BaseModel):
    """Full credit scoring prediction response."""
    borrower_id:          str
    credit_score:         int   = Field(..., ge=300, le=850, description="Credit score (300–850)")
    probability_of_default: float = Field(..., ge=0.0, le=1.0)
    risk_level:           str   = Field(..., description="LOW | MEDIUM | HIGH")
    shap_explanations:    Optional[ShapExplanation] = None
    recommendations:      List[str] = Field(default_factory=list)
    scored_at:            datetime

    model_config = {
        "json_schema_extra": {
            "example": {
                "borrower_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "credit_score": 720,
                "probability_of_default": 0.18,
                "risk_level": "LOW",
                "shap_explanations": {
                    "top_features": [
                        {"feature": "loan_to_income_ratio", "label": "Loan-to-Income Ratio",
                         "value": 0.22, "impact": 0.35}
                    ],
                    "method": "rule_based"
                },
                "recommendations": [
                    "✅ Your risk profile is LOW. Keep up your current financial practices.",
                    "📱 Use mobile money consistently to build a verifiable digital financial trail."
                ],
                "scored_at": "2026-03-14T10:00:00Z",
            }
        }
    }


class BatchPredictionItem(BaseModel):
    """Single item within a batch prediction response."""
    index:                int
    borrower_id:          str
    credit_score:         int
    probability_of_default: float
    risk_level:           str
    recommendations:      List[str] = Field(default_factory=list)


class BatchCreditScoreResponse(BaseModel):
    """Batch prediction response."""
    total:   int
    results: List[BatchPredictionItem]


class AuditLogResponse(BaseModel):
    """Schema for a single audit log entry."""
    log_id: str
    endpoint: str
    method: str
    status_code: int
    duration_ms: int
    timestamp: datetime


class BorrowerSummary(BaseModel):
    """Minimal borrower data for portfolio tables."""
    borrower_id: str
    business_name: str
    loan_amnt: float
    risk_level: str
    credit_score: int
    last_scored_at: datetime


class DashboardStatsResponse(BaseModel):
    """Aggregated stats for the lender dashboard."""
    total_borrowers: int
    total_exposure: float
    avg_credit_score: float
    at_risk_count: int
    recent_activity: List[Dict[str, Any]]


class SMEProfileResponse(BaseModel):
    """Consolidated view for an SME owner."""
    business_name: str
    current_score: int
    risk_level: str
    probability_of_default: float
    recommendations: List[str]
    last_updated: datetime
    history: List[Dict[str, Any]]


class AnalyticsResponse(BaseModel):
    """Macro-level portfolio analytics."""
    revenue_trend: List[Dict[str, Any]]
    sector_distribution: List[Dict[str, Any]]
    score_distribution: List[Dict[str, Any]]
    avg_default_prob: str
    avg_credit_score: str
    capital_velocity: str
    risk_adjusted_roi: str


class TransactionSummary(BaseModel):
    """Single transaction record for tables."""
    transaction_id: str
    borrower_id: str
    business_name: str
    date: datetime
    type: str
    amount: float
    status: str
    method: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    detail: str


class HealthResponse(BaseModel):
    """Health check response."""
    status:    str
    version:   str
    db_status: str
    model:     str
