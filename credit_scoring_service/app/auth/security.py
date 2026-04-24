from datetime import datetime, timedelta, timezone
import secrets
from passlib.context import CryptContext
import jwt

from app.config import get_settings

settings = get_settings()

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def hash_api_key(api_key: str) -> str:
    return pwd_context.hash(api_key)

def verify_api_key_hash(plain_api_key: str, hashed_api_key: str) -> bool:
    return pwd_context.verify(plain_api_key, hashed_api_key)

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=ALGORITHM)

def generate_api_key(user_id: str, mode: str = "live") -> str:
    """Generates a Stripe-like API key that embeds the user_id for lookup before bcrypt verification."""
    prefix = "pmj_live" if mode == "live" else "pmj_test"
    key_body = secrets.token_hex(16)
    return f"{prefix}_{user_id}_{key_body}"


def decode_access_token(token: str) -> dict | None:
    """
    Decode a JWT and return its payload dict.
    Returns None (instead of raising) on expiry or invalid signature,
    so callers can handle missing auth gracefully.
    """
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

