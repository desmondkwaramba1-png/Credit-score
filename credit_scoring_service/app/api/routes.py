"""
Core API routes for the credit scoring service.

POST /v1/predict-credit-score  — Submit borrower data, receive full credit score, SHAP, and recommendations.
POST /v1/predict-batch         — Score multiple borrowers at once.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth.api_key_auth import verify_api_key
from app.database.db import get_db
from app.schemas.borrower_schema import BorrowerScoreRequest
from app.schemas.response_schema import (
    CreditScoreResponse, ErrorResponse, BatchCreditScoreResponse,
    DashboardStatsResponse, BorrowerSummary, SMEProfileResponse,
    AuditLogResponse, AnalyticsResponse, TransactionSummary
)
from app.services.scoring_service import score_borrower, score_borrower_batch
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(tags=["Credit Scoring"])


@router.post(
    "/predict-credit-score",
    response_model=CreditScoreResponse,
    status_code=200,
    summary="Predict Credit Score",
    description=(
        "Submit SME borrower financial data and receive an AI-generated credit score, "
        "probability of default, risk classification, SHAP feature explanations, "
        "and actionable recommendations.\n\n"
        "**Requires** `Authorization: Bearer <API_KEY>` header."
    ),
    responses={
        200: {"model": CreditScoreResponse, "description": "Scoring result with explanations"},
        401: {"model": ErrorResponse, "description": "Invalid or missing API key"},
        422: {"model": ErrorResponse, "description": "Validation error"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(settings.rate_limit)
async def predict_credit_score_endpoint(
    request: Request,
    payload: BorrowerScoreRequest,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
) -> CreditScoreResponse:
    logger.info("Single score request received | key=%s...", api_key[:8])
    return score_borrower(request=payload, db=db)


@router.post(
    "/predict-batch",
    response_model=BatchCreditScoreResponse,
    status_code=200,
    summary="Batch Predict Credit Scores",
    description=(
        "Submit an array of SME borrower profiles and receive scores for all of them. "
        "Useful for lender portfolio analysis.\n\n"
        "**Requires** `Authorization: Bearer <API_KEY>` (Lender Role Recommended)."
    ),
    responses={
        200: {"model": BatchCreditScoreResponse, "description": "Batch scoring results"},
        401: {"model": ErrorResponse, "description": "Invalid or missing API key"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(settings.rate_limit)
async def predict_batch_endpoint(
    request: Request,
    payload: List[BorrowerScoreRequest],
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
) -> BatchCreditScoreResponse:
    logger.info("Batch score request received (%d items) | key=%s...", len(payload), api_key[:8])
    if len(payload) > 100:
        raise HTTPException(status_code=400, detail="Batch size cannot exceed 100 items.")
    return score_borrower_batch(requests=payload, db=db)


# ── Dashboard & Management Endpoints ──────────────────────────────────────────

@router.get("/dashboard/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Fetch high-level portfolio metrics for the Lender Dashboard."""
    from app.database.models import Borrower, CreditScore
    from sqlalchemy import func

    total_borrowers = db.query(Borrower).count()
    total_exposure = db.query(func.sum(Borrower.loan_amnt)).scalar() or 0
    avg_score = db.query(func.avg(CreditScore.credit_score)).scalar() or 0
    at_risk = db.query(CreditScore).filter(CreditScore.risk_level == "HIGH").count()

    # Get some recent activity
    recent = db.query(Borrower).order_by(Borrower.created_at.desc()).limit(5).all()
    activity = []
    for b in recent:
        activity.append({
            "name": b.business_name,
            "action": "New Borrower Registered",
            "time": b.created_at.isoformat()
        })

    return {
        "total_borrowers": total_borrowers,
        "total_exposure": float(total_exposure),
        "avg_credit_score": round(float(avg_score), 1),
        "at_risk_count": at_risk,
        "recent_activity": activity
    }


from pydantic import BaseModel
from typing import Optional

class BorrowerCreate(BaseModel):
    business_name: str
    category: Optional[str] = None
    country: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    annual_income: Optional[float] = None
    total_loan_amount: Optional[float] = None


@router.get("/borrowers", response_model=List[BorrowerSummary])
def list_borrowers(
    db: Session = Depends(get_db),
    credentials: Optional[str] = None,
):
    """Retrieve all borrowers with their latest health scores."""
    from app.database.models import Borrower, CreditScore

    results = db.query(Borrower).order_by(Borrower.created_at.desc()).all()
    output = []
    for b in results:
        latest = (
            db.query(CreditScore)
            .filter(CreditScore.borrower_id == b.borrower_id)
            .order_by(CreditScore.scored_at.desc())
            .first()
        )
        output.append({
            "borrower_id":       str(b.borrower_id),
            "business_name":     b.business_name,
            "category":          b.category,
            "country":           b.country,
            "contact_email":     b.contact_email,
            "contact_phone":     b.contact_phone,
            "total_loan_amount": float(b.total_loan_amount or b.loan_amnt or 0),
            "annual_income":     float(b.annual_income or b.person_income or 0),
            "risk_level":        latest.risk_level if latest else None,
            "credit_score":      latest.credit_score if latest else None,
            "probability_of_default": latest.probability_of_default if latest else None,
            "last_scored_at":    latest.scored_at if latest else b.created_at,
        })
    return output


@router.post("/borrowers", status_code=201)
def create_borrower(
    payload: BorrowerCreate,
    db: Session = Depends(get_db),
):
    """Register a new SME borrower in the lender's portfolio."""
    from app.database.models import Borrower
    b = Borrower(
        business_name=payload.business_name,
        category=payload.category,
        country=payload.country,
        contact_email=payload.contact_email,
        contact_phone=payload.contact_phone,
        annual_income=payload.annual_income,
        total_loan_amount=payload.total_loan_amount,
        loan_amnt=payload.total_loan_amount,         # keep legacy field in sync
        person_income=payload.annual_income,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return {
        "borrower_id":   str(b.borrower_id),
        "business_name": b.business_name,
        "created_at":    b.created_at.isoformat(),
    }


@router.get("/borrowers/{borrower_id}")
def get_borrower(
    borrower_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve a single borrower with their latest score."""
    from app.database.models import Borrower, CreditScore
    b = db.query(Borrower).filter(Borrower.borrower_id == borrower_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Borrower not found")
    latest = (
        db.query(CreditScore)
        .filter(CreditScore.borrower_id == b.borrower_id)
        .order_by(CreditScore.scored_at.desc())
        .first()
    )
    return {
        "borrower_id":           str(b.borrower_id),
        "business_name":         b.business_name,
        "category":              b.category,
        "country":               b.country,
        "contact_email":         b.contact_email,
        "contact_phone":         b.contact_phone,
        "total_loan_amount":     float(b.total_loan_amount or b.loan_amnt or 0),
        "annual_income":         float(b.annual_income or b.person_income or 0),
        "risk_level":            latest.risk_level if latest else None,
        "credit_score":          latest.credit_score if latest else None,
        "probability_of_default": latest.probability_of_default if latest else None,
        "created_at":            b.created_at.isoformat(),
    }


@router.get("/borrowers/{borrower_id}/scores")
def get_borrower_scores(
    borrower_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve all credit score history for a borrower."""
    from app.database.models import Borrower, CreditScore
    b = db.query(Borrower).filter(Borrower.borrower_id == borrower_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Borrower not found")
    scores = (
        db.query(CreditScore)
        .filter(CreditScore.borrower_id == borrower_id)
        .order_by(CreditScore.scored_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "score_id":               str(s.score_id),
            "credit_score":           s.credit_score,
            "probability_of_default": s.probability_of_default,
            "risk_level":             s.risk_level,
            "model_version":          s.model_version,
            "scored_at":              s.scored_at.isoformat() if s.scored_at else None,
            "mode":                   "live",
        }
        for s in scores
    ]



@router.get("/borrower/me", response_model=SMEProfileResponse)
def get_my_borrower_profile(email: str, db: Session = Depends(get_db)):
    """Fetch the logged-in SME's own business profile and history."""
    from app.database.models import User, Borrower, CreditScore
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    borrower = db.query(Borrower).filter(Borrower.user_id == user.user_id).first()
    if not borrower:
        # Create a default dummy borrower profile if they don't have one yet
        return {
            "business_name": user.name,
            "current_score": 0,
            "risk_level": "LOW",
            "probability_of_default": 0.0,
            "recommendations": ["Submit your first loan request to generate a score!"],
            "last_updated": user.created_at,
            "history": []
        }
    
    latest_score = db.query(CreditScore).filter(CreditScore.borrower_id == borrower.borrower_id).order_by(CreditScore.scored_at.desc()).first()
    history = db.query(CreditScore).filter(CreditScore.borrower_id == borrower.borrower_id).order_by(CreditScore.scored_at.desc()).limit(10).all()
    
    return {
        "business_name": borrower.business_name,
        "current_score": latest_score.credit_score if latest_score else 0,
        "risk_level": latest_score.risk_level if latest_score else "LOW",
        "probability_of_default": latest_score.probability_of_default if latest_score else 0.0,
        "recommendations": latest_score.recommendations if latest_score else [],
        "last_updated": latest_score.scored_at if latest_score else borrower.created_at,
        "history": [{"date": s.scored_at.isoformat(), "score": s.credit_score} for s in history]
    }


@router.get("/audit-logs/me", response_model=List[AuditLogResponse])
def get_my_audit_logs(email: str, db: Session = Depends(get_db)):
    """Fetch API usage history for the Developer Portal."""
    from app.database.models import User, AuditLog
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    logs = db.query(AuditLog).filter(AuditLog.user_id == user.user_id).order_by(AuditLog.timestamp.desc()).limit(50).all()
    return [
        {
            "log_id": str(l.log_id),
            "endpoint": l.endpoint,
            "method": l.method,
            "status_code": l.status_code,
            "duration_ms": l.duration_ms,
            "timestamp": l.timestamp
        } for l in logs
    ]
@router.get("/analytics", response_model=AnalyticsResponse)
def get_portfolio_analytics(db: Session = Depends(get_db)):
    """Fetch macro-level analytics for the Lender portfolio."""
    from app.database.models import Borrower, CreditScore, Transaction
    from sqlalchemy import func
    
    # Aggregate score distribution
    distribution = [
        {"range": "300-500", "count": db.query(CreditScore).filter(CreditScore.credit_score < 500).count(), "color": "#EF4444"},
        {"range": "500-600", "count": db.query(CreditScore).filter(CreditScore.credit_score >= 500, CreditScore.credit_score < 600).count(), "color": "#F59E0B"},
        {"range": "600-700", "count": db.query(CreditScore).filter(CreditScore.credit_score >= 600, CreditScore.credit_score < 700).count(), "color": "#6366F1"},
        {"range": "700-800", "count": db.query(CreditScore).filter(CreditScore.credit_score >= 700, CreditScore.credit_score < 800).count(), "color": "#10B981"},
        {"range": "800-850", "count": db.query(CreditScore).filter(CreditScore.credit_score >= 800).count(), "color": "#059669"},
    ]

    avg_pd = db.query(func.avg(CreditScore.probability_of_default)).scalar() or 0.15
    avg_score = db.query(func.avg(CreditScore.credit_score)).scalar() or 680
    
    return {
        "revenue_trend": [
            { "month": "Jan", "revenue": 45000, "targets": 40000 },
            { "month": "Feb", "revenue": 52000, "targets": 45000 },
            { "month": "Mar", "revenue": 48000, "targets": 48000 },
            { "month": "Apr", "revenue": 61000, "targets": 52000 },
            { "month": "May", "revenue": 55000, "targets": 55000 },
            { "month": "Jun", "revenue": 67000, "targets": 60000 },
        ],
        "sector_distribution": [
            { "name": "Retail", "value": 40 },
            { "name": "Agri", "value": 30 },
            { "name": "Tech", "value": 20 },
            { "name": "Service", "value": 10 },
        ],
        "score_distribution": distribution,
        "avg_default_prob": f"{float(avg_pd)*100:.1f}%",
        "avg_credit_score": str(round(float(avg_score))),
        "capital_velocity": "x1.8",
        "risk_adjusted_roi": "12.8%"
    }


@router.get("/transactions", response_model=List[TransactionSummary])
def list_transactions(db: Session = Depends(get_db)):
    """Fetch all borrower transactions for the Lender network."""
    from app.database.models import Transaction, Borrower
    
    results = db.query(Transaction).join(Borrower).order_by(Transaction.transaction_date.desc()).limit(50).all()
    
    return [
       {
           "transaction_id": str(t.transaction_id),
           "borrower_id": str(t.borrower_id),
           "business_name": t.borrower.business_name,
           "date": t.transaction_date,
           "type": t.type,
           "amount": float(t.amount),
           "status": "Completed", # Simplified for now
           "method": "Digital"
       } for t in results
    ]
