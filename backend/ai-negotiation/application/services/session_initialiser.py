from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any

from application.services.starter_questions import generate_starter_questions
from domain.entities.brief import NegotiationBrief
from domain.entities.context import SupplierContext
from domain.entities.settings import SettingsBundle, SettingsNotFoundError
from domain.ports.settings_port import SettingsPort
from domain.services.brief_builder import build_negotiation_brief
from domain.services.context_builder import build_supplier_context
from domain.services.scf_policy import (
    resolve_scf_enabled,
    sanitize_context_for_mode,
    strip_scf_from_raw,
)

logger = logging.getLogger(__name__)


@dataclass
class SessionInitResult:
    context: SupplierContext | None
    supplier_data: dict[str, Any]
    starter_questions: list[str] = field(default_factory=list)
    # Raw rows from thread_adapter.get_threads_by_supplier — each is a
    # (thread, message_count, summary) tuple.  Schema conversion
    # (thread_list_item) is left to the API layer.
    previous_thread_rows: list[Any] = field(default_factory=list)
    settings_bundle: SettingsBundle | None = None
    # The turn-shaped brief, built at session start from `context`. It is pure
    # Python (no LLM, no IO), so there is no reason to defer it to the first
    # message — see `NegotiationState.brief`. None when there is no supplier
    # data.
    #
    # This is the SESSION-START view: no session target/BATNA override exists
    # yet. Each turn rebuilds the brief from the resolved context, because an
    # override moves the ask and everything derived from it.
    brief: NegotiationBrief | None = None
    # Whether Supply Chain Finance is available for this session (driven by the
    # tenant strategy setting term_extension_scf). When False, `context` and
    # `supplier_data` have already been stripped of SCF; downstream nodes must
    # also route/gate on this flag (see domain.services.scf_policy).
    scf_enabled: bool = False

    @property
    def bundle_views(self) -> dict[str, Any]:
        """The brief's argument bundle, under the key the session store holds."""
        if self.brief is None:
            return {"argument_analysis": {}}
        return self.brief.state_views()


async def initialise_session(
    supplier_id: str,
    tenant_id: str,
    supplier_adapter,
    thread_adapter,
    settings_port: SettingsPort,
) -> SessionInitResult:
    """Fetch and assemble everything needed to open a negotiation session.

    Keeps fetch + context-build + thread-history concerns together in the
    application layer so the API route handler only deals with HTTP/WS
    concerns.
    """
    supplier_data: dict[str, Any] = {}
    try:
        supplier_data = await supplier_adapter.get_supplier_context(supplier_id, tenant_id)
        # The raw upstream payload, exactly as fetched — recorded BEFORE the SCF
        # strip and before any fact extraction, so it is the ground truth every
        # computed bundle below can be checked against. Debug level: it is a
        # whole supplier payload, and it belongs in the log file, not on the
        # terminal of everyone who starts the app.
        logger.debug(
            "session/start: supplier_data supplier=%s tenant=%s: %s",
            supplier_id,
            tenant_id,
            supplier_data,
        )
    except Exception as exc:
        logger.error("session_initialiser: failed to fetch supplier data supplier=%s: %s", supplier_id, exc)

    context: SupplierContext | None = None

    if supplier_data:
        try:
            context = build_supplier_context(supplier_data)
        except Exception as exc:
            logger.error("session_initialiser: failed to build supplier context supplier=%s: %s", supplier_id, exc)

        # Surface the computed BATNA/concession floor on the supplier payload
        # so the session/start response carries it. Reuse the value
        # `build_supplier_context` already resolved (in `argument_analysis`)
        # rather than recomputing — the adapter stays a pure data-shaper and
        # facts are extracted exactly once.
        if context is not None and context.argument_analysis is not None:
            terms = context.argument_analysis.get("terms") or {}
            supplier_data["effectiveBatna"] = {
                "termDays": terms.get("batna_floor"),
                "note": terms.get("batna_note"),
            }

    async def _fetch_threads() -> list[Any]:
        if not supplier_data:
            return []
        try:
            return await thread_adapter.get_threads_by_supplier(supplier_id)
        except Exception as exc:
            logger.warning("session_initialiser: failed to load previous threads supplier=%s: %s", supplier_id, exc)
            return []

    async def _fetch_settings() -> SettingsBundle | None:
        try:
            tenant_uuid = await settings_port.resolve_tenant_uuid(tenant_id)
            if tenant_uuid is None:
                logger.warning("session_initialiser: tenant not found tenant_id=%s", tenant_id)
                return None
            return await settings_port.get_tenant_bundle(
                tenant_uuid,
                include_kb_documents=False,
            )
        except SettingsNotFoundError as exc:
            logger.warning("session_initialiser: settings not found tenant_id=%s: %s", tenant_id, exc)
            return None
        except Exception as exc:
            logger.warning("session_initialiser: failed to load settings tenant_id=%s: %s", tenant_id, exc)
            return None

    previous_thread_rows, settings_bundle = await asyncio.gather(
        _fetch_threads(),
        _fetch_settings(),
    )

    # Resolve the SCF mode from the tenant strategy setting. When SCF is off,
    # remove it from both the raw payload the frontend receives and the built
    # context every graph node reasons over — so nothing downstream can surface
    # or hallucinate it. Missing settings default to SCF-disabled (fail closed).
    effective_strategies = (
        settings_bundle.effective_strategies if settings_bundle else None
    )
    scf_enabled = resolve_scf_enabled(effective_strategies)

    # ── Diagnostic: which strategy mode is active for this supplier ──────────
    # effective_strategies is the intersection of three configured layers:
    #   platform-allowed  ∩  tenant-cap  ∩  tenant-admin-enabled
    # If ANY layer is empty/None the intersection is empty — which reads as
    # "nothing enabled". Print each layer so an empty result is explainable.
    _global_record = settings_bundle.global_record if settings_bundle else None
    _tenant_record = settings_bundle.tenant_record if settings_bundle else None
    _platform_allowed = list((_global_record.strategies if _global_record else None) or [])
    _tenant_cap = list((_tenant_record.global_strategy if _tenant_record else None) or [])
    _tenant_enabled = list((_tenant_record.strategies if _tenant_record else None) or [])
    _available = list((settings_bundle.available_strategies if settings_bundle else None) or [])
    _strategies = list(effective_strategies or [])
    _tenant_scf = "term_extension_scf" in _strategies
    _tenant_term = "term_extension" in _strategies
    _supplier_scf_rate = (supplier_data.get("supplier", {}) or {}).get("scfRate")
    _mode_label = "SCF + Term Extension" if scf_enabled else "Term Extension only (SCF OFF)"
    logger.info(
        "session_initialiser: mode=%r scf_enabled=%s effective=%s available=%s "
        "platform=%s tenant_cap=%s tenant_enabled=%s supplier_scfRate=%s",
        _mode_label,
        scf_enabled,
        _strategies,
        _available,
        _platform_allowed,
        _tenant_cap,
        _tenant_enabled,
        _supplier_scf_rate,
    )
    if not scf_enabled:
        # Strip each surface independently — context sanitisation must not hinge
        # on supplier_data being truthy (and vice-versa). strip_scf_from_raw is
        # a no-op on an empty payload.
        if supplier_data:
            supplier_data = strip_scf_from_raw(supplier_data)
        if context is not None:
            context = sanitize_context_for_mode(context)

    # The brief is deterministic Python over the context just built, so it is
    # computed once here — the session opens with the facts and the full
    # argument picture already resolved, before any message is sent. The SCF
    # strip above has already been applied to `context`, so what it holds is
    # what the first turn will actually reason over.
    brief = build_negotiation_brief(context, scf_enabled=scf_enabled)

    return SessionInitResult(
        context=context,
        supplier_data=supplier_data,
        brief=brief,
        starter_questions=await generate_starter_questions() if supplier_data else [],
        previous_thread_rows=previous_thread_rows,
        settings_bundle=settings_bundle,
        scf_enabled=scf_enabled,
    )
