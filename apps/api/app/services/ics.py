from __future__ import annotations

from datetime import datetime, timezone

from app.models import Interview


def _ics_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def _format_utc(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y%m%dT%H%M%SZ")


def build_interview_ics(
    *,
    interview: Interview,
    organization_name: str,
    job_title: str,
    candidate_name: str,
    attendee_emails: list[str],
) -> str:
    now_str = _format_utc(datetime.now(timezone.utc))
    start_str = _format_utc(interview.scheduled_start)
    end_str = _format_utc(interview.scheduled_end)
    description_parts = [
        f"Role: {job_title}",
        f"Candidate: {candidate_name}",
        f"Format: {interview.interview_type.replace('_', ' ').title()}",
        f"Timezone reference: {interview.timezone}",
    ]
    if interview.meeting_link:
        description_parts.append(f"Meeting link: {interview.meeting_link}")
    if interview.instructions:
        description_parts.append(f"Notes: {interview.instructions}")
    description = _ics_escape("\n".join(description_parts))
    location = _ics_escape(interview.meeting_link or interview.location or "Remote video conference")
    summary = _ics_escape(f"{interview.title} ({organization_name})")

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//TalentOS//Interview Schedule//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:REQUEST",
        "BEGIN:VEVENT",
        f"UID:interview-{interview.id}@talentos.local",
        f"DTSTAMP:{now_str}",
        f"DTSTART:{start_str}",
        f"DTEND:{end_str}",
        f"SUMMARY:{summary}",
        f"DESCRIPTION:{description}",
        f"LOCATION:{location}",
        "STATUS:CONFIRMED" if interview.status != "cancelled" else "STATUS:CANCELLED",
    ]
    for email in attendee_emails:
        lines.append(f"ATTENDEE;CN={_ics_escape(email)}:mailto:{email}")
    lines.extend(["END:VEVENT", "END:VCALENDAR", ""])
    return "\r\n".join(lines)
