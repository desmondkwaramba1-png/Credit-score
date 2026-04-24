from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Boolean
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String)  # 'lender' or 'sme'
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class ScoreRecord(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String, index=True)
    borrower_name = Column(String)
    score = Column(Integer)
    band = Column(String)
    default_probability = Column(Float)
    scoring_method = Column(String)
    recommendation = Column(JSON)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
