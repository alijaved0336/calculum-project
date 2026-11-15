"""API-transport constants shared across routes."""
from __future__ import annotations

# SSE anti-buffering headers. no-transform stops CDNs/proxies from gzip-buffering
# the stream; X-Accel-Buffering covers nginx specifically.
SSE_HEADERS = {"Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no"}
SSE_MEDIA_TYPE = "text/event-stream"
