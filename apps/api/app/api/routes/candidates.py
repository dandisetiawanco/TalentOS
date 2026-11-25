from __future__ import annotations

import math
import uuid
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, require_org_roles
from app.core.security import create_signed_document_url
from app.db.session import get_db
from app.models import (
    STAGE_ORDER,
    ActivityLog,
    Application,
    ApplicationStageHistory,
    Candidate,
    CandidateDocument,
    CandidateSkill,
    Interview,
    Job,
    RecruiterNote,
    ResumeAnalysis,
    User,
)
from app.schemas.candidates import (
    ApplicationStageUpdateRequest,
    ApplicationSummaryOut,
    CandidateDetailOut,
    CandidateDirectoryItem,
    CandidateDocumentOut,
    CandidateSkillOut,
    RecruiterNoteCreateRequest,
    RecruiterNoteOut,
    ResumeAnalysisOut,
    ResumeAnalysisStructuredOutput,
    StageHistoryOut,
)
from app.schemas.common import PaginatedResponse
from app.services.activity import create_notification, record_activity

router = APIRouter(tags=["Candidates & Pipeline"])


def _serialize_applications(db: Session, applications: list[Application]) -> list[ApplicationSummaryOut]:
    if not applications:
        return []
    app_ids = [a.id for a in applications]
    job_ids = {a.job_id for a in applications}
    cand_ids = {a.candidate_id for a in applications}
    recruiter_ids = {a.assigned_recruiter_id for a in applications if a.assigned_recruiter_id}

    jobs = {j.id: j for j in db.scalars(select(Job).where(Job.id.in_(job_ids))).all()}
    cands = {c.id: c for c in db.scalars(select(Candidate).where(Candidate.id.in_(cand_ids))).all()}
    recruiters = (
        {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(recruiter_ids))).all()}
        if recruiter_ids
        else {}
    )
    org_name = ""
    if applications:
        from app.models import Organization

        org = db.get(Organization, applications[0].organization_id)
        org_name = org.name if org else ""

    skills_by_cand: dict[uuid.UUID, list[str]] = defaultdict(list)
    for sk in db.scalars(select(CandidateSkill).where(CandidateSkill.candidate_id.in_(cand_ids))).all():
        skills_by_cand[sk.candidate_id].append(sk.skill_name)

    histories = list(
        db.scalars(
            select(ApplicationStageHistory)
            .where(ApplicationStageHistory.application_id.in_(app_ids))
            .order_by(ApplicationStageHistory.changed_at.asc())
        ).all()
    )
    changer_ids = {h.changed_by_id for h in histories if h.changed_by_id}
    changers = (
        {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(changer_ids))).all()}
        if changer_ids
        else {}
    )
    hist_by_app: dict[uuid.UUID, list[StageHistoryOut]] = defaultdict(list)
    for h in histories:
        hist_by_app[h.application_id].append(
            StageHistoryOut(
                id=h.id,
                from_stage=h.from_stage,
                to_stage=h.to_stage,
                changed_by_name=changers.get(h.changed_by_id) if h.changed_by_id else None,
                reason=h.reason,
                changed_at=h.changed_at,
            )
        )

    analyses = list(
        db.scalars(
            select(ResumeAnalysis)
            .where(ResumeAnalysis.application_id.in_(app_ids))
            .order_by(ResumeAnalysis.created_at.desc())
        ).all()
    )
    latest_analysis: dict[uuid.UUID, ResumeAnalysis] = {}
    for an in analyses:
        if an.application_id and an.application_id not in latest_analysis:
            latest_analysis[an.application_id] = an

    result: list[ApplicationSummaryOut] = []
    for app in applications:
        job = jobs.get(app.job_id)
        cand = cands.get(app.candidate_id)
        if not job or not cand:
            continue
        an = latest_analysis.get(app.id)
        found_cnt: int | None = None
        req_total: int | None = None
        if an and isinstance(an.structured_output, dict):
            req_list = an.structured_output.get("required_qualifications_evidence") or []
            if req_list:
                req_total = len(req_list)
                found_cnt = sum(1 for item in req_list if item.get("status") == "evidence_found")

        result.append(
            ApplicationSummaryOut(
                id=app.id,
                job_id=job.id,
                job_title=job.title,
                job_slug=job.slug,
                job_department=job.department,
                organization_name=org_name,
                candidate_id=cand.id,
                candidate_name=cand.full_name,
                candidate_email=cand.email,
                candidate_location=cand.location,
                candidate_years_experience=cand.years_of_experience,
                candidate_skills=skills_by_cand.get(cand.id, [])[:8],
                stage=app.stage,
                assigned_recruiter_id=app.assigned_recruiter_id,
                assigned_recruiter_name=recruiters.get(app.assigned_recruiter_id) if app.assigned_recruiter_id else None,
                cover_note=app.cover_note,
                decision_reason=app.decision_reason,
                source=app.source,
                applied_at=app.applied_at,
                last_activity_at=app.last_activity_at,
                resume_document_id=app.resume_document_id,
                evidence_found_count=found_cnt,
                required_total_count=req_total,
                stage_history=hist_by_app.get(app.id, []),
            )
        )
    return result


@router.get("/candidates", response_model=PaginatedResponse[CandidateDirectoryItem])
def list_candidates(
    q: str | None = Query(default=None),
    stage: str | None = Query(default=None),
    job_id: uuid.UUID | None = Query(default=None),
    skill: str | None = Query(default=None),
    sort: str = Query(default="recent_activity"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> PaginatedResponse[CandidateDirectoryItem]:
    assert auth.organization is not None
    stmt = select(Candidate).where(Candidate.organization_id == auth.organization.id)

    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Candidate.full_name.ilike(pattern),
                Candidate.email.ilike(pattern),
                Candidate.headline.ilike(pattern),
                Candidate.location.ilike(pattern),
            )
        )
    if skill:
        skill_cand_ids = select(CandidateSkill.candidate_id).where(
            CandidateSkill.organization_id == auth.organization.id,
            CandidateSkill.skill_name.ilike(f"%{skill.strip()}%"),
        )
        stmt = stmt.where(Candidate.id.in_(skill_cand_ids))
    if stage or job_id:
        app_sub = select(Application.candidate_id).where(Application.organization_id == auth.organization.id)
        if stage:
            app_sub = app_sub.where(Application.stage == stage)
        if job_id:
            app_sub = app_sub.where(Application.job_id == job_id)
        stmt = stmt.where(Candidate.id.in_(app_sub))

    candidates = list(db.scalars(stmt).all())
    cand_ids = [c.id for c in candidates]

    apps = (
        list(
            db.scalars(
                select(Application)
                .where(Application.organization_id == auth.organization.id, Application.candidate_id.in_(cand_ids))
                .order_by(Application.last_activity_at.desc())
            ).all()
        )
        if cand_ids
        else []
    )
    latest_app_by_cand: dict[uuid.UUID, Application] = {}
    for app in apps:
        if app.candidate_id not in latest_app_by_cand:
            latest_app_by_cand[app.candidate_id] = app

    job_ids = {a.job_id for a in latest_app_by_cand.values()}
    jobs = {j.id: j.title for j in db.scalars(select(Job).where(Job.id.in_(job_ids))).all()} if job_ids else {}
    rec_ids = {a.assigned_recruiter_id for a in latest_app_by_cand.values() if a.assigned_recruiter_id}
    recruiters = {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(rec_ids))).all()} if rec_ids else {}

    skills_by_cand: dict[uuid.UUID, list[str]] = defaultdict(list)
    if cand_ids:
        for sk in db.scalars(select(CandidateSkill).where(CandidateSkill.candidate_id.in_(cand_ids))).all():
            skills_by_cand[sk.candidate_id].append(sk.skill_name)

    items: list[CandidateDirectoryItem] = []
    for cand in candidates:
        app = latest_app_by_cand.get(cand.id)
        items.append(
            CandidateDirectoryItem(
                id=cand.id,
                full_name=cand.full_name,
                email=cand.email,
                location=cand.location,
                headline=cand.headline,
                years_of_experience=cand.years_of_experience,
                skills=skills_by_cand.get(cand.id, [])[:8],
                latest_application_id=app.id if app else None,
                latest_job_id=app.job_id if app else None,
                latest_job_title=jobs.get(app.job_id) if app else None,
                latest_stage=app.stage if app else None,
                assigned_recruiter_name=recruiters.get(app.assigned_recruiter_id) if app and app.assigned_recruiter_id else None,
                last_activity_at=app.last_activity_at if app else cand.updated_at,
            )
        )

    if sort == "name_asc":
        items.sort(key=lambda x: x.full_name.lower())
    elif sort == "experience_desc":
        items.sort(key=lambda x: x.years_of_experience, reverse=True)
    else:
        items.sort(key=lambda x: x.last_activity_at, reverse=True)

    total = len(items)
    start = (page - 1) * page_size
    paged = items[start : start + page_size]
    return PaginatedResponse(
        items=paged,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, math.ceil(total / page_size)),
    )


@router.get("/candidates/{candidate_id}", response_model=CandidateDetailOut)
def get_candidate_detail(
    candidate_id: uuid.UUID,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> CandidateDetailOut:
    assert auth.organization is not None
    cand = db.scalar(
        select(Candidate).where(Candidate.id == candidate_id, Candidate.organization_id == auth.organization.id)
    )
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    skills = list(db.scalars(select(CandidateSkill).where(CandidateSkill.candidate_id == cand.id)).all())
    docs = list(
        db.scalars(
            select(CandidateDocument)
            .where(CandidateDocument.candidate_id == cand.id, CandidateDocument.organization_id == auth.organization.id)
            .order_by(CandidateDocument.created_at.desc())
        ).all()
    )
    apps = list(
        db.scalars(
            select(Application)
            .where(Application.candidate_id == cand.id, Application.organization_id == auth.organization.id)
            .order_by(Application.applied_at.desc())
        ).all()
    )
    interviews = list(
        db.scalars(
            select(Interview)
            .where(Interview.candidate_id == cand.id, Interview.organization_id == auth.organization.id)
            .order_by(Interview.scheduled_start.desc())
        ).all()
    )
    notes = list(
        db.scalars(
            select(RecruiterNote)
            .where(RecruiterNote.candidate_id == cand.id, RecruiterNote.organization_id == auth.organization.id)
            .order_by(RecruiterNote.created_at.desc())
        ).all()
    )
    analyses = list(
        db.scalars(
            select(ResumeAnalysis)
            .where(ResumeAnalysis.candidate_id == cand.id, ResumeAnalysis.organization_id == auth.organization.id)
            .order_by(ResumeAnalysis.created_at.desc())
        ).all()
    )

    user_ids = {n.author_id for n in notes} | {a.reviewed_by_id for a in analyses if a.reviewed_by_id}
    users = {u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    job_ids = {a.job_id for a in analyses if a.job_id} | {iv.job_id for iv in interviews}
    jobs = {j.id: j.title for j in db.scalars(select(Job).where(Job.id.in_(job_ids))).all()} if job_ids else {}

    serialized_docs = []
    for doc in docs:
        signed_url, _ = create_signed_document_url(str(doc.id))
        serialized_docs.append(
            CandidateDocumentOut(
                id=doc.id,
                document_type=doc.document_type,
                original_filename=doc.original_filename,
                mime_type=doc.mime_type,
                file_size_bytes=doc.file_size_bytes,
                consent_granted=doc.consent_granted,
                is_demo=doc.is_demo,
                created_at=doc.created_at,
                signed_download_url=signed_url,
            )
        )

    serialized_analyses = [
        ResumeAnalysisOut(
            id=an.id,
            candidate_id=an.candidate_id,
            application_id=an.application_id,
            job_id=an.job_id,
            job_title=jobs.get(an.job_id) if an.job_id else None,
            document_id=an.document_id,
            analysis_mode=an.analysis_mode,
            provider_name=an.provider_name,
            model_name=an.model_name,
            prompt_injection_flags=an.prompt_injection_flags or [],
            structured_output=ResumeAnalysisStructuredOutput.model_validate(an.structured_output),
            human_reviewed=an.human_reviewed,
            reviewed_by_name=users.get(an.reviewed_by_id) if an.reviewed_by_id else None,
            reviewed_at=an.reviewed_at,
            reviewer_corrections=an.reviewer_corrections,
            created_at=an.created_at,
        )
        for an in analyses
    ]

    app_id_strs = {str(a.id) for a in apps} | {str(cand.id)}
    activities = list(
        db.scalars(
            select(ActivityLog)
            .where(ActivityLog.organization_id == auth.organization.id, ActivityLog.entity_id.in_(app_id_strs))
            .order_by(ActivityLog.created_at.desc())
            .limit(20)
        ).all()
    )

    return CandidateDetailOut(
        id=cand.id,
        full_name=cand.full_name,
        email=cand.email,
        phone=cand.phone,
        location=cand.location,
        headline=cand.headline,
        professional_summary=cand.professional_summary,
        years_of_experience=cand.years_of_experience,
        education=cand.education or [],
        work_experience=cand.work_experience or [],
        linkedin_url=cand.linkedin_url,
        portfolio_url=cand.portfolio_url,
        consent_resume_processing=cand.consent_resume_processing,
        consent_recorded_at=cand.consent_recorded_at,
        skills=[CandidateSkillOut.model_validate(s) for s in skills],
        documents=serialized_docs,
        applications=_serialize_applications(db, apps),
        interviews=[
            {
                "id": str(iv.id),
                "title": iv.title,
                "interview_type": iv.interview_type,
                "status": iv.status,
                "job_title": jobs.get(iv.job_id, ""),
                "scheduled_start": iv.scheduled_start.isoformat(),
                "scheduled_end": iv.scheduled_end.isoformat(),
                "duration_minutes": iv.duration_minutes,
                "timezone": iv.timezone,
                "meeting_link": iv.meeting_link,
            }
            for iv in interviews
        ],
        notes=[
            RecruiterNoteOut(
                id=n.id,
                candidate_id=n.candidate_id,
                application_id=n.application_id,
                author_id=n.author_id,
                author_name=users.get(n.author_id, "Team Member"),
                content=n.content,
                is_private=n.is_private,
                created_at=n.created_at,
            )
            for n in notes
        ],
        analyses=serialized_analyses,
        activity=[
            {
                "id": str(act.id),
                "action": act.action,
                "summary": act.summary,
                "created_at": act.created_at.isoformat(),
            }
            for act in activities
        ],
        created_at=cand.created_at,
    )


@router.post("/candidates/{candidate_id}/notes", response_model=RecruiterNoteOut, status_code=status.HTTP_201_CREATED)
def add_recruiter_note(
    candidate_id: uuid.UUID,
    payload: RecruiterNoteCreateRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> RecruiterNoteOut:
    assert auth.organization is not None
    cand = db.scalar(
        select(Candidate).where(Candidate.id == candidate_id, Candidate.organization_id == auth.organization.id)
    )
    if not cand:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    note = RecruiterNote(
        organization_id=auth.organization.id,
        candidate_id=cand.id,
        application_id=payload.application_id,
        author_id=auth.user.id,
        content=payload.content.strip(),
        is_private=True,
    )
    db.add(note)
    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="candidate",
        entity_id=cand.id,
        action="note_added",
        summary=f"{auth.user.full_name} added an internal note on {cand.full_name}",
    )
    db.commit()
    db.refresh(note)
    return RecruiterNoteOut(
        id=note.id,
        candidate_id=note.candidate_id,
        application_id=note.application_id,
        author_id=note.author_id,
        author_name=auth.user.full_name,
        content=note.content,
        is_private=note.is_private,
        created_at=note.created_at,
    )


@router.get("/applications", response_model=list[ApplicationSummaryOut])
def list_org_applications(
    job_id: uuid.UUID | None = Query(default=None),
    stage: str | None = Query(default=None),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> list[ApplicationSummaryOut]:
    assert auth.organization is not None
    stmt = select(Application).where(Application.organization_id == auth.organization.id)
    if job_id:
        stmt = stmt.where(Application.job_id == job_id)
    if stage:
        stmt = stmt.where(Application.stage == stage)
    apps = list(db.scalars(stmt.order_by(Application.last_activity_at.desc())).all())
    return _serialize_applications(db, apps)


@router.get("/pipeline")
def get_pipeline_board(
    job_id: uuid.UUID | None = Query(default=None),
    q: str | None = Query(default=None),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    assert auth.organization is not None
    stmt = select(Application).where(Application.organization_id == auth.organization.id)
    if job_id:
        stmt = stmt.where(Application.job_id == job_id)
    apps = list(db.scalars(stmt.order_by(Application.last_activity_at.desc())).all())
    serialized = _serialize_applications(db, apps)

    if q:
        needle = q.strip().lower()
        serialized = [
            item
            for item in serialized
            if needle in item.candidate_name.lower()
            or needle in item.job_title.lower()
            or any(needle in s.lower() for s in item.candidate_skills)
        ]

    columns: dict[str, list[dict[str, Any]]] = {stage: [] for stage in STAGE_ORDER}
    for item in serialized:
        columns.setdefault(item.stage, []).append(item.model_dump(mode="json"))

    counts = {stage: len(columns[stage]) for stage in STAGE_ORDER}
    return {
        "stages": list(STAGE_ORDER),
        "counts": counts,
        "total": len(serialized),
        "columns": columns,
    }


@router.patch("/applications/{application_id}/stage", response_model=ApplicationSummaryOut)
def update_application_stage(
    application_id: uuid.UUID,
    payload: ApplicationStageUpdateRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter")),
    db: Session = Depends(get_db),
) -> ApplicationSummaryOut:
    assert auth.organization is not None
    app_row = db.scalar(
        select(Application).where(
            Application.id == application_id,
            Application.organization_id == auth.organization.id,
        )
    )
    if not app_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    if payload.to_stage in {"hired", "rejected"} and not (payload.reason and len(payload.reason.strip()) >= 5):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="A brief human decision reason (at least 5 characters) is required when moving a candidate to Hired or Rejected.",
        )

    old_stage = app_row.stage
    if old_stage == payload.to_stage:
        return _serialize_applications(db, [app_row])[0]

    now = datetime.now(timezone.utc)
    app_row.stage = payload.to_stage
    app_row.last_activity_at = now
    if payload.reason:
        app_row.decision_reason = payload.reason.strip()

    db.add(
        ApplicationStageHistory(
            organization_id=auth.organization.id,
            application_id=app_row.id,
            from_stage=old_stage,
            to_stage=payload.to_stage,
            changed_by_id=auth.user.id,
            reason=payload.reason.strip() if payload.reason else None,
            changed_at=now,
        )
    )

    cand = db.get(Candidate, app_row.candidate_id)
    job = db.get(Job, app_row.job_id)
    cand_name = cand.full_name if cand else "Candidate"
    job_title = job.title if job else "Role"

    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="application",
        entity_id=app_row.id,
        action="stage_changed",
        summary=f"Moved {cand_name} from {old_stage} to {payload.to_stage} for {job_title}",
        metadata={"from_stage": old_stage, "to_stage": payload.to_stage},
    )

    if cand and cand.user_id:
        create_notification(
            db,
            user_id=cand.user_id,
            organization_id=auth.organization.id,
            event_type="application_status_updated",
            title=f"Application status updated: {job_title}",
            body=f"Your application moved to {payload.to_stage.replace('_', ' ').title()}.",
            link_url=f"/candidate/applications/{app_row.id}",
        )

    db.commit()
    db.refresh(app_row)
    return _serialize_applications(db, [app_row])[0]
