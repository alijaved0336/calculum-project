"""Support document library — list / search / paginate / get / remove-from-list.

Reads the general-document rows (``media_type='document'``) written by the ingestion
service. Document upload + parsing + indexing stays in the ingestion service; this
service manages the library. Every endpoint requires a valid calculum-tokenize JWT
(same auth model as the rest of the service — no role gating).
"""
from __future__ import annotations

import asyncio
import logging
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, Query

from api.deps.auth import current_user
from api.schemas.documents import (
    DeleteDocumentResponse,
    DocumentDownloadResponse,
    DocumentListResponse,
    DocumentRow,
)
from application.services.media_deleter import cascade_delete_media
from dependencies import get_document_store, get_signed_url, get_vector_store
from domain.entities.user import User
from infrastructure.storage.gcs_client import delete_object

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List support documents (search + pagination)",
    description=(
        "Paginated list of support documents, newest first. Optional case-insensitive "
        "search over title/filename via `q`. Requires an authenticated user."
    ),
)
async def list_documents(
    q: str | None = Query(default=None, description="Case-insensitive title/filename search"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=8, ge=1, le=100),
    _user: User = Depends(current_user),
) -> DocumentListResponse:
    # The admin library lists ALL documents (public and private). Access is still gated at
    # download time and in chat citations — only the listing is unrestricted here.
    items, total = await get_document_store().list_documents(q=q, page=page, page_size=page_size)
    return DocumentListResponse(
        items=[DocumentRow(**it) for it in items], total=total, page=page, page_size=page_size
    )


@router.get(
    "/{document_id}",
    response_model=DocumentRow,
    summary="Get a single support document row",
    responses={404: {"description": "Document not found"}, 422: {"description": "Malformed id"}},
)
async def get_document(document_id: str, user: User = Depends(current_user)) -> DocumentRow:
    try:
        uid = _uuid.UUID(document_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid document_id {document_id!r}.")
    doc = await get_document_store().get_document(uid)
    # Any admin may view any document row; a plain user only public ones (404 for private,
    # so it doesn't even leak that the document exists).
    if doc is None or (not doc.get("is_public") and not user.is_admin):
        raise HTTPException(404, f"Document {document_id!r} not found.")
    return DocumentRow(**doc)


@router.get(
    "/{document_id}/download",
    response_model=DocumentDownloadResponse,
    summary="Signed URL to download the original document file",
    description=(
        "Returns a short-lived signed GCS URL for the stored document file so the "
        "admin can download the original. Requires an authenticated user."
    ),
    responses={404: {"description": "Document (or its stored file) not found"}},
)
async def download_document(document_id: str, user: User = Depends(current_user)) -> DocumentDownloadResponse:
    try:
        uid = _uuid.UUID(document_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid document_id {document_id!r}.")
    doc = await get_document_store().get_document(uid)
    # Public documents are downloadable by anyone; private ones by any admin (tenant admin
    # or global). A plain user gets 404 for a private doc (not 403) so a shared link can't
    # even confirm the file exists.
    if doc is None or (not doc.get("is_public") and not user.is_admin):
        raise HTTPException(404, f"Document {document_id!r} not found.")
    gcs_object = (doc.get("metadata") or {}).get("gcs_object")
    if not gcs_object:
        raise HTTPException(404, "This document has no stored file to download.")
    url = await asyncio.to_thread(get_signed_url().sign, gcs_object)
    return DocumentDownloadResponse(
        document_id=document_id, download_url=url, filename=doc.get("filename")
    )


@router.delete(
    "/{document_id}",
    response_model=DeleteDocumentResponse,
    summary="Delete a document (file + chunks + row)",
    description=(
        "Permanently deletes the document: its Qdrant chunks, its GCS file, and its Postgres row. "
        "Idempotent — re-deleting a gone document returns 404."
    ),
    responses={404: {"description": "Document not found"}},
)
async def delete_document(document_id: str, _user: User = Depends(current_user)) -> DeleteDocumentResponse:
    try:
        uid = _uuid.UUID(document_id)
    except (ValueError, TypeError):
        raise HTTPException(422, f"Invalid document_id {document_id!r}.")
    store = get_document_store()
    doc = await store.get_document(uid)
    if doc is None:
        raise HTTPException(404, f"Document {document_id!r} not found.")
    await cascade_delete_media(
        uid, doc, vector_store=get_vector_store(),
        gcs_delete=delete_object, delete_row=store.delete_document,
    )
    return DeleteDocumentResponse(deleted=True, document_id=document_id)
