import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import logging
logger = logging.getLogger(__name__)

from app.database.db import get_db
from app.database.models import User
from app.schemas.auth_schema import UserCreate, Token, ApiKeyResponse
from app.auth.security import (
    verify_password, get_password_hash, create_access_token, generate_api_key, hash_api_key
)
from app.config import get_settings

settings = get_settings()

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new User (SME or Lender) and returns a JWT token."""
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Ensure UUID is generated first
    new_user_id = str(uuid.uuid4())
    mode = "live" if settings.app_env == "production" else "test"
    raw_api_key = generate_api_key(user_id=new_user_id, mode=mode)
    hashed_api_key = hash_api_key(raw_api_key)
    hashed_password = get_password_hash(user_in.password)

    new_user = User(
        user_id=new_user_id,
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed_password,
        user_type=user_in.user_type,
        api_key=hashed_api_key
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Generate JWT Session Token
    access_token = create_access_token(
        data={"sub": new_user.user_id, "user_type": new_user.user_type}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(new_user.user_id),
        "email": new_user.email,
        "user_type": new_user.user_type.lower(),
        "name": new_user.name,
        "api_key": raw_api_key
    }


@router.post("/login", response_model=Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 compatible token login, getting a JWT token for API access."""
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(
        data={"sub": str(user.user_id), "user_type": user.user_type.name if hasattr(user.user_type, 'name') else user.user_type}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.user_id),
        "email": user.email,
        "user_type": (user.user_type.name if hasattr(user.user_type, 'name') else user.user_type).lower(),
        "name": user.name
    }


@router.post("/api-key/rotate", response_model=ApiKeyResponse)
def rotate_api_key(email: str, db: Session = Depends(get_db)):
    """
    WARNING: This endpoint should be protected by a strictly-verified JWT dependency in production.
    For this demo, we accept the email to identify the user rotating the key.
    """
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    mode = "live" if settings.app_env == "production" else "test"
    raw_api_key = generate_api_key(user_id=user.user_id, mode=mode)
    user.api_key = hash_api_key(raw_api_key)
    
    db.commit()
    db.refresh(user)

    return {
        "old_key_invalidated": True,
        "new_api_key": raw_api_key
    }
