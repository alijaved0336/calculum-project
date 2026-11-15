from __future__ import annotations

from pydantic import BaseModel, Field


class ThreadRow(BaseModel):
    """A support chat thread owned by the authenticated user."""

    thread_id: str
    title: str | None = None
    message_count: int | None = None
    created_at: str | None = None
    updated_at: str | None = None


class ThreadListResponse(BaseModel):
    items: list[ThreadRow]
    total: int = Field(..., description="Total threads for the user (across all pages)")
    page: int
    page_size: int


class ChatMessageRow(BaseModel):
    message_id: str
    role: str
    content: str
    metadata: dict = Field(default_factory=dict)
    created_at: str | None = None


class ThreadMessagesResponse(BaseModel):
    thread_id: str
    title: str | None = None
    messages: list[ChatMessageRow]


class CreateThreadRequest(BaseModel):
    title: str | None = None


class UpdateThreadRequest(BaseModel):
    title: str


class DeleteThreadResponse(BaseModel):
    deleted: bool
    thread_id: str
