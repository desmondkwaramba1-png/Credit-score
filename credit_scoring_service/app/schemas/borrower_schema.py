"""
Request schemas for borrower-related API endpoints.
"""

from pydantic import BaseModel, Field, model_validator


class BorrowerScoreRequest(BaseModel):
    """
    Request body for POST /v1/score.

    All numeric fields represent borrower financial attributes used
    by the ML model to compute a credit score.
    """

    person_age: int = Field(
        ...,
        gt=17,
        lt=101,
        example=25,
        description="Age of the borrower in years.",
    )
    person_income: float = Field(
        ...,
        gt=0,
        example=60000.0,
        description="Annual income of the borrower in USD.",
    )
    person_home_ownership: str = Field(
        ...,
        example="RENT",
        description="Home ownership status (e.g., RENT, OWN, MORTGAGE, OTHER).",
    )
    person_emp_length: float = Field(
        ...,
        ge=0,
        example=3.0,
        description="Employment length in years.",
    )
    loan_intent: str = Field(
        ...,
        example="EDUCATION",
        description="Intent of the loan (e.g., EDUCATION, MEDICAL, VENTURE, PERSONAL).",
    )
    loan_grade: str = Field(
        ...,
        example="A",
        description="Loan grade assigned based on credit history (A-G).",
    )
    loan_amnt: float = Field(
        ...,
        gt=0,
        example=15000.0,
        description="Requested loan amount in USD.",
    )
    loan_int_rate: float = Field(
        ...,
        ge=0,
        example=10.5,
        description="Interest rate of the loan (percentage).",
    )
    loan_percent_income: float = Field(
        ...,
        ge=0,
        le=1.0,
        example=0.25,
        description="Loan amount as a percentage of annual income (0.0 to 1.0).",
    )
    cb_person_default_on_file: str = Field(
        ...,
        example="N",
        description="Historical default on file (Y or N).",
    )
    cb_person_cred_hist_length: int = Field(
        ...,
        ge=0,
        example=3,
        description="Credit history length in years.",
    )

    @model_validator(mode="after")
    def validate_loan_to_income(self) -> "BorrowerScoreRequest":
        if self.loan_amnt > self.person_income * 20:
            raise ValueError("loan_amount cannot exceed 20× annual income.")
        return self

    model_config = {
        "json_schema_extra": {
            "example": {
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
                "cb_person_cred_hist_length": 3,
            }
        }
    }
