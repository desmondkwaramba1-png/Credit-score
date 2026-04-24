"""
New /v1/score endpoints (cleaner naming vs legacy /v1/predict-* routes).

POST /v1/score              — Single borrower score (live/test mode)
POST /v1/score/batch        — Batch scoring (up to 100)
GET  /v1/score/{request_id} — Retrieve a previously stored ScoreRequest
GET  /v1/sandbox/score      — Unauthenticated deterministic mock response
GET  /v1/usage              — Tenant-scoped usage metrics
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.database.db import get_db
from app.database.models import ScoreRequest, Webhook, WebhookDelivery, User, Borrower, CreditScore
from app.schemas.borrower_schema import BorrowerScoreRequest
from app.services.scoring_service import score_borrower, score_borrower_batch
from app.auth.api_key_auth import verify_api_key
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
limiter = Limiter(key_func=get_remote_address)
router = APIRouter(tags=["Score v1"])

_bearer = HTTPBearer(auto_error=False)


def _get_user_from_token(
    credentials: Optional[HTTPAuthorizationCredentials],
    db: Session,
) -> Optional[User]:
    """Best-effort user lookup from JWT token (sub = user_id)."""
    if not credentials:
        return None
    try:
        from app.auth.security import decode_access_token
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub") if payload else None
        if user_id:
            return db.query(User).filter(User.user_id == user_id).first()
    except Exception:
        pass
    return None


# ── POST /v1/score ─────────────────────────────────────────────────────────────

@router.post("/score", status_code=200, summary="Score a borrower (v1)")
@limiter.limit(settings.rate_limit)
async def score_endpoint(
    request: Request,
    payload: BorrowerScoreRequest,
    mode: str = Query(default="test", regex="^(live|test)$"),
    api_key: str = Depends(verify_api_key),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """
    Score a single borrower. Pass `?mode=live` for production scoring
    or omit / pass `?mode=test` for sandbox.
    """
    logger.info("POST /v1/score | mode=%s | key=%s...", mode, api_key[:8])

    result = score_borrower(request=payload, db=db)

    # Persist ScoreRequest record
    user = _get_user_from_token(credentials, db)
    try:
        sr = ScoreRequest(
            request_id=str(uuid.uuid4()),
            user_id=user.user_id if user else None,
            mode=mode,
            credit_score=result.credit_score,
            probability_of_default=result.probability_of_default,
            risk_level=result.risk_level,
            risk_tier=getattr(result, "risk_tier", None),
            risk_flags=getattr(result, "risk_flags", []),
            confidence=getattr(result, "confidence", None),
            input_payload=payload.model_dump(),
            ip_address=request.client.host if request.client else None,
            scored_at=datetime.now(timezone.utc),
        )
        db.add(sr)
        db.commit()
        db.refresh(sr)

        # Fire webhook dispatch (non-blocking background task)
        _dispatch_webhooks_background(sr, user, db)

        return {**result.model_dump(), "request_id": sr.request_id, "mode": mode}
    except Exception as exc:
        logger.warning("Could not persist ScoreRequest: %s", exc)
        return {**result.model_dump(), "request_id": str(uuid.uuid4()), "mode": mode}


# ── POST /v1/score/batch ───────────────────────────────────────────────────────

@router.post("/score/batch", status_code=200, summary="Batch score borrowers (v1)")
@limiter.limit(settings.rate_limit)
async def score_batch_endpoint(
    request: Request,
    payload: List[BorrowerScoreRequest],
    mode: str = Query(default="test", regex="^(live|test)$"),
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Score up to 100 borrowers in a single request."""
    if len(payload) > 100:
        raise HTTPException(status_code=400, detail="Batch size cannot exceed 100 items.")
    logger.info("POST /v1/score/batch | mode=%s | count=%d | key=%s...", mode, len(payload), api_key[:8])
    result = score_borrower_batch(requests=payload, db=db)
    return {**result.model_dump(), "mode": mode}


# ── GET /v1/score/{request_id} ────────────────────────────────────────────────

@router.get("/score/{request_id}", status_code=200, summary="Retrieve a score request by ID")
def get_score_request(
    request_id: str,
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Fetch a previously stored score request by its request_id."""
    sr = db.query(ScoreRequest).filter(ScoreRequest.request_id == request_id).first()
    if not sr:
        raise HTTPException(status_code=404, detail=f"ScoreRequest '{request_id}' not found.")
    return {
        "request_id": sr.request_id,
        "mode": sr.mode,
        "credit_score": sr.credit_score,
        "probability_of_default": sr.probability_of_default,
        "risk_level": sr.risk_level,
        "risk_tier": sr.risk_tier,
        "risk_flags": sr.risk_flags or [],
        "confidence": sr.confidence,
        "model_version": sr.model_version,
        "scored_at": sr.scored_at.isoformat() if sr.scored_at else None,
    }


# ── GET /v1/sandbox/score ─────────────────────────────────────────────────────

@router.get("/sandbox/score", status_code=200, summary="Sandbox: deterministic mock score (no auth)")
def sandbox_score(seed: int = Query(default=42, ge=1, le=9999)):
    """
    Returns a deterministic mock score for UI testing and sandbox exploration.
    Does NOT call the ML model. No authentication required.
    """
    import hashlib
    h = int(hashlib.md5(str(seed).encode()).hexdigest(), 16)
    pd = round((h % 7000) / 10000 + 0.05, 4)   # 0.05 – 0.75
    from app.ml.predict import _map_pd_to_tier
    credit_score, risk_level, risk_tier = _map_pd_to_tier(pd)
    return {
        "sandbox": True,
        "seed": seed,
        "credit_score": credit_score,
        "probability_of_default": pd,
        "risk_level": risk_level,
        "risk_tier": risk_tier,
        "risk_flags": [
            "This is a sandbox response — no real ML inference was performed.",
        ],
        "confidence": 1.0,
        "model_version": "sandbox-v1",
        "scored_at": datetime.now(timezone.utc).isoformat(),
    }


# ── GET /v1/usage ──────────────────────────────────────────────────────────────

@router.get("/usage", status_code=200, summary="Tenant usage metrics")
def get_usage(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    api_key: str = Depends(verify_api_key),
    db: Session = Depends(get_db),
):
    """Returns scoring usage metrics scoped to the authenticated tenant."""
    from sqlalchemy import func

    user = _get_user_from_token(credentials, db)

    # Build query — scope to user if resolved, else aggregate all (admin view)
    q = db.query(ScoreRequest)
    if user:
        q = q.filter(ScoreRequest.user_id == user.user_id)

    total = q.count()
    live_count = q.filter(ScoreRequest.mode == "live").count()
    test_count = q.filter(ScoreRequest.mode == "test").count()
    avg_score = db.query(func.avg(ScoreRequest.credit_score)).scalar() or 0
    high_risk = q.filter(ScoreRequest.risk_level == "HIGH").count()
    success_count = q.filter(ScoreRequest.credit_score >= 580).count()
    error_count = total - success_count

    # Monthly breakdown (last 6 months)
    monthly = []
    from sqlalchemy import extract
    now = datetime.now(timezone.utc)
    for delta in range(5, -1, -1):
        m = (now.month - delta - 1) % 12 + 1
        y = now.year if now.month - delta >= 1 else now.year - 1
        cnt = q.filter(
            extract("month", ScoreRequest.scored_at) == m,
            extract("year", ScoreRequest.scored_at) == y,
        ).count()
        monthly.append({
            "month": datetime(y, m, 1).strftime("%b"),
            "requests": cnt,
        })

    return {
        "total_requests": total,
        "live_requests": live_count,
        "test_requests": test_count,
        "avg_credit_score": round(float(avg_score), 1),
        "high_risk_count": high_risk,
        "success_count": success_count,
        "error_count": error_count,
        "monthly_breakdown": monthly,
        "tenant_id": user.user_id if user else "anonymous",
    }


# ── Webhook Dispatch Helper ────────────────────────────────────────────────────

def _dispatch_webhooks_background(sr: ScoreRequest, user: Optional[User], db: Session):
    """
    Fire-and-forget webhook dispatcher.  Called synchronously but designed to be
    migrated to a Celery/ARQ task queue.  Uses HMAC-SHA256 signing and up to 3
    retries with exponential backoff.
    """
    import asyncio
    import threading

    if not user:
        return

    webhooks = (
        db.query(Webhook)
        .filter(Webhook.user_id == user.user_id, Webhook.is_active == True)
        .all()
    )
    if not webhooks:
        return

    payload = {
        "event": "score.completed",
        "request_id": sr.request_id,
        "mode": sr.mode,
        "credit_score": sr.credit_score,
        "probability_of_default": sr.probability_of_default,
        "risk_level": sr.risk_level,
        "risk_tier": sr.risk_tier,
        "scored_at": sr.scored_at.isoformat() if sr.scored_at else None,
    }

    def _run():
        import hmac, hashlib, time, json
        import httpx as _httpx

        for wh in webhooks:
            body = json.dumps(payload).encode()
            sig = hmac.new(wh.secret.encode(), body, hashlib.sha256).hexdigest()
            headers = {
                "Content-Type": "application/json",
                "X-PAMOJA-Signature": f"sha256={sig}",
            }
            success = False
            last_status = None
            last_error = None
            for attempt in range(1, 4):
                try:
                    t0 = time.time()
                    resp = _httpx.post(wh.url, content=body, headers=headers, timeout=10)
                    duration = int((time.time() - t0) * 1000)
                    last_status = resp.status_code
                    success = resp.status_code < 300
                    _log_delivery(db, wh.webhook_id, sr.request_id, attempt, last_status, success, payload, resp.text, None, duration)
                    if success:
                        break
                except Exception as exc:
                    last_error = str(exc)
                    duration = 0
                    _log_delivery(db, wh.webhook_id, sr.request_id, attempt, None, False, payload, None, last_error, duration)
                time.sleep(2 ** attempt)   # exponential backoff: 2s, 4s, 8s

    thread = threading.Thread(target=_run, daemon=True)
    thread.start()


def _log_delivery(db, webhook_id, sr_id, attempt, status, success, body, resp_body, error, duration):
    try:
        delivery = WebhookDelivery(
            webhook_id=webhook_id,
            score_request_id=sr_id,
            attempt=attempt,
            http_status=status,
            success=success,
            request_body=body,
            response_body=resp_body,
            error_message=error,
            duration_ms=duration,
        )
        db.add(delivery)
        db.commit()
    except Exception as exc:
        logger.warning("Could not log webhook delivery: %s", exc)
