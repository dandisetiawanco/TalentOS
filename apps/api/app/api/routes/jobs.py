from __future__ import annotations

import math
import re
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_optional_auth, require_org_roles
from app.db.session import get_db
from app.models import (
    Application,
    ApplicationStageHistory,
    Candidate,
    CandidateDocument,
    CandidateSkill,
    Interview,
    Job,
    JobRequirement,
    Organization,
    OrganizationMember,
    ResumeAnalysis,
    User,
    UserProfile,
)
from app.schemas.candidates import PublicApplicationCreateRequest
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.jobs import JobCreateRequest, JobOut, JobUpdateRequest
from app.services.activity import create_notification, record_activity
from app.services.analytics import compute_organization_analytics
from app.services.demo_seed import ensure_public_showcase_seeded

router = APIRouter(tags=["Jobs & Public Careers"])


def _slugify_job(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:70] or "role"
    return f"{base}-{uuid.uuid4().hex[:6]}"


def _serialize_jobs(db: Session, jobs: list[Job]) -> list[JobOut]:
    if not jobs:
        return []
    job_ids = [job.id for job in jobs]
    org_ids = {job.organization_id for job in jobs}
    hm_ids = {job.hiring_manager_id for job in jobs if job.hiring_manager_id}

    orgs = {o.id: o.name for o in db.scalars(select(Organization).where(Organization.id.in_(org_ids))).all()}
    hms = (
        {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(hm_ids))).all()}
        if hm_ids
        else {}
    )
    app_rows = db.execute(
        select(Application.job_id, Application.stage, func.count(Application.id))
        .where(Application.job_id.in_(job_ids))
        .group_by(Application.job_id, Application.stage)
    ).all()

    counts_by_job: dict[uuid.UUID, int] = defaultdict(int)
    stages_by_job: dict[uuid.UUID, dict[str, int]] = defaultdict(dict)
    for j_id, stage, cnt in app_rows:
        counts_by_job[j_id] += int(cnt)
        stages_by_job[j_id][stage] = int(cnt)

    result: list[JobOut] = []
    for job in jobs:
        result.append(
            JobOut(
                id=job.id,
                organization_id=job.organization_id,
                organization_name=orgs.get(job.organization_id, ""),
                slug=job.slug,
                title=job.title,
                department=job.department,
                employment_type=job.employment_type,
                work_arrangement=job.work_arrangement,
                location=job.location,
                salary_min=job.salary_min,
                salary_max=job.salary_max,
                salary_currency=job.salary_currency,
                description=job.description,
                responsibilities=job.responsibilities or [],
                required_qualifications=job.required_qualifications or [],
                preferred_qualifications=job.preferred_qualifications or [],
                required_skills=job.required_skills or [],
                status=job.status,
                openings_count=job.openings_count,
                application_deadline=job.application_deadline,
                hiring_manager_id=job.hiring_manager_id,
                hiring_manager_name=hms.get(job.hiring_manager_id) if job.hiring_manager_id else None,
                is_demo=job.is_demo,
                published_at=job.published_at,
                created_at=job.created_at,
                updated_at=job.updated_at,
                application_count=counts_by_job.get(job.id, 0),
                stage_counts=stages_by_job.get(job.id, {}),
            )
        )
    return result


def _sync_job_requirements(db: Session, job: Job) -> None:
    existing = db.scalars(select(JobRequirement).where(JobRequirement.job_id == job.id)).all()
    for row in existing:
        db.delete(row)
    db.flush()
    sort_order = 0
    for item in job.required_qualifications or []:
        db.add(JobRequirement(organization_id=job.organization_id, job_id=job.id, category="required", label=item[:240], weight=2, sort_order=sort_order))
        sort_order += 1
    for item in job.preferred_qualifications or []:
        db.add(JobRequirement(organization_id=job.organization_id, job_id=job.id, category="preferred", label=item[:240], weight=1, sort_order=sort_order))
        sort_order += 1
    for item in job.required_skills or []:
        db.add(JobRequirement(organization_id=job.organization_id, job_id=job.id, category="skill", label=item[:240], weight=1, sort_order=sort_order))
        sort_order += 1


@router.get("/public/showcase")
def get_public_showcase_preview(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Read-only snapshot from the seeded synthetic showcase dataset for the landing page."""
    org = ensure_public_showcase_seeded(db)
    jobs = list(db.scalars(select(Job).where(Job.organization_id == org.id).order_by(Job.created_at.desc())).all())
    job_map = {j.id: j for j in jobs}
    apps = list(
        db.scalars(
            select(Application)
            .where(Application.organization_id == org.id)
            .order_by(Application.last_activity_at.desc())
        ).all()
    )
    cand_ids = {a.candidate_id for a in apps}
    cands = {c.id: c for c in db.scalars(select(Candidate).where(Candidate.id.in_(cand_ids))).all()}
    analyses = list(
        db.scalars(
            select(ResumeAnalysis).where(ResumeAnalysis.organization_id == org.id).limit(10)
        ).all()
    )
    analysis_by_app = {a.application_id: a for a in analyses if a.application_id}

    pipeline_columns: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for app in apps:
        cand = cands.get(app.candidate_id)
        job = job_map.get(app.job_id)
        if not cand or not job:
            continue
        if len(pipeline_columns[app.stage]) < 4:
            pipeline_columns[app.stage].append(
                {
                    "application_id": str(app.id),
                    "candidate_name": cand.full_name,
                    "job_title": job.title,
                    "location": cand.location,
                    "years_of_experience": cand.years_of_experience,
                    "stage": app.stage,
                }
            )

    featured_analysis = analyses[0] if analyses else None
    featured_candidate = None
    if featured_analysis and featured_analysis.candidate_id in cands:
        fc = cands[featured_analysis.candidate_id]
        fj = job_map.get(featured_analysis.job_id) if featured_analysis.job_id else None
        featured_candidate = {
            "full_name": fc.full_name,
            "headline": fc.headline,
            "location": fc.location,
            "years_of_experience": fc.years_of_experience,
            "job_title": fj.title if fj else "",
            "analysis_mode": featured_analysis.analysis_mode,
            "structured_output": featured_analysis.structured_output,
        }

    interviews = list(
        db.scalars(
            select(Interview)
            .where(Interview.organization_id == org.id)
            .order_by(Interview.scheduled_start.asc())
            .limit(6)
        ).all()
    )
    upcoming_interviews = [
        {
            "id": str(iv.id),
            "title": iv.title,
            "interview_type": iv.interview_type,
            "status": iv.status,
            "candidate_name": cands[iv.candidate_id].full_name if iv.candidate_id in cands else "",
            "job_title": job_map[iv.job_id].title if iv.job_id in job_map else "",
            "scheduled_start": iv.scheduled_start.isoformat(),
            "duration_minutes": iv.duration_minutes,
            "timezone": iv.timezone,
        }
        for iv in interviews
    ]

    analytics = compute_organization_analytics(db, organization_id=org.id, days=60)
    return {
        "organization_name": org.name,
        "is_demo_dataset": True,
        "pipeline_columns": pipeline_columns,
        "featured_candidate": featured_candidate,
        "interviews": upcoming_interviews,
        "analytics": analytics.model_dump(mode="json"),
        "published_jobs_count": sum(1 for j in jobs if j.status == "published"),
        "total_applications": len(apps),
        "evidence_reviews_count": len(analysis_by_app),
    }


@router.get("/public/jobs", response_model=PaginatedResponse[JobOut])
def list_public_jobs(
    q: str | None = Query(default=None),
    department: str | None = Query(default=None),
    employment_type: str | None = Query(default=None),
    work_arrangement: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
    auth: AuthContext | None = Depends(get_optional_auth),
    db: Session = Depends(get_db),
) -> PaginatedResponse[JobOut]:
    ensure_public_showcase_seeded(db)

    # Show published jobs from non-demo orgs + the single public showcase org (plus the signed-in user's own demo org if in a demo session).
    allowed_org_filters = [Organization.is_demo.is_(False), Organization.is_public_showcase.is_(True)]
    if auth and auth.user.demo_session_id:
        allowed_org_filters.append(Organization.demo_session_id == auth.user.demo_session_id)

    stmt = (
        select(Job)
        .join(Organization, Organization.id == Job.organization_id)
        .where(Job.status == "published", or_(*allowed_org_filters))
    )
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Job.title.ilike(pattern), Job.department.ilike(pattern), Job.location.ilike(pattern), Job.description.ilike(pattern))
        )
    if department:
        stmt = stmt.where(Job.department == department)
    if employment_type:
        stmt = stmt.where(Job.employment_type == employment_type)
    if work_arrangement:
        stmt = stmt.where(Job.work_arrangement == work_arrangement)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    jobs = list(
        db.scalars(
            stmt.order_by(Job.published_at.desc(), Job.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        ).all()
    )
    return PaginatedResponse(
        items=_serialize_jobs(db, jobs),
        total=int(total),
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(int(total) / page_size)),
    )


@router.get("/public/jobs/{slug}", response_model=JobOut)
def get_public_job(slug: str, db: Session = Depends(get_db)) -> JobOut:
    ensure_public_showcase_seeded(db)
    job = db.scalar(select(Job).where(Job.slug == slug, Job.status == "published"))
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")
    return _serialize_jobs(db, [job])[0]


@router.post("/public/jobs/{slug}/apply", status_code=status.HTTP_201_CREATED)
def apply_to_public_job(
    slug: str,
    payload: PublicApplicationCreateRequest,
    auth: AuthContext | None = Depends(get_optional_auth),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    job = db.scalar(select(Job).where(Job.slug == slug, Job.status == "published"))
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This job opening is no longer accepting applications.")

    if not payload.consent_resume_processing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate consent is required before submitting application data.",
        )

    org = db.get(Organization, job.organization_id)
    assert org is not None
    # Protect public showcase org from unbounded mutation when unauthenticated, while still allowing authenticated demo candidates to apply inside their isolated org or non-showcase orgs.
    normalized_email = (auth.user.email if auth and auth.user.account_type == "candidate" else payload.email).lower().strip()
    candidate = db.scalar(
        select(Candidate).where(
            Candidate.organization_id == job.organization_id,
            Candidate.email == normalized_email,
        )
    )
    now = datetime.now(timezone.utc)
    if candidate is None:
        profile = db.scalar(select(UserProfile).where(UserProfile.user_id == auth.user.id)) if auth else None
        candidate = Candidate(
            organization_id=job.organization_id,
            user_id=auth.user.id if auth and auth.user.account_type == "candidate" else None,
            full_name=payload.full_name.strip(),
            email=normalized_email,
            phone=payload.phone or (profile.phone if profile else None),
            location=payload.location or (profile.location if profile else None),
            headline=payload.headline or (profile.headline if profile else None),
            professional_summary=profile.bio if profile else None,
            years_of_experience=payload.years_of_experience,
            education=profile.education if profile else [],
            work_experience=profile.work_experience if profile else [],
            linkedin_url=payload.linkedin_url or (profile.linkedin_url if profile else None),
            portfolio_url=payload.portfolio_url or (profile.portfolio_url if profile else None),
            consent_resume_processing=payload.consent_resume_processing,
            consent_recorded_at=now,
            retention_expires_at=now + timedelta(days=org.document_retention_days),
            is_demo=org.is_demo,
        )
        db.add(candidate)
        db.flush()
        if profile and profile.skills:
            for skill in profile.skills[:20]:
                db.add(CandidateSkill(organization_id=job.organization_id, candidate_id=candidate.id, skill_name=skill, source="profile"))
    else:
        if auth and auth.user.account_type == "candidate" and candidate.user_id is None:
            candidate.user_id = auth.user.id

    existing_app = db.scalar(
        select(Application).where(Application.job_id == job.id, Application.candidate_id == candidate.id)
    )
    if existing_app:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An application for this role has already been submitted with this email address.",
        )

    resume_doc_id = None
    if payload.resume_document_id:
        doc = db.get(CandidateDocument, payload.resume_document_id)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Selected resume document was not found.")
        if auth and doc.user_id and doc.user_id != auth.user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot attach another user's document.")
        resume_doc_id = doc.id
        if doc.candidate_id is None:
            doc.candidate_id = candidate.id
            doc.organization_id = job.organization_id

    recruiter_member = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == job.organization_id,
            OrganizationMember.role.in_(["recruiter", "organization_owner"]),
            OrganizationMember.status == "active",
        )
    )

    application = Application(
        organization_id=job.organization_id,
        job_id=job.id,
        candidate_id=candidate.id,
        resume_document_id=resume_doc_id,
        stage="applied",
        assigned_recruiter_id=recruiter_member.user_id if recruiter_member else None,
        cover_note=payload.cover_note,
        source="careers_portal",
        applied_at=now,
        last_activity_at=now,
    )
    db.add(application)
    db.flush()

    db.add(
        ApplicationStageHistory(
            organization_id=job.organization_id,
            application_id=application.id,
            from_stage=None,
            to_stage="applied",
            changed_by_id=auth.user.id if auth else None,
            changed_at=now,
        )
    )

    if recruiter_member:
        create_notification(
            db,
            user_id=recruiter_member.user_id,
            organization_id=job.organization_id,
            event_type="new_application",
            title=f"New application for {job.title}",
            body=f"{candidate.full_name} submitted an application via the public careers board.",
            link_url=f"/workspace/candidates/{candidate.id}",
        )
    record_activity(
        db,
        organization_id=job.organization_id,
        actor_id=auth.user.id if auth else None,
        entity_type="application",
        entity_id=application.id,
        action="application_submitted",
        summary=f"{candidate.full_name} applied for {job.title}",
    )
    db.commit()
    return {
        "application_id": str(application.id),
        "job_title": job.title,
        "organization_name": org.name,
        "stage": application.stage,
        "submitted_at": now.isoformat(),
        "message": "Your application has been received.",
    }


@router.get("/jobs", response_model=PaginatedResponse[JobOut])
def list_org_jobs(
    q: str | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    department: str | None = Query(default=None),
    employment_type: str | None = Query(default=None),
    work_arrangement: str | None = Query(default=None),
    sort: str = Query(default="created_at_desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> PaginatedResponse[JobOut]:
    assert auth.organization is not None
    stmt = select(Job).where(Job.organization_id == auth.organization.id)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(or_(Job.title.ilike(pattern), Job.department.ilike(pattern), Job.location.ilike(pattern)))
    if status_filter:
        stmt = stmt.where(Job.status == status_filter)
    if department:
        stmt = stmt.where(Job.department == department)
    if employment_type:
        stmt = stmt.where(Job.employment_type == employment_type)
    if work_arrangement:
        stmt = stmt.where(Job.work_arrangement == work_arrangement)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order_col = {
        "title_asc": Job.title.asc(),
        "title_desc": Job.title.desc(),
        "deadline_asc": Job.application_deadline.asc(),
        "created_at_asc": Job.created_at.asc(),
    }.get(sort, Job.created_at.desc())

    jobs = list(
        db.scalars(stmt.order_by(order_col).offset((page - 1) * page_size).limit(page_size)).all()
    )
    return PaginatedResponse(
        items=_serialize_jobs(db, jobs),
        total=int(total),
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(int(total) / page_size)),
    )


@router.post("/jobs", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreateRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter")),
    db: Session = Depends(get_db),
) -> JobOut:
    assert auth.organization is not None
    if payload.salary_min is not None and payload.salary_max is not None and payload.salary_min > payload.salary_max:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Minimum salary cannot exceed maximum salary.",
        )

    now = datetime.now(timezone.utc)
    job = Job(
        organization_id=auth.organization.id,
        slug=_slugify_job(payload.title),
        title=payload.title.strip(),
        department=payload.department.strip(),
        employment_type=payload.employment_type,
        work_arrangement=payload.work_arrangement,
        location=payload.location.strip(),
        salary_min=payload.salary_min,
        salary_max=payload.salary_max,
        salary_currency=payload.salary_currency.upper(),
        description=payload.description.strip(),
        responsibilities=[r.strip() for r in payload.responsibilities if r.strip()],
        required_qualifications=[r.strip() for r in payload.required_qualifications if r.strip()],
        preferred_qualifications=[r.strip() for r in payload.preferred_qualifications if r.strip()],
        required_skills=[r.strip() for r in payload.required_skills if r.strip()],
        status=payload.status,
        openings_count=payload.openings_count,
        application_deadline=payload.application_deadline,
        created_by_id=auth.user.id,
        hiring_manager_id=payload.hiring_manager_id,
        is_demo=auth.organization.is_demo,
        published_at=now if payload.status == "published" else None,
    )
    db.add(job)
    db.flush()
    _sync_job_requirements(db, job)
    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="job",
        entity_id=job.id,
        action="job_created",
        summary=f"Created job opening '{job.title}' ({job.status})",
    )
    db.commit()
    db.refresh(job)
    return _serialize_jobs(db, [job])[0]


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_org_job(
    job_id: uuid.UUID,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> JobOut:
    assert auth.organization is not None
    job = db.scalar(select(Job).where(Job.id == job_id, Job.organization_id == auth.organization.id))
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")
    return _serialize_jobs(db, [job])[0]


@router.patch("/jobs/{job_id}", response_model=JobOut)
def update_org_job(
    job_id: uuid.UUID,
    payload: JobUpdateRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter")),
    db: Session = Depends(get_db),
) -> JobOut:
    assert auth.organization is not None
    job = db.scalar(select(Job).where(Job.id == job_id, Job.organization_id == auth.organization.id))
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")

    updates = payload.model_dump(exclude_unset=True)
    new_min = updates.get("salary_min", job.salary_min)
    new_max = updates.get("salary_max", job.salary_max)
    if new_min is not None and new_max is not None and new_min > new_max:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Minimum salary cannot exceed maximum salary.",
        )

    old_status = job.status
    for field, value in updates.items():
        setattr(job, field, value)
    if job.status == "published" and job.published_at is None:
        job.published_at = datetime.now(timezone.utc)

    if any(k in updates for k in ("required_qualifications", "preferred_qualifications", "required_skills")):
        _sync_job_requirements(db, job)

    action = "job_published" if old_status != "published" and job.status == "published" else "job_updated"
    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="job",
        entity_id=job.id,
        action=action,
        summary=f"Updated job '{job.title}' (status: {job.status})",
    )
    db.commit()
    db.refresh(job)
    return _serialize_jobs(db, [job])[0]


@router.delete("/jobs/{job_id}", response_model=MessageResponse)
def delete_org_job(
    job_id: uuid.UUID,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter")),
    db: Session = Depends(get_db),
) -> MessageResponse:
    assert auth.organization is not None
    if auth.is_demo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Deleting jobs is restricted in public demo mode. You can close or pause a role instead.",
        )
    job = db.scalar(select(Job).where(Job.id == job_id, Job.organization_id == auth.organization.id))
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job opening not found.")
    title = job.title
    db.delete(job)
    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="job",
        entity_id=job_id,
        action="job_deleted",
        summary=f"Deleted job opening '{title}'",
    )
    db.commit()
    return MessageResponse(message=f"Deleted job opening '{title}'.")
