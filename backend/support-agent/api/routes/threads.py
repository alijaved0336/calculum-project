"""Support chat thread management — list / read / rename / delete the authenticated
user's own conversations. Every endpoint requires a valid JWT and enforces per-user
ownership (a thread that isn't yours is reported as 404, not 403, to avoid leaking existence).
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps.auth import current_user
from api.schemas.threads import (
    ChatMessageRow,
    CreateThreadRequest,
    DeleteThreadResponse,
    ThreadListResponse,
    ThreadMessagesResponse,
    ThreadRow,
    UpdateThreadRequest,
)
from application.services.clip_builder import sign_clips
from application.services.citations import redact_private_document_refs
from application.services.document_sources import gate_document_sources, hidden_document_sources
from dependencies import get_chat_store, get_document_store, get_signed_url
from domain.entities.user import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/support/threads", tags=["threads"])


async def _owned_thread(thread_id: str, user: User) -> dict:
    thread = await get_chat_store().get_thread(thread_id)
    if thread is None or thread.get("user_uuid") != user.id:
        raise HTTPException(status_code=404, detail=f"Thread {thread_id!r} not found.")
    return thread


@router.post("", response_model=ThreadRow, status_code=201, summary="Create a new chat thread")
async def create_thread(
    body: CreateThreadRequest, user: User = Depends(current_user)
) -> ThreadRow:
    """Start a new (empty) conversation and return its ``thread_id`` for the FE to use in
    subsequent ``POST /support/query`` / ``WS /support/chat`` calls. Title defaults to 'New chat'."""
    created = await get_chat_store().create_thread(user.id, title=(body.title or "New chat"))
    return ThreadRow(**{**created, "message_count": 0})


@router.get("", response_model=ThreadListResponse, summary="List my chat threads")
async def list_threads(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(current_user),
) -> ThreadListResponse:
    items, total = await get_chat_store().list_threads(user.id, page=page, page_size=page_size)
    return ThreadListResponse(
        items=[ThreadRow(**it) for it in items], total=total, page=page, page_size=page_size
    )


@router.get(
    "/{thread_id}/messages",
    response_model=ThreadMessagesResponse,
    summary="Get a thread's messages",
    responses={404: {"description": "Thread not found"}},
)
async def get_thread_messages(thread_id: str, user: User = Depends(current_user)) -> ThreadMessagesResponse:
    thread = await _owned_thread(thread_id, user)
    msgs = await get_chat_store().get_messages(thread_id)
    signer = get_signed_url().sign
    is_admin = user.is_global_admin
    # Gate citations by each document's CURRENT visibility (DB = source of truth), not the
    # snapshot stored in the message — a doc made private since the turn must disappear.
    cited_ids: set = set()
    for m in msgs:
        cited_ids |= _cited_doc_ids(m.get("metadata") or {})
    current_public = await get_document_store().public_flags(cited_ids) if cited_ids else {}
    rows = [ChatMessageRow(**_prepare_message(m, signer, is_admin, current_public)) for m in msgs]
    return ThreadMessagesResponse(thread_id=thread_id, title=thread.get("title"), messages=rows)


def _cited_doc_ids(meta: dict) -> set:
    """All document_ids cited by a stored message — across the sectioned format and the
    legacy flat format (older messages)."""
    ids = {d.get("document_id") for d in (meta.get("document_sources") or [])}
    for section in (meta.get("sections") or []):
        ids |= {d.get("document_id") for d in (section.get("document_sources") or [])}
    return ids


def _sign_and_gate(clips_docs: dict, signer, is_admin: bool, current_public: dict) -> dict:
    """Re-sign clip URLs (video names shown to all) and gate doc citations by current visibility.

    Also strips private-document titles/page cites from section ``text`` for non-admins, using
    the pre-gate source list so a doc flipped private since the turn is redacted too.
    """
    out = dict(clips_docs)
    if clips_docs.get("video_clips"):
        out["video_clips"] = sign_clips(clips_docs["video_clips"], signer)
    original_docs = list(clips_docs.get("document_sources") or [])
    if "document_sources" in clips_docs:
        gated = gate_document_sources(original_docs, is_admin, current_public)
        out["document_sources"] = gated
        if "text" in clips_docs and not is_admin:
            hidden = hidden_document_sources(original_docs, gated)
            out["text"] = redact_private_document_refs(clips_docs.get("text") or "", hidden, gated)
    return out


def _prepare_message(message: dict, signer, is_admin: bool, current_public: dict[str, bool]) -> dict:
    """Ready a stored message for replay: re-sign clip URLs (the originals expire) and hide
    private-document citations (cards AND inline title/page refs) from non-admins, per section.
    Citations are gated on the document's CURRENT visibility, so a doc made private after the
    turn is hidden. Handles both the sectioned format and the legacy flat format (older messages).
    """
    meta = message.get("metadata") or {}
    if not meta:
        return message
    # Original (ungated) sources — needed to redact ``content`` after sections are rewritten.
    all_original: list[dict] = list(meta.get("document_sources") or [])
    for section in (meta.get("sections") or []):
        all_original.extend(section.get("document_sources") or [])

    new_meta = dict(meta)
    if "sections" in new_meta:
        new_meta["sections"] = [
            _sign_and_gate(section, signer, is_admin, current_public)
            for section in (new_meta["sections"] or [])
        ]
    if "video_clips" in new_meta or "document_sources" in new_meta:  # legacy flat message
        new_meta.update(_sign_and_gate(new_meta, signer, is_admin, current_public))

    content = message.get("content")
    if content and not is_admin and all_original:
        gated = gate_document_sources(all_original, is_admin, current_public)
        hidden = hidden_document_sources(all_original, gated)
        content = redact_private_document_refs(content, hidden, gated)
        return {**message, "content": content, "metadata": new_meta}
    return {**message, "metadata": new_meta}


@router.patch(
    "/{thread_id}",
    response_model=ThreadRow,
    summary="Rename a thread",
    responses={404: {"description": "Thread not found"}},
)
async def rename_thread(
    thread_id: str, body: UpdateThreadRequest, user: User = Depends(current_user)
) -> ThreadRow:
    await _owned_thread(thread_id, user)
    await get_chat_store().rename_thread(thread_id, body.title)
    return ThreadRow(**await get_chat_store().get_thread(thread_id))


@router.delete(
    "/{thread_id}",
    response_model=DeleteThreadResponse,
    summary="Delete a thread",
    responses={404: {"description": "Thread not found"}},
)
async def delete_thread(thread_id: str, user: User = Depends(current_user)) -> DeleteThreadResponse:
    await _owned_thread(thread_id, user)
    await get_chat_store().delete_thread(thread_id)
    return DeleteThreadResponse(deleted=True, thread_id=thread_id)
