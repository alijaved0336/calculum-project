import type { SummaryCard } from '@/types/chat'

const SUMMARY_CARD_START = '<!--summary-card:'
const SUMMARY_CARD_END = '-->'

/** Branch card fields may use *_term_days / raw numbers; UI uses current_days etc. */
export function normalizeSummaryCard(raw: unknown): SummaryCard | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Record<string, unknown>

  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null
  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v : null
  const money = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}K`
    return String(Math.round(v))
  }
  const rate = (v: unknown): string | null => {
    if (typeof v === 'string' && v.trim()) return v
    if (typeof v !== 'number' || !Number.isFinite(v)) return null
    return `${(v * 100).toFixed(2)}%`
  }

  return {
    supplier_name: str(c.supplier_name),
    country_flag: str(c.country_flag),
    country: str(c.country),
    industry: str(c.industry),
    credit_rating: str(c.credit_rating),
    header: str(c.header),
    description: str(c.description),
    lead: str(c.lead),
    current_days: num(c.current_days) ?? num(c.current_term_days),
    target_days: num(c.target_days) ?? num(c.target_term_days),
    batna_days: num(c.batna_days),
    standards: Array.isArray(c.standards) ? (c.standards as SummaryCard['standards']) : undefined,
    spend_volume: money(c.spend_volume),
    cash_flow: money(c.cash_flow) ?? money(c.cash_flow_opportunity),
    buyer_leverage: str(c.buyer_leverage),
    company_size: str(c.company_size),
    company_size_detail: str(c.company_size_detail),
    relationship: str(c.relationship),
    relationship_detail: str(c.relationship_detail),
    priority: str(c.priority) ?? str(c.relationship),
    financing_rate: rate(c.financing_rate) ?? rate(c.supplier_financing_rate),
    success_probability: str(c.success_probability) ?? str(c.probability_of_success),
    arguments: Array.isArray(c.arguments) ? (c.arguments as SummaryCard['arguments']) : undefined,
    batna_note: str(c.batna_note),
    regulatory_cap_days: num(c.regulatory_cap_days),
    regulatory_enforced: typeof c.regulatory_enforced === 'boolean' ? c.regulatory_enforced : null,
  }
}

export function extractSummaryCard(text: string): { body: string; card: SummaryCard | null } {
  const start = text.lastIndexOf(SUMMARY_CARD_START)
  if (start < 0) return { body: text, card: null }
  const end = text.indexOf(SUMMARY_CARD_END, start)
  if (end < 0) return { body: text, card: null }
  const raw = text.slice(start + SUMMARY_CARD_START.length, end)
  const body = `${text.slice(0, start)}${text.slice(end + SUMMARY_CARD_END.length)}`.trimEnd()
  try {
    const card = normalizeSummaryCard(JSON.parse(raw))
    if (!card) return { body: text, card: null }
    return { body, card }
  } catch {
    return { body: text, card: null }
  }
}
