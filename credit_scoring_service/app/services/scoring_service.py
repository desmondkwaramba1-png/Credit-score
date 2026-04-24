"""
Scoring service: orchestrates feature engineering, ML prediction,
SHAP explanations, recommendations, and database persistence
for a credit scoring request.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.schemas.borrower_schema import BorrowerScoreRequest
from app.schemas.response_schema import (
    CreditScoreResponse, ShapExplanation, ShapFeature,
    BatchPredictionItem, BatchCreditScoreResponse,
)
from app.services.feature_engineering import engineer_features
from app.services.shap_service import generate_shap_explanations
from app.services.recommendations import generate_recommendations
from app.ml.predict import predict, load_model
from app.database.models import Borrower, CreditScore

logger = logging.getLogger(__name__)


def score_borrower(
    request: BorrowerScoreRequest,
    db: Session,
    business_id: Optional[str] = None,
) -> CreditScoreResponse:
    """
    End-to-end credit scoring workflow:

    1. Engineer features from raw request data.
    2. Run ML inference → credit score, PD, risk level.
    3. Generate SHAP explanations.
    4. Generate actionable recommendations.
    5. Persist borrower + credit score to the database.
    6. Return a rich structured response.
    """
    # ── 1. Feature engineering ────────────────────────────────────────────────
    features_df = engineer_features(
        person_age=request.person_age,
        person_income=request.person_income,
        person_home_ownership=request.person_home_ownership,
        person_emp_length=request.person_emp_length,
        loan_intent=request.loan_intent,
        loan_grade=request.loan_grade,
        loan_amnt=request.loan_amnt,
        loan_int_rate=request.loan_int_rate,
        loan_percent_income=request.loan_percent_income,
        cb_person_default_on_file=request.cb_person_default_on_file,
        cb_person_cred_hist_length=request.cb_person_cred_hist_length,
    )

    # ── 2. ML inference ───────────────────────────────────────────────────────
    credit_score, prob_default, risk_level = predict(features_df)

    # ── 3. SHAP explanations ──────────────────────────────────────────────────
    model = load_model()
    shap_raw = generate_shap_explanations(features_df, model, prob_default)
    shap_explanation = ShapExplanation(
        top_features=[ShapFeature(**f) for f in shap_raw["top_features"]],
        method=shap_raw["method"],
    )

    # ── 4. Recommendations ────────────────────────────────────────────────────
    feature_dict = features_df.iloc[0].to_dict()
    feature_dict.update({
        "person_income": request.person_income,
        "loan_amnt": request.loan_amnt,
        "loan_int_rate": request.loan_int_rate,
        "loan_percent_income": request.loan_percent_income,
        "person_emp_length": request.person_emp_length,
        "cb_person_cred_hist_length": request.cb_person_cred_hist_length,
        "cb_person_default_on_file": request.cb_person_default_on_file,
    })
    recommendations = generate_recommendations(
        risk_level=risk_level,
        prob_default=prob_default,
        features=feature_dict,
        shap_top_features=shap_raw["top_features"],
    )

    # ── 5. Persist to database ────────────────────────────────────────────────
    borrower_id = uuid.uuid4()
    scored_at = datetime.now(timezone.utc)

    try:
        borrower = Borrower(
            borrower_id=str(borrower_id),
            business_name="Scoring Request",
            income=request.person_income,
            loan_amount=request.loan_amnt,
            transaction_frequency=0,
            business_age=0,
            person_age=request.person_age,
            person_income=request.person_income,
            person_home_ownership=request.person_home_ownership,
            person_emp_length=request.person_emp_length,
            loan_intent=request.loan_intent,
            loan_grade=request.loan_grade,
            loan_amnt=request.loan_amnt,
            loan_int_rate=request.loan_int_rate,
            loan_percent_income=request.loan_percent_income,
            cb_person_default_on_file=request.cb_person_default_on_file,
            cb_person_cred_hist_length=request.cb_person_cred_hist_length,
        )
        db.add(borrower)
        db.flush()

        score_record = CreditScore(
            score_id=uuid.uuid4(),
            borrower_id=borrower.borrower_id,
            credit_score=credit_score,
            probability_of_default=prob_default,
            risk_level=risk_level,
            shap_explanations=shap_raw,
            recommendations=recommendations,
            scored_at=scored_at,
        )
        db.add(score_record)
        db.commit()

        logger.info(
            "Scored borrower %s | score=%d pod=%.4f risk=%s",
            borrower.id, credit_score, prob_default, risk_level,
        )
    except Exception as exc:
        logger.warning("DB unavailable – result not persisted (score=%d): %s", credit_score, exc)
        try:
            db.rollback()
        except Exception:
            pass

    # ── 6. Return response ────────────────────────────────────────────────────
    return CreditScoreResponse(
        borrower_id=str(borrower_id),
        credit_score=credit_score,
        probability_of_default=round(prob_default, 4),
        risk_level=risk_level,
        shap_explanations=shap_explanation,
        recommendations=recommendations,
        scored_at=scored_at,
    )


def score_borrower_batch(
    requests: List[BorrowerScoreRequest],
    db: Session,
) -> BatchCreditScoreResponse:
    """
    Run credit scoring for a list of borrowers in sequence.
    Returns a BatchCreditScoreResponse with results for each borrower.
    """
    results = []
    for i, req in enumerate(requests):
        try:
            result = score_borrower(req, db)
            results.append(BatchPredictionItem(
                index=i,
                borrower_id=result.borrower_id,
                credit_score=result.credit_score,
                probability_of_default=result.probability_of_default,
                risk_level=result.risk_level,
                recommendations=result.recommendations,
            ))
        except Exception as exc:
            logger.error("Batch item %d failed: %s", i, exc)
            results.append(BatchPredictionItem(
                index=i,
                borrower_id=f"error-{i}",
                credit_score=300,
                probability_of_default=1.0,
                risk_level="HIGH",
                recommendations=[f"Error processing this record: {str(exc)}"],
            ))

    return BatchCreditScoreResponse(total=len(results), results=results)
