from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_auth, require_org_roles
from app.db.session import get_db
from app.models import (
    Application,
    Candidate,
    Interview,
    InterviewFeedback,
    InterviewParticipant,
    Job,
    Organization,
    OrganizationMember,
    User,
)
from app.schemas.interviews import (
    InterviewCreateRequest,
    InterviewFeedbackCreateRequest,
    InterviewFeedbackOut,
    InterviewOut,
    InterviewParticipantOut,
    InterviewUpdateRequest,
)
from app.services.activity import create_notification, record_activity
from app.services.ics import build_interview_ics

router = APIRouter(prefix="/interviews", tags=["Interviews"])


def _as_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def _serialize_interviews(db: Session, interviews: list[Interview], *, include_feedback: bool = True) -> list[InterviewOut]:
    if not interviews:
        return []
    iv_ids = [iv.id for iv in interviews]
    job_ids = {iv.job_id for iv in interviews}
    cand_ids = {iv.candidate_id for iv in interviews}

    jobs = {j.id: j.title for j in db.scalars(select(Job).where(Job.id.in_(job_ids))).all()}
    cands = {c.id: c for c in db.scalars(select(Candidate).where(Candidate.id.in_(cand_ids))).all()}
    participants = list(
        db.scalars(select(InterviewParticipant).where(InterviewParticipant.interview_id.in_(iv_ids))).all()
    )
    feedbacks = (
        list(db.scalars(select(InterviewFeedback).where(InterviewFeedback.interview_id.in_(iv_ids))).all())
        if include_feedback
        else []
    )
    user_ids = {p.user_id for p in participants} | {f.reviewer_id for f in feedbacks}
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}

    part_by_iv: dict[uuid.UUID, list[InterviewParticipantOut]] = {}
    for p in participants:
        u = users.get(p.user_id)
        if not u:
            continue
        part_by_iv.setdefault(p.interview_id, []).append(
            InterviewParticipantOut(
                user_id=u.id,
                full_name=u.full_name,
                email=u.email,
                role=p.role,
                attendance_status=p.attendance_status,
            )
        )

    fb_by_iv: dict[uuid.UUID, list[InterviewFeedbackOut]] = {}
    for f in feedbacks:
        u = users.get(f.reviewer_id)
        fb_by_iv.setdefault(f.interview_id, []).append(
            InterviewFeedbackOut(
                id=f.id,
                reviewer_id=f.reviewer_id,
                reviewer_name=u.full_name if u else "Interviewer",
                recommendation=f.recommendation,
                strengths=f.strengths,
                concerns=f.concerns,
                notes=f.notes,
                rubric_scores=f.rubric_scores or {},
                submitted_at=f.submitted_at,
            )
        )

    output: list[InterviewOut] = []
    for iv in interviews:
        cand = cands.get(iv.candidate_id)
        if not cand:
            continue
        output.append(
            InterviewOut(
                id=iv.id,
                application_id=iv.application_id,
                job_id=iv.job_id,
                job_title=jobs.get(iv.job_id, ""),
                candidate_id=cand.id,
                candidate_name=cand.full_name,
                candidate_email=cand.email,
                title=iv.title,
                interview_type=iv.interview_type,
                status=iv.status,
                scheduled_start=iv.scheduled_start,
                scheduled_end=iv.scheduled_end,
                duration_minutes=iv.duration_minutes,
                timezone=iv.timezone,
                meeting_link=iv.meeting_link,
                location=iv.location,
                instructions=iv.instructions,
                participants=part_by_iv.get(iv.id, []),
                feedback_entries=fb_by_iv.get(iv.id, []),
                created_at=iv.created_at,
            )
        )
    return output


def _check_schedule_conflicts(
    db: Session,
    *,
    organization_id: uuid.UUID,
    candidate_id: uuid.UUID,
    interviewer_ids: list[uuid.UUID],
    start: datetime,
    end: datetime,
    exclude_interview_id: uuid.UUID | None = None,
) -> None:
    active_interviews = list(
        db.scalars(
            select(Interview).where(
                Interview.organization_id == organization_id,
                Interview.status.in_(["scheduled", "rescheduled"]),
            )
        ).all()
    )
    iv_ids = [iv.id for iv in active_interviews]
    participants = (
        list(db.scalars(select(InterviewParticipant).where(InterviewParticipant.interview_id.in_(iv_ids))).all())
        if iv_ids
        else []
    )
    parts_by_iv: dict[uuid.UUID, set[uuid.UUID]] = {}
    for p in participants:
        parts_by_iv.setdefault(p.interview_id, set()).add(p.user_id)

    req_interviewers = set(interviewer_ids)
    start_u = _as_utc(start)
    end_u = _as_utc(end)

    for existing in active_interviews:
        if exclude_interview_id and existing.id == exclude_interview_id:
            continue
        ex_start = _as_utc(existing.scheduled_start)
        ex_end = _as_utc(existing.scheduled_end)
        overlaps = start_u < ex_end and end_u > ex_start
        if not overlaps:
            continue
        if existing.candidate_id == candidate_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Candidate already has another interview scheduled during this time slot.",
            )
        overlap_interviewers = req_interviewers.intersection(parts_by_iv.get(existing.id, set()))
        if overlap_interviewers:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="One or more selected interviewers have a scheduling conflict during this time slot.",
            )


@router.get("", response_model=list[InterviewOut])
def list_interviews(
    status_filter: str | None = Query(default=None, alias="status"),
    job_id: uuid.UUID | None = Query(default=None),
    start_from: datetime | None = Query(default=None),
    start_to: datetime | None = Query(default=None),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> list[InterviewOut]:
    assert auth.organization is not None
    stmt = select(Interview).where(Interview.organization_id == auth.organization.id)
    if status_filter:
        stmt = stmt.where(Interview.status == status_filter)
    if job_id:
        stmt = stmt.where(Interview.job_id == job_id)
    if start_from:
        stmt = stmt.where(Interview.scheduled_start >= start_from)
    if start_to:
        stmt = stmt.where(Interview.scheduled_start <= start_to)

    rows = list(db.scalars(stmt.order_by(Interview.scheduled_start.asc())).all())
    return _serialize_interviews(db, rows)


@router.post("", response_model=InterviewOut, status_code=status.HTTP_201_CREATED)
def schedule_interview(
    payload: InterviewCreateRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter")),
    db: Session = Depends(get_db),
) -> InterviewOut:
    assert auth.organization is not None
    now = datetime.now(timezone.utc)
    start_dt = _as_utc(payload.scheduled_start)
    if start_dt < now - timedelta(minutes=5):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Interview start time cannot be in the past.",
        )

    application = db.scalar(
        select(Application).where(
            Application.id == payload.application_id,
            Application.organization_id == auth.organization.id,
        )
    )
    if not application:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")

    valid_members = set(
        db.scalars(
            select(OrganizationMember.user_id).where(
                OrganizationMember.organization_id == auth.organization.id,
                OrganizationMember.user_id.in_(payload.interviewer_ids),
                OrganizationMember.status == "active",
            )
        ).all()
    )
    if len(valid_members) != len(set(payload.interviewer_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All assigned interviewers must be active members of your organization.",
        )

    end_dt = start_dt + timedelta(minutes=payload.duration_minutes)
    _check_schedule_conflicts(
        db,
        organization_id=auth.organization.id,
        candidate_id=application.candidate_id,
        interviewer_ids=list(valid_members),
        start=start_dt,
        end=end_dt,
    )

    interview = Interview(
        organization_id=auth.organization.id,
        application_id=application.id,
        job_id=application.job_id,
        candidate_id=application.candidate_id,
        title=payload.title.strip(),
        interview_type=payload.interview_type,
        status="scheduled",
        scheduled_start=start_dt,
        scheduled_end=end_dt,
        duration_minutes=payload.duration_minutes,
        timezone=payload.timezone,
        meeting_link=payload.meeting_link,
        location=payload.location,
        instructions=payload.instructions,
        created_by_id=auth.user.id,
    )
    db.add(interview)
    db.flush()

    for idx, interviewer_id in enumerate(dict.fromkeys(payload.interviewer_ids)):
        db.add(
            InterviewParticipant(
                organization_id=auth.organization.id,
                interview_id=interview.id,
                user_id=interviewer_id,
                role="lead_interviewer" if idx == 0 else "interviewer",
                attendance_status="accepted",
            )
        )
        create_notification(
            db,
            user_id=interviewer_id,
            organization_id=auth.organization.id,
            event_type="interview_scheduled",
            title=f"Interview scheduled: {interview.title}",
            body=f"Scheduled for {start_dt.strftime('%Y-%m-%d %H:%M UTC')} ({payload.duration_minutes} min).",
            link_url="/workspace/interviews",
        )

    cand = db.get(Candidate, application.candidate_id)
    job = db.get(Job, application.job_id)
    if cand and cand.user_id:
        create_notification(
            db,
            user_id=cand.user_id,
            organization_id=auth.organization.id,
            event_type="interview_scheduled",
            title=f"Interview invitation: {job.title if job else interview.title}",
            body=f"{interview.title} is scheduled for {start_dt.strftime('%Y-%m-%d %H:%M UTC')}.",
            link_url="/candidate/interviews",
        )

    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="interview",
        entity_id=interview.id,
        action="interview_scheduled",
        summary=f"Scheduled {interview.title} with {cand.full_name if cand else 'candidate'}",
    )
    db.commit()
    db.refresh(interview)
    return _serialize_interviews(db, [interview])[0]


@router.patch("/{interview_id}", response_model=InterviewOut)
def update_interview(
    interview_id: uuid.UUID,
    payload: InterviewUpdateRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> InterviewOut:
    assert auth.organization is not None
    interview = db.scalar(
        select(Interview).where(Interview.id == interview_id, Interview.organization_id == auth.organization.id)
    )
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    updates = payload.model_dump(exclude_unset=True)
    # Hiring managers may mark interviews completed, while rescheduling/cancelling stays with recruiters/owners.
    if auth.role == "hiring_manager" and set(updates.keys()) - {"status"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters or organization owners can reschedule interviews.",
        )

    rescheduled = False
    new_start = _as_utc(updates["scheduled_start"]) if "scheduled_start" in updates and updates["scheduled_start"] else _as_utc(interview.scheduled_start)
    new_duration = updates.get("duration_minutes", interview.duration_minutes)
    new_end = new_start + timedelta(minutes=new_duration)

    if "scheduled_start" in updates or "duration_minutes" in updates or "interviewer_ids" in updates:
        if "scheduled_start" in updates and new_start < datetime.now(timezone.utc) - timedelta(minutes=5):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Rescheduled interview time cannot be in the past.",
            )
        interviewer_ids = updates.get("interviewer_ids")
        if interviewer_ids is None:
            interviewer_ids = list(
                db.scalars(
                    select(InterviewParticipant.user_id).where(InterviewParticipant.interview_id == interview.id)
                ).all()
            )
        _check_schedule_conflicts(
            db,
            organization_id=auth.organization.id,
            candidate_id=interview.candidate_id,
            interviewer_ids=interviewer_ids,
            start=new_start,
            end=new_end,
            exclude_interview_id=interview.id,
        )
        interview.scheduled_start = new_start
        interview.scheduled_end = new_end
        interview.duration_minutes = new_duration
        if "scheduled_start" in updates:
            rescheduled = True
            if "status" not in updates:
                interview.status = "rescheduled"

    if "interviewer_ids" in updates and updates["interviewer_ids"]:
        existing_parts = db.scalars(select(InterviewParticipant).where(InterviewParticipant.interview_id == interview.id)).all()
        for ep in existing_parts:
            db.delete(ep)
        db.flush()
        for idx, u_id in enumerate(dict.fromkeys(updates["interviewer_ids"])):
            db.add(
                InterviewParticipant(
                    organization_id=auth.organization.id,
                    interview_id=interview.id,
                    user_id=u_id,
                    role="lead_interviewer" if idx == 0 else "interviewer",
                    attendance_status="accepted",
                )
            )

    for simple_field in ("title", "interview_type", "status", "timezone", "meeting_link", "location", "instructions"):
        if simple_field in updates and updates[simple_field] is not None:
            setattr(interview, simple_field, updates[simple_field])

    cand = db.get(Candidate, interview.candidate_id)
    if cand and cand.user_id and (rescheduled or updates.get("status") == "cancelled"):
        create_notification(
            db,
            user_id=cand.user_id,
            organization_id=auth.organization.id,
            event_type="interview_rescheduled" if rescheduled else "interview_cancelled",
            title=f"Interview {'rescheduled' if rescheduled else 'updated'}: {interview.title}",
            body=f"Updated status: {interview.status}. Time: {interview.scheduled_start.strftime('%Y-%m-%d %H:%M UTC')}.",
            link_url="/candidate/interviews",
        )

    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="interview",
        entity_id=interview.id,
        action="interview_updated",
        summary=f"Updated interview '{interview.title}' (status: {interview.status})",
    )
    db.commit()
    db.refresh(interview)
    return _serialize_interviews(db, [interview])[0]


@router.post("/{interview_id}/feedback", response_model=InterviewFeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_interview_feedback(
    interview_id: uuid.UUID,
    payload: InterviewFeedbackCreateRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> InterviewFeedbackOut:
    assert auth.organization is not None
    interview = db.scalar(
        select(Interview).where(Interview.id == interview_id, Interview.organization_id == auth.organization.id)
    )
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    existing = db.scalar(
        select(InterviewFeedback).where(
            InterviewFeedback.interview_id == interview.id,
            InterviewFeedback.reviewer_id == auth.user.id,
        )
    )
    now = datetime.now(timezone.utc)
    if existing:
        existing.recommendation = payload.recommendation
        existing.strengths = payload.strengths.strip()
        existing.concerns = payload.concerns.strip() if payload.concerns else None
        existing.notes = payload.notes.strip() if payload.notes else None
        existing.rubric_scores = payload.rubric_scores
        existing.submitted_at = now
        entry = existing
    else:
        entry = InterviewFeedback(
            organization_id=auth.organization.id,
            interview_id=interview.id,
            reviewer_id=auth.user.id,
            recommendation=payload.recommendation,
            strengths=payload.strengths.strip(),
            concerns=payload.concerns.strip() if payload.concerns else None,
            notes=payload.notes.strip() if payload.notes else None,
            rubric_scores=payload.rubric_scores,
            submitted_at=now,
        )
        db.add(entry)

    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="interview",
        entity_id=interview.id,
        action="feedback_submitted",
        summary=f"{auth.user.full_name} submitted interview feedback ({payload.recommendation})",
    )
    db.commit()
    db.refresh(entry)
    return InterviewFeedbackOut(
        id=entry.id,
        reviewer_id=entry.reviewer_id,
        reviewer_name=auth.user.full_name,
        recommendation=entry.recommendation,
        strengths=entry.strengths,
        concerns=entry.concerns,
        notes=entry.notes,
        rubric_scores=entry.rubric_scores or {},
        submitted_at=entry.submitted_at,
    )


@router.get("/{interview_id}/ics")
def download_interview_ics(
    interview_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> Response:
    interview = db.get(Interview, interview_id)
    if not interview:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    cand = db.get(Candidate, interview.candidate_id)
    if auth.user.account_type == "candidate":
        if not cand or cand.user_id != auth.user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")
    elif auth.organization is None or interview.organization_id != auth.organization.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview not found.")

    org = db.get(Organization, interview.organization_id)
    job = db.get(Job, interview.job_id)
    part_user_ids = list(
        db.scalars(select(InterviewParticipant.user_id).where(InterviewParticipant.interview_id == interview.id)).all()
    )
    emails = [u.email for u in db.scalars(select(User).where(User.id.in_(part_user_ids))).all()] if part_user_ids else []
    if cand and cand.email not in emails:
        emails.append(cand.email)

    ics_content = build_interview_ics(
        interview=interview,
        organization_name=org.name if org else "TalentOS",
        job_title=job.title if job else "Role",
        candidate_name=cand.full_name if cand else "Candidate",
        attendee_emails=emails,
    )
    return Response(
        content=ics_content,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="talentos-interview-{interview.id}.ics"'},
    )
