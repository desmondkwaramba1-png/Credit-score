"""
Pydantic domain model for a borrower's financial profile.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional


class BorrowerModel(BaseModel):
    """Domain model (not schema) representing a borrower entity."""

    id: Optional[str] = None
    business_id: Optional[str] = None
    income: float = Field(..., gt=0, description="Annual income in USD")
    loan_amount: float = Field(..., gt=0, description="Requested loan amount in USD")
    transaction_frequency: int = Field(..., ge=0, description="Number of monthly transactions")
    business_age: int = Field(..., ge=0, description="Age of borrower's business in months")

    @model_validator(mode="after")
    def loan_must_not_exceed_income_ratio(self) -> "BorrowerModel":
        ratio = self.loan_amount / self.income
        if ratio > 20:
            raise ValueError("loan_amount cannot exceed 20× annual income")
        return self

    model_config = {"from_attributes": True}
