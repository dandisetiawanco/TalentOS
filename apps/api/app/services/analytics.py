from __future__ import annotations

import csv
import io
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import (
    STAGE_ORDER,
    Application,
    ApplicationStageHistory,
    Interview,
    Job,
)
from app.schemas.analytics import (
    AnalyticsOverviewOut,
    AttentionJobItem,
    DepartmentActivityPoint,
    JobVolumePoint,
    StageCountPoint,
    StageDurationPoint,
    TrendPoint,
)

STAGE_LABELS = {
    "applied": "Applied",
    "screening": "Screening",
    "shortlisted": "Shortlisted",
    "interview": "Interview",
    "offer": "Offer",
    "hired": "Hired",
    "rejected": "Rejected",
}

FUNNEL_STAGES = ("applied", "screening", "shortlisted", "interview", "offer", "hired")

METRIC_DEFINITIONS: dict[str, str] = {
    "active_job_openings": "Published jobs currently accepting applications within the selected filters.",
    "total_applications": "Applications submitted inside the selected date window and scope.",
    "stage_conversion_rate": "Percentage of applicants reaching each progressive stage relative to the prior funnel stage.",
    "avg_time_to_hire_days": "Mean elapsed calendar days between initial application timestamp and transition to Hired.",
    "avg_days_per_stage": "Mean elapsed days spent between entering a stage and moving to the next recorded stage.",
    "interview_completion_rate_pct": "Completed interviews divided by all non-cancelled interviews in scope.",
    "offer_acceptance_rate_pct": "Hired applications divided by applications that reached Offer or Hired.",
}


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def compute_organization_analytics(
    db: Session,
    *,
    organization_id: uuid.UUID,
    days: int = 60,
    department: str | None = None,
    job_id: uuid.UUID | None = None,
) -> AnalyticsOverviewOut:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    job_stmt = select(Job).where(Job.organization_id == organization_id)
    if department:
        job_stmt = job_stmt.where(Job.department == department)
    if job_id:
        job_stmt = job_stmt.where(Job.id == job_id)
    jobs = list(db.scalars(job_stmt).all())
    job_map = {job.id: job for job in jobs}
    scoped_job_ids = list(job_map.keys())

    if not scoped_job_ids:
        return AnalyticsOverviewOut(
            date_range_days=days,
            active_job_openings=0,
            total_applications=0,
            interviews_scheduled=0,
            offers_made=0,
            hired_count=0,
            avg_time_to_hire_days=None,
            interview_completion_rate_pct=None,
            offer_acceptance_rate_pct=None,
            stage_distribution=[StageCountPoint(stage=s, label=STAGE_LABELS[s], count=0) for s in STAGE_ORDER],
            applications_over_time=[],
            applications_by_job=[],
            avg_days_per_stage=[StageDurationPoint(stage=s, label=STAGE_LABELS[s], avg_days=None) for s in FUNNEL_STAGES[:-1]],
            hiring_by_department=[],
            jobs_requiring_attention=[],
            metric_definitions=METRIC_DEFINITIONS,
        )

    all_apps = list(
        db.scalars(
            select(Application).where(
                Application.organization_id == organization_id,
                Application.job_id.in_(scoped_job_ids),
            )
        ).all()
    )
    apps = [app for app in all_apps if _as_utc(app.applied_at) >= cutoff]
    app_ids = [app.id for app in apps]

    history_rows = list(
        db.scalars(
            select(ApplicationStageHistory)
            .where(
                ApplicationStageHistory.organization_id == organization_id,
                ApplicationStageHistory.application_id.in_(app_ids) if app_ids else False,
            )
            .order_by(ApplicationStageHistory.changed_at.asc())
        ).all()
    ) if app_ids else []

    interviews = list(
        db.scalars(
            select(Interview).where(
                Interview.organization_id == organization_id,
                Interview.job_id.in_(scoped_job_ids),
            )
        ).all()
    )

    active_openings = sum(1 for j in jobs if j.status == "published")
    stage_counts = defaultdict(int)
    for app in apps:
        stage_counts[app.stage] += 1

    # Progressive funnel reach based on stage history so conversion reflects real progression.
    history_by_app: dict[uuid.UUID, list[ApplicationStageHistory]] = defaultdict(list)
    for row in history_rows:
        history_by_app[row.application_id].append(row)

    stage_reached = defaultdict(int)
    for app in apps:
        visited = {h.to_stage for h in history_by_app.get(app.id, [])}
        visited.add(app.stage)
        for s in visited:
            stage_reached[s] += 1

    stage_distribution: list[StageCountPoint] = []
    for idx, stage in enumerate(STAGE_ORDER):
        conversion: float | None = None
        if stage in FUNNEL_STAGES and idx > 0:
            prev_stage = FUNNEL_STAGES[FUNNEL_STAGES.index(stage) - 1]
            prev_reached = stage_reached[prev_stage]
            if prev_reached > 0:
                conversion = round((stage_reached[stage] / prev_reached) * 100.0, 1)
        stage_distribution.append(
            StageCountPoint(
                stage=stage,
                label=STAGE_LABELS[stage],
                count=stage_counts[stage],
                conversion_from_previous_pct=conversion,
            )
        )

    # Applications over time grouped by day across the window (bucketed by 3-day or daily points).
    bucket_counts: dict[str, int] = defaultdict(int)
    span_days = min(days, 60)
    for offset in range(span_days, -1, -1):
        day_str = (now - timedelta(days=offset)).strftime("%Y-%m-%d")
        bucket_counts[day_str] = 0
    for app in apps:
        day_str = _as_utc(app.applied_at).strftime("%Y-%m-%d")
        if day_str in bucket_counts:
            bucket_counts[day_str] += 1
    applications_over_time = [TrendPoint(date=day, applications=count) for day, count in sorted(bucket_counts.items())]

    # Average time to hire & average dwell time per stage.
    hire_durations: list[float] = []
    stage_dwell_samples: dict[str, list[float]] = defaultdict(list)
    for app in apps:
        events = history_by_app.get(app.id, [])
        if app.stage == "hired" and events:
            hired_event = next((e for e in reversed(events) if e.to_stage == "hired"), None)
            if hired_event:
                delta_days = (_as_utc(hired_event.changed_at) - _as_utc(app.applied_at)).total_seconds() / 86400.0
                if delta_days >= 0:
                    hire_durations.append(delta_days)
        for i in range(len(events) - 1):
            curr_ev = events[i]
            next_ev = events[i + 1]
            dwell = (_as_utc(next_ev.changed_at) - _as_utc(curr_ev.changed_at)).total_seconds() / 86400.0
            if dwell >= 0:
                stage_dwell_samples[curr_ev.to_stage].append(dwell)

    avg_time_to_hire = round(sum(hire_durations) / len(hire_durations), 1) if hire_durations else None
    avg_days_per_stage = [
        StageDurationPoint(
            stage=s,
            label=STAGE_LABELS[s],
            avg_days=round(sum(stage_dwell_samples[s]) / len(stage_dwell_samples[s]), 1)
            if stage_dwell_samples[s]
            else None,
        )
        for s in FUNNEL_STAGES[:-1]
    ]

    non_cancelled_interviews = [iv for iv in interviews if iv.status != "cancelled"]
    completed_interviews = [iv for iv in non_cancelled_interviews if iv.status == "completed"]
    upcoming_scheduled = [iv for iv in interviews if iv.status in {"scheduled", "rescheduled"}]
    interview_completion_rate = (
        round((len(completed_interviews) / len(non_cancelled_interviews)) * 100.0, 1)
        if non_cancelled_interviews
        else None
    )

    offers_reached = stage_reached["offer"] + sum(1 for a in apps if a.stage == "hired" and "offer" not in {h.to_stage for h in history_by_app.get(a.id, [])})
    hired_count = stage_counts["hired"]
    offer_acceptance_rate = (
        round((hired_count / offers_reached) * 100.0, 1)
        if offers_reached > 0
        else None
    )

    # Applications by job and department breakdown.
    apps_by_job_map: dict[uuid.UUID, list[Application]] = defaultdict(list)
    for app in apps:
        apps_by_job_map[app.job_id].append(app)
    interviews_by_job: dict[uuid.UUID, int] = defaultdict(int)
    for iv in non_cancelled_interviews:
        interviews_by_job[iv.job_id] += 1

    applications_by_job: list[JobVolumePoint] = []
    dept_rollup: dict[str, dict[str, int]] = defaultdict(lambda: {"open_jobs": 0, "applications": 0, "interviews": 0, "hired": 0})
    attention_jobs: list[AttentionJobItem] = []

    for job in jobs:
        j_apps = apps_by_job_map.get(job.id, [])
        j_interviews = interviews_by_job.get(job.id, 0)
        j_offers = sum(1 for a in j_apps if a.stage == "offer")
        j_hired = sum(1 for a in j_apps if a.stage == "hired")
        applications_by_job.append(
            JobVolumePoint(
                job_id=job.id,
                title=job.title,
                department=job.department,
                status=job.status,
                applications=len(j_apps),
                interviews=j_interviews,
                offers=j_offers,
                hired=j_hired,
            )
        )
        dept_rollup[job.department]["open_jobs"] += 1 if job.status == "published" else 0
        dept_rollup[job.department]["applications"] += len(j_apps)
        dept_rollup[job.department]["interviews"] += j_interviews
        dept_rollup[job.department]["hired"] += j_hired

        if job.status == "published":
            unreviewed = sum(1 for a in j_apps if a.stage == "applied")
            closing_soon = bool(
                job.application_deadline and _as_utc(job.application_deadline) <= now + timedelta(days=15)
            )
            if unreviewed >= 2 or closing_soon or len(j_apps) == 0:
                reasons: list[str] = []
                if unreviewed >= 2:
                    reasons.append(f"{unreviewed} applicants awaiting initial screening")
                if closing_soon:
                    reasons.append("closing deadline within 15 days")
                if len(j_apps) == 0:
                    reasons.append("no applications yet")
                attention_jobs.append(
                    AttentionJobItem(
                        job_id=job.id,
                        title=job.title,
                        department=job.department,
                        unreviewed_count=unreviewed,
                        total_applications=len(j_apps),
                        closing_soon=closing_soon,
                        application_deadline=job.application_deadline,
                        reason="; ".join(reasons).capitalize(),
                    )
                )

    applications_by_job.sort(key=lambda item: item.applications, reverse=True)
    attention_jobs.sort(key=lambda item: (item.closing_soon, item.unreviewed_count), reverse=True)

    hiring_by_department = [
        DepartmentActivityPoint(
            department=dept,
            open_jobs=vals["open_jobs"],
            applications=vals["applications"],
            interviews=vals["interviews"],
            hired=vals["hired"],
        )
        for dept, vals in sorted(dept_rollup.items(), key=lambda kv: kv[1]["applications"], reverse=True)
    ]

    return AnalyticsOverviewOut(
        date_range_days=days,
        active_job_openings=active_openings,
        total_applications=len(apps),
        interviews_scheduled=len(upcoming_scheduled),
        offers_made=stage_counts["offer"] + hired_count,
        hired_count=hired_count,
        avg_time_to_hire_days=avg_time_to_hire,
        interview_completion_rate_pct=interview_completion_rate,
        offer_acceptance_rate_pct=offer_acceptance_rate,
        stage_distribution=stage_distribution,
        applications_over_time=applications_over_time,
        applications_by_job=applications_by_job,
        avg_days_per_stage=avg_days_per_stage,
        hiring_by_department=hiring_by_department,
        jobs_requiring_attention=attention_jobs[:6],
        metric_definitions=METRIC_DEFINITIONS,
    )


def export_analytics_csv(overview: AnalyticsOverviewOut) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Section", "Label", "Metric", "Value"])
    writer.writerow(["Summary", "Active Job Openings", "count", overview.active_job_openings])
    writer.writerow(["Summary", "Total Applications", "count", overview.total_applications])
    writer.writerow(["Summary", "Upcoming Interviews", "count", overview.interviews_scheduled])
    writer.writerow(["Summary", "Offers Made", "count", overview.offers_made])
    writer.writerow(["Summary", "Hired", "count", overview.hired_count])
    writer.writerow(["Summary", "Average Time to Hire (days)", "days", overview.avg_time_to_hire_days or "N/A"])
    writer.writerow(["Summary", "Interview Completion Rate (%)", "percent", overview.interview_completion_rate_pct or "N/A"])
    writer.writerow(["Summary", "Offer Acceptance Rate (%)", "percent", overview.offer_acceptance_rate_pct or "N/A"])
    for stage in overview.stage_distribution:
        writer.writerow(["Stage Distribution", stage.label, "count", stage.count])
    for job in overview.applications_by_job:
        writer.writerow(["Applications by Job", f"{job.title} ({job.department})", "applications", job.applications])
    for dept in overview.hiring_by_department:
        writer.writerow(["Department Activity", dept.department, "applications", dept.applications])
    return buffer.getvalue()
