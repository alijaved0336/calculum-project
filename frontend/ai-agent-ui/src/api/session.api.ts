import client from "./services/negotiation.client";
import type { PlaybookSection } from '@/types/chat'

// ── Nested schemas ────────────────────────────────────────────────────────────

export interface NegotiationStrategyEntry {
  value: number | null;
  applied: boolean;
}

export interface PeerGroupEntry extends NegotiationStrategyEntry {
  occurrences: number | null;
  avg: number | null;
  q3: number | null;
}

export interface NegotiationStrategy {
  parent_or_supplier_max: NegotiationStrategyEntry;
  industry_region_standard: NegotiationStrategyEntry;
  buyer_standard: NegotiationStrategyEntry;
  supplier_standard: NegotiationStrategyEntry;
  peer_group_standard: PeerGroupEntry;
  regulatory_term: NegotiationStrategyEntry;
  scf_peer_standard: NegotiationStrategyEntry;
  harmonization: NegotiationStrategyEntry;
}

export interface TargetSchema {
  opportunity_payment_terms: number | null;
  target_payment_terms: number | null;
  target_cash_flow: number | null;
}

export interface AgreementSchema {
  agreed_terms_without_cash_discounts: number | null;
  agreed_terms_with_cash_discounts: number | null;
  agreed_cash_discount_percentage: number | null;
}

export interface SupplierContextData {
  supplier_uuid: string;
  tenant_id: string;
  sfv_uuid: string;
  name: string;
  country: string;
  is_sme: boolean;
  spend_volume: number;
  entity_buyer_leverage_level: string;
  entity_supplier_leverage_level: string;
  success_probability: string;
  credit_rating: string | null;
  updated_at: string;
  confidence_flag: string | null;
  target: TargetSchema;
  agreement: AgreementSchema;
  negotiation_strategy: NegotiationStrategy;
}

export interface ThreadSummary {
  content: string | null;
  created_at: string;
  thread_name?: string | null;
}

export interface PreviousThread {
  thread_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  pinned: boolean;
  latest_summary: ThreadSummary | null;
  thread_tone: string | null;
}

export interface SupplierListItem {
  supplierId: string;
  name: string;
  receivedName: string | null;
  country: string | null;
  parentName: string | null;
  spendVolume: number | null;
  isSme: boolean | null;
}

export interface ListSuppliersParams {
  limit?: number;
  offset?: number;
  search?: string;
}

// ── Request / Response shapes ─────────────────────────────────────────────────

export interface StartSessionRequest {
  tenant_id: string;
  supplier_id: string;
  user_id?: string | null;
  thread_tone?: string | null;
}

export interface SessionSettings {
  effectiveStrategies: string[];
  effectiveTones: string[];
  strategyToneMap: Record<string, string> | null;
  /** Effective permission supplied by the session API for the active user. */
  canViewDataInputs?: boolean;
}

export interface StartSessionResponse {
  session_id: string;
  token?: string | null;
  thread_id: string | null;
  previous_threads: PreviousThread[];
  data: SupplierContextData | null;
  settings: SessionSettings | null;
  starter_questions: string[];
}

export type ChatTone = "collaborative" | "assertive" | "methodical";

export interface MessageRequest {
  message: string;
  thread_tone?: ChatTone | null;
  negotiation_strategy?: string | null;
}

export interface MessageResponse {
  session_id: string;
  passed: boolean;
  generated_message: string | null;
  tone_used: string | null;
  strategies_used: string[];
  strategies_suppressed: string[];
  confidence: string | null;
  reasoning: string | null;
  scf_offered: boolean;
  batna_position: string | null;
  flags: Array<{ code: string; message: string; severity: string }>;
  escalation_reason: string | null;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
  timing: {
    started_at: number;
    completed_at: number;
    duration_seconds: number;
  } | null;
}

export interface ThreadSummaryResponse {
  thread_id: string;
  summary: string;
  created_at: string;
  thread_name?: string | null;
  title?: string | null;
}

export interface ThreadMessage {
  message_id: string;
  role: "user" | "ai";
  content: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  source: import('@/types/chat').MessageSourceMap | null;
  rag_sources?: import('@/types/chat').RagSource[] | null;
  created_at: string;
}

export interface EditMessageRequest {
  updated_content: string;
}

export interface UpdateThreadRequest {
  title?: string | null;
  pinned?: boolean | null;
  reaction?: boolean | null;
}

export interface UpdateThreadResponse {
  thread_id: string;
  title: string;
  pinned: boolean;
  reaction: boolean | null;
  updated_at: string;
}

export interface ThreadMessagesResponse {
  thread_id: string;
  pinned: boolean;
  messages: ThreadMessage[];
  latest_summary: ThreadSummary | null;
}

export interface ThreadPinResponse {
  thread_id: string;
  pinned: boolean;
}

export interface SavePlaybookRequest {
  title: string;
  subtitle: string;
  supplier_name?: string | null;
  country_code?: string | null;
  footer?: string | null;
  sections: PlaybookSection[];
  raw: string;
}

export interface SavePlaybookResponse {
  playbook_id: string;
  pdf_url: string;
  created_at: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const sessionApi = {
  start: (payload: StartSessionRequest) =>
    client.post<StartSessionResponse>("/session/start", payload),

  chat: (
    sessionId: string,
    message: string,
    thread_tone?: ChatTone | null,
    negotiation_strategy?: string | null,
  ) =>
    client.post<MessageResponse>(`/${sessionId}/chat`, {
      message,
      thread_tone,
      negotiation_strategy,
    } satisfies MessageRequest),

  generateSummary: (sessionId: string) =>
    client.post<ThreadSummaryResponse | null>(`/${sessionId}/summary`, {}),

  getThreads: (supplierId: string) =>
    client.get<{ threads: PreviousThread[] }>(`/suppliers/${supplierId}/threads`),

  listSuppliers: (tenantId: string, options: ListSuppliersParams = {}) =>
    client.get<{ suppliers: SupplierListItem[] }>("/suppliers", {
      params: {
        tenant_id: tenantId,
        limit: options.limit,
        offset: options.offset,
        search: options.search || undefined,
      },
    }),

  getThreadMessages: (threadId: string, sessionId?: string | null) =>
    client.get<ThreadMessagesResponse>(`/${threadId}/messages`, {
      params: sessionId ? { session_id: sessionId } : undefined,
    }),

  pinThreadSummary: (threadId: string) =>
    client.post<ThreadPinResponse>(`/${threadId}/summary/pin`, {}),

  unpinThreadSummary: (threadId: string) =>
    client.delete<ThreadPinResponse>(`/${threadId}/summary/pin`),

  updateThread: (threadId: string, payload: UpdateThreadRequest) =>
    client.patch<UpdateThreadResponse>(`/threads/${threadId}`, payload),

  deleteThread: (threadId: string) =>
    client.delete(`/threads/${threadId}`),

  editMessage: (threadId: string, messageId: string, updatedContent: string) =>
    client.patch<ThreadMessagesResponse>(`/${threadId}/messages/${messageId}`, {
      updated_content: updatedContent,
    } satisfies EditMessageRequest),

  savePlaybook: (payload: SavePlaybookRequest) =>
    client.post<SavePlaybookResponse>("/playbooks/save", payload),
};
