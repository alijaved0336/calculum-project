"""Server-Sent Events helper: stream ProgressBroker events to a client.

Wraps a broker subscription in an ``EventSourceResponse`` (sse-starlette adds keep-alive
pings so the stream survives proxy/Cloud Run idle timeouts). Each event becomes one SSE
frame with the JSON payload in ``data:`` and the status as the ``event:`` type.
"""
from __future__ import annotations

import json

from fastapi import Request
from sse_starlette.sse import EventSourceResponse, ServerSentEvent

from infrastructure.session.progress_broker import ProgressBroker


def sse_response(broker: ProgressBroker, stream_id: str, request: Request) -> EventSourceResponse:
    async def event_source():
        async for event in broker.subscribe(stream_id):
            if await request.is_disconnected():
                break
            yield ServerSentEvent(data=json.dumps(event), event=event.get("status"))

    return EventSourceResponse(event_source())
