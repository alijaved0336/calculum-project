from __future__ import annotations
import asyncio
import base64
import contextvars
import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING

from fastapi import APIRouter, Depends, HTTPException, Query, Response, WebSocket, WebSocketDisconnect
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.schemas.auth import TenantListResponse, TenantOption
from api.schemas.negotiation import (
    ChatMessageSchema,
    ThreadPinResponse,
    EditMessageRequest,
    RagSourceSchema,
    SavePlaybookRequest,
    SavePlaybookResponse,
    ThreadSummaryResponse,
    MessageRequest,
    MessageResponse,
    StartSessionRequest,
    StartSessionResponse,
    SupplierListResponse,
    ThreadListResponse,
    ThreadMessagesResponse,
    ThreadSummarySchema,
    TimingSchema,
    UpdateThreadRequest,
    UpdateThreadResponse,
    UsageSchema,
    thread_list_item,
)
from api.schemas.auth import AuthenticatedUser
from api.mappers.settings import prompt_instruction_map, session_settings_snapshot
from utils.prompts.prompt_instructions import (
    extract_active_instructions,
    merge_prompt_instructions,
)
from dependencies import (
    get_current_user_any,
    get_current_user_ws,
    get_graph,
    get_llm,
    get_pg_settings_adapter,
    get_pg_supplier_adapter,
    get_pg_thread_adapter,
    get_rag_service,
    get_session_by_id,
    get_session_store,
)
from domain.ports.settings_port import SettingsPort
from infrastructure.database.connection import get_db_session
from infrastructure.postgres.models import Tenant, User
from config import settings
from domain.entities.intent import Intent
from application.services.thread_summariser import summarise_thread, maybe_apply_thread_title
from application.services.session_initialiser import initialise_session
from application.services.sso_user_provisioner import ensure_sso_user
from application.services.override_store import clear_session, get_overrides
from domain.services.brief_builder import build_negotiation_brief
from domain.services.negotiation_overrides import resolve_overridden_context
from agents.state import NegotiationState
from agents.thread_manager import ensure_thread
from utils.playbook_pdf import (
    PlaybookPdfUnavailableError,
    build_playbook_pdf_bytes,
)
from infrastructure.storage.gcs_playbook_storage import (
    PlaybookStorageConfigurationError,
    PlaybookStorageError,
    get_playbook_storage,
    is_playbook_storage_enabled,
)
from agents.nodes.follow_up_generator import generate_follow_ups, safe_fallback_follow_ups
from utils.prompts.follow_up_suggestions_prompt import strip_scf_follow_ups
from domain.services.agent_capabilities import STRATEGY_INTENTS
from domain.services.improvement_opportunity import (
    has_improvement_opportunity,
    thin_opportunity_warning,
)
from domain.services.scf_analysis import resolve_scf_viability
from domain.services.scf_policy import (
    enforce_scf_output_policy,
    filter_scf_from_instructions,
    resolve_turn_scf_enabled,
    sanitize_context_for_mode,
    strip_scf_offer_claims,
)
from utils.constants import collect_supplier_data_sources
from utils.prompts.supplier_summary import attach_summary_card, extract_summary_card
from infrastructure.observability.langfuse_tracing import trace_turn
from infrastructure.streaming_context import active_stream_queue

if TYPE_CHECKING:
    from domain.ports.llm_port import LLMPort
    from domain.ports.session_port import SessionPort
    from domain.ports.supplier_data_port import SupplierDataPort

logger = logging.getLogger(__name__)
router = APIRouter(tags=["negotiation"])
_WORD_CHUNK = re.compile(r"\S+\s*")


def _chunk_text(text: str) -> list[str]:
    """Split an already-complete reply into word-sized pieces for streaming."""
    return _WORD_CHUNK.findall(text) or [text]


def _turn_brief_state(context, scf_enabled: bool) -> dict:
    """The turn's brief, computed ONCE, as a graph-state fragment.

    Built from the RESOLVED context (overrides applied, SCF stripped when the
    turn disallows it), so every node reasons from the same arguments and the
    same posture instead of each prompt re-deriving them — see
    ``NegotiationState.brief``.

    Returns the brief plus the bundle key it is also carried under, so the
    state schema keeps speaking the shape it always has.
    """
    brief = build_negotiation_brief(context, scf_enabled=scf_enabled)
    if brief is None:
        return {"brief": None, "argument_analysis": {}}

    # Where the bundle came from. It should be the SAME object the context
    # resolved (context_builder at session start, rebuilt by
    # `resolve_overridden_context` when the negotiator overrides the target) —
    # "rebuilt from facts" here means the context reached the turn without it.
    logger.debug(
        "turn: argument_analysis=%s",
        "from context"
        if brief.arguments is context.argument_analysis
        else "rebuilt from facts",
    )
    return {"brief": brief, **brief.state_views()}


def _turn_scf_and_context(session: dict, selected_strategy: str | None, session_id: str):
    """Active Goal ∩ tenant ceiling → the turn's SCF gates, context, instructions.

    Two gates come back, not one. ``scf_enabled`` is whether the programme
    exists for this turn at all; ``scf_offerable`` is whether it can be put in
    front of THIS supplier — enabled AND offerable on rate. Everything that
    merely reports the programme to the negotiator keys off the first; anything
    that would OFFER it keys off the second.

    Also layers on any negotiator-set target/walkaway overrides for this session
    (see application.services.override_store) so every intent this turn reasons
    over the negotiator's chosen numbers rather than the calculated defaults.
    """
    scf_enabled = resolve_turn_scf_enabled(
        selected_strategy,
        session_scf_enabled=bool(session.get("scf_enabled", False)),
    )
    context = session.get("context")
    instructions = list(session.get("prompt_instructions") or [])
    if not scf_enabled:
        if context is not None:
            context = sanitize_context_for_mode(context)
    if context is not None:
        context = resolve_overridden_context(context, get_overrides(session_id))

    # Resolved AFTER the overrides, from the same context every node reasons
    # over. `resolve_scf_viability` is fail-closed on `scf_enabled`, so a
    # session without the programme can never come back offerable.
    scf_offerable = context is not None and context.facts is not None and (
        resolve_scf_viability(
            context.facts, context.argument_analysis, scf_enabled=scf_enabled
        )
        is not None
    )
    # An operator rule that says "offer SCF" is unfollowable when SCF cannot be
    # offered here, and it is injected into EVERY node's prompt — so it, not the
    # data, was what kept SCF in the advice after the figures were gone.
    if not scf_offerable:
        instructions = filter_scf_from_instructions(instructions, False)
        if scf_enabled and context is not None:
            context = strip_scf_offer_claims(context)
            logger.info(
                "scf: enabled for the turn but not offerable to this supplier "
                "session=%s — SCF operator rules and offer claims filtered",
                session_id,
            )
    return scf_enabled, scf_offerable, context, instructions


def _turn_opportunity(context) -> tuple[bool, int | None]:
    """(has_opportunity, current_term_days) for follow-up gating.

    Uses the SAME `context` (post-override) the graph itself reasons over —
    see `_turn_scf_and_context` — so this reflects any target/walkaway
    override the negotiator has already applied this session, exactly like
    the graph's own `_has_improvement_opportunity` gate does.
    """
    facts = getattr(context, "facts", None) if context is not None else None
    return has_improvement_opportunity(facts), getattr(facts, "current_term_days", None)


def _turn_opportunity_warning(context, intent, blocked_by: str | None) -> str | None:
    """The thin-opportunity notice for this turn, or None (§2).

    Shown only on a strategy turn that actually produced its output — a
    blocked turn already says why in its own message. It travels BESIDE the
    response (``opportunity_warning``) and is never merged into the generated
    text: that text is the playbook or a supplier-facing draft.
    """
    if blocked_by or intent not in STRATEGY_INTENTS:
        return None
    facts = getattr(context, "facts", None) if context is not None else None
    return thin_opportunity_warning(facts)


def _playbook_owner_id(user: AuthenticatedUser) -> str:
    if not user.user_id:
        raise HTTPException(status_code=403, detail="User ID is required")
    try:
        return str(uuid.UUID(user.user_id))
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid user ID")


async def _can_view_data_inputs(
    user: AuthenticatedUser,
    settings_port: SettingsPort,
) -> bool:
    """Resolve the effective Data Inputs permission for persisted messages."""
    # TEMPORARY: Data Inputs shown to all users regardless of role or tenant setting.
    return True


def _playbook_object_name(
    playbook_id: str,
    user: AuthenticatedUser,
) -> str | None:
    try:
        normalized_playbook_id = str(uuid.UUID(playbook_id))
    except ValueError:
        return None
    owner_id = _playbook_owner_id(user)
    return get_playbook_storage().object_name(
        owner_id,
        normalized_playbook_id,
    )


@router.get("/tenants", response_model=TenantListResponse)
async def list_tenants(
    _: AuthenticatedUser = Depends(get_current_user_any),
    session: AsyncSession = Depends(get_db_session, use_cache=False),
):
    rows = (
        await session.execute(select(Tenant).order_by(Tenant.name))
    ).scalars().all()
    return TenantListResponse(tenants=[
        TenantOption(
            tenant_uuid=tenant.uuid,
            tenant_id=tenant.tenant_id,
            tenant_name=tenant.name,
            country=tenant.country,
        )
        for tenant in rows
    ])


@router.get("/suppliers", response_model=SupplierListResponse)
async def list_suppliers(
    tenant_id: str,
    limit: int = Query(200, ge=1, le=200),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None, max_length=200),
    _: AuthenticatedUser = Depends(get_current_user_any),
    adapter: SupplierDataPort = Depends(get_pg_supplier_adapter),
):
    return SupplierListResponse(
        suppliers=await adapter.list_suppliers(
            tenant_id=tenant_id,
            limit=limit,
            offset=offset,
            search=search,
        )
    )


_WS_OUTPUT_DIR = Path("logs/ws_negotiation_chat")
_RULE = "-" * 88


def _not_implemented_message(intent: Intent | None) -> str:
    label = intent.value.replace("_", " ") if intent else "this request"
    return (
        f"Support for {label} isn't implemented yet in this assistant. "
        "I can currently help with generating a negotiation guide, running "
        "term-change scenarios, summarizing a supplier's position, answering "
        "data questions about this supplier, handling supplier pushback, "
        "recommending an opening strategy, and explaining recommendations."
    )


_GRAPH_FAILURE_MESSAGE = (
    "Sorry — something went wrong while generating this response. "
    "Please try again."
)


async def _invoke_graph_traced(
    graph, graph_state: NegotiationState, *, channel: str, user_id: str | None
) -> dict:
    """Run the graph under one Langfuse turn trace (a plain ainvoke when tracing is off).

    Every model call, retrieval span and email-agent call inside the graph nests
    under this trace, and turns are grouped by session in Langfuse. Must run on
    the task that invokes the graph so the span is the current context there.
    """
    def _plain(value):
        return getattr(value, "value", value)

    def _jsonable(value):
        # Langfuse's serializer writes a Decimal as the literal "<Decimal>", and
        # payload figures can be Decimals — stringify them instead of losing them.
        try:
            return json.loads(json.dumps(value, default=str))
        except (TypeError, ValueError):
            return str(value)

    # The turn's context on the root span, so it reads at a glance. The exact
    # prompts each node built from it are on the nested `llm:<node>` generations.
    async with trace_turn(
        name="negotiation_turn",
        session_id=graph_state.get("session_id"),
        user_id=user_id,
        input={
            "message": graph_state.get("message"),
            "supplier_payload": _jsonable(getattr(graph_state.get("context"), "raw", None)),
            "prompt_instructions": _jsonable(graph_state.get("prompt_instructions")),
            "conversation_history": graph_state.get("conversation_history"),
        },
        metadata={
            "channel": channel,
            "supplier_id": graph_state.get("supplier_id"),
            "tenant_id": graph_state.get("tenant_id"),
            "selected_tone": _plain(graph_state.get("selected_tone")),
            "scf_enabled": graph_state.get("scf_enabled"),
        },
    ) as turn:
        result = await graph.ainvoke(graph_state)
        rag_context = result.get("rag_context")
        turn.update(
            output={
                "response": result.get("response"),
                "intent": _plain(result.get("intent")),
                "blocked_by": _plain(result.get("blocked_by")),
                "rag_status": getattr(rag_context, "status", None),
                "rag_chunks": getattr(rag_context, "chunk_count", None),
                "errors": result.get("errors"),
            }
        )
        return result


async def _generate_follow_ups_traced(
    *args, session_id: str | None, user_id: str | None, **kwargs
) -> list[str]:
    """`generate_follow_ups` in its own `follow_ups` trace, in the turn's session.

    Follow-ups run after the turn trace has closed (on WS, as a background task),
    so without this their model call lands as a detached root `llm` trace.
    """
    async with trace_turn(name="follow_ups", session_id=session_id, user_id=user_id) as turn:
        follow_ups = await generate_follow_ups(*args, **kwargs)
        turn.update(output=follow_ups)
        return follow_ups


def _fallback_response(result: dict) -> str:
    """Never surface a blank assistant reply.

    Nodes that fail defensively return ``response=None`` plus an ``errors``
    entry (see the nodes' except blocks) — tell the user it failed rather
    than claiming the intent isn't implemented. A None response *without*
    errors means the intent genuinely has no node yet.
    """
    if result.get("errors"):
        return _GRAPH_FAILURE_MESSAGE
    return _not_implemented_message(result.get("intent"))


def _response_text(result: dict) -> str:
    """The reply body, falling back only when the graph produced no reply.

    A supplier summary lives on its card: the small (key facts) tier always
    leaves the body empty, and the large tier does when no argument has a day
    value. An empty body next to a card is a complete reply, not a missing one.
    """
    response = result.get("response")
    if response:
        return response
    if response is not None and result.get("summary_card"):
        return ""
    return _fallback_response(result)


# The chat client opens the reply bubble on its first NON-empty token and hangs
# the `done` event's card on it; a card-only reply streams this so the bubble
# exists. The client trims a carded body, and the persisted copy drops it.
_CARD_ONLY_TOKEN = "\n"


def _write_ws_output(
    session_id: str,
    user_message: str,
    intent: object,
    response_text: str,
    source: dict[str, dict[str, object]] | None,
) -> None:
    """Append the full (non-chunked) exchange to a per-session text file.

    The WS client receives the response token-by-token, which is hard to
    read back while testing. This writes the assembled response in one
    place so the full exchange can be inspected after the fact.
    """
    _WS_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = _WS_OUTPUT_DIR / f"{session_id}.txt"
    with path.open("a", encoding="utf-8") as f:
        f.write(f"\n{_RULE}\n")
        f.write(f"timestamp: {datetime.now(timezone.utc).isoformat()}\n")
        f.write(f"intent: {intent.value if intent else None}\n")
        f.write(f"{_RULE}\n")
        f.write(f"USER:\n{user_message}\n")
        f.write(f"{_RULE}\n")
        f.write(f"ASSISTANT:\n{response_text}\n")
        if source:
            f.write(f"{_RULE}\n")
            f.write(f"SOURCE:\n{source}\n")
        f.write(f"{_RULE}\n")


# ── Session Start ─────────────────────────────────────────────────────────────

@router.post("/session/start", response_model=StartSessionResponse)
async def start_session(
    body: StartSessionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user_any),
    store: SessionPort = Depends(get_session_store),
    adapter: SupplierDataPort = Depends(get_pg_supplier_adapter),
    thread_adapter=Depends(get_pg_thread_adapter),
    settings_port: SettingsPort = Depends(get_pg_settings_adapter),
    db: AsyncSession = Depends(get_db_session, use_cache=False),
):
    session_id = str(uuid.uuid4())

    user_id = body.user_id or current_user.user_id
    if user_id and user_id == current_user.user_id:
        await ensure_sso_user(
            db,
            user_id=user_id,
            email=current_user.email,
            display_name=current_user.display_name,
            role=current_user.role,
            tenant_slug=body.tenant_id or current_user.tenant_id,
        )

    init = await initialise_session(
        body.supplier_id, body.tenant_id, adapter, thread_adapter, settings_port
    )
    previous_threads = [thread_list_item(t, count, s) for t, count, s in init.previous_thread_rows]

    merged_pi = None
    if init.settings_bundle:
        tenant = init.settings_bundle.tenant_record
        merged_pi = merge_prompt_instructions(
            init.settings_bundle.global_record.prompt_instructions,
            tenant.prompt_instructions if tenant else None,
        )
    # When SCF is off, strip SCF directives from operator instructions — these
    # are injected into every node's prompt and would otherwise override all
    # other gating (e.g. the seeded "Offer SCF as a mitigation" rule).
    active_instructions = filter_scf_from_instructions(
        extract_active_instructions(merged_pi),
        init.scf_enabled,
    )

    # TEMPORARY: Data Inputs shown to all users regardless of role or tenant setting.
    can_view_data_inputs = True
    display_name: str | None = None
    if user_id:
        try:
            row = (await db.execute(
                select(User.display_name, User.email).where(User.uuid == uuid.UUID(user_id))
            )).one_or_none()
            if row:
                display_name = row[0] or row[1]
        except Exception:
            logger.warning("Failed to resolve display_name for user_id=%s", user_id)

    await store.create(session_id, {
        "_auth_user": current_user,  # used by get_current_user_ws session-identity fallback
        "user_id": user_id,
        "user_name": display_name,
        "tenant_id": body.tenant_id,
        "supplier_id": body.supplier_id,
        "thread_id": None,
        "context": init.context,
        # The session-start view of the brief's two computed bundles. Each turn
        # rebuilds the brief from the RESOLVED context (an override moves the
        # ask, and everything derived from it) — these are kept so the opening
        # state is inspectable without sending a message.
        **init.bundle_views,
        "prompt_instructions": active_instructions,
        "scf_enabled": init.scf_enabled,
        "can_view_data_inputs": can_view_data_inputs,
    })

    settings_snap = (
        session_settings_snapshot(
            init.settings_bundle,
            can_view_data_inputs=can_view_data_inputs,
        )
        if init.settings_bundle
        else None
    )
    if settings_snap and merged_pi:
        settings_snap.prompt_instructions = prompt_instruction_map(merged_pi)

    response = StartSessionResponse(
        session_id=session_id,
        data=init.supplier_data if init.supplier_data else None,
        previous_threads=previous_threads,
        settings=settings_snap,
        starter_questions=init.starter_questions,
    )
    return response


# ── Supplier threads ──────────────────────────────────────────────────────────

@router.get("/suppliers/{supplier_id}/threads", response_model=ThreadListResponse)
async def get_supplier_threads(
    supplier_id: str,
    _: AuthenticatedUser = Depends(get_current_user_any),
    thread_adapter=Depends(get_pg_thread_adapter),
):
    rows = await thread_adapter.get_threads_by_supplier(supplier_id)
    return ThreadListResponse(
        threads=[thread_list_item(t, count, s) for t, count, s in rows]
    )


# ── Thread update ─────────────────────────────────────────────────────────────

@router.patch("/threads/{thread_id}", response_model=UpdateThreadResponse)
async def update_thread(
    thread_id: str,
    body: UpdateThreadRequest,
    _: AuthenticatedUser = Depends(get_current_user_any),
    thread_adapter=Depends(get_pg_thread_adapter),
):
    if body.title is None and body.pinned is None and body.reaction is None:
        raise HTTPException(status_code=422, detail="At least one of 'title', 'pinned' or 'reaction' must be provided")
    try:
        thread = await thread_adapter.update_thread(
            thread_id, title=body.title, pinned=body.pinned, reaction=body.reaction
        )
    except ValueError:
        raise HTTPException(status_code=404, detail="Thread not found")
    return UpdateThreadResponse(
        thread_id=str(thread.uuid),
        title=thread.title,
        pinned=thread.pinned,
        reaction=thread.reaction,
        updated_at=thread.updated_at,
    )


@router.delete("/threads/{thread_id}", status_code=204)
async def delete_thread(
    thread_id: str,
    _: AuthenticatedUser = Depends(get_current_user_any),
    thread_adapter=Depends(get_pg_thread_adapter),
):
    try:
        await thread_adapter.delete_thread(thread_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Thread not found")


# ── Thread messages ───────────────────────────────────────────────────────────

@router.patch("/{thread_id}/messages/{message_id}", response_model=ThreadMessagesResponse)
async def edit_message(
    thread_id: str,
    message_id: str,
    body: EditMessageRequest,
    user: AuthenticatedUser = Depends(get_current_user_any),
    thread_adapter=Depends(get_pg_thread_adapter),
    settings_port: SettingsPort = Depends(get_pg_settings_adapter),
):
    try:
        messages = await thread_adapter.edit_message(thread_id, message_id, body.updated_content)
    except ValueError:
        raise HTTPException(status_code=404, detail="Message not found in the specified thread")
    summary = await thread_adapter.get_latest_summary(thread_id)
    thread = await thread_adapter.get_thread(thread_id)
    can_view_data_inputs = await _can_view_data_inputs(user, settings_port)
    return ThreadMessagesResponse(
        thread_id=thread_id,
        pinned=bool(thread.pinned) if thread else False,
        messages=[
            ChatMessageSchema(
                message_id=str(m.uuid),
                role=m.role.value,
                content=m.content,
                tokens_in=m.tokens_in,
                tokens_out=m.tokens_out,
                source=m.source if can_view_data_inputs else None,
                rag_sources=m.rag_sources if can_view_data_inputs else None,
                created_at=m.created_at,
            )
            # Empty AI rows are stop-before-reply leftovers; hide them on reload.
            for m in messages
            if m.role.value != "ai" or (m.content or "").strip()
        ],
        latest_summary=ThreadSummarySchema(
            content=summary.content,
            created_at=summary.created_at,
            thread_name=getattr(summary, "thread_name", None),
        ) if summary else None,
    )


@router.get("/{thread_id}/messages", response_model=ThreadMessagesResponse)
async def get_thread_messages(
    thread_id: str,
    session_id: str | None = None,
    user: AuthenticatedUser = Depends(get_current_user_any),
    store: "SessionPort" = Depends(get_session_store),
    thread_adapter=Depends(get_pg_thread_adapter),
    settings_port: SettingsPort = Depends(get_pg_settings_adapter),
):
    messages = await thread_adapter.get_messages(thread_id)
    summary = await thread_adapter.get_latest_summary(thread_id)
    thread = await thread_adapter.get_thread(thread_id)
    can_view_data_inputs = await _can_view_data_inputs(user, settings_port)

    # When session_id is provided, opening a previous thread makes it the
    # session's ACTIVE thread so the next WS message continues it.
    if thread is not None and session_id:
        await store.update(session_id, {"thread_id": thread_id})

    return ThreadMessagesResponse(
        thread_id=thread_id,
        pinned=bool(thread.pinned) if thread else False,
        messages=[
            ChatMessageSchema(
                message_id=str(m.uuid),
                role=m.role.value,
                content=m.content,
                tokens_in=m.tokens_in,
                tokens_out=m.tokens_out,
                source=m.source if can_view_data_inputs else None,
                rag_sources=m.rag_sources if can_view_data_inputs else None,
                created_at=m.created_at,
            )
            # Empty AI rows are stop-before-reply leftovers; hide them on reload.
            for m in messages
            if m.role.value != "ai" or (m.content or "").strip()
        ],
        latest_summary=ThreadSummarySchema(
            content=summary.content,
            created_at=summary.created_at,
            thread_name=getattr(summary, "thread_name", None),
        ) if summary else None,
    )


@router.post("/{thread_id}/summary/pin", response_model=ThreadPinResponse)
async def pin_thread_summary(
    thread_id: str,
    _: AuthenticatedUser = Depends(get_current_user_any),
    thread_adapter=Depends(get_pg_thread_adapter),
):
    thread = await thread_adapter.set_thread_pinned(thread_id, True)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return ThreadPinResponse(thread_id=str(thread.uuid), pinned=thread.pinned)


@router.delete("/{thread_id}/summary/pin", response_model=ThreadPinResponse)
async def unpin_thread_summary(
    thread_id: str,
    _: AuthenticatedUser = Depends(get_current_user_any),
    thread_adapter=Depends(get_pg_thread_adapter),
):
    thread = await thread_adapter.set_thread_pinned(thread_id, False)
    if thread is None:
        raise HTTPException(status_code=404, detail="Thread not found")
    return ThreadPinResponse(thread_id=str(thread.uuid), pinned=thread.pinned)


# ── Playbook GCS save ────────────────────────────────────────────────────────

@router.post("/playbooks/save", response_model=SavePlaybookResponse)
async def save_playbook(
    body: SavePlaybookRequest,
    user: AuthenticatedUser = Depends(get_current_user_any),
):
    created_at = datetime.now(timezone.utc)
    playbook_id = str(uuid.uuid4())

    try:
        pdf = await build_playbook_pdf_bytes(body)
    except PlaybookPdfUnavailableError as exc:
        logger.warning("Playbook PDF renderer unavailable: %s", exc)
        raise HTTPException(status_code=503, detail=str(exc))

    pdf_url: str | None = None
    if is_playbook_storage_enabled():
        try:
            object_name = _playbook_object_name(playbook_id, user)
            assert object_name is not None
            storage = get_playbook_storage()
            await storage.upload_pdf(object_name, pdf)
            pdf_url = await storage.create_download_url(
                object_name,
                filename=f"{playbook_id}.pdf",
            )
            logger.info("Saved playbook PDF to GCS id=%s object=%s", playbook_id, object_name)
        except (PlaybookStorageConfigurationError, PlaybookStorageError):
            # ponytail: rotated SA keys etc.; PDF bytes are already in hand.
            logger.warning("Playbook GCS unavailable; returning inline PDF", exc_info=True)
    else:
        logger.debug("Playbook GCS disabled; returning inline PDF for download")

    if pdf_url is None:
        pdf_url = "data:application/pdf;base64," + base64.standard_b64encode(pdf).decode("ascii")
    return SavePlaybookResponse(
        playbook_id=playbook_id,
        pdf_url=pdf_url,
        created_at=created_at,
    )


# ── Thread summary ──────────────────────────────────────────────────────

@router.post(
    "/{session_id}/summary",
    response_model=ThreadSummaryResponse,
)
async def generate_thread_summary(
    session_id: str,
    _: AuthenticatedUser = Depends(get_current_user_any),
    llm: LLMPort = Depends(get_llm),
    session: dict = Depends(get_session_by_id),
    thread_adapter=Depends(get_pg_thread_adapter),
):
    thread_id = session.get("thread_id")
    if not thread_id:
        raise HTTPException(
            status_code=404,
            detail="No active thread found for this session. Send at least one message before generating a summary.",
        )

    result = None
    try:
        result = await summarise_thread(thread_id, llm, thread_adapter)
    except Exception as exc:
        logger.warning(
            "LLM summary failed session=%s thread=%s — attempting fallback: %s",
            session_id, thread_id, exc,
        )

    if result is not None:
        thread = await thread_adapter.get_thread(thread_id)
        return ThreadSummaryResponse(
            thread_id=thread_id,
            summary=result.summary_text,
            created_at=result.created_at,
            thread_name=result.thread_name,
            title=thread.title if thread else None,
        )

    # Fallback 1: return the most recent previously-persisted summary
    existing = await thread_adapter.get_latest_summary(thread_id)
    if existing:
        logger.info("Returning cached summary for thread=%s", thread_id)
        thread = await thread_adapter.get_thread(thread_id)
        return ThreadSummaryResponse(
            thread_id=thread_id,
            summary=existing.content,
            created_at=existing.created_at,
            thread_name=getattr(existing, "thread_name", None),
            title=thread.title if thread else None,
        )

    # Fallback 2: rule-based summary built from raw messages (no LLM needed)
    messages = await thread_adapter.get_messages(thread_id)
    if not messages:
        raise HTTPException(status_code=404, detail="Thread has no messages to summarize.")

    user_msgs = [m for m in messages if m.role.value == "user"]
    goal_snippet = (user_msgs[0].content or "")[:300] if user_msgs else (messages[0].content or "")[:300]
    latest_snippet = (user_msgs[-1].content or "")[:300] if user_msgs else (messages[-1].content or "")[:300]
    fallback_name = (goal_snippet[:80].strip() or None)
    fallback_text = (
        f"• Goal: {goal_snippet}\n"
        f"• Anchor: (not determined)\n"
        f"• Tone: (not determined)\n"
        f"• Open risk: AI summary unavailable — latest message: {latest_snippet}"
    )
    persisted = await thread_adapter.insert_thread_summary(
        thread_id=thread_id,
        content=fallback_text,
        token_count=len(fallback_text.split()),
        thread_name=fallback_name,
    )
    await maybe_apply_thread_title(thread_adapter, thread_id, fallback_name)
    thread = await thread_adapter.get_thread(thread_id)
    return ThreadSummaryResponse(
        thread_id=thread_id,
        summary=fallback_text,
        created_at=persisted.created_at,
        thread_name=fallback_name,
        title=thread.title if thread else None,
    )


async def _resolve_rag_sources(
    raw_rag_sources: list[dict],
    settings_port: "SettingsPort",
    session_id: str,
) -> list[RagSourceSchema]:
    if not raw_rag_sources:
        return []
    unique_file_ids = list({c["file_id"] for c in raw_rag_sources})
    try:
        filename_map = await settings_port.get_kb_document_filenames(unique_file_ids)
    except Exception:
        logger.warning("Failed to resolve KB document filenames session=%s", session_id)
        filename_map = {}
    return [
        RagSourceSchema(
            file_uuid=chunk["file_id"],
            filename=filename_map.get(chunk["file_id"]) or chunk.get("filename"),
            pages=chunk.get("page_numbers") or [],
            text=chunk.get("text", ""),
        )
        for chunk in raw_rag_sources
    ]


async def _persist_assistant_message(
    *,
    session_id: str,
    thread_id: str | None,
    content: str,
    tokens_in: int,
    tokens_out: int,
    rag_sources: list[RagSourceSchema],
    thread_adapter,
    store: SessionPort,
    source: dict | None = None,
    summary_card: dict | None = None,
) -> None:
    # Stop-before-first-token leaves nothing to show; don't store an empty bubble.
    if not (content or "").strip():
        return
    # Embed the card in the stored body so reopen can rebuild the facts UI.
    stored = attach_summary_card(content, summary_card)
    if thread_id:
        try:
            await thread_adapter.save_message(
                thread_id=thread_id,
                role="ai",
                content=stored,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                source=source,
                rag_sources=[s.model_dump() for s in rag_sources] or None,
            )
        except Exception:
            logger.warning("Failed to persist assistant message session=%s", session_id)
    else:
        await store.append_history(session_id, {"role": "ai", "content": stored})


# ── REST — full response ───────────────────────────────────────────────────────

@router.post("/{session_id}/chat", response_model=MessageResponse)
async def handle_message(
    session_id: str,
    body: MessageRequest,
    _: AuthenticatedUser = Depends(get_current_user_any),
    llm: "LLMPort" = Depends(get_llm),
    session: dict = Depends(get_session_by_id),
    store: SessionPort = Depends(get_session_store),
    thread_adapter=Depends(get_pg_thread_adapter),
    graph=Depends(get_graph),
    settings_port: SettingsPort = Depends(get_pg_settings_adapter),
):
    thread_id = await ensure_thread(session_id, session, body.thread_tone, store, thread_adapter)

    conversation_history: list[dict[str, str]] = []
    if thread_id:
        try:
            recent = await thread_adapter.get_recent_messages(thread_id, limit=10)
            conversation_history = [
                {"role": m.role.value, "content": extract_summary_card(m.content or "")[0]}
                for m in recent
                if m.role.value != "ai" or (m.content or "").strip()
            ]
        except Exception:
            logger.warning("Failed to load conversation history session=%s", session_id)
    else:
        # No durable DB thread — fall back to the in-process session history so
        # multi-turn features keep working without DB persistence.
        conversation_history = (await store.get_history(session_id))[-10:]

    if thread_id:
        try:
            await thread_adapter.save_message(thread_id=thread_id, role="user", content=body.message)
        except Exception:
            logger.warning("Failed to persist user message session=%s", session_id)
    else:
        await store.append_history(session_id, {"role": "user", "content": body.message})

    scf_enabled, scf_offerable, turn_context, turn_instructions = _turn_scf_and_context(
        session, body.negotiation_strategy, session_id
    )
    graph_state: NegotiationState = {
        "session_id": session_id,
        "supplier_id": session.get("supplier_id", ""),
        "tenant_id": session.get("tenant_id", ""),
        "message": body.message,
        "context": turn_context,
        **_turn_brief_state(turn_context, scf_enabled),
        "selected_tone": body.thread_tone,
        "conversation_history": conversation_history,
        "prompt_instructions": turn_instructions,
        "user_name": session.get("user_name"),
        "scf_enabled": scf_enabled,
    }
    started_at = time.time()
    result = await _invoke_graph_traced(
        graph, graph_state, channel="rest", user_id=session.get("user_id")
    )
    completed_at = time.time()
    logger.info("[TIMING] total.graph_invoke: %.0fms", (completed_at - started_at) * 1000)

    full_response = _response_text(result)
    # SCF output backstop: if SCF is disabled but a response still slipped SCF
    # through, replace it with the canned refusal (authoritative on this
    # non-streamed REST path).
    full_response, _scf_tripped = enforce_scf_output_policy(
        full_response, scf_enabled
    )
    if _scf_tripped:
        logger.warning("SCF output policy tripped (REST) session=%s — response replaced", session_id)
    intent = result.get("intent")
    intent_value = intent.value if intent else None
    blocked_by = result.get("blocked_by")
    # Grounded in the actual response (REST is non-streaming, so this is real
    # added latency — bounded with a short timeout and static fallback;
    # generate_follow_ups already catches its own timeout/errors and returns
    # the static fallback list, so it never raises here). blocked_by is set
    # only when no_opportunity/scf_blocked short-circuited this turn, so
    # follow-ups don't re-suggest the exact strategy the graph just refused.
    # has_opportunity/current_term_days additionally cover turns that weren't
    # blocked this turn (e.g. run_scenario, never gated) but still have no
    # stored ask above current terms — see _turn_opportunity.
    has_opportunity, current_term_days = _turn_opportunity(turn_context)
    follow_ups = await _generate_follow_ups_traced(
        llm, body.message, full_response, intent_value, conversation_history,
        timeout=4.0, blocked_by=blocked_by, source=result.get("source"),
        previous_follow_ups=session.get("last_follow_ups"),
        has_opportunity=has_opportunity, current_term_days=current_term_days,
        session_id=session_id, user_id=session.get("user_id"),
        scf_offerable=scf_offerable, previous_intent=session.get("last_intent"),
    )
    # When SCF cannot be offered on this turn, no suggestion may reference it.
    follow_ups = strip_scf_follow_ups(
        follow_ups, scf_offerable, intent_value, blocked_by, has_opportunity,
        body.message, session.get("last_follow_ups"),
    )
    # Remembered for next turn's dedup (see generate_follow_ups' previous_follow_ups)
    # and fixed-set resolution (previous_intent) — in-memory only, best-effort
    # (see InMemorySessionStore).
    await store.update(session_id, {"last_follow_ups": follow_ups, "last_intent": intent_value})
    prompt_tokens = len(body.message.split())
    completion_tokens = len(full_response.split())

    raw_rag_sources: list[dict] = result.get("rag_sources") or []
    rag_sources_response = (
        await _resolve_rag_sources(raw_rag_sources, settings_port, session_id)
        if session.get("can_view_data_inputs", False)
        else []
    )

    await _persist_assistant_message(
        session_id=session_id,
        thread_id=thread_id,
        content=full_response,
        tokens_in=prompt_tokens,
        tokens_out=completion_tokens,
        rag_sources=rag_sources_response,
        thread_adapter=thread_adapter,
        store=store,
        summary_card=result.get("summary_card"),
    )

    return MessageResponse(
        session_id=session_id,
        summary_scope=result.get("summary_scope") if intent == Intent.SUMMARIZE_SUPPLIER_POSITION else None,
        summary_tier=result.get("summary_tier") if intent == Intent.SUMMARIZE_SUPPLIER_POSITION and result.get("summary_scope") != "narrow" else None,
        summary_card=result.get("summary_card"),
        opportunity_warning=_turn_opportunity_warning(turn_context, intent, blocked_by),
        passed=True,
        generated_message=full_response,
        tone_used=body.thread_tone,
        strategies_used=[],
        strategies_suppressed=[],
        confidence=None,
        reasoning=None,
        scf_offered=False,
        batna_position=None,
        flags=[],
        escalation_reason=None,
        usage=UsageSchema(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
        ),
        timing=TimingSchema(
            started_at=started_at,
            completed_at=completed_at,
            duration_seconds=round(completed_at - started_at, 3),
        ),
        follow_ups=follow_ups,
        rag_sources=rag_sources_response,
    )


# ── WebSocket — multi-turn token streaming ────────────────────────────────────

@router.post(
    "/{session_id}/negotiation/chat",
    tags=["negotiation"],
    summary="WebSocket: stream chat tokens",
    description="""
**This is a WebSocket endpoint — use a WS client to connect, not HTTP.**

Connect via:
```
ws://127.0.0.1:8000/{session_id}/negotiation/chat
```

**Send** (JSON):
```json
{"message": "your message here", "thread_tone": "assertive", "negotiation_strategy": "term_extension"}
```

**Stop** an in-flight reply (connection stays open):
```json
{"type": "stop"}
```

**Receive** — server streams back:
```json
{"type": "intent", "session_id": "...", "data": {"intent": "...", "confidence": 0.0, "low_confidence": false, "group": "...", "agent": "...", "reasoning": "..."}}
{"type": "token",  "session_id": "...", "data": "<token>"}
{"type": "done",   "session_id": "...", "data": {"usage": {...}, "timing": {...}, "source": {...} | null, "is_playbook": true | false}}
{"type": "error",  "session_id": "...", "data": "<error message>"}
```


Each incoming message is first run through the negotiation graph (currently
just the intent-classifier node); the resulting classification is sent as an
`intent` event before the response starts streaming.

For intents that draft from sourced supplier facts (e.g.
`generate_negotiation_playbook`), the final `done` event's `source` field maps
each fact quoted in the response to the payload path it was extracted from —
so the client can show the negotiator where each figure came from. It's
`null` for intents that don't produce a sourced brief.
""",
    response_description="WebSocket only — HTTP calls to this path return 404.",
    include_in_schema=True,
    responses={},
)
def ws_docs_stub():
    pass


@router.websocket("/{session_id}/negotiation/chat")
async def stream_message_ws(
    session_id: str,
    websocket: WebSocket,
    _: AuthenticatedUser = Depends(get_current_user_ws),
    llm: LLMPort = Depends(get_llm),
    graph=Depends(get_graph),
    rag_service=Depends(get_rag_service),
    session: dict = Depends(get_session_by_id),
    store: SessionPort = Depends(get_session_store),
    thread_adapter=Depends(get_pg_thread_adapter),
    settings_port: SettingsPort = Depends(get_pg_settings_adapter),
):
    await websocket.accept()
    logger.info("WS connected session=%s user=%s", session_id, session.get("user_id"))

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                if json.loads(raw).get("type") == "ping":
                    continue
            except Exception:
                pass
            try:
                body = MessageRequest.model_validate_json(raw)
            except ValidationError as exc:
                await websocket.send_json({"type": "error", "session_id": session_id, "data": str(exc)})
                continue

            thread_id = await ensure_thread(session_id, session, body.thread_tone, store, thread_adapter)

            conversation_history: list[dict[str, str]] = []
            if thread_id:
                try:
                    recent = await thread_adapter.get_recent_messages(thread_id, limit=10)
                    conversation_history = [
                        {"role": m.role.value, "content": extract_summary_card(m.content or "")[0]}
                        for m in recent
                        if m.role.value != "ai" or (m.content or "").strip()
                    ]
                except Exception:
                    logger.warning("Failed to load conversation history session=%s — falling back to in-memory", session_id)
                    conversation_history = (await store.get_history(session_id))[-10:]
            else:
                # No durable DB thread (e.g. the session has no user_id, so
                # `ensure_thread` skipped creation). Fall back to the in-process
                # session history so multi-turn features (meta_operation,
                # follow-ups) still work for the life of this connection.
                conversation_history = (await store.get_history(session_id))[-10:]

            logger.debug(
                "[conversation_history] thread_id=%s fetched %d prior message(s): %s",
                thread_id,
                len(conversation_history),
                conversation_history,
            )

            if thread_id:
                try:
                    await thread_adapter.save_message(thread_id=thread_id, role="user", content=body.message)
                except Exception:
                    logger.warning("Failed to persist user message session=%s", session_id)
            else:
                await store.append_history(session_id, {"role": "user", "content": body.message})

            graph_response: str | None = None
            graph_source: dict[str, dict[str, object]] | None = None
            follow_up_task: asyncio.Task | None = None
            graph_task: asyncio.Task | None = None
            _ctx_token: contextvars.Token | None = None
            intent: Intent | None = None
            intent_value: str | None = None
            rag_sources_response: list = []
            started_at = time.time()
            chunks: list[str] = []
            completion_tokens = 0
            client_connected = True
            user_stopped = False
            listen_task: asyncio.Task | None = None

            # NOTE: RAG retrieval is intentionally NOT prefetched here. Several
            # intents (SUMMARIZE_SUPPLIER_POSITION, META_OPERATION,
            # EXPLAIN_RECOMMENDATION) must never search the knowledge base, and
            # the intent is not known until the classifier runs inside the graph.
            # Prefetching would fire a KB search before we know the intent, so
            # retrieval is deferred to the `rag_query` node — which is only on
            # the path for RAG-using intents. It self-retrieves when no prefetch
            # task is set (see agents/nodes/rag_query.py).

            # Set up a token queue so substantive nodes can stream tokens to the
            # client in real time.  The context var is inherited by the graph task
            # (asyncio.create_task copies the current context), so every node that
            # calls complete(stream_to_client=True) will push tokens here.
            token_queue: asyncio.Queue[str | None] = asyncio.Queue(maxsize=100)
            _ctx_token = active_stream_queue.set(token_queue)

            async def _run_graph_with_sentinel() -> dict:
                try:
                    return await _invoke_graph_traced(
                        graph, graph_state, channel="ws", user_id=session.get("user_id")
                    )
                finally:
                    # Always unblock the consumer — even if the graph errors or
                    # the intent is a simple one that never streams.
                    await token_queue.put(None)

            try:
                scf_enabled, scf_offerable, turn_context, turn_instructions = _turn_scf_and_context(
                    session, body.negotiation_strategy, session_id
                )
                graph_state: NegotiationState = {
                    "session_id": session_id,
                    "supplier_id": session.get("supplier_id", ""),
                    "tenant_id": session.get("tenant_id", ""),
                    "message": body.message,
                    "context": turn_context,
                    **_turn_brief_state(turn_context, scf_enabled),
                    "selected_tone": body.thread_tone,
                    "conversation_history": conversation_history,
                    "prompt_instructions": turn_instructions,
                    "user_name": session.get("user_name"),
                    "scf_enabled": scf_enabled,
                }
                _t_graph = time.perf_counter()
                # Run the graph concurrently so we can forward LLM tokens to the
                # client as they arrive instead of buffering the full response.
                graph_task = asyncio.create_task(_run_graph_with_sentinel())

                async def _listen_for_stop() -> None:
                    nonlocal user_stopped, client_connected
                    while True:
                        try:
                            raw_in = await websocket.receive_text()
                        except WebSocketDisconnect:
                            client_connected = False
                            return
                        try:
                            msg_in = json.loads(raw_in)
                        except Exception:
                            continue
                        if not isinstance(msg_in, dict):
                            continue
                        msg_type = msg_in.get("type")
                        if msg_type == "ping":
                            continue
                        if msg_type == "stop":
                            user_stopped = True
                            if graph_task and not graph_task.done():
                                graph_task.cancel()
                            try:
                                token_queue.put_nowait(None)
                            except asyncio.QueueFull:
                                pass
                            logger.info("WS stop requested session=%s", session_id)
                            return

                listen_task = asyncio.create_task(_listen_for_stop())

                # ── Stream real LLM tokens to the client ──────────────────────
                while not user_stopped:
                    tok = await asyncio.wait_for(token_queue.get(), timeout=60.0)
                    if tok is None:
                        break
                    chunks.append(tok)
                    if not client_connected:
                        continue
                    try:
                        await websocket.send_json({"type": "token", "session_id": session_id, "data": tok})
                    except (WebSocketDisconnect, RuntimeError):
                        logger.info("WS client disconnected during token stream session=%s", session_id)
                        client_connected = False

                # ── Collect final graph state (always — even if client left) ───
                result: dict = {}
                try:
                    result = await graph_task
                except asyncio.CancelledError:
                    result = {}
                logger.info("[TIMING] total.graph_invoke: %.0fms", (time.perf_counter() - _t_graph) * 1000)

                intent = result.get("intent")
                graph_response = result.get("response")
                graph_source = result.get("source")
                # Augment data-backed responses with the full supplier payload,
                # each entry formatted (e.g. industryRegionStandard -> "Industry
                # Region Standard"). Skips trivial intents (greeting/unclear/…)
                # that produced no source of their own.
                if graph_source:
                    _ctx = result.get("context")
                    supplier_data_source = collect_supplier_data_sources(getattr(_ctx, "raw", None))
                    if supplier_data_source:
                        graph_source = {**graph_source, **supplier_data_source}
                intent_value = intent.value if intent else None
                blocked_by = result.get("blocked_by")

                if client_connected and not user_stopped:
                    try:
                        await websocket.send_json({
                            "type": "intent",
                            "session_id": session_id,
                            "data": {
                                "intent": intent.value if intent else None,
                                "confidence": result.get("intent_confidence"),
                                "low_confidence": result.get("intent_low_confidence"),
                                "group": result.get("intent_group"),
                                "agent": result.get("intent_agent"),
                                "reasoning": result.get("intent_reasoning"),
                                "response_mode": result.get("response_mode"),
                                "summary_scope": result.get("summary_scope") if intent == Intent.SUMMARIZE_SUPPLIER_POSITION else None,
                                "summary_tier": result.get("summary_tier") if intent == Intent.SUMMARIZE_SUPPLIER_POSITION and result.get("summary_scope") != "narrow" else None,
                            },
                        })
                    except (WebSocketDisconnect, RuntimeError):
                        logger.info("WS client disconnected before intent event session=%s", session_id)
                        client_connected = False

                # Nodes that return a pre-built string without LLM streaming —
                # simple intents (GREETING, UNCLEAR, OUT_OF_SCOPE) and post-
                # processed documents (the playbook, which is normalized and
                # validated after generation) — fake-stream it so the client
                # always receives token events before the done event.
                if not chunks and not user_stopped:
                    response_text = _response_text(result)
                    pieces = _chunk_text(response_text or _CARD_ONLY_TOKEN)
                    # Word-by-word pacing reads naturally for short canned
                    # replies, but a full document at 0.03s/word would take
                    # ~20s — cap the whole fake-stream at ~1.5s.
                    delay = min(0.03, 1.5 / len(pieces))
                    for chunk in pieces:
                        if user_stopped:
                            break
                        chunks.append(chunk)
                        if not client_connected:
                            continue
                        try:
                            await websocket.send_json({"type": "token", "session_id": session_id, "data": chunk})
                            await asyncio.sleep(delay)
                        except (WebSocketDisconnect, RuntimeError):
                            logger.info("WS client disconnected during fake-stream session=%s", session_id)
                            client_connected = False

                if listen_task and not listen_task.done():
                    listen_task.cancel()
                    try:
                        await listen_task
                    except asyncio.CancelledError:
                        pass
                listen_task = None

                raw_rag_sources: list[dict] = result.get("rag_sources") or []
                can_view_data_inputs = bool(session.get("can_view_data_inputs", False))
                rag_sources_response = (
                    await _resolve_rag_sources(raw_rag_sources, settings_port, session_id)
                    if can_view_data_inputs and not user_stopped
                    else []
                )
                # Follow-ups are only needed for the client `done` event.
                # Always grounded in the actual response — generated as a
                # background task while the client is already reading the
                # (already fully streamed) answer, so this adds no perceived
                # latency; capped below by a bounded wait before `done`.
                follow_ups = None
                if client_connected and not user_stopped:
                    has_opportunity, current_term_days = _turn_opportunity(turn_context)
                    follow_up_task = asyncio.create_task(
                        _generate_follow_ups_traced(
                            llm, body.message, graph_response or "", intent_value, conversation_history,
                            blocked_by=blocked_by, source=graph_source,
                            previous_follow_ups=session.get("last_follow_ups"),
                            has_opportunity=has_opportunity, current_term_days=current_term_days,
                            session_id=session_id, user_id=session.get("user_id"),
                            scf_offerable=scf_offerable, previous_intent=session.get("last_intent"),
                        )
                    )
                else:
                    follow_up_task = None

                completed_at = time.time()
                # Stopped turns keep only what the client already saw.
                ai_content = ("".join(chunks) if user_stopped else (graph_response or "".join(chunks)))
                prompt_tokens = len(body.message.split())
                # SCF output backstop for the PERSISTED copy: tokens already
                # streamed to the client can't be recalled, but keeping SCF out
                # of stored history stops it re-entering future turns' context.
                persisted_content, _scf_tripped = enforce_scf_output_policy(
                    ai_content, scf_enabled
                )
                if _scf_tripped:
                    logger.warning(
                        "SCF output policy tripped (WS) session=%s — persisted copy replaced",
                        session_id,
                    )
                summary_card = result.get("summary_card")
                persisted_content = attach_summary_card(persisted_content, summary_card)
                completion_tokens = len(extract_summary_card(persisted_content)[0].split())

                await _persist_assistant_message(
                    session_id=session_id,
                    thread_id=thread_id,
                    content=persisted_content,
                    tokens_in=prompt_tokens,
                    tokens_out=completion_tokens,
                    rag_sources=rag_sources_response,
                    thread_adapter=thread_adapter,
                    store=store,
                    source=(
                        graph_source
                        if can_view_data_inputs and graph_source and not user_stopped
                        else None
                    ),
                )

                if not client_connected:
                    if follow_up_task and not follow_up_task.done():
                        follow_up_task.cancel()
                    logger.info(
                        "WS client gone — AI reply persisted session=%s thread=%s",
                        session_id, thread_id,
                    )
                    return

                if not follow_ups and follow_up_task:
                    try:
                        follow_ups = await asyncio.wait_for(follow_up_task, timeout=3.0)
                    except Exception:
                        # Same gating-aware, dedup'd fallback generate_follow_ups
                        # itself falls back to — a raw get_fallback_follow_ups()
                        # here would ignore blocked_by/has_opportunity and could
                        # repeat the current message or the previous turn's chips.
                        follow_ups = safe_fallback_follow_ups(
                            body.message, intent_value, blocked_by, has_opportunity,
                            session.get("last_follow_ups"),
                        )

                # When SCF cannot be offered on this turn, no suggestion may
                # reference it.
                follow_ups = strip_scf_follow_ups(
                    follow_ups or [], scf_offerable, intent_value, blocked_by, has_opportunity,
                    body.message, session.get("last_follow_ups"),
                ) if not user_stopped else []
                # Remembered for next turn's dedup (see generate_follow_ups'
                # previous_follow_ups) and fixed-set resolution (previous_intent)
                # — in-memory only, best-effort.
                await store.update(
                    session_id, {"last_follow_ups": follow_ups, "last_intent": intent_value}
                )

                try:
                    await websocket.send_json({
                        "type": "done",
                        "session_id": session_id,
                        "data": {
                            "usage": {
                                "prompt_tokens": prompt_tokens,
                                "completion_tokens": completion_tokens,
                                "total_tokens": prompt_tokens + completion_tokens,
                            },
                            "timing": {
                                "started_at": started_at,
                                "completed_at": completed_at,
                                "duration_seconds": round(completed_at - started_at, 3),
                            },
                            "source": graph_source if can_view_data_inputs and not user_stopped else None,
                            "is_playbook": (not user_stopped) and intent == Intent.GENERATE_NEGOTIATION_PLAYBOOK,
                            "summary_scope": result.get("summary_scope") if intent == Intent.SUMMARIZE_SUPPLIER_POSITION else None,
                            "summary_tier": result.get("summary_tier") if intent == Intent.SUMMARIZE_SUPPLIER_POSITION and result.get("summary_scope") != "narrow" else None,
                            "summary_card": result.get("summary_card"),
                            "follow_ups": follow_ups,
                            "opportunity_warning": (
                                None if user_stopped
                                else _turn_opportunity_warning(turn_context, intent, blocked_by)
                            ),
                            "rag_sources": [s.model_dump() for s in rag_sources_response],
                            "thread_id": thread_id,
                        },
                    })
                except (WebSocketDisconnect, RuntimeError):
                    logger.info("WS client disconnected before done event session=%s", session_id)
                    return
                if settings.ws_debug_log and not user_stopped:
                    _write_ws_output(session_id, body.message, intent, ai_content, graph_source)
            except WebSocketDisconnect:
                logger.info("WS client disconnected session=%s", session_id)
                if listen_task and not listen_task.done():
                    listen_task.cancel()
                if graph_task and not graph_task.done():
                    graph_task.cancel()
                if follow_up_task and not follow_up_task.done():
                    follow_up_task.cancel()
                return
            except Exception as exc:
                logger.exception("WS graph invocation failed session=%s", session_id)
                if listen_task and not listen_task.done():
                    listen_task.cancel()
                try:
                    await websocket.send_json({"type": "error", "session_id": session_id, "data": f"Graph invocation failed: {exc}"})
                    await websocket.send_json({"type": "intent", "session_id": session_id, "data": None})
                except (WebSocketDisconnect, RuntimeError):
                    return
                continue
            finally:
                if listen_task and not listen_task.done():
                    listen_task.cancel()
                if _ctx_token is not None:
                    active_stream_queue.reset(_ctx_token)

    except WebSocketDisconnect:
        logger.info("WS disconnected session=%s", session_id)
    finally:
        await store.delete(session_id)
        clear_session(session_id)  # drop this session's target/walkaway overrides        logger.debug("WS session cleaned up session=%s", session_id)
