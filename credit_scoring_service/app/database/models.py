"""
SQLAlchemy ORM models for the Credit Scoring Platform.
Covers: users, borrowers, transactions, credit_scores, audit_logs,
        score_requests, webhooks, webhook_deliveries.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Float, Integer, ForeignKey,
    DateTime, Text, Boolean, Enum, Numeric, JSON
)
from sqlalchemy.orm import relationship

from app.database.db import Base


def utcnow():
    return datetime.now(timezone.utc)


def generate_uuid():
    return str(uuid.uuid4())


# =============================================================================
# User (SME or Lender)
# =============================================================================

class User(Base):
    """Platform user — either an SME owner or a lender."""
    __tablename__ = "users"

    user_id       = Column(String(36), primary_key=True, default=generate_uuid)
    name          = Column(String(255), nullable=False)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(512), nullable=False, default="")
    user_type     = Column(String(20), nullable=False, default="SME")
    api_key       = Column(String(128), unique=True, index=True)
    is_active     = Column(Boolean, nullable=False, default=True)
    created_at    = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at    = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    borrowers      = relationship("Borrower", back_populates="user", cascade="all, delete-orphan")
    audit_logs     = relationship("AuditLog", back_populates="user")
    score_requests = relationship("ScoreRequest", back_populates="user", cascade="all, delete-orphan")
    webhooks       = relationship("Webhook", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.user_id} email={self.email!r} type={self.user_type}>"


# =============================================================================
# Borrower (SME Business)
# =============================================================================

class Borrower(Base):
    """SME business profile linked to a User account."""
    __tablename__ = "borrowers"

    borrower_id   = Column(String(36), primary_key=True, default=generate_uuid)
    user_id       = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True, index=True)
    business_name = Column(String(255), nullable=False, default="Unknown Business")
    registration_date    = Column(DateTime(timezone=True))
    business_age_months  = Column(Integer, default=0)

    # Kaggle Credit Risk Dataset features (used by ML model)
    person_age                  = Column(Integer)
    person_income               = Column(Numeric(15, 2))
    person_home_ownership       = Column(String(20))
    person_emp_length           = Column(Numeric(5, 1))
    loan_intent                 = Column(String(50))
    loan_grade                  = Column(String(5))
    loan_amnt                   = Column(Numeric(15, 2))
    loan_int_rate               = Column(Numeric(6, 2))
    loan_percent_income         = Column(Numeric(6, 4))
    cb_person_default_on_file   = Column(String(1))
    cb_person_cred_hist_length  = Column(Integer)

    # Legacy fields kept for DB compatibility
    income               = Column(Float)
    loan_amount          = Column(Float)
    transaction_frequency = Column(Integer, default=0)
    business_age         = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user          = relationship("User", back_populates="borrowers")
    transactions  = relationship("Transaction", back_populates="borrower", cascade="all, delete-orphan")
    credit_scores = relationship("CreditScore", back_populates="borrower", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Borrower id={self.borrower_id} business={self.business_name!r}>"


# =============================================================================
# Transaction
# =============================================================================

class Transaction(Base):
    """SME financial transaction record used for behavior profiling."""
    __tablename__ = "transactions"

    transaction_id   = Column(String(36), primary_key=True, default=generate_uuid)
    borrower_id      = Column(String(36), ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False, index=True)
    amount           = Column(Numeric(15, 2), nullable=False)
    type             = Column(String(20), nullable=False)
    description      = Column(Text)
    transaction_date = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    borrower = relationship("Borrower", back_populates="transactions")

    def __repr__(self):
        return f"<Transaction id={self.transaction_id} type={self.type} amount={self.amount}>"


# =============================================================================
# CreditScore
# =============================================================================

class CreditScore(Base):
    """ML prediction result including SHAP explanations and recommendations."""
    __tablename__ = "credit_scores"

    score_id             = Column(String(36), primary_key=True, default=generate_uuid)
    borrower_id          = Column(String(36), ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False, index=True)
    credit_score         = Column(Integer, nullable=False)         # 300–850
    probability_of_default = Column(Float, nullable=False)         # 0.0–1.0
    risk_level           = Column(String(20), nullable=False)
    shap_explanations    = Column(JSON)                           # top-5 feature importances
    recommendations      = Column(JSON)                           # actionable advice list
    model_version        = Column(String(50), default="1.0.0")
    scored_at            = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    borrower = relationship("Borrower", back_populates="credit_scores")

    def __repr__(self):
        return f"<CreditScore id={self.score_id} score={self.credit_score} risk={self.risk_level}>"


# =============================================================================
# AuditLog
# =============================================================================

class AuditLog(Base):
    """Immutable record of every API request and response."""
    __tablename__ = "audit_logs"

    log_id           = Column(String(36), primary_key=True, default=generate_uuid)
    user_id          = Column(String(36), ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    endpoint         = Column(String(255), nullable=False)
    method           = Column(String(10), nullable=False, default="POST")
    request_payload  = Column(JSON)
    response_payload = Column(JSON)
    status_code      = Column(Integer)
    duration_ms      = Column(Integer)
    ip_address       = Column(String(45))  # supports IPv4 and IPv6
    timestamp        = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="audit_logs")

    def __repr__(self):
        return f"<AuditLog id={self.log_id} endpoint={self.endpoint!r} status={self.status_code}>"


# =============================================================================
# ScoreRequest  (tenant-scoped scoring log)
# =============================================================================

class ScoreRequest(Base):
    """Immutable log of every /v1/score call, scoped to a tenant (user)."""
    __tablename__ = "score_requests"

    request_id           = Column(String(36), primary_key=True, default=generate_uuid)
    user_id              = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=True, index=True)
    borrower_id          = Column(String(36), ForeignKey("borrowers.borrower_id", ondelete="SET NULL"), nullable=True)
    mode                 = Column(String(10), nullable=False, default="test")   # 'live' | 'test'
    credit_score         = Column(Integer)
    probability_of_default = Column(Float)
    risk_level           = Column(String(20))
    risk_tier            = Column(String(30))   # e.g. 'PRIME', 'NEAR_PRIME', 'SUBPRIME' …
    risk_flags           = Column(JSON)         # list of plain-English flag strings
    confidence           = Column(Float)        # 0.0–1.0 heuristic completeness metric
    input_payload        = Column(JSON)
    model_version        = Column(String(50), default="1.0.0")
    ip_address           = Column(String(45))
    scored_at            = Column(DateTime(timezone=True), default=utcnow, nullable=False, index=True)

    user     = relationship("User", back_populates="score_requests")
    borrower = relationship("Borrower")

    def __repr__(self):
        return f"<ScoreRequest id={self.request_id} mode={self.mode} score={self.credit_score}>"


# =============================================================================
# Webhook
# =============================================================================

class Webhook(Base):
    """Webhook subscription registered by a lender / developer."""
    __tablename__ = "webhooks"

    webhook_id  = Column(String(36), primary_key=True, default=generate_uuid)
    user_id     = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    url         = Column(String(2048), nullable=False)
    secret      = Column(String(256), nullable=False)   # raw secret for HMAC-SHA256 signing
    description = Column(String(255))
    is_active   = Column(Boolean, nullable=False, default=True)
    created_at  = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at  = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    user      = relationship("User", back_populates="webhooks")
    deliveries = relationship("WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Webhook id={self.webhook_id} url={self.url!r} active={self.is_active}>"


# =============================================================================
# WebhookDelivery
# =============================================================================

class WebhookDelivery(Base):
    """Per-attempt delivery record for a webhook event."""
    __tablename__ = "webhook_deliveries"

    delivery_id      = Column(String(36), primary_key=True, default=generate_uuid)
    webhook_id       = Column(String(36), ForeignKey("webhooks.webhook_id", ondelete="CASCADE"), nullable=False, index=True)
    score_request_id = Column(String(36), ForeignKey("score_requests.request_id", ondelete="SET NULL"), nullable=True)
    attempt          = Column(Integer, nullable=False, default=1)   # 1-indexed retry count
    http_status      = Column(Integer)                              # response status code
    success          = Column(Boolean, nullable=False, default=False)
    request_body     = Column(JSON)
    response_body    = Column(Text)
    error_message    = Column(Text)
    duration_ms      = Column(Integer)
    delivered_at     = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    webhook = relationship("Webhook", back_populates="deliveries")

    def __repr__(self):
        return f"<WebhookDelivery id={self.delivery_id} attempt={self.attempt} success={self.success}>"
