from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class StageCountPoint(BaseModel):
    stage: str
    label: str
    count: int
    conversion_from_previous_pct: float | None = None


class TrendPoint(BaseModel):
    date: str
    applications: int


class JobVolumePoint(BaseModel):
    job_id: UUID
    title: str
    department: str
    status: str
    applications: int
    interviews: int
    offers: int
    hired: int


class StageDurationPoint(BaseModel):
    stage: str
    label: str
    avg_days: float | None = None


class DepartmentActivityPoint(BaseModel):
    department: str
    open_jobs: int
    applications: int
    interviews: int
    hired: int


class AttentionJobItem(BaseModel):
    job_id: UUID
    title: str
    department: str
    unreviewed_count: int
    total_applications: int
    closing_soon: bool
    application_deadline: datetime | None = None
    reason: str


class AnalyticsOverviewOut(BaseModel):
    date_range_days: int
    active_job_openings: int
    total_applications: int
    interviews_scheduled: int
    offers_made: int
    hired_count: int
    avg_time_to_hire_days: float | None = None
    interview_completion_rate_pct: float | None = None
    offer_acceptance_rate_pct: float | None = None
    stage_distribution: list[StageCountPoint]
    applications_over_time: list[TrendPoint]
    applications_by_job: list[JobVolumePoint]
    avg_days_per_stage: list[StageDurationPoint]
    hiring_by_department: list[DepartmentActivityPoint]
    jobs_requiring_attention: list[AttentionJobItem]
    metric_definitions: dict[str, str]
