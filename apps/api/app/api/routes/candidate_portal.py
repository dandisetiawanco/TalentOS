from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_candidate_user
from app.core.security import create_signed_document_url
from app.db.session import get_db
from app.models import (
    Application,
    ApplicationStageHistory,
    Candidate,
    CandidateDocument,
    Interview,
    Job,
    Organization,
    UserProfile,
)
from app.schemas.candidates import (
    CandidateDocumentOut,
    CandidateProfileOut,
    CandidateProfileUpdateRequest,
    StageHistoryOut,
)

router = APIRouter(prefix="/candidate", tags=["Candidate Portal"])


@router.get("/profile", response_model=CandidateProfileOut)
def get_candidate_profile(
    auth: AuthContext = Depends(require_candidate_user),
    db: Session = Depends(get_db),
) -> CandidateProfileOut:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == auth.user.id))
    if profile is None:
        profile = UserProfile(user_id=auth.user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return CandidateProfileOut(
        user_id=auth.user.id,
        full_name=auth.user.full_name,
        email=auth.user.email,
        phone=profile.phone,
        location=profile.location,
        timezone=profile.timezone,
        headline=profile.headline,
        bio=profile.bio,
        years_of_experience=profile.years_of_experience,
        skills=profile.skills or [],
        education=profile.education or [],
        work_experience=profile.work_experience or [],
        linkedin_url=profile.linkedin_url,
        portfolio_url=profile.portfolio_url,
        consent_resume_processing=profile.consent_resume_processing,
        consent_recorded_at=profile.consent_recorded_at,
    )


@router.patch("/profile", response_model=CandidateProfileOut)
def update_candidate_profile(
    payload: CandidateProfileUpdateRequest,
    auth: AuthContext = Depends(require_candidate_user),
    db: Session = Depends(get_db),
) -> CandidateProfileOut:
    profile = db.scalar(select(UserProfile).where(UserProfile.user_id == auth.user.id))
    if profile is None:
        profile = UserProfile(user_id=auth.user.id)
        db.add(profile)

    updates = payload.model_dump(exclude_unset=True)
    if "full_name" in updates and updates["full_name"]:
        auth.user.full_name = updates.pop("full_name").strip()
    if "consent_resume_processing" in updates:
        profile.consent_resume_processing = bool(updates.pop("consent_resume_processing"))
        profile.consent_recorded_at = datetime.now(timezone.utc) if profile.consent_resume_processing else None
    for field, value in updates.items():
        setattr(profile, field, value)

    # Propagate profile updates to linked candidate records owned by this user.
    linked_cands = db.scalars(select(Candidate).where(Candidate.user_id == auth.user.id)).all()
    for cand in linked_cands:
        cand.full_name = auth.user.full_name
        cand.phone = profile.phone
        cand.location = profile.location
        cand.headline = profile.headline
        cand.professional_summary = profile.bio
        cand.linkedin_url = profile.linkedin_url
        cand.portfolio_url = profile.portfolio_url
        cand.consent_resume_processing = profile.consent_resume_processing
        cand.consent_recorded_at = profile.consent_recorded_at
        if profile.years_of_experience is not None:
            cand.years_of_experience = profile.years_of_experience

    db.commit()
    db.refresh(profile)
    return get_candidate_profile(auth=auth, db=db)


def _serialize_candidate_application(db: Session, app_row: Application) -> dict[str, Any]:
    """Serialize candidate-visible application data only; strictly omits internal notes & private evaluations."""
    job = db.get(Job, app_row.job_id)
    org = db.get(Organization, app_row.organization_id)
    histories = list(
        db.scalars(
            select(ApplicationStageHistory)
            .where(ApplicationStageHistory.application_id == app_row.id)
            .order_by(ApplicationStageHistory.changed_at.asc())
        ).all()
    )
    interviews = list(
        db.scalars(
            select(Interview)
            .where(Interview.application_id == app_row.id)
            .order_by(Interview.scheduled_start.asc())
        ).all()
    )
    return {
        "id": str(app_row.id),
        "job_id": str(app_row.job_id),
        "job_title": job.title if job else "Role",
        "job_slug": job.slug if job else "",
        "job_department": job.department if job else "",
        "job_location": job.location if job else "",
        "job_work_arrangement": job.work_arrangement if job else "",
        "organization_name": org.name if org else "",
        "stage": app_row.stage,
        "cover_note": app_row.cover_note,
        "applied_at": app_row.applied_at.isoformat(),
        "last_activity_at": app_row.last_activity_at.isoformat(),
        "timeline": [
            StageHistoryOut(
                id=h.id,
                from_stage=h.from_stage,
                to_stage=h.to_stage,
                changed_by_name=None,
                reason=None,
                changed_at=h.changed_at,
            ).model_dump(mode="json")
            for h in histories
        ],
        "interviews": [
            {
                "id": str(iv.id),
                "title": iv.title,
                "interview_type": iv.interview_type,
                "status": iv.status,
                "scheduled_start": iv.scheduled_start.isoformat(),
                "scheduled_end": iv.scheduled_end.isoformat(),
                "duration_minutes": iv.duration_minutes,
                "timezone": iv.timezone,
                "meeting_link": iv.meeting_link,
                "location": iv.location,
                "instructions": iv.instructions,
                "ics_url": f"/api/v1/interviews/{iv.id}/ics",
            }
            for iv in interviews
        ],
    }


@router.get("/applications")
def list_candidate_applications(
    auth: AuthContext = Depends(require_candidate_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    cand_ids = list(db.scalars(select(Candidate.id).where(Candidate.user_id == auth.user.id)).all())
    if not cand_ids:
        return []
    apps = list(
        db.scalars(
            select(Application)
            .where(Application.candidate_id.in_(cand_ids))
            .order_by(Application.applied_at.desc())
        ).all()
    )
    return [_serialize_candidate_application(db, app_row) for app_row in apps]


@router.get("/applications/{application_id}")
def get_candidate_application(
    application_id: uuid.UUID,
    auth: AuthContext = Depends(require_candidate_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    cand_ids = set(db.scalars(select(Candidate.id).where(Candidate.user_id == auth.user.id)).all())
    app_row = db.get(Application, application_id)
    if not app_row or app_row.candidate_id not in cand_ids:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    return _serialize_candidate_application(db, app_row)


@router.get("/interviews")
def list_candidate_interviews(
    auth: AuthContext = Depends(require_candidate_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    cand_ids = list(db.scalars(select(Candidate.id).where(Candidate.user_id == auth.user.id)).all())
    if not cand_ids:
        return []
    interviews = list(
        db.scalars(
            select(Interview)
            .where(Interview.candidate_id.in_(cand_ids))
            .order_by(Interview.scheduled_start.asc())
        ).all()
    )
    job_ids = {iv.job_id for iv in interviews}
    org_ids = {iv.organization_id for iv in interviews}
    jobs = {j.id: j.title for j in db.scalars(select(Job).where(Job.id.in_(job_ids))).all()} if job_ids else {}
    orgs = {o.id: o.name for o in db.scalars(select(Organization).where(Organization.id.in_(org_ids))).all()} if org_ids else {}
    return [
        {
            "id": str(iv.id),
            "application_id": str(iv.application_id),
            "job_title": jobs.get(iv.job_id, ""),
            "organization_name": orgs.get(iv.organization_id, ""),
            "title": iv.title,
            "interview_type": iv.interview_type,
            "status": iv.status,
            "scheduled_start": iv.scheduled_start.isoformat(),
            "scheduled_end": iv.scheduled_end.isoformat(),
            "duration_minutes": iv.duration_minutes,
            "timezone": iv.timezone,
            "meeting_link": iv.meeting_link,
            "location": iv.location,
            "instructions": iv.instructions,
            "ics_url": f"/api/v1/interviews/{iv.id}/ics",
        }
        for iv in interviews
    ]


@router.get("/documents", response_model=list[CandidateDocumentOut])
def list_candidate_documents(
    auth: AuthContext = Depends(require_candidate_user),
    db: Session = Depends(get_db),
) -> list[CandidateDocumentOut]:
    docs = list(
        db.scalars(
            select(CandidateDocument)
            .where(CandidateDocument.user_id == auth.user.id)
            .order_by(CandidateDocument.created_at.desc())
        ).all()
    )
    results: list[CandidateDocumentOut] = []
    for doc in docs:
        url, _ = create_signed_document_url(str(doc.id))
        results.append(
            CandidateDocumentOut(
                id=doc.id,
                document_type=doc.document_type,
                original_filename=doc.original_filename,
                mime_type=doc.mime_type,
                file_size_bytes=doc.file_size_bytes,
                consent_granted=doc.consent_granted,
                is_demo=doc.is_demo,
                created_at=doc.created_at,
                signed_download_url=url,
            )
        )
    return results
