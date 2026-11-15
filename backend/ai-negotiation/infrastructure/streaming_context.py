from __future__ import annotations

import asyncio
import contextvars

# Set this context var before launching a graph task to receive streaming tokens.
# Each substantive node that calls complete(stream_to_client=True) will push its
# tokens into this queue.  A sentinel None signals that the node has finished
# streaming its response.
#
# INVARIANT — only ONE node per request may push tokens to this queue at a time.
# The negotiation graph is strictly sequential (intent_classifier → rag_query →
# one substantive node → END), so this holds today.  If parallel LangGraph
# branches are ever added and both stream, tokens from the two nodes will be
# interleaved in the queue and the client will receive garbled output.  Any node
# that streams MUST be the sole active streamer for that request.
active_stream_queue: contextvars.ContextVar[asyncio.Queue | None] = contextvars.ContextVar(
    "llm_active_stream_queue", default=None
)
