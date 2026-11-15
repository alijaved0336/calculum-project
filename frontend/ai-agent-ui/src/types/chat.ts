export interface MessageVisualContext {
  supplierName?: string | null
  country?: string | null
}

export interface Message {
  id: number
  message_id?: string
  role: 'user' | 'assistant'
  content: string
  followups?: string[]
  streaming?: boolean
  isPlaybook?: boolean
  playbook?: PlaybookData | null
  summaryCard?: SummaryCard | null
  metadata?: MessageMetadata
}

export interface SummaryCardStandard {
  key: string
  label: string
  days: number
}

export interface SummaryCardArgument {
  title?: string | null
  days?: number | null
  text: string
}

export interface SummaryCard {
  supplier_name?: string | null
  country_flag?: string | null
  country?: string | null
  industry?: string | null
  credit_rating?: string | null
  header?: string | null
  description?: string | null
  lead?: string | null
  current_days?: number | null
  target_days?: number | null
  batna_days?: number | null
  standards?: SummaryCardStandard[]
  spend_volume?: string | null
  cash_flow?: string | null
  buyer_leverage?: string | null
  company_size?: string | null
  company_size_detail?: string | null
  relationship?: string | null
  relationship_detail?: string | null
  priority?: string | null
  financing_rate?: string | null
  success_probability?: string | null
  arguments?: SummaryCardArgument[]
  batna_note?: string | null
  regulatory_cap_days?: number | null
  regulatory_enforced?: boolean | null
}

export interface PlaybookSection {
  index: number
  title: string
  subtitle: string
  summary: string
  bullets: string[]
}

export interface PlaybookData {
  title: string
  subtitle: string
  supplierName: string | null
  countryCode: string | null
  footer: string | null
  sections: PlaybookSection[]
  raw: string
}

export interface MessageSourceEntry {
  path: string
  value: unknown
}

export type MessageSourceMap = Record<string, MessageSourceEntry>

export interface RagSource {
  file_uuid: string
  filename: string | null
  pages: number[]
  text?: string
}

export interface MessageUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export interface MessageTiming {
  started_at: number
  completed_at: number
  duration_seconds: number
}

export interface MessageMetadata {
  source?: MessageSourceMap | null
  rag_sources?: RagSource[] | null
  usage?: MessageUsage | null
  timing?: MessageTiming | null
  is_playbook?: boolean
  summary_card?: SummaryCard | null
  follow_ups?: string[]
  thread_id?: string | null
}

export interface Goal {
  id: string
  title: string
  description: string
  scfStatus: 'SCF Enabled' | 'SCF Disabled'
}

export interface SummaryBullet {
  label: string
  content: string
}

export interface ToneDescriptor {
  label: string
  color: string
}

export type Tone = 'collaborative' | 'assertive' | 'methodical'
