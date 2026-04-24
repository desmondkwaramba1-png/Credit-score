"""
API key authentication dependency.

Clients must pass: Authorization: Bearer <API_KEY>
Keys are validated against the set defined in settings.VALID_API_KEYS.
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
from app.auth.security import verify_api_key_hash

async def verify_api_key(
    credentials: HTTPAuthorizationCredentials = Security(security),
    db: Session = Depends(get_db)
) -> str:
    """
    FastAPI dependency that validates the Bearer token against the known API keys in DB.
    Returns the validated raw API key on success.
    Raises HTTP 401 on failure.
    """
    api_key = credentials.credentials

    # Parse user_id from pmj_mode_user_id_keybody
    parts = api_key.split('_')
    if len(parts) != 4 or parts[0] != "pmj":
        logger.warning("Rejected request with malformed API key: %s...", api_key[:8])
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key format.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = parts[2]
    user = db.query(User).filter(User.user_id == user_id).first()
    
    if not user or not user.api_key or not verify_api_key_hash(api_key, user.api_key):
        logger.warning("Rejected request with invalid API key for user: %s", user_id)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated.")

    logger.debug("Authenticated request with API key for user: %s", user_id)
    return api_key
