from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    account_type: Literal["recruiter", "candidate"] = "recruiter"
    organization_name: str | None = Field(default=None, min_length=2, max_length=160)
    consent_resume_processing: bool = False


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)
    new_password: str = Field(min_length=8, max_length=128)


class DemoSessionRequest(BaseModel):
    role: Literal["recruiter", "hiring_manager", "candidate"] = "recruiter"


class OrganizationSummary(ORMModel):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    website: str | None = None
    industry: str | None = None
    default_timezone: str
    document_retention_days: int
    is_demo: bool


class UserPreferencesOut(ORMModel):
    theme: str
    email_notifications_enabled: bool
    notify_new_application: bool
    notify_interview_updates: bool
    notify_status_updates: bool
    notify_resume_analysis: bool
    default_timezone: str


class UserPreferencesUpdate(BaseModel):
    theme: Literal["system", "light", "dark"] | None = None
    email_notifications_enabled: bool | None = None
    notify_new_application: bool | None = None
    notify_interview_updates: bool | None = None
    notify_status_updates: bool | None = None
    notify_resume_analysis: bool | None = None
    default_timezone: str | None = Field(default=None, max_length=64)


class AuthenticatedUser(BaseModel):
    id: UUID
    email: str
    full_name: str
    account_type: str
    role: str
    is_verified: bool
    is_demo: bool
    demo_session_id: str | None = None
    organization: OrganizationSummary | None = None
    preferences: UserPreferencesOut


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: AuthenticatedUser


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    website: str | None = Field(default=None, max_length=255)
    industry: str | None = Field(default=None, max_length=120)
    default_timezone: str | None = Field(default=None, max_length=64)
    document_retention_days: int | None = Field(default=None, ge=30, le=1095)


class TeamMemberOut(BaseModel):
    id: UUID
    user_id: UUID
    full_name: str
    email: str
    role: str
    status: str
    title: str | None = None
    department: str | None = None
    created_at: datetime


class TeamInviteRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=160)
    email: EmailStr
    role: Literal["organization_owner", "recruiter", "hiring_manager"] = "recruiter"
    title: str | None = Field(default=None, max_length=120)
    department: str | None = Field(default=None, max_length=120)


class TeamMemberUpdateRequest(BaseModel):
    role: Literal["organization_owner", "recruiter", "hiring_manager"] | None = None
    status: Literal["active", "disabled"] | None = None
    title: str | None = Field(default=None, max_length=120)
    department: str | None = Field(default=None, max_length=120)
