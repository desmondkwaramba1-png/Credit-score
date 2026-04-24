"""
Main entry point for the Credit Scoring ML Service API.

Wires up the FastAPI application, loads the ML model on startup,
configures logging, audit middleware, and includes feature endpoints.
"""

import logging
import os
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

# Local imports
from app.api import routes
from app.config import get_settings
from app.database.db import engine, SessionLocal
from app.schemas.response_schema import HealthResponse
from app.ml import predict
from app.middleware.audit_logger import AuditLogMiddleware

settings = get_settings()

# Configure logging
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO if not settings.debug else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events:
    - Preload the Machine Learning model into memory.
    - Check database connectivity.
    """
    logger.info("Starting up `%s` (env: %s)...", settings.app_name, settings.app_env)

    try:
        model = predict.load_model()
        if model:
            logger.info("ML tracking model successfully pre-loaded.")
        else:
            logger.warning("ML prediction model failed to load or is not present.")
    except Exception as e:
        logger.error("Error pre-loading ML model: %s", e)

    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("Database connection established successfully.")
    except Exception as e:
        logger.error("Database connection failed: %s", e)

    yield

    logger.info("Shutting down %s...", settings.app_name)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="End-to-end AI-powered credit scoring and SME insights platform.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Exception handlers
app.state.limiter = routes.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"],
)
# Add custom Audit Logging Middleware
app.add_middleware(AuditLogMiddleware)

# API routes
from app.api.auth import router as auth_router
app.include_router(auth_router, prefix="/v1")
app.include_router(routes.router, prefix="/v1")


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["System"],
    summary="Health check",
    description="Returns the status of the API, database connectivity, and ML model.",
)
async def health_check():
    """Health check endpoint."""
    db_status = "ok"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "disconnected"

    model_loaded = predict.load_model() is not None

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        db_status=db_status,
        model="loaded" if model_loaded else "unavailable"
    )

