from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.models import ActivityLog, Notification, UserPreference


def record_activity(
    db: Session,
    *,
    organization_id: uuid.UUID,
    actor_id: uuid.UUID | None,
    entity_type: str,
    entity_id: str | uuid.UUID,
    action: str,
    summary: str,
    metadata: dict[str, Any] | None = None,
) -> ActivityLog:
    entry = ActivityLog(
        organization_id=organization_id,
        actor_id=actor_id,
        entity_type=entity_type,
        entity_id=str(entity_id),
        action=action,
        summary=summary,
        metadata_json=metadata or {},
    )
    db.add(entry)
    return entry


def create_notification(
    db: Session,
    *,
    user_id: uuid.UUID,
    organization_id: uuid.UUID | None,
    event_type: str,
    title: str,
    body: str,
    link_url: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> Notification | None:
    pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if pref:
        pref_map = {
            "new_application": pref.notify_new_application,
            "interview_scheduled": pref.notify_interview_updates,
            "interview_rescheduled": pref.notify_interview_updates,
            "interview_cancelled": pref.notify_interview_updates,
            "application_status_updated": pref.notify_status_updates,
            "resume_analysis_completed": pref.notify_resume_analysis,
        }
        if event_type in pref_map and not pref_map[event_type]:
            return None

    notification = Notification(
        user_id=user_id,
        organization_id=organization_id,
        event_type=event_type,
        title=title,
        body=body,
        link_url=link_url,
        metadata_json=metadata or {},
    )
    db.add(notification)
    return notification
