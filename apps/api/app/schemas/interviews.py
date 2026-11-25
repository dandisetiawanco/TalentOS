from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class InterviewCreateRequest(BaseModel):
    application_id: UUID
    title: str = Field(min_length=3, max_length=200)
    interview_type: Literal[
        "screening", "technical", "system_design", "behavioral", "panel", "final"
    ] = "technical"
    scheduled_start: datetime
    duration_minutes: int = Field(default=45, ge=15, le=240)
    timezone: str = Field(default="UTC", max_length=64)
    meeting_link: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=200)
    instructions: str | None = Field(default=None, max_length=2000)
    interviewer_ids: list[UUID] = Field(min_length=1)


class InterviewUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    interview_type: Literal[
        "screening", "technical", "system_design", "behavioral", "panel", "final"
    ] | None = None
    status: Literal["scheduled", "completed", "cancelled", "rescheduled"] | None = None
    scheduled_start: datetime | None = None
    duration_minutes: int | None = Field(default=None, ge=15, le=240)
    timezone: str | None = Field(default=None, max_length=64)
    meeting_link: str | None = Field(default=None, max_length=500)
    location: str | None = Field(default=None, max_length=200)
    instructions: str | None = Field(default=None, max_length=2000)
    interviewer_ids: list[UUID] | None = None


class InterviewFeedbackCreateRequest(BaseModel):
    recommendation: Literal["strong_yes", "yes", "mixed", "no"]
    strengths: str = Field(min_length=5, max_length=3000)
    concerns: str | None = Field(default=None, max_length=3000)
    notes: str | None = Field(default=None, max_length=3000)
    rubric_scores: dict[str, int] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_scores(self) -> InterviewFeedbackCreateRequest:
        for key, value in self.rubric_scores.items():
            if not (1 <= value <= 5):
                raise ValueError(f"Rubric score for {key} must be between 1 and 5.")
        return self


class InterviewParticipantOut(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    role: str
    attendance_status: str


class InterviewFeedbackOut(BaseModel):
    id: UUID
    reviewer_id: UUID
    reviewer_name: str
    recommendation: str
    strengths: str
    concerns: str | None = None
    notes: str | None = None
    rubric_scores: dict[str, Any]
    submitted_at: datetime


class InterviewOut(BaseModel):
    id: UUID
    application_id: UUID
    job_id: UUID
    job_title: str
    candidate_id: UUID
    candidate_name: str
    candidate_email: str
    title: str
    interview_type: str
    status: str
    scheduled_start: datetime
    scheduled_end: datetime
    duration_minutes: int
    timezone: str
    meeting_link: str | None = None
    location: str | None = None
    instructions: str | None = None
    participants: list[InterviewParticipantOut]
    feedback_entries: list[InterviewFeedbackOut] = Field(default_factory=list)
    created_at: datetime
