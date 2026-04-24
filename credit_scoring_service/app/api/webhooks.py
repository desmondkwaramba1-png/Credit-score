"""
Webhook CRUD endpoints.

POST   /v1/webhooks           — Register a new webhook URL
GET    /v1/webhooks           — List all webhooks for the authenticated user
GET    /v1/webhooks/{id}      — Get a single webhook + delivery history
PATCH  /v1/webhooks/{id}      — Update URL / description / active status
DELETE /v1/webhooks/{id}      — Remove a webhook
GET    /v1/webhooks/{id}/deliveries — List delivery attempts for a webhook
"""

import logging
import secrets
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl, Field
from sqlalchemy.orm import Session

from app.auth.api_key_auth import verify_api_key
from app.database.db import get_db
from app.database.models import Webhook, WebhookDelivery, User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
_bearer = HTTPBearer(auto_error=False)


# ── Pydantic schemas ───────────────────────────────────────────────────────────

class WebhookCreate(BaseModel):
    url: HttpUrl
    description: Optional[str] = Field(default=None, max_length=255)


class WebhookUpdate(BaseModel):
    url: Optional[HttpUrl] = None
    description: Optional[str] = Field(default=None, max_length=255)
    is_active: Optional[bool] = None


class WebhookOut(BaseModel):
    webhook_id: str
    url: str
    description: Optional[str]
    is_active: bool
    created_at: str

    class Config:
        from_attributes = True


class DeliveryOut(BaseModel):
    delivery_id: str
    attempt: int
    http_status: Optional[int]
    success: bool
    error_message: Optional[str]
    duration_ms: Optional[int]
    delivered_at: str

    class Config:
        from_attributes = True


# ── Helpers ────────────────────────────────────────────────────────────────────

def _resolve_user(
    credentials: Optional[HTTPAuthorizationCredentials],
    db: Session,
) -> User:
    """Resolve User from JWT; raise 401 if not found."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        from app.auth.security import decode_access_token
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub") if payload else None
        if user_id:
            user = db.query(User).filter(User.user_id == user_id).first()
            if user:
                return user
    except Exception:
        pass
    raise HTTPException(status_code=401, detail="Invalid or expired token.")


def _wh_out(wh: Webhook) -> dict:
    return {
        "webhook_id": wh.webhook_id,
        "url": wh.url,
        "description": wh.description,
        "is_active": wh.is_active,
        "created_at": wh.created_at.isoformat() if wh.created_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("", status_code=201, summary="Register a webhook")
def create_webhook(
    body: WebhookCreate,
    api_key: str = Depends(verify_api_key),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """
    Register a new webhook URL for the authenticated tenant.
    Returns the raw signing secret (store it — it won't be shown again).
    The webhook URL must be HTTPS in production.
    """
    user = _resolve_user(credentials, db)
    raw_secret = secrets.token_hex(32)   # 256-bit random secret

    url_str = str(body.url)
    wh = Webhook(
        user_id=user.user_id,
        url=url_str,
        secret=raw_secret,
        description=body.description,
        is_active=True,
    )
    db.add(wh)
    db.commit()
    db.refresh(wh)

    logger.info("Webhook registered: %s for user %s", wh.webhook_id, user.user_id)
    return {
        **_wh_out(wh),
        "signing_secret": raw_secret,   # shown once — store securely!
    }


@router.get("", status_code=200, summary="List webhooks")
def list_webhooks(
    api_key: str = Depends(verify_api_key),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """List all webhooks registered by the authenticated tenant."""
    user = _resolve_user(credentials, db)
    webhooks = db.query(Webhook).filter(Webhook.user_id == user.user_id).all()
    return [_wh_out(wh) for wh in webhooks]


@router.get("/{webhook_id}", status_code=200, summary="Get a webhook")
def get_webhook(
    webhook_id: str,
    api_key: str = Depends(verify_api_key),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    user = _resolve_user(credentials, db)
    wh = db.query(Webhook).filter(
        Webhook.webhook_id == webhook_id,
        Webhook.user_id == user.user_id,
    ).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found.")
    return _wh_out(wh)


@router.patch("/{webhook_id}", status_code=200, summary="Update a webhook")
def update_webhook(
    webhook_id: str,
    body: WebhookUpdate,
    api_key: str = Depends(verify_api_key),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    user = _resolve_user(credentials, db)
    wh = db.query(Webhook).filter(
        Webhook.webhook_id == webhook_id,
        Webhook.user_id == user.user_id,
    ).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found.")
    if body.url is not None:
        wh.url = str(body.url)
    if body.description is not None:
        wh.description = body.description
    if body.is_active is not None:
        wh.is_active = body.is_active
    db.commit()
    db.refresh(wh)
    return _wh_out(wh)


@router.delete("/{webhook_id}", status_code=204, summary="Delete a webhook")
def delete_webhook(
    webhook_id: str,
    api_key: str = Depends(verify_api_key),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    user = _resolve_user(credentials, db)
    wh = db.query(Webhook).filter(
        Webhook.webhook_id == webhook_id,
        Webhook.user_id == user.user_id,
    ).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found.")
    db.delete(wh)
    db.commit()
    return


@router.get("/{webhook_id}/deliveries", status_code=200, summary="List delivery attempts")
def list_deliveries(
    webhook_id: str,
    api_key: str = Depends(verify_api_key),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    db: Session = Depends(get_db),
):
    """Return the last 50 delivery attempts for a webhook."""
    user = _resolve_user(credentials, db)
    wh = db.query(Webhook).filter(
        Webhook.webhook_id == webhook_id,
        Webhook.user_id == user.user_id,
    ).first()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found.")

    deliveries = (
        db.query(WebhookDelivery)
        .filter(WebhookDelivery.webhook_id == webhook_id)
        .order_by(WebhookDelivery.delivered_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "delivery_id": d.delivery_id,
            "attempt": d.attempt,
            "http_status": d.http_status,
            "success": d.success,
            "error_message": d.error_message,
            "duration_ms": d.duration_ms,
            "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None,
        }
        for d in deliveries
    ]
