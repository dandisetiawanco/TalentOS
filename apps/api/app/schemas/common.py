from __future__ import annotations

from datetime import datetime
from typing import Generic, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    service: str
    database: str
    ai_provider: str
    email_configured: bool
    timestamp: datetime


class NotificationOut(ORMModel):
    id: UUID
    event_type: str
    title: str
    body: str
    link_url: str | None = None
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime


class ActivityLogOut(ORMModel):
    id: UUID
    actor_id: UUID | None = None
    actor_name: str | None = None
    entity_type: str
    entity_id: str
    action: str
    summary: str
    created_at: datetime
