import uuid as _uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel

from api.schemas.settings import SessionSettingsSnapshot


# ── Shared camelCase base ─────────────────────────────────────────────────────

class _CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, alias_generator=to_camel)


# ── Supplier context schemas ──────────────────────────────────────────────────

class SupplierDataSchema(_CamelModel):
    uuid: str
    name: str
    description: str | None = None
    address: str | None = None
    phone_number: str | None = None
    ownership: str | None = None
    stock_ticker: str | None = None
    entity_type: str | None = None
    country: str | None = None
    country_rating: str | None = None
    credit_rating: str | None = None
    credit_rating_source: str | None = None
    main_industry_code: str | None = None
    main_industry_name: str | None = None
    url: str | None = None
    company_size: str | None = None
    external_id: str | None = None
    provided_internal_id: str | None = None
    cost_of_debt_spread: float | None = None
    wacc_pre_tax: float | None = None
    wacc_after_tax: float | None = None
    supplier_financing_rate: float | None = None
    scf_rate: float | None = None
    ethnic_minority_owned_business: bool | None = None
    woman_owned_business: bool | None = None
    veteran_owned_business: bool | None = None
    spend_volume: float | None = None
    negotiation_status: str | None = None
    program_applied: str | None = None
    success_probability: str | None = None
    # Calculum 9-box position (1-9). Priority in key facts is derived from this
    # (Carlos, 2026-09-15): boxes 1/2/4 high, 3/5/7 medium, 6/8/9 low.
    nine_box_term_extension: int | None = None
    entity_buyer_leverage_level: str | None = None
    # `entity_supplier_leverage_level` is deliberately ABSENT (§3): only
    # buyer-side leverage is considered. The column still exists upstream and
    # is dormant — it is not carried through this schema, the supplier payload,
    # or the facts.
    is_sme: bool | None = None
    sme_source: str | None = None
    dso: int | None = None
    updated_at: str | None = None


class TargetDataSchema(_CamelModel):
    opportunity_payment_terms: int | None = None
    target_payment_terms: int | None = None
    target_cash_flow: float | None = None


class AgreementDataSchema(_CamelModel):
    agreed_terms_without_cash_discounts: int | None = None
    agreed_terms_with_cash_discounts: int | None = None
    agreed_cash_discount_percentage: float | None = None


class EffectiveBatnaSchema(_CamelModel):
    """The computed BATNA / concession floor for this negotiation.

    Derived once at context-build time by
    :func:`domain.entities.facts.resolve_effective_batna`
    (``harmonise(target - 15)``, with No BATNA below contractual + 5).
    ``note`` explains which rule produced the figure; both are ``None`` when
    there is no ask or the floor fails the contractual gate.
    """
    term_days: int | None = None
    note: str | None = None


class SupplierFullResponse(_CamelModel):
    supplier: SupplierDataSchema
    target: TargetDataSchema
    agreement: AgreementDataSchema
    negotiation_strategy: dict
    effective_batna: EffectiveBatnaSchema | None = None


# ── /session/start ────────────────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    tenant_id: str
    supplier_id: str
    user_id: str | None = None
    thread_tone: str | None = None

    @field_validator("supplier_id")
    @classmethod
    def _must_be_uuid(cls, v: str | None) -> str | None:
        if v is None:
            return v
        try:
            _uuid.UUID(v)
        except ValueError:
            raise ValueError("must be a valid UUID")
        return v


class ThreadSummarySchema(BaseModel):
    content: str | None
    created_at: datetime
    thread_name: str | None = None


class ThreadListItem(BaseModel):
    thread_id: str
    title: str
    thread_tone: str | None
    message_count: int
    pinned: bool
    pinned: bool
    latest_summary: ThreadSummarySchema | None
    created_at: datetime
    updated_at: datetime


def thread_list_item(thread, msg_count: int, summary) -> ThreadListItem:
    return ThreadListItem(
        thread_id=str(thread.uuid),
        title=thread.title,
        thread_tone=thread.tone.value if thread.tone else None,
        message_count=msg_count,
        pinned=thread.pinned,
        latest_summary=(
            ThreadSummarySchema(
                content=summary.content,
                created_at=summary.created_at,
                thread_name=getattr(summary, "thread_name", None),
            )
            if summary
            else None
        ),
        created_at=thread.created_at,
        updated_at=thread.updated_at,
    )


class ThreadListResponse(BaseModel):
    threads: list[ThreadListItem]


class SupplierListItem(_CamelModel):
    supplier_id: str
    name: str
    received_name: str | None = None
    country: str | None = None
    parent_name: str | None = None
    spend_volume: float | None = None
    is_sme: bool | None = None


class SupplierListResponse(BaseModel):
    suppliers: list[SupplierListItem]


class EditMessageRequest(BaseModel):
    updated_content: str


class UpdateThreadRequest(BaseModel):
    title: str | None = None
    pinned: bool | None = None
    reaction: bool | None = None


class UpdateThreadResponse(BaseModel):
    thread_id: str
    title: str
    pinned: bool
    reaction: bool | None
    updated_at: datetime


class ChatMessageSchema(BaseModel):
    message_id: str
    role: str
    content: str | None
    tokens_in: int | None
    tokens_out: int | None
    source: dict | None = None
    rag_sources: list[dict] | None = None
    created_at: datetime


class ThreadMessagesResponse(BaseModel):
    thread_id: str
    pinned: bool
    messages: list[ChatMessageSchema]
    latest_summary: ThreadSummarySchema | None


class ThreadPinResponse(BaseModel):
    thread_id: str
    pinned: bool


class ThreadSummaryResponse(BaseModel):
    thread_id: str
    summary: str
    created_at: datetime
    thread_name: str | None = None
    title: str | None = None


class SavePlaybookRequest(BaseModel):
    title: str
    subtitle: str
    supplier_name: str | None = None
    country_code: str | None = None
    footer: str | None = None
    sections: list["PlaybookSectionPayload"] = Field(default_factory=list)
    raw: str


class SavePlaybookResponse(BaseModel):
    playbook_id: str
    pdf_url: str
    created_at: datetime


class PlaybookSectionPayload(BaseModel):
    index: int
    title: str
    subtitle: str
    summary: str | None = None
    bullets: list[str] = Field(default_factory=list)


SavePlaybookRequest.model_rebuild()


class StartSessionResponse(BaseModel):
    session_id: str
    thread_id: str | None = None
    data: SupplierFullResponse | None = None
    previous_threads: list[ThreadListItem] = Field(default_factory=list)
    settings: SessionSettingsSnapshot | None = None
    starter_questions: list[str] = Field(default_factory=list)



# ── /chat ─────────────────────────────────────────────────────────────────────

class MessageRequest(BaseModel):
    message: str
    # User-selected tone (from the tone picker), looked up against
    # `utils.prompts.tone_guidance.TONE_GUIDANCE` when drafting supplier-facing text.
    # Optional — nodes fall back to a neutral default when absent.
    thread_tone: str | None = None
    # Active Goal from the chat UI (`term_extension` | `term_extension_scf`).
    # Narrows SCF for this turn; cannot enable SCF if the tenant session disallows it.
    negotiation_strategy: str | None = None


class ValidationFlagSchema(BaseModel):
    code: str
    message: str
    severity: str


class UsageSchema(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class TimingSchema(BaseModel):
    started_at: float
    completed_at: float
    duration_seconds: float


class RagSourceSchema(BaseModel):
    file_uuid: str
    filename: str | None = None
    pages: list[int] = Field(default_factory=list)
    text: str = ""


class SummaryCardStandardSchema(BaseModel):
    key: str
    label: str
    days: int


class SummaryCardSchema(BaseModel):
    supplier_name: str | None = None
    country_flag: str | None = None
    industry: str | None = None
    credit_rating: str | None = None
    description: str | None = None
    current_term_days: int | None = None
    target_term_days: int | None = None
    batna_days: int | None = None
    standards: list[SummaryCardStandardSchema] = Field(default_factory=list)
    spend_volume: float | None = None
    cash_flow_opportunity: float | None = None
    buyer_leverage: str | None = None
    company_size: str | None = None
    supplier_financing_rate: float | None = None
    probability_of_success: str | None = None
    regulatory_cap_days: int | None = None
    regulatory_enforced: bool | None = None
    batna_note: str | None = None


class MessageResponse(BaseModel):
    session_id: str
    passed: bool
    generated_message: str | None
    tone_used: str | None
    strategies_used: list[str]
    strategies_suppressed: list[str]
    confidence: str | None
    reasoning: str | None
    scf_offered: bool
    batna_position: str | None
    flags: list[ValidationFlagSchema]
    escalation_reason: str | None
    usage: UsageSchema | None = None
    timing: TimingSchema | None = None
    follow_ups: list[str] = Field(default_factory=list)
    rag_sources: list[RagSourceSchema] = Field(default_factory=list)
    summary_scope: str | None = None
    summary_tier: str | None = None
    summary_card: SummaryCardSchema | None = None
    # Thin-opportunity notice (target less than one 15-day step above current
    # terms). A UI banner — never part of generated_message.
    opportunity_warning: str | None = None


# ── /session/{id}/summary ─────────────────────────────────────────────────────

class HistoryTurn(BaseModel):
    role: str
    content: str


class SessionSummaryResponse(BaseModel):
    session_id: str
    tenant_id: str
    supplier_id: str
    proposed_terms: int
    tone_override: str | None
    history: list[HistoryTurn]
    turn_count: int
