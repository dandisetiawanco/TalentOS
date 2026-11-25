from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import AuthContext, get_current_auth, require_org_roles
from app.core.security import generate_opaque_token, hash_password
from app.db.session import get_db
from app.models import (
    ActivityLog,
    Notification,
    OrganizationMember,
    User,
    UserPreference,
    UserProfile,
)
from app.schemas.auth import (
    OrganizationSummary,
    OrganizationUpdate,
    TeamInviteRequest,
    TeamMemberOut,
    TeamMemberUpdateRequest,
)
from app.schemas.common import ActivityLogOut, MessageResponse, NotificationOut
from app.services.activity import create_notification, record_activity

router = APIRouter(tags=["Organization & Collaboration"])


@router.get("/organizations/current", response_model=OrganizationSummary)
def get_current_organization(
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
) -> OrganizationSummary:
    assert auth.organization is not None
    return OrganizationSummary.model_validate(auth.organization)


@router.patch("/organizations/current", response_model=OrganizationSummary)
def update_current_organization(
    payload: OrganizationUpdate,
    auth: AuthContext = Depends(require_org_roles("organization_owner")),
    db: Session = Depends(get_db),
) -> OrganizationSummary:
    assert auth.organization is not None
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(auth.organization, field, value)
    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="organization",
        entity_id=auth.organization.id,
        action="organization_updated",
        summary=f"Updated organization settings for {auth.organization.name}",
    )
    db.commit()
    db.refresh(auth.organization)
    return OrganizationSummary.model_validate(auth.organization)


@router.get("/team", response_model=list[TeamMemberOut])
def list_team_members(
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> list[TeamMemberOut]:
    assert auth.organization is not None
    rows = db.execute(
        select(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .where(OrganizationMember.organization_id == auth.organization.id)
        .order_by(OrganizationMember.created_at.asc())
    ).all()
    return [
        TeamMemberOut(
            id=member.id,
            user_id=user.id,
            full_name=user.full_name,
            email=user.email,
            role=member.role,
            status=member.status,
            title=member.title,
            department=member.department,
            created_at=member.created_at,
        )
        for member, user in rows
    ]


@router.post("/team/invite", response_model=TeamMemberOut, status_code=status.HTTP_201_CREATED)
def invite_team_member(
    payload: TeamInviteRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner")),
    db: Session = Depends(get_db),
) -> TeamMemberOut:
    assert auth.organization is not None
    normalized_email = payload.email.lower().strip()
    user = db.scalar(select(User).where(User.email == normalized_email))
    if user is None:
        user = User(
            email=normalized_email,
            password_hash=hash_password(generate_opaque_token(18)),
            full_name=payload.full_name.strip(),
            account_type="recruiter",
            is_active=True,
            is_verified=True,
            is_demo=auth.is_demo,
            demo_session_id=auth.organization.demo_session_id,
        )
        db.add(user)
        db.flush()
        db.add(UserProfile(user_id=user.id, headline=payload.title))
        db.add(UserPreference(user_id=user.id))

    existing_member = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.organization_id == auth.organization.id,
            OrganizationMember.user_id == user.id,
        )
    )
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This user is already a member of the organization.",
        )

    member = OrganizationMember(
        organization_id=auth.organization.id,
        user_id=user.id,
        role=payload.role,
        status="active",
        title=payload.title,
        department=payload.department,
        invited_by_id=auth.user.id,
    )
    db.add(member)
    create_notification(
        db,
        user_id=user.id,
        organization_id=auth.organization.id,
        event_type="team_invitation",
        title=f"Invited to {auth.organization.name}",
        body=f"{auth.user.full_name} added you as {payload.role.replace('_', ' ')}.",
        link_url="/workspace",
    )
    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="team_member",
        entity_id=user.id,
        action="member_invited",
        summary=f"Invited {user.full_name} ({payload.role.replace('_', ' ')})",
    )
    db.commit()
    db.refresh(member)
    return TeamMemberOut(
        id=member.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=member.role,
        status=member.status,
        title=member.title,
        department=member.department,
        created_at=member.created_at,
    )


@router.patch("/team/{member_id}", response_model=TeamMemberOut)
def update_team_member(
    member_id: uuid.UUID,
    payload: TeamMemberUpdateRequest,
    auth: AuthContext = Depends(require_org_roles("organization_owner")),
    db: Session = Depends(get_db),
) -> TeamMemberOut:
    assert auth.organization is not None
    member = db.scalar(
        select(OrganizationMember).where(
            OrganizationMember.id == member_id,
            OrganizationMember.organization_id == auth.organization.id,
        )
    )
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found.")
    if member.user_id == auth.user.id and payload.status == "disabled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot disable your own account.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value)

    user = db.get(User, member.user_id)
    assert user is not None
    record_activity(
        db,
        organization_id=auth.organization.id,
        actor_id=auth.user.id,
        entity_type="team_member",
        entity_id=member.id,
        action="member_updated",
        summary=f"Updated team access for {user.full_name} (role: {member.role}, status: {member.status})",
    )
    db.commit()
    db.refresh(member)
    return TeamMemberOut(
        id=member.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=member.role,
        status=member.status,
        title=member.title,
        department=member.department,
        created_at=member.created_at,
    )


@router.get("/notifications", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = Query(default=False),
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> list[NotificationOut]:
    stmt = select(Notification).where(Notification.user_id == auth.user.id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    rows = db.scalars(stmt.order_by(Notification.created_at.desc()).limit(50)).all()
    return [NotificationOut.model_validate(row) for row in rows]


@router.patch("/notifications/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> NotificationOut:
    notif = db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == auth.user.id,
        )
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    notif.is_read = True
    notif.read_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(notif)
    return NotificationOut.model_validate(notif)


@router.post("/notifications/read-all", response_model=MessageResponse)
def mark_all_notifications_read(
    auth: AuthContext = Depends(get_current_auth),
    db: Session = Depends(get_db),
) -> MessageResponse:
    now = datetime.now(timezone.utc)
    rows = db.scalars(
        select(Notification).where(Notification.user_id == auth.user.id, Notification.is_read.is_(False))
    ).all()
    for row in rows:
        row.is_read = True
        row.read_at = now
    db.commit()
    return MessageResponse(message=f"Marked {len(rows)} notifications as read.")


@router.get("/activity", response_model=list[ActivityLogOut])
def list_activity_logs(
    limit: int = Query(default=25, ge=1, le=100),
    auth: AuthContext = Depends(require_org_roles("organization_owner", "recruiter", "hiring_manager")),
    db: Session = Depends(get_db),
) -> list[ActivityLogOut]:
    assert auth.organization is not None
    rows = db.scalars(
        select(ActivityLog)
        .where(ActivityLog.organization_id == auth.organization.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    ).all()
    actor_ids = {row.actor_id for row in rows if row.actor_id}
    actors = {
        u.id: u.full_name
        for u in db.scalars(select(User).where(User.id.in_(actor_ids))).all()
    } if actor_ids else {}
    return [
        ActivityLogOut(
            id=row.id,
            actor_id=row.actor_id,
            actor_name=actors.get(row.actor_id) if row.actor_id else "System",
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            action=row.action,
            summary=row.summary,
            created_at=row.created_at,
        )
        for row in rows
    ]
