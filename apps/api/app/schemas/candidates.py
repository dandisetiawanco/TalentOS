from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class EducationEntry(BaseModel):
    institution: str
    degree: str
    field_of_study: str | None = None
    start_year: str | None = None
    end_year: str | None = None


class WorkExperienceEntry(BaseModel):
    company: str
    role: str
    start_date: str | None = None
    end_date: str | None = None
    highlights: list[str] = Field(default_factory=list)


class CandidateSkillOut(ORMModel):
    id: UUID
    skill_name: str
    category: str
    proficiency: str | None = None
    source: str


class CandidateDocumentOut(ORMModel):
    id: UUID
    document_type: str
    original_filename: str
    mime_type: str
    file_size_bytes: int
    consent_granted: bool
    is_demo: bool
    created_at: datetime
    signed_download_url: str | None = None


class StageHistoryOut(ORMModel):
    id: UUID
    from_stage: str | None = None
    to_stage: str
    changed_by_name: str | None = None
    reason: str | None = None
    changed_at: datetime


class RecruiterNoteOut(ORMModel):
    id: UUID
    candidate_id: UUID
    application_id: UUID | None = None
    author_id: UUID
    author_name: str
    content: str
    is_private: bool
    created_at: datetime


class RecruiterNoteCreateRequest(BaseModel):
    content: str = Field(min_length=2, max_length=4000)
    application_id: UUID | None = None


class QualificationEvidence(BaseModel):
    criterion: str
    status: Literal["evidence_found", "not_found", "ambiguous"]
    evidence_excerpt: str | None = None
    notes: str | None = None


class ResumeAnalysisStructuredOutput(BaseModel):
    professional_summary: str
    extracted_technical_skills: list[str]
    extracted_professional_skills: list[str]
    relevant_work_experience: list[str]
    education: list[str]
    certifications: list[str]
    required_qualifications_evidence: list[QualificationEvidence]
    preferred_qualifications_evidence: list[QualificationEvidence]
    requirements_not_found: list[str]
    uncertain_or_ambiguous: list[str]
    suggested_interview_questions: list[str]
    analysis_limitations: list[str]
    qualification_coverage_summary: str


class ResumeAnalysisOut(ORMModel):
    id: UUID
    candidate_id: UUID
    application_id: UUID | None = None
    job_id: UUID | None = None
    job_title: str | None = None
    document_id: UUID | None = None
    analysis_mode: str
    provider_name: str
    model_name: str | None = None
    prompt_injection_flags: list[str]
    structured_output: ResumeAnalysisStructuredOutput
    human_reviewed: bool
    reviewed_by_name: str | None = None
    reviewed_at: datetime | None = None
    reviewer_corrections: dict[str, Any] | None = None
    created_at: datetime


class ResumeAnalysisReviewRequest(BaseModel):
    human_reviewed: bool = True
    reviewer_notes: str | None = Field(default=None, max_length=2000)
    corrected_skills: list[str] | None = None
    corrected_summary: str | None = Field(default=None, max_length=2000)


class ApplicationSummaryOut(BaseModel):
    id: UUID
    job_id: UUID
    job_title: str
    job_slug: str
    job_department: str
    organization_name: str
    candidate_id: UUID
    candidate_name: str
    candidate_email: str
    candidate_location: str | None = None
    candidate_years_experience: int = 0
    candidate_skills: list[str] = Field(default_factory=list)
    stage: str
    assigned_recruiter_id: UUID | None = None
    assigned_recruiter_name: str | None = None
    cover_note: str | None = None
    decision_reason: str | None = None
    source: str
    applied_at: datetime
    last_activity_at: datetime
    resume_document_id: UUID | None = None
    evidence_found_count: int | None = None
    required_total_count: int | None = None
    stage_history: list[StageHistoryOut] = Field(default_factory=list)


class CandidateDirectoryItem(BaseModel):
    id: UUID
    full_name: str
    email: str
    location: str | None = None
    headline: str | None = None
    years_of_experience: int
    skills: list[str]
    latest_application_id: UUID | None = None
    latest_job_id: UUID | None = None
    latest_job_title: str | None = None
    latest_stage: str | None = None
    assigned_recruiter_name: str | None = None
    last_activity_at: datetime


class CandidateDetailOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    phone: str | None = None
    location: str | None = None
    headline: str | None = None
    professional_summary: str | None = None
    years_of_experience: int
    education: list[dict[str, Any]]
    work_experience: list[dict[str, Any]]
    linkedin_url: str | None = None
    portfolio_url: str | None = None
    consent_resume_processing: bool
    consent_recorded_at: datetime | None = None
    skills: list[CandidateSkillOut]
    documents: list[CandidateDocumentOut]
    applications: list[ApplicationSummaryOut]
    interviews: list[dict[str, Any]]
    notes: list[RecruiterNoteOut]
    analyses: list[ResumeAnalysisOut]
    activity: list[dict[str, Any]]
    created_at: datetime


class ApplicationStageUpdateRequest(BaseModel):
    to_stage: Literal[
        "applied",
        "screening",
        "shortlisted",
        "interview",
        "offer",
        "hired",
        "rejected",
    ]
    reason: str | None = Field(default=None, max_length=1500)


class PublicApplicationCreateRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=160)
    headline: str | None = Field(default=None, max_length=200)
    years_of_experience: int = Field(default=0, ge=0, le=60)
    linkedin_url: str | None = Field(default=None, max_length=255)
    portfolio_url: str | None = Field(default=None, max_length=255)
    cover_note: str | None = Field(default=None, max_length=4000)
    resume_document_id: UUID | None = None
    consent_resume_processing: bool = True


class CandidateProfileOut(BaseModel):
    user_id: UUID
    full_name: str
    email: str
    phone: str | None = None
    location: str | None = None
    timezone: str
    headline: str | None = None
    bio: str | None = None
    years_of_experience: int | None = None
    skills: list[str]
    education: list[dict[str, Any]]
    work_experience: list[dict[str, Any]]
    linkedin_url: str | None = None
    portfolio_url: str | None = None
    consent_resume_processing: bool
    consent_recorded_at: datetime | None = None


class CandidateProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=160)
    phone: str | None = Field(default=None, max_length=40)
    location: str | None = Field(default=None, max_length=160)
    timezone: str | None = Field(default=None, max_length=64)
    headline: str | None = Field(default=None, max_length=200)
    bio: str | None = Field(default=None, max_length=4000)
    years_of_experience: int | None = Field(default=None, ge=0, le=60)
    skills: list[str] | None = None
    education: list[dict[str, Any]] | None = None
    work_experience: list[dict[str, Any]] | None = None
    linkedin_url: str | None = Field(default=None, max_length=255)
    portfolio_url: str | None = Field(default=None, max_length=255)
    consent_resume_processing: bool | None = None
