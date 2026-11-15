from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket
from pydantic import BaseModel
from starlette.websockets import WebSocketDisconnect, WebSocketState

from api.deps.auth import current_user, get_ws_user
from application.agent.support_agent import ThreadAccessError
from dependencies import get_support_agent
from domain.entities.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/support", tags=["support"])


def _log_state(name: str, payload: dict, *, level: int = logging.INFO) -> None:
    logger.log(
        level,
        "\n%s\nSTATE · %s\n%s\n%s",
        "=" * 78,
        name,
        "=" * 78,
        json.dumps(payload, indent=2, default=str),
    )


# How long to hold the socket open after the last frame, waiting for the CLIENT to close.
# Closing straight after the final send loses that frame in front of a proxy: measured on
# staging (Cloud Run), every `token` frame arrived but `done` was dropped on 5 of 6 turns —
# the connection ended 1006 (abnormal, no close handshake) tens of milliseconds after the
# last token, with the server-side turn fully completed and persisted. `done` is the frame
# that carries the reconciled clips, so losing it strands the client on scaffolding. Letting
# the client close first gives the proxy a chance to flush. Bounded, so a client that never
# closes cannot pin the connection open.
_CLOSE_LINGER_S = 5.0


class QueryRequest(BaseModel):
    question: str
    thread_id: str | None = None


def _to_payload(result) -> dict:
    return {
        "answer": result.answer,
        "sections": result.sections,
        "video_clips": result.video_clips,           # flattened union (back-compat)
        "document_sources": result.document_sources,  # flattened union (back-compat)
        "resolved": result.resolved,
        "sources": result.sources,
        "escalated": result.escalated,
        "thread_id": result.thread_id,
    }


@router.post("/query")
async def query(body: QueryRequest, user: User = Depends(current_user)) -> dict:
    """Single-turn grounded answer + deep-linked clip refs. Pass ``thread_id`` to continue
    a conversation (omit to start a new one — the response returns the new ``thread_id``)."""
    try:
        result = await get_support_agent().answer(body.question, user=user, thread_id=body.thread_id)
    except ThreadAccessError:
        raise HTTPException(status_code=404, detail="Thread not found.")
    return _to_payload(result)


async def _linger_for_client_close(ws: WebSocket, conn_id: str, thread_id: str | None) -> None:
    """Wait (briefly) for the client to close after the final frame — see ``_CLOSE_LINGER_S``.

    ``ws.receive()`` returns the client's ``websocket.disconnect`` as an ordinary message, so
    the normal path here is: client sees ``done`` → closes → this returns immediately. Best-
    effort: a timeout or an already-dead socket just falls through to the close below.

    Contract: this connection answers exactly ONE question. If the client sends a NEW message
    here instead of closing (e.g. a fast follow-up sent before it observed the socket close),
    ``receive()`` returns it like any other frame — there is no second turn to answer it with,
    so it is dropped. Logged (not silent) so a "my message vanished" report is diagnosable; the
    real fix is the client always waiting for close before sending the next question.
    """
    if ws.client_state != WebSocketState.CONNECTED:
        return
    try:
        msg = await asyncio.wait_for(ws.receive(), timeout=_CLOSE_LINGER_S)
        if msg.get("type") == "websocket.receive":
            logger.warning(
                "support_chat.linger_message_dropped conn_id=%s thread_id=%s",
                conn_id, thread_id,
            )
    except asyncio.TimeoutError:
        logger.info(
            "support_chat.linger_timeout conn_id=%s thread_id=%s linger_s=%.1f",
            conn_id, thread_id, _CLOSE_LINGER_S,
        )
    except Exception:
        logger.info("support_chat.linger_socket_gone conn_id=%s thread_id=%s", conn_id, thread_id)


@router.websocket("/chat")
async def chat(ws: WebSocket, token: str | None = Query(default=None)) -> None:
    """Streaming chat. First frame: ``{message, thread_id?}``. Forwards live
    {type:'token'} events, then {type:'attachments'} (clips/docs as soon as reconcile
    finishes), then {type:'done', metadata:{…, thread_id}}. Apply ``attachments`` the same
    way as ``done.metadata`` (``video_clips`` / ``document_sources`` / ``sections``)."""
    # A connection-scoped id so every log line for this socket is correlatable even before
    # thread_id is known (new conversation) or if the failure happens before any frame is sent.
    conn_id = uuid.uuid4().hex[:8]
    conn_start = time.monotonic()
    try:
        user = get_ws_user(ws, token)
    except Exception:
        logger.warning("support_chat.unauthenticated conn_id=%s", conn_id)
        await ws.close(code=1008)  # policy violation (unauthenticated)
        return
    await ws.accept()
    logger.info("support_chat.connected conn_id=%s user_id=%s", conn_id, getattr(user, "id", None))
    thread_id = None
    try:
        data = await ws.receive_json()
        question = (data or {}).get("message", "")
        thread_id = (data or {}).get("thread_id")
        logger.info(
            "support_chat.question_received conn_id=%s thread_id=%s question_len=%d",
            conn_id, thread_id, len(question),
        )
        try:
            event_count = 0
            last_event_type = None
            done_sent = False
            done_metadata = None
            async for event in get_support_agent().stream_answer(
                question, user=user, thread_id=thread_id
            ):
                last_event_type = event.get("type")
                await ws.send_json(event)
                event_count += 1
                if event.get("type") == "thread":
                    thread_id = event.get("thread_id") or thread_id
                elif event.get("type") == "done":
                    metadata = event.get("metadata") or {}
                    done_sent = True
                    done_metadata = metadata
                    logger.info(
                        "support_chat.done_sent conn_id=%s thread_id=%s resolved=%s escalated=%s "
                        "sections=%d video_clips=%d document_sources=%d sources=%d events=%d elapsed_s=%.2f",
                        conn_id, thread_id, metadata.get("resolved"), metadata.get("escalated"),
                        len(metadata.get("sections") or []), len(metadata.get("video_clips") or []),
                        len(metadata.get("document_sources") or []), len(metadata.get("sources") or []),
                        event_count, time.monotonic() - conn_start,
                    )
            if not done_sent:
                logger.error(
                    "support_chat.done_missing conn_id=%s thread_id=%s events=%d last_event_type=%s elapsed_s=%.2f",
                    conn_id, thread_id, event_count, last_event_type, time.monotonic() - conn_start,
                )
                _log_state("support_chat_done_missing", {
                    "reason": "stream_ended_without_done",
                    "conn_id": conn_id,
                    "thread_id": thread_id,
                    "events": event_count,
                    "last_event_type": last_event_type,
                    "elapsed_s": round(time.monotonic() - conn_start, 2),
                    "done_metadata": done_metadata,
                }, level=logging.ERROR)
            logger.info(
                "support_chat.stream_completed conn_id=%s thread_id=%s events=%d elapsed_s=%.2f",
                conn_id, thread_id, event_count, time.monotonic() - conn_start,
            )
        except ThreadAccessError:
            logger.warning("support_chat.thread_not_found conn_id=%s thread_id=%s", conn_id, thread_id)
            await ws.send_json({"type": "error", "data": "Thread not found."})
        except WebSocketDisconnect as exc:
            # The client navigated away / lost connection mid-stream. This is NOT a failure —
            # ws.send_json() raises this once the socket is gone (Starlette converts the OSError
            # from a dead connection into WebSocketDisconnect) — so it must be caught here,
            # ahead of the generic except below, or every ordinary disconnect gets logged as an
            # ERROR-level stream_failed traceback and buries genuine stalls in noise. No retry
            # send either: the socket is already gone, so it would just fail again.
            logger.info(
                "support_chat.client_disconnected conn_id=%s thread_id=%s last_event_type=%s code=%s reason=%s elapsed_s=%.2f",
                conn_id, thread_id, last_event_type, getattr(exc, "code", None),
                getattr(exc, "reason", None), time.monotonic() - conn_start,
            )
            _log_state("support_chat_done_missing", {
                "reason": "client_disconnected",
                "conn_id": conn_id,
                "thread_id": thread_id,
                "events": event_count,
                "last_event_type": last_event_type,
                "done_sent": done_sent,
                "disconnect_code": getattr(exc, "code", None),
                "disconnect_reason": getattr(exc, "reason", None),
                "application_state": getattr(ws.application_state, "name", str(ws.application_state)),
                "client_state": getattr(ws.client_state, "name", str(ws.client_state)),
                "elapsed_s": round(time.monotonic() - conn_start, 2),
            })
        except Exception as exc:
            # Any unexpected failure mid-stream (e.g. a stalled downstream call) must not just
            # drop the socket silently — the client would see a bare disconnect with no `done`
            # and no explanation. Surface it as a frame so the FE can show/retry instead of
            # hanging on stale scaffolding, and log full details (with elapsed time, so it's
            # obvious how far into the turn it got) for diagnosis.
            logger.exception(
                "support_chat.stream_failed conn_id=%s thread_id=%s last_event_type=%s elapsed_s=%.2f",
                conn_id, thread_id, last_event_type, time.monotonic() - conn_start,
            )
            _log_state("support_chat_done_missing", {
                "reason": "stream_exception",
                "conn_id": conn_id,
                "thread_id": thread_id,
                "events": event_count,
                "last_event_type": last_event_type,
                "done_sent": done_sent,
                "exception_type": type(exc).__name__,
                "exception": str(exc),
                "elapsed_s": round(time.monotonic() - conn_start, 2),
            }, level=logging.ERROR)
            try:
                await ws.send_json({"type": "error", "data": "Something went wrong. Please try again."})
            except Exception:
                logger.warning(
                    "support_chat.error_frame_send_failed conn_id=%s thread_id=%s", conn_id, thread_id
                )
        # The turn's last frame (`done`, or an error frame) has been sent. Do NOT close on its
        # heels — that is what loses it in front of the proxy. Let the client close first.
        await _linger_for_client_close(ws, conn_id, thread_id)
    except WebSocketDisconnect as exc:
        # Client disconnected before/while sending its first message — same non-failure case
        # as above, just outside the inner stream loop.
        logger.info(
            "support_chat.client_disconnected conn_id=%s thread_id=%s code=%s reason=%s elapsed_s=%.2f",
            conn_id, thread_id, getattr(exc, "code", None), getattr(exc, "reason", None),
            time.monotonic() - conn_start,
        )
        _log_state("support_chat_done_missing", {
            "reason": "client_disconnected_before_first_message",
            "conn_id": conn_id,
            "thread_id": thread_id,
            "disconnect_code": getattr(exc, "code", None),
            "disconnect_reason": getattr(exc, "reason", None),
            "application_state": getattr(ws.application_state, "name", str(ws.application_state)),
            "client_state": getattr(ws.client_state, "name", str(ws.client_state)),
            "elapsed_s": round(time.monotonic() - conn_start, 2),
        })
    finally:
        logger.info(
            "support_chat.disconnecting conn_id=%s thread_id=%s elapsed_s=%.2f",
            conn_id, thread_id, time.monotonic() - conn_start,
        )
        # Once WebSocketDisconnect has been raised — or the client closed during the linger
        # above — the socket is already marked disconnected, and calling close() again would
        # itself raise ("Cannot call send once a close message has been sent"), escaping
        # uncaught since finally isn't wrapped. Only close a socket that is still live on
        # BOTH sides, and swallow the race where it dies between the check and the call.
        if (
            ws.application_state == WebSocketState.CONNECTED
            and ws.client_state == WebSocketState.CONNECTED
        ):
            try:
                await ws.close()
            except Exception:
                logger.info("support_chat.close_failed conn_id=%s thread_id=%s", conn_id, thread_id)
