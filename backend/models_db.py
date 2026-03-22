from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from database import Base
import datetime

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
