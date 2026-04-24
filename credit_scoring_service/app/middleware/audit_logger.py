"""
Audit Logging Middleware.

Logs every incoming API request and its response to the audit_logs
PostgreSQL table. Captures payload, status code, duration, and IP.
"""

import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class AuditLogMiddleware(BaseHTTPMiddleware):
    """
    Starlette middleware that persists an audit log entry for every request.

    Skips logging for:
    - /health          (noisy, low-value)
    - /docs, /openapi  (FastAPI internal)
    """

    SKIP_PATHS = {"/health", "/docs", "/openapi.json", "/redoc", "/favicon.ico"}

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        # Read and cache the request body so it can be forwarded and logged
        body_bytes = await request.body()
        request_payload = None
        try:
            request_payload = json.loads(body_bytes) if body_bytes else None
        except Exception:
            request_payload = {"raw": body_bytes.decode("utf-8", errors="replace")[:500]}

        start_time = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        # Capture response body safely (only for JSON responses)
        response_payload = None
        try:
            if "application/json" in response.headers.get("content-type", ""):
                resp_body = b""
                async for chunk in response.body_iterator:
                    resp_body += chunk
                response_payload = json.loads(resp_body)

                # Reconstruct response with the consumed body
                from starlette.responses import JSONResponse
                response = JSONResponse(
                    content=response_payload,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                )
        except Exception:
            pass

        # Persist to audit_logs table asynchronously (best-effort)
        try:
            from app.database.db import SessionLocal
            db = SessionLocal()
            try:
                from app.database.models import AuditLog
                log = AuditLog(
                    log_id=uuid.uuid4(),
                    endpoint=request.url.path,
                    method=request.method,
                    request_payload=request_payload,
                    response_payload=response_payload,
                    status_code=response.status_code,
                    duration_ms=duration_ms,
                    ip_address=request.client.host if request.client else None,
                    timestamp=datetime.now(timezone.utc),
                )
                db.add(log)
                db.commit()
            finally:
                db.close()
        except Exception as exc:
            logger.debug("Audit log not persisted (DB may be offline): %s", exc)

        return response
