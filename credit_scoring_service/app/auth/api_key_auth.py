"""
API key authentication dependency.

Clients must pass: Authorization: Bearer <TOKEN_OR_API_KEY>
Accepts:
  1. JWT access token (issued at login) — for dashboard users
  2. Structured API key (pmj_live_... / pmj_test_...) — for programmatic/API access
"""

import logging
from fastapi import Security, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

security = HTTPBearer(auto_error=True)

from sqlalchemy.orm import Session
from app.database.db import get_db
from app.database.models import User
from app.auth.security import verify_api_key_hash, decode_access_token


async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db),
) -> str:
    """
    Dual-mode FastAPI dependency that accepts:
      1. A JWT access token (issued at /v1/auth/login) — for dashboard users.
      2. A structured pmj_ API key — for programmatic/API access.
    Returns the user_id string on success.
    Raises HTTP 401 on failure.
    """
    token = credentials.credentials

    # ── Path 1: Try to decode as a JWT (dashboard users) ───────────────────────
    try:
        payload = decode_access_token(token)
        if payload and payload.get("sub"):
            user_id = payload["sub"]
            user = db.query(User).filter(User.user_id == user_id).first()
            if user and user.is_active:
                logger.debug("Authenticated via JWT for user: %s", user_id)
                return user_id
    except Exception:
        pass  # Not a valid JWT — fall through to API key check

    # ── Path 2: Try to decode as a structured pmj_ API key ─────────────────────
    parts = token.split("_")
    if len(parts) == 4 and parts[0] == "pmj":
        user_id = parts[2]
        user = db.query(User).filter(User.user_id == user_id).first()
        if user and user.api_key and verify_api_key_hash(token, user.api_key):
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User account is deactivated.",
                )
            logger.debug("Authenticated via API key for user: %s", user_id)
            return user_id
        logger.warning("Rejected invalid API key for user_id: %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Neither JWT nor valid API key format ────────────────────────────────────
    logger.warning(
        "Rejected request — token is neither JWT nor pmj_ key: %s...", token[:12]
    )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials. Use your login JWT token or a valid API key.",
        headers={"WWW-Authenticate": "Bearer"},
    )
