from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class JobCreateRequest(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    department: str = Field(min_length=2, max_length=120)
    employment_type: Literal["full_time", "part_time", "contract", "internship"] = "full_time"
    work_arrangement: Literal["remote", "hybrid", "onsite"] = "hybrid"
    location: str = Field(min_length=2, max_length=160)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    salary_currency: str = Field(default="USD", min_length=3, max_length=8)
    description: str = Field(min_length=20, max_length=10000)
    responsibilities: list[str] = Field(default_factory=list)
    required_qualifications: list[str] = Field(default_factory=list)
    preferred_qualifications: list[str] = Field(default_factory=list)
    required_skills: list[str] = Field(default_factory=list)
    status: Literal["draft", "published", "paused", "closed"] = "draft"
    openings_count: int = Field(default=1, ge=1, le=100)
    application_deadline: datetime | None = None
    hiring_manager_id: UUID | None = None


class JobUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=180)
    department: str | None = Field(default=None, min_length=2, max_length=120)
    employment_type: Literal["full_time", "part_time", "contract", "internship"] | None = None
    work_arrangement: Literal["remote", "hybrid", "onsite"] | None = None
    location: str | None = Field(default=None, min_length=2, max_length=160)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    salary_currency: str | None = Field(default=None, min_length=3, max_length=8)
    description: str | None = Field(default=None, min_length=20, max_length=10000)
    responsibilities: list[str] | None = None
    required_qualifications: list[str] | None = None
    preferred_qualifications: list[str] | None = None
    required_skills: list[str] | None = None
    status: Literal["draft", "published", "paused", "closed"] | None = None
    openings_count: int | None = Field(default=None, ge=1, le=100)
    application_deadline: datetime | None = None
    hiring_manager_id: UUID | None = None


class JobRequirementOut(ORMModel):
    id: UUID
    category: str
    label: str
    detail: str | None = None
    weight: int
    sort_order: int


class JobOut(ORMModel):
    id: UUID
    organization_id: UUID
    organization_name: str = ""
    slug: str
    title: str
    department: str
    employment_type: str
    work_arrangement: str
    location: str
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str
    description: str
    responsibilities: list[str]
    required_qualifications: list[str]
    preferred_qualifications: list[str]
    required_skills: list[str]
    status: str
    openings_count: int
    application_deadline: datetime | None = None
    hiring_manager_id: UUID | None = None
    hiring_manager_name: str | None = None
    is_demo: bool
    published_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    application_count: int = 0
    stage_counts: dict[str, int] = Field(default_factory=dict)
