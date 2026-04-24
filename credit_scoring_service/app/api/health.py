"""
Health check endpoint.

GET /v1/health — returns service status and version.
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(tags=["Health"])
settings = get_settings()


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str


@router.get(
    "/v1/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Returns HTTP 200 with service metadata if the service is running correctly.",
)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
    )
