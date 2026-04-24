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


@router.get("/borrowers", response_model=List[BorrowerSummary])
def list_borrowers(db: Session = Depends(get_db)):
    """Retrieve all borrowers with their latest health scores."""
    from app.database.models import Borrower, CreditScore
    
    results = db.query(Borrower).all()
    output = []
    for b in results:
        latest_score = db.query(CreditScore).filter(CreditScore.borrower_id == b.borrower_id).order_by(CreditScore.scored_at.desc()).first()
        output.append({
            "borrower_id": str(b.borrower_id),
            "business_name": b.business_name,
            "loan_amnt": float(b.loan_amnt or 0),
            "risk_level": latest_score.risk_level if latest_score else "LOW",
            "credit_score": latest_score.credit_score if latest_score else 700,
            "last_scored_at": latest_score.scored_at if latest_score else b.created_at
        })
    return output


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
