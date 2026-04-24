"""
FastAPI application entry point.

Bootstraps:
  - Logging
  - Rate limiting (slowapi)
  - RFC 7807 Problem Details error handlers
  - Security headers middleware
  - CORS (configurable via CORS_ORIGINS env var)
  - Database table creation on startup
  - ML model boot validation
  - API router registration
"""

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.api.routes import router as score_router
from app.api.health import router as health_router
from app.database.db import engine, Base
from app.utils.logging import setup_logging

# ── Bootstrap ──────────────────────────────────────────────────────────────────
setup_logging()
logger = logging.getLogger(__name__)
settings = get_settings()

# ── Rate limiter ───────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=[settings.rate_limit])

# ── FastAPI app ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI-powered alternative credit scoring microservice. "
        "Submit SME borrower financial data and receive a credit score, "
        "probability of default, SHAP explanations, and risk flags."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# ── Security Headers Middleware ────────────────────────────────────────────────
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if settings.app_env == "production":
        response.headers["Strict-Transport-Security"] = (
            "max-age=63072000; includeSubDomains; preload"
        )
    return response


# ── CORS Middleware ────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── RFC 7807 Problem Details Exception Handlers ────────────────────────────────
def _status_title(code: int) -> str:
    return {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Unprocessable Entity",
        429: "Too Many Requests",
        500: "Internal Server Error",
        503: "Service Unavailable",
    }.get(code, "Error")


from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Return all HTTP errors in RFC 7807 Problem Details JSON format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "type": f"https://credai.io/errors/{exc.status_code}",
            "title": _status_title(exc.status_code),
            "status": exc.status_code,
            "detail": exc.detail,
            "instance": str(request.url),
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return Pydantic validation errors in RFC 7807 format."""
    errors = exc.errors()
    detail = "; ".join(
        f"{' → '.join(str(l) for l in e['loc'])}: {e['msg']}" for e in errors
    )
    return JSONResponse(
        status_code=422,
        content={
            "type": "https://credai.io/errors/422",
            "title": "Unprocessable Entity",
            "status": 422,
            "detail": detail,
            "instance": str(request.url),
        },
    )


# ── Startup / Shutdown ─────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    logger.info(
        "Starting up %s v%s [%s]",
        settings.app_name,
        settings.app_version,
        settings.app_env,
    )

    # Create DB tables (Alembic handles migrations in production)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified / created.")
    except Exception as exc:
        logger.warning(
            "Could not connect to database on startup (running without DB): %s", exc
        )

    # ── ML model boot validation ───────────────────────────────────────────────
    try:
        from app.ml.predict import ScoringEngine
        engine_inst = ScoringEngine()
        if engine_inst.model is None:
            logger.error(
                "CRITICAL: ML model failed to load from '%s'. "
                "Scoring endpoints will return HTTP 503.",
                settings.model_path,
            )
        else:
            logger.info(
                "ML model boot validation PASSED: %s",
                type(engine_inst.model).__name__,
            )
    except Exception as exc:
        logger.error("ML boot validation raised an exception: %s", exc)


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down %s", settings.app_name)


# ── Routers ────────────────────────────────────────────────────────────────────
from app.api.auth import router as auth_router
from app.api.score import router as v1_score_router
from app.api.webhooks import router as webhooks_router

app.include_router(health_router)
app.include_router(auth_router, prefix="/v1")
app.include_router(score_router, prefix="/v1")       # legacy /v1/predict-* endpoints
app.include_router(v1_score_router, prefix="/v1")    # new /v1/score endpoints
app.include_router(webhooks_router, prefix="/v1")    # /v1/webhooks


# ── Root ───────────────────────────────────────────────────────────────────────
@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": f"Welcome to {settings.app_name}. Visit /docs for API documentation."
    }
