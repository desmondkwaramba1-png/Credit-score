"""
Pydantic domain model for a business (API client).
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class BusinessModel(BaseModel):
    """Domain model representing a registered B2B API consumer."""

    id: Optional[str] = None
    company_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    api_key: str = Field(..., min_length=32, max_length=128)
    plan: str = Field(default="free")
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
