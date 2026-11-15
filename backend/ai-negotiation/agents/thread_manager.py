from __future__ import annotations

import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from domain.ports.session_port import SessionPort
    from domain.ports.thread_port import ThreadPort

logger = logging.getLogger(__name__)


async def ensure_thread(
    session_id: str,
    session: dict,
    thread_tone: str | None,
    store: "SessionPort",
    thread_adapter: "ThreadPort",
) -> str | None:
    thread_id: str | None = session.get("thread_id")
    if thread_id:
        return thread_id

    supplier_id = session.get("supplier_id")
    user_id = session.get("user_id")
    if not supplier_id or not user_id:
        logger.warning(
            "ensure_thread: skipping thread creation for session=%s — "
            "missing supplier_id=%r or user_id=%r",
            session_id, supplier_id, user_id,
        )
        return None

    try:
        context = session.get("context")
        supplier_name = context.supplier.get("name", "Supplier") if context else "Supplier"
        thread = await thread_adapter.create_thread(
            supplier_id=supplier_id,
            user_id=user_id,
            title=f"Negotiation – {supplier_name}",
            tone=thread_tone,
        )
        thread_id = str(thread.uuid)
        await store.update(session_id, {"thread_id": thread_id})
        session["thread_id"] = thread_id
    except Exception as exc:
        logger.error("Failed to create thread session=%s: %s", session_id, exc)
        return None
    return thread_id
