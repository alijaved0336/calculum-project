from __future__ import annotations

import asyncio
import json
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from domain.entities.ingestion import PlaybookStrategyType

from api.schemas.auth import AuthenticatedUser

from api.constants import SSE_HEADERS, SSE_MEDIA_TYPE
from api.schemas.ingest import (
    DeleteChunksResponse,
    AdabotIngestionLogResponse,
    IngestionLogsResponse,
    IngestionJobStatusResponse,
    SyncTriggerRequest, SyncTriggerResponse,
    UploadAcceptedResponse,
)
from application.notifications import HEARTBEAT
from dependencies import (
    get_api_ingestion_service,
    get_adabot_ingestion_log_store,
    get_global_platform_admin,
    get_current_user,
    get_delete_use_case,
    get_ingestion_job_store,
    get_ingest_use_case,
    get_pg_adapter,
    get_status_broker,
    get_storage,
)
from application.sso_user import ensure_sso_uploader
from domain.entities import FeedName

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ingest", tags=["ingestion"])
ingestion_logs_router = APIRouter(tags=["ingestion"])


def _build_extra_metadata(is_already_uploaded: bool, strategies: list[str], description: str | None) -> dict:
    return {"is_already_uploaded": is_already_uploaded,
            "playbook_strategy_type": strategies, "description": description}


def _dispatch(
    background_tasks: BackgroundTasks,
    storage_key: str,
    filename: str,
    uploaded_by_user_uuid: str,
    extra_metadata: dict | None = None,
    file_uuid: uuid.UUID | None = None,
) -> UploadAcceptedResponse:
    file_id = str(file_uuid) if file_uuid else str(uuid.uuid4())
    job_id = str(uuid.uuid4())
    use_case = get_ingest_use_case()
    use_case.create_job(job_id, file_id, storage_key, filename)
    background_tasks.add_task(
        use_case.execute, job_id, storage_key, file_id, filename,
        uploaded_by_user_uuid, extra_metadata or {},
    )
    return UploadAcceptedResponse(job_id=job_id, file_id=file_id, status="pending",
                                  status_url=f"/ingest/jobs/{job_id}",
                                  events_url=f"/ingest/files/{file_id}/events")


@ingestion_logs_router.get("/ingestion-logs", response_model=IngestionLogsResponse)
async def get_ingestion_logs(
    _: AuthenticatedUser = Depends(get_global_platform_admin),
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    """Return a page of scheduler ingestion logs, newest first."""
    items, total = await get_adabot_ingestion_log_store().get_adabot_ingestion_logs(limit, offset)
    return {"items": items, "total": total}


@router.post("/upload", status_code=202, response_model=UploadAcceptedResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile,
    is_already_uploaded: bool = Form(default=False),
    strategy_term_extension: bool = Form(default=False, description="Include term-extension"),
    strategy_term_extension_scf: bool = Form(default=False, description="Include term-extension-scf"),
    description: str | None = Form(default=None),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UploadAcceptedResponse:
    """Upload document for background ingestion."""
    accepted_exts = {".pdf", ".docx", ".doc", ".txt"}
    suffix = Path(file.filename or "").suffix.lower()
    if not file.filename or suffix not in accepted_exts:
        raise HTTPException(422, f"Unsupported file type. Supported: {sorted(accepted_exts)}")

    if not current_user.user_id:
        raise HTTPException(401, "Token missing user identifier (sub/user_id).")

    # Ada/Azure users have no `users` row, which kb_documents.uploaded_by_user_uuid needs.
    await ensure_sso_uploader(
        get_pg_adapter().sessionmaker(),
        user_id=current_user.user_id,
        email=current_user.email,
        display_name=current_user.display_name,
        role=current_user.role,
    )

    file_uuid = uuid.uuid4()
    key = f"{file_uuid}/{Path(file.filename).name}"  # Path.name strips any client-supplied path
    storage = get_storage()
    await asyncio.to_thread(storage.upload, key, await file.read(), file.content_type)

    strategies = []
    if strategy_term_extension:
        strategies.append(PlaybookStrategyType.TERM_EXTENSION.value)
    if strategy_term_extension_scf:
        strategies.append(PlaybookStrategyType.TERM_EXTENSION_SCF.value)

    try:
        return _dispatch(background_tasks, key, file.filename, current_user.user_id,
                         extra_metadata=_build_extra_metadata(is_already_uploaded, strategies, description),
                         file_uuid=file_uuid)
    except Exception:
        await asyncio.to_thread(storage.delete, str(file_uuid))
        raise


@router.delete("/documents/{file_uuid}", response_model=DeleteChunksResponse)
async def delete(
    file_uuid: uuid.UUID,
    _: AuthenticatedUser = Depends(get_current_user),
) -> DeleteChunksResponse:
    if not await get_delete_use_case().delete_document(file_uuid):
        raise HTTPException(404, f"Document {file_uuid!s} not found.")
    return DeleteChunksResponse(deleted=True, file_uuid=str(file_uuid), status="Deleted")


@router.get("/files/{file_uuid}/events")
async def stream_file_events(
    file_uuid: uuid.UUID,
    _: AuthenticatedUser = Depends(get_current_user),
) -> StreamingResponse:
    """SSE stream of ingestion-status updates; closes on terminal state (completed/failed).

    Starlette cancels this generator when the client disconnects, which runs the
    broker's subscription cleanup; the heartbeat keeps idle connections alive.
    """
    broker = get_status_broker()

    async def event_stream():
        yield "retry: 3000\n\n"
        async for item in broker.subscribe(str(file_uuid)):
            yield ": ping\n\n" if item is HEARTBEAT else f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(event_stream(), media_type=SSE_MEDIA_TYPE, headers=SSE_HEADERS)


@router.get("/jobs/{job_id}", response_model=IngestionJobStatusResponse)
def get_ingestion_job_status(
    job_id: str,
    _: AuthenticatedUser = Depends(get_current_user),
) -> IngestionJobStatusResponse:
    """Return status and chunks written for an ingestion job."""
    job = get_ingestion_job_store().get(job_id)
    if not job:
        raise HTTPException(404, f"Job {job_id!r} not found.")
    return IngestionJobStatusResponse(
        job_id=job.job_id, file_id=job.file_id, file_name=job.file_name,
        status=job.status, chunks_written=job.chunks_written, error=job.error,
    )


@router.post("/sync", response_model=SyncTriggerResponse)
async def trigger_sync(
    body: SyncTriggerRequest,
    _: AuthenticatedUser = Depends(get_global_platform_admin),
):
    """Manually trigger an API delta pull."""
    svc = get_api_ingestion_service()
    feed = None
    if body.feed:
        try:
            feed = FeedName(body.feed)
        except ValueError:
            raise HTTPException(422, f"Unknown feed {body.feed!r}. Valid: {[f.value for f in FeedName]}")
    log_uuid = await svc.start_scheduled_sync_log()
    results: dict = {}
    try:
        if feed is not None:
            stats = await svc.sync_feed(feed)
            results = {feed.value: stats}
        else:
            results = await svc.sync_all()
        await svc.finish_scheduled_sync_log(log_uuid, results)
        return SyncTriggerResponse(results={k: v.rows_written for k, v in results.items()})
    except Exception as exc:
        await svc.finish_scheduled_sync_log(log_uuid, results, str(exc) or "sync failed")
        raise
