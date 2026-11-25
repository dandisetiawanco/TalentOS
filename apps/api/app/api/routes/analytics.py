from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_org_roles
from app.db.session import get_db
from app.models import Candidate, Job
from app.schemas.analytics import AnalyticsOverviewOut
from app.services.analytics import compute_organization_analytics, export_analytics_csv

router = APIRouter(tags=["Analytics & Search"])


@router.get("/analytics/overview", response_model=AnalyticsOverviewOut)
def get_analytics_overview(
    days: int = Query(default=60, ge=7, le=365),
    department: str | None = Query(default=None),
    job_id: uuid.UUID | None = Query(default=None),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> AnalyticsOverviewOut:
    assert auth.organization is not None
    return compute_organization_analytics(
        db,
        organization_id=auth.organization.id,
        days=days,
        department=department,
        job_id=job_id,
    )


@router.get("/analytics/export.csv")
def export_analytics(
    days: int = Query(default=60, ge=7, le=365),
    department: str | None = Query(default=None),
    job_id: uuid.UUID | None = Query(default=None),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> Response:
    assert auth.organization is not None
    overview = compute_organization_analytics(
        db,
        organization_id=auth.organization.id,
        days=days,
        department=department,
        job_id=job_id,
    )
    csv_body = export_analytics_csv(overview)
    return Response(
        content=csv_body,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="talentos-recruitment-analytics.csv"'},
    )


@router.get("/search")
def global_workspace_search(
    q: str = Query(min_length=1, max_length=120),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    assert auth.organization is not None
    pattern = f"%{q.strip()}%"
    jobs = list(
        db.scalars(
            select(Job)
            .where(
                Job.organization_id == auth.organization.id,
                or_(Job.title.ilike(pattern), Job.department.ilike(pattern), Job.location.ilike(pattern)),
            )
            .limit(6)
        ).all()
    )
    candidates = list(
        db.scalars(
            select(Candidate)
            .where(
                Candidate.organization_id == auth.organization.id,
                or_(Candidate.full_name.ilike(pattern), Candidate.email.ilike(pattern), Candidate.headline.ilike(pattern)),
            )
            .limit(6)
        ).all()
    )
    return {
        "jobs": [
            {"id": str(j.id), "title": j.title, "department": j.department, "status": j.status}
            for j in jobs
        ],
        "candidates": [
            {"id": str(c.id), "full_name": c.full_name, "headline": c.headline, "location": c.location}
            for c in candidates
        ],
    }
