"""
PAMOJA AI — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""
import sys, os
import logging
from dotenv import load_dotenv
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import secrets
from score_engine import PamojaScoreEngine
from database import engine, Base, get_db
import models_db
import auth
from auth import get_password_hash, verify_password, create_access_token, get_current_user

# ... (rest of imports)

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("pamoja-ai")

# Load environment variables
load_dotenv()

# Create database tables (Fail-safe for Vercel startup)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created.")
except Exception as e:
    logger.error(f"Database connection failed at startup: {e}")
    # We continue so the health check can still return a status even if DB is down

app = FastAPI(title="PAMOJA AI API", version="0.4.0",
              description="Alternative credit scoring for Zimbabwean SMEs")

app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

# Load engine once at startup
# Robust path detection for Local, Vercel, and Docker/HuggingFace
possible_paths = [
    os.path.join(os.path.dirname(__file__), "models"), # Local/Docker
    os.path.join(os.path.dirname(os.path.dirname(__file__)), "models"), # Vercel
    os.path.join(os.getcwd(), "models"), # Current working dir
]
MODEL_DIR = os.getenv("MODEL_DIR")
if not MODEL_DIR:
    for path in possible_paths:
        if os.path.exists(path):
            MODEL_DIR = path
            break
    if not MODEL_DIR:
        MODEL_DIR = possible_paths[0] # Fallback

logger.info(f"Using model directory: {MODEL_DIR}")
engine_scorer = PamojaScoreEngine(model_dir=MODEL_DIR)

# API key store from environment
API_KEYS = {
    os.getenv("DEMO_API_KEY", "pk_demo_zw_pamoja2026"): {"name": "Demo Key", "tier": "starter"},
    os.getenv("LIVE_API_KEY", "pk_live_zw_lender001"):  {"name": "Lender Portal", "tier": "growth"},
}

def verify_key(x_api_key: str = Header(default=os.getenv("DEMO_API_KEY", "pk_demo_zw_pamoja2026"))):
    if not isinstance(x_api_key, str):
        x_api_key = str(x_api_key)
    if x_api_key not in API_KEYS:
        logger.warning(f"Unauthorized access attempt with key: {x_api_key[:8]}...")
        raise HTTPException(status_code=401, detail="Invalid API key")
    return API_KEYS[x_api_key]


# ── MODELS ────────────────────────────────────────────────────
class BorrowerData(BaseModel):
    business_type: Optional[str] = "tuck_shop"
    province: Optional[str] = "Harare"
    gender: Optional[str] = "female"
    age: Optional[int] = 30
    years_in_business: Optional[float] = 2
    mm_consistency_score: Optional[float] = 0.6
    mm_months_active: Optional[int] = 18
    mm_inflow_ratio: Optional[float] = 1.1
    mm_avg_balance_usd: Optional[float] = 40
    mm_tx_count_monthly: Optional[int] = 20
    mm_unique_counterparties: Optional[int] = 10
    mm_merchant_ratio: Optional[float] = 0.3
    prior_loans_count: Optional[int] = 0
    repayment_rate: Optional[float] = None
    days_late_recent_loan: Optional[int] = 0
    has_active_loan: Optional[int] = 0
    airtime_spend_monthly_usd: Optional[float] = 6
    airtime_regularity_days: Optional[float] = 7
    uses_airtime_credit: Optional[int] = 0
    airtime_credit_repay_fast: Optional[int] = 1
    is_rounds_member: Optional[int] = 0
    rounds_groups_count: Optional[int] = 0
    rounds_consistency_score: Optional[float] = 0
    rounds_tenure_months: Optional[int] = 0
    is_rounds_organizer: Optional[int] = 0
    zesa_payment_consistency: Optional[float] = 0.5
    months_since_zesa_disconnection: Optional[int] = 0
    rent_via_mobile: Optional[int] = 0
    rent_consistency_score: Optional[float] = 0
    council_bills_consistent: Optional[int] = 0
    monthly_revenue_usd: Optional[float] = 200
    revenue_cv: Optional[float] = 0.4
    is_registered: Optional[int] = 0
    pays_suppliers_on_time: Optional[int] = 1
    stock_purchase_regularity: Optional[float] = 0.5
    years_at_address: Optional[int] = 2
    community_group_member: Optional[int] = 0
    has_references: Optional[int] = 0
    has_fixed_location: Optional[int] = 1

class ScoreRequest(BaseModel):
    phone: Optional[str] = ""
    consent_token: Optional[str] = ""
    borrower_name: Optional[str] = ""
    data: BorrowerData

class LoanRequest(BaseModel):
    phone: Optional[str] = ""
    borrower_name: Optional[str] = ""
    interest_rate_pct: Optional[float] = 0.04
    total_amount: Optional[float] = 5000
    total_amount_to_repay: Optional[float] = 5200
    duration_days: Optional[int] = 7
    prior_loans_count: Optional[int] = 0
    prior_defaults: Optional[int] = 0
    new_versus_repeat: Optional[str] = "Repeat"
    lender_portion_funded: Optional[float] = 0.3
    amount_funded_by_lender: Optional[float] = 1500
    days_since_last_loan: Optional[int] = 30
    avg_loan_amount: Optional[float] = 5000
    monthly_revenue_usd: Optional[float] = 200
    loan_type_risk: Optional[float] = 0.008
    month: Optional[int] = 6
    day_of_week: Optional[int] = 1
    quarter: Optional[int] = 2

class BatchRequest(BaseModel):
    borrowers: List[ScoreRequest]

class UserRegister(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # 'lender' or 'sme'

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str


# ── HEALTH CHECK ───────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "ok", "service": "PAMOJA AI API", "version": "0.4.0"}

@app.get("/health")
def health():
    return {"status": "ok"}


# ── AUTH ENDPOINTS ─────────────────────────────────────────────
@app.post("/auth/register", response_model=Token)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    # Check if user exists
    existing_user = db.query(models_db.User).filter(models_db.User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_pwd = get_password_hash(user_data.password)
    new_user = models_db.User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        full_name=user_data.full_name,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Return token immediately
    access_token = create_access_token(data={"sub": new_user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": new_user.role,
        "full_name": new_user.full_name
    }

@app.post("/auth/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(models_db.User).filter(models_db.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user.email})
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user.role,
        "full_name": user.full_name
    }

@app.get("/auth/me")
def get_me(current_user: models_db.User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role
    }

# ── ENDPOINTS ──────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "version": "0.4.0",
            "engine": "PAMOJA Credit Score Engine",
            "models": ["behavioral_hgb", "zindi_loan_hgb"],
            "auc_loan_model": 0.9459}

@app.post("/score")
def score_borrower(req: ScoreRequest, key=Depends(verify_key), db: Session = Depends(get_db), current_user: models_db.User = Depends(get_current_user)):
    result = engine_scorer.score(req.data.model_dump())
    
    # Save to database
    db_record = models_db.ScoreRecord(
        phone=req.phone,
        borrower_name=req.borrower_name,
        score=result["score"],
        band=result["band"],
        default_probability=result["default_probability"],
        scoring_method=result["scoring_method"],
        recommendation=result["loan_recommendation"]
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)

    return {
        "status": "ok",
        "phone": req.phone,
        "borrower_name": req.borrower_name,
        "result": result
    }

@app.post("/score/loan")
def score_loan(req: LoanRequest, key=Depends(verify_key), db: Session = Depends(get_db), current_user: models_db.User = Depends(get_current_user)):
    result = engine_scorer.score_loan(req.model_dump())
    
    # Save to database
    db_record = models_db.ScoreRecord(
        phone=req.phone,
        borrower_name=req.borrower_name,
        score=result["score"],
        band=result["band"],
        default_probability=result["default_probability"],
        scoring_method=result["scoring_method"],
        recommendation=result["loan_recommendation"]
    )
    db.add(db_record)
    db.commit()
    
    return {"status": "ok", "phone": req.phone, "result": result}

@app.post("/score/batch")
def score_batch(req: BatchRequest, key=Depends(verify_key), db: Session = Depends(get_db), current_user: models_db.User = Depends(get_current_user)):
    if len(req.borrowers) > 100:
        raise HTTPException(400, "Max 100 per batch")
    results = []
    for i, b in enumerate(req.borrowers):
        try:
            r = engine_scorer.score(b.data.model_dump())
            
            # Save each to database
            db_record = models_db.ScoreRecord(
                phone=b.phone,
                borrower_name=b.borrower_name,
                score=r["score"],
                band=r["band"],
                default_probability=r["default_probability"],
                scoring_method=r["scoring_method"],
                recommendation=r["loan_recommendation"]
            )
            db.add(db_record)
            
            results.append({"index": i, "phone": b.phone,
                           "borrower_name": b.borrower_name,
                           "result": r, "error": None})
        except Exception as e:
            results.append({"index": i, "error": str(e), "result": None})
    
    db.commit()
    return {"status": "ok", "count": len(results), "results": results}

@app.get("/history")
def get_history(db: Session = Depends(get_db), current_user: models_db.User = Depends(get_current_user)):
    query = db.query(models_db.ScoreRecord)
    
    # Isolation: Lenders see all scored records. SMEs only see their own scores.
    if current_user.role == 'sme':
        query = query.filter(models_db.ScoreRecord.phone == current_user.email) # Assuming email/phone link for demo
    
    records = query.order_by(models_db.ScoreRecord.created_at.desc()).all()
    return {"status": "ok", "count": len(records), "history": records}

@app.get("/docs/schema")
def schema():
    return {
        "borrower_fields": BorrowerData.model_json_schema(),
        "loan_fields": LoanRequest.model_json_schema(),
    }
