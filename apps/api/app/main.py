from __future__ import annotations

import logging
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import APIRouter, FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.api.routes import (
    analytics,
    auth,
    candidate_portal,
    candidates,
    documents,
    interviews,
    jobs,
    organizations,
)
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.schemas.common import HealthResponse
from app.services.demo_seed import ensure_public_showcase_seeded

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("talentos.http")


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    if settings.app_env != "test":
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            ensure_public_showcase_seeded(db)
        finally:
            db.close()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="TalentOS API",
        version="1.0.0",
        description=(
            "Versioned REST API for TalentOS: recruitment workflow management, "
            "role-based access control, evidence-based resume intelligence, "
            "interview coordination, and recruitment analytics."
        ),
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
    )

    @app.middleware("http")
    async def security_and_audit_middleware(request: Request, call_next) -> Response:
        start = time.perf_counter()
        response: Response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        response.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api/v1/auth") else response.headers.get("Cache-Control", "private, no-cache")
        logger.info("%s %s -> %s (%.1fms)", request.method, request.url.path, response.status_code, elapsed_ms)
        return response

    register_exception_handlers(app)

    v1 = APIRouter(prefix="/api/v1")

    @v1.get("/health", response_model=HealthResponse, tags=["System"])
    def health_check() -> HealthResponse:
        return HealthResponse(
            status="ok",
            service="talentos-api",
            database="configured",
            ai_provider=settings.ai_provider,
            email_configured=settings.email_configured,
            timestamp=datetime.now(timezone.utc),
        )

    @v1.get("/ready", response_model=HealthResponse, tags=["System"])
    def readiness_check() -> HealthResponse:
        db_status = "connected"
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return HealthResponse(
            status="ready",
            service="talentos-api",
            database=db_status,
            ai_provider=settings.ai_provider,
            email_configured=settings.email_configured,
            timestamp=datetime.now(timezone.utc),
        )

    v1.include_router(auth.router)
    v1.include_router(organizations.router)
    v1.include_router(jobs.router)
    v1.include_router(candidates.router)
    v1.include_router(documents.router)
    v1.include_router(interviews.router)
    v1.include_router(analytics.router)
    v1.include_router(candidate_portal.router)

    app.include_router(v1)
    return app


app = create_app()
