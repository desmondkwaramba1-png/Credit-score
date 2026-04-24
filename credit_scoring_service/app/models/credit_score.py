"""
Pydantic domain model for a credit score result.
"""

from typing import Literal
from pydantic import BaseModel, Field


class CreditScoreModel(BaseModel):
    """Domain model representing a credit score prediction result."""

    credit_score: int = Field(..., ge=300, le=850, description="Credit score (300–850)")
    probability_of_default: float = Field(..., ge=0.0, le=1.0, description="Probability of default (0–1)")
    risk_level: Literal["LOW", "MEDIUM", "HIGH"] = Field(..., description="Risk classification")

    model_config = {"from_attributes": True}
